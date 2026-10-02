import type Stripe from 'stripe'
import { requireServerEnv } from '@/lib/env.server'
import { log } from '@/lib/log'
import { confirmPayment, releaseOrder } from '@/lib/payments/confirm'
import { stripe } from '@/lib/payments/stripe'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Stripe webhooks. Signature verified on the raw body; each event id is claimed once in
 * webhook_events, so Stripe's retries are harmless. Returns 500 on processing errors so
 * Stripe retries; returns 200 for events we deliberately ignore.
 */
export async function POST(req: Request) {
  const body = await req.text()
  let event: Stripe.Event
  try {
    event = stripe().webhooks.constructEvent(
      body,
      req.headers.get('stripe-signature') ?? '',
      requireServerEnv('STRIPE_WEBHOOK_SECRET'),
    )
  } catch (err) {
    log.warn('webhook.stripe.bad_signature', { err })
    return new Response('Invalid signature', { status: 400 })
  }

  const db = createAdminClient()
  const { data: fresh, error: claimError } = await db.rpc('claim_webhook_event', {
    p_provider: 'stripe',
    p_event_id: event.id,
    p_type: event.type,
    p_payload: JSON.parse(body),
  })
  if (claimError) return new Response('Retry', { status: 500 })
  if (!fresh) return Response.json({ ok: true, duplicate: true })

  try {
    switch (event.type) {
      case 'payment_intent.amount_capturable_updated':
      case 'payment_intent.succeeded': {
        const pi = event.data.object
        const orderId = pi.metadata?.order_id
        if (orderId) {
          const captured = event.type === 'payment_intent.succeeded'
          await confirmPayment({
            orderId,
            provider: 'stripe',
            ref: pi.id,
            amountOre: captured ? pi.amount_received : pi.amount_capturable,
            status: captured ? 'captured' : 'authorized',
            raw: { id: pi.id, status: pi.status },
          })
        }
        break
      }
      case 'checkout.session.expired': {
        const orderId = event.data.object.metadata?.order_id
        if (orderId) await releaseOrder(orderId, 'expired')
        break
      }
      case 'payment_intent.canceled': {
        const orderId = event.data.object.metadata?.order_id
        if (orderId) await releaseOrder(orderId, 'cancelled')
        break
      }
    }
    await db.rpc('complete_webhook_event', { p_provider: 'stripe', p_event_id: event.id })
    return Response.json({ ok: true })
  } catch (err) {
    log.error('webhook.stripe.failed', { err, type: event.type, id: event.id })
    await db.rpc('complete_webhook_event', {
      p_provider: 'stripe',
      p_event_id: event.id,
      p_error: String(err),
    })
    return new Response('Retry', { status: 500 })
  }
}
