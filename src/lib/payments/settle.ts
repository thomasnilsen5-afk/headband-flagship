import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from './stripe'
import { vippsModify } from './vipps'

/**
 * Money movements after checkout, done by staff: capture when the parcel ships, refund when a
 * return is settled. Provider calls carry idempotency keys derived from our ids, so a retried
 * click never captures or refunds twice.
 */

async function latestPayment(orderId: string) {
  const { data } = await createAdminClient()
    .from('payments')
    .select('provider, provider_ref, status, amount_ore')
    .eq('order_id', orderId)
    .in('status', ['authorized', 'captured', 'partially_refunded'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

export async function captureOrderPayment(orderId: string, amountOre: number) {
  const p = await latestPayment(orderId)
  if (!p) throw new Error('no_payment')
  if (p.status !== 'authorized') return // already captured
  if (p.provider === 'stripe') {
    await stripe().paymentIntents.capture(
      p.provider_ref,
      { amount_to_capture: amountOre },
      { idempotencyKey: `capture-${orderId}` },
    )
  } else if (p.provider === 'vipps') {
    await vippsModify('capture', p.provider_ref, amountOre, `capture-${orderId}`)
  }
  // 'test': nothing to call; the database records the capture.
}

export async function refundOrderPayment(orderId: string, amountOre: number, key: string) {
  const p = await latestPayment(orderId)
  if (!p) throw new Error('no_payment')
  if (p.provider === 'stripe') {
    await stripe().refunds.create(
      { payment_intent: p.provider_ref, amount: amountOre },
      { idempotencyKey: key },
    )
  } else if (p.provider === 'vipps') {
    await vippsModify('refund', p.provider_ref, amountOre, key)
  }
}
