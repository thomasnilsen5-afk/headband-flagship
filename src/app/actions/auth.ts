'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { getPathname } from '@/i18n/navigation'
import { siteUrl } from '@/lib/env'
import { log } from '@/lib/log'
import { clientIp, rateLimit } from '@/lib/security/rate-limit'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type SignInState =
  | { step: 'email'; status?: 'invalid' | 'limited' | 'error' }
  | { step: 'code'; email: string; status?: 'sent' | 'invalid' | 'limited' | 'error' }

const email = z.string().trim().toLowerCase().pipe(z.email())
const locale = z.enum(['nb', 'en'])

/**
 * Passwordless sign-in. Step 1 emails a one-time code (and a link, for the default
 * template); step 2 verifies the code in this browser. Accounts are created on first use.
 */
export async function signInStep(prev: SignInState, form: FormData): Promise<SignInState> {
  const ip = clientIp(await headers())
  const loc = locale.catch('nb').parse(form.get('locale'))

  if (form.get('intent') === 'restart') return { step: 'email' }

  if (prev.step === 'email' || form.get('intent') === 'resend') {
    const e = email.safeParse(form.get('email'))
    if (!e.success) return { step: 'email', status: 'invalid' }
    if (!(await rateLimit('signin-send', `${ip}:${e.data}`, 5, '15 m')).ok) {
      return { step: 'email', status: 'limited' }
    }
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: e.data,
      options: {
        shouldCreateUser: true,
        data: { locale: loc },
        emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(getPathname({ href: '/account', locale: loc }))}`,
      },
    })
    if (error) {
      log.warn('auth.otp_send_failed', { err: error.message, status: error.status })
      return { step: 'email', status: error.status === 429 ? 'limited' : 'error' }
    }
    return { step: 'code', email: e.data, status: 'sent' }
  }

  const token = z
    .string()
    .trim()
    .regex(/^\d{6,10}$/)
    .safeParse(form.get('code'))
  const addr = email.safeParse(form.get('email'))
  if (!addr.success) return { step: 'email', status: 'invalid' }
  const codeStep = { step: 'code', email: addr.data } as const
  if (!token.success) return { ...codeStep, status: 'invalid' }
  // Brute-force guard on the code: tight per address (wherever the guesses come from), looser
  // per IP so customers behind a shared network are not locked out by each other.
  const [perEmail, perIp] = await Promise.all([
    rateLimit('signin-verify', addr.data, 10, '15 m'),
    rateLimit('signin-verify-ip', ip, 60, '15 m'),
  ])
  if (!perEmail.ok || !perIp.ok) return { ...codeStep, status: 'limited' }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.verifyOtp({
    email: addr.data,
    token: token.data,
    type: 'email',
  })
  if (error) return { ...codeStep, status: 'invalid' }
  await supabase.rpc('claim_guest_orders')
  redirect(getPathname({ href: '/account', locale: loc }))
}

export async function signOut(form: FormData) {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect(getPathname({ href: '/', locale: locale.catch('nb').parse(form.get('locale')) }))
}
