import 'server-only'
import { render } from '@react-email/components'
import type { ReactElement } from 'react'
import { Resend } from 'resend'
import { brand } from '@/lib/brand'
import { serverEnv } from '@/lib/env.server'
import { log } from '@/lib/log'
import { createAdminClient } from '@/lib/supabase/admin'

export type EmailKind =
  | 'order_confirmation'
  | 'shipping_confirmation'
  | 'abandoned_cart'
  | 'back_in_stock'
  | 'drop_live'
  | 'return_update'

let resend: Resend | undefined

/**
 * Sends at most one email per (kind, ref), e.g. one order confirmation per order, however
 * many webhooks or retries arrive. The email_log row is claimed first; if delivery fails the
 * claim is released so the next attempt can send.
 *
 * Transport: Resend when RESEND_API_KEY is set; otherwise Mailpit (local and CI) when
 * MAILPIT_URL is set; otherwise the email is only logged. Never throws: an email problem must
 * not fail a payment webhook.
 */
export async function sendOnce(opts: {
  kind: EmailKind
  ref: string
  to: string
  subject: string
  email: ReactElement
}): Promise<'sent' | 'duplicate' | 'skipped' | 'failed'> {
  const db = createAdminClient()
  const { data: claim, error: claimError } = await db
    .from('email_log')
    .upsert(
      { kind: opts.kind, ref: opts.ref, recipient: opts.to },
      { onConflict: 'kind,ref', ignoreDuplicates: true },
    )
    .select('id')
  if (claimError) {
    log.error('email.claim_failed', { err: claimError.message, kind: opts.kind, ref: opts.ref })
    return 'failed'
  }
  if (!claim?.length) return 'duplicate'

  try {
    const [html, text] = await Promise.all([
      render(opts.email),
      render(opts.email, { plainText: true }),
    ])
    const providerId = await deliver({ ...opts, html, text })
    if (!providerId) {
      // Nothing was delivered: keep the slot free for when a transport is configured.
      await db.from('email_log').delete().eq('id', claim[0]!.id)
      return 'skipped'
    }
    await db.from('email_log').update({ provider_id: providerId }).eq('id', claim[0]!.id)
    log.info('email.sent', { kind: opts.kind, ref: opts.ref })
    return 'sent'
  } catch (err) {
    await db.from('email_log').delete().eq('id', claim[0]!.id)
    log.error('email.failed', { err, kind: opts.kind, ref: opts.ref })
    return 'failed'
  }
}

async function deliver(m: {
  kind: EmailKind
  ref: string
  to: string
  subject: string
  html: string
  text: string
}) {
  const env = serverEnv()
  const from = env.EMAIL_FROM ?? `${brand.name} <${brand.email}>`

  if (env.RESEND_API_KEY) {
    resend ??= new Resend(env.RESEND_API_KEY)
    const { data, error } = await resend.emails.send(
      {
        from,
        to: m.to,
        subject: m.subject,
        html: m.html,
        text: m.text,
        tags: [{ name: 'kind', value: m.kind }],
      },
      { idempotencyKey: `${m.kind}/${m.ref}` },
    )
    if (error) throw new Error(`resend: ${error.message}`)
    return data?.id ?? null
  }

  if (env.MAILPIT_URL && process.env.VERCEL_ENV !== 'production') {
    const address = /<([^>]+)>/.exec(from)?.[1] ?? from
    const res = await fetch(`${env.MAILPIT_URL}/api/v1/send`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        From: { Email: address, Name: brand.name },
        To: [{ Email: m.to }],
        Subject: m.subject,
        HTML: m.html,
        Text: m.text,
        Tags: [m.kind],
      }),
    })
    if (!res.ok) throw new Error(`mailpit: ${res.status}`)
    return ((await res.json()) as { ID?: string }).ID ?? 'mailpit'
  }

  log.warn('email.no_transport', { kind: m.kind, ref: m.ref })
  return null
}
