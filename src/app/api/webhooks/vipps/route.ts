import { requireServerEnv } from '@/lib/env.server'
import { log } from '@/lib/log'
import { confirmPayment, releaseOrder } from '@/lib/payments/confirm'
import { orderNumberFromReference, verifyVippsWebhook } from '@/lib/payments/vipps'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type VippsEvent = {
  msn: string
  reference: string
  pspReference: string
  name:
    | 'CREATED'
    | 'AUTHORIZED'
    | 'ABORTED'
    | 'EXPIRED'
    | 'CANCELLED'
    | 'CAPTURED'
    | 'REFUNDED'
    | 'TERMINATED'
  amount: { currency: string; value: number }
  success: boolean
}

/** Vipps MobilePay ePayment webhooks: HMAC-verified, claimed once, then applied. */
export async function POST(req: Request) {
  const body = await req.text()
  const url = new URL(req.url)
  const ok = verifyVippsWebhook({
    body,
    pathAndQuery: url.pathname + url.search,
    host: req.headers.get('host') ?? url.host,
    date: req.headers.get('x-ms-date'),
    contentSha256: req.headers.get('x-ms-content-sha256'),
    authorization: req.headers.get('authorization'),
    secret: requireServerEnv('VIPPS_WEBHOOK_SECRET'),
  })
  if (!ok) {
    log.warn('webhook.vipps.bad_signature')
    return new Response('Invalid signature', { status: 401 })
  }

  const event = JSON.parse(body) as VippsEvent
  const eventId = `${event.reference}:${event.name}:${event.pspReference}`
  const db = createAdminClient()
  const { data: fresh, error: claimError } = await db.rpc('claim_webhook_event', {
    p_provider: 'vipps',
    p_event_id: eventId,
    p_type: event.name,
    p_payload: JSON.parse(body),
  })
  if (claimError) return new Response('Retry', { status: 500 })
  if (!fresh) return Response.json({ ok: true, duplicate: true })

  try {
    const number = orderNumberFromReference(event.reference)
    const { data: order } = number
      ? await db.from('orders').select('id').eq('number', number).maybeSingle()
      : { data: null }
    if (order && event.success) {
      if (event.name === 'AUTHORIZED' || event.name === 'CAPTURED') {
        await confirmPayment({
          orderId: order.id,
          provider: 'vipps',
          ref: event.reference,
          amountOre: event.amount.value,
          status: event.name === 'CAPTURED' ? 'captured' : 'authorized',
          raw: { pspReference: event.pspReference, name: event.name },
        })
      } else if (
        event.name === 'ABORTED' ||
        event.name === 'EXPIRED' ||
        event.name === 'TERMINATED'
      ) {
        await releaseOrder(order.id, event.name === 'EXPIRED' ? 'expired' : 'cancelled')
      }
    }
    await db.rpc('complete_webhook_event', { p_provider: 'vipps', p_event_id: eventId })
    return Response.json({ ok: true })
  } catch (err) {
    log.error('webhook.vipps.failed', { err, eventId })
    await db.rpc('complete_webhook_event', {
      p_provider: 'vipps',
      p_event_id: eventId,
      p_error: String(err),
    })
    return new Response('Retry', { status: 500 })
  }
}
