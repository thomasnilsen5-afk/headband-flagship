import type { EmailOtpType } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { safeNext } from '@/lib/auth'
import { log } from '@/lib/log'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * Landing point for the sign-in link in the email. Handles both the PKCE code flow (default
 * Supabase template) and token_hash links (custom template), then attaches guest orders.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl
  const next = safeNext(url.searchParams.get('next'), '/konto')
  const supabase = await createSupabaseServerClient()

  const code = url.searchParams.get('code')
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type') as EmailOtpType | null
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error('missing code') }

  if (error) {
    log.warn('auth.callback_failed', { err: error.message })
    return NextResponse.redirect(new URL('/konto/logg-inn?feil=lenke', url.origin))
  }
  await supabase.rpc('claim_guest_orders')
  return NextResponse.redirect(new URL(next, url.origin))
}
