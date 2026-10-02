'use server'

import { headers } from 'next/headers'
import { log } from '@/lib/log'
import { waitlistSchema } from '@/lib/schemas/waitlist'
import { clientIp, rateLimit } from '@/lib/security/rate-limit'
import { createAdminClient } from '@/lib/supabase/admin'

export type WaitlistState = { status: 'idle' | 'ok' | 'invalid' | 'consent' | 'limited' | 'error' }

/**
 * Join a drop waitlist or a back-in-stock list. Runs on the server with the service role
 * (customers have no INSERT policy on waitlist_entries), after validation and rate limiting.
 * Idempotent: joining twice is a success, never an error or a duplicate.
 */
export async function joinWaitlist(_prev: WaitlistState, form: FormData): Promise<WaitlistState> {
  const parsed = waitlistSchema.safeParse({
    kind: form.get('kind'),
    dropId: form.get('dropId') || undefined,
    variantId: form.get('variantId') || undefined,
    email: form.get('email'),
    locale: form.get('locale'),
    consent: form.get('consent') ?? undefined,
    company: form.get('company') ?? '',
  })
  if (!parsed.success) {
    const consent = parsed.error.issues.some((i) => i.message === 'consent_required')
    return { status: consent ? 'consent' : 'invalid' }
  }
  const v = parsed.data
  // Honeypot filled: pretend success, store nothing.
  if (v.company) return { status: 'ok' }

  const ip = clientIp(await headers())
  const [byIp, byEmail] = await Promise.all([
    rateLimit('waitlist-ip', ip, 10, '10 m'),
    rateLimit('waitlist-email', v.email, 5, '1 h'),
  ])
  if (!byIp.ok || !byEmail.ok) return { status: 'limited' }

  try {
    const { error } = await createAdminClient()
      .from('waitlist_entries')
      .upsert(
        {
          kind: v.kind,
          drop_id: v.dropId ?? null,
          variant_id: v.variantId ?? null,
          email: v.email,
          locale: v.locale,
          consent_at: new Date().toISOString(),
        },
        { onConflict: 'kind,drop_id,variant_id,email', ignoreDuplicates: true },
      )
    if (error) throw error
    log.info('waitlist.joined', { kind: v.kind, dropId: v.dropId, variantId: v.variantId })
    return { status: 'ok' }
  } catch (err) {
    log.error('waitlist.failed', { err, kind: v.kind })
    return { status: 'error' }
  }
}
