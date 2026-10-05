import 'server-only'
import { after } from 'next/server'
import { sendOrderConfirmation } from '@/lib/email/orders'
import { log } from '@/lib/log'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripeSessionStatus } from './stripe'
import { getVippsPayment, vippsReference } from './vipps'

type Provider = 'stripe' | 'vipps' | 'test'

/** Single entry point for "the provider says this order is paid". Idempotent. */
export async function confirmPayment(opts: {
  orderId: string
  provider: Provider
  ref: string
  amountOre: number
  status: 'authorized' | 'captured'
  raw?: Record<string, unknown>
}) {
  const { data, error } = await createAdminClient().rpc('confirm_order_payment', {
    p_order_id: opts.orderId,
    p_provider: opts.provider,
    p_provider_ref: opts.ref,
    p_amount_ore: opts.amountOre,
    p_payment_status: opts.status,
    p_raw: (opts.raw ?? null) as never,
  })
  if (error) throw new Error(`confirm_order_payment: ${error.message}`)
  if (data) {
    log.info('order.paid', { orderId: opts.orderId, provider: opts.provider, status: opts.status })
    // After the response: the provider gets its 200 without waiting on email delivery.
    after(() => sendOrderConfirmation(opts.orderId))
  }
  return data === true
}

export async function releaseOrder(orderId: string, status: 'cancelled' | 'expired') {
  const { error } = await createAdminClient().rpc('release_order', {
    p_order_id: orderId,
    p_status: status,
  })
  if (error) throw new Error(`release_order: ${error.message}`)
}

/**
 * Called when the customer lands on the confirmation page. If the webhook has not arrived yet
 * (or is not configured in this environment), ask the provider directly. Never trusts the URL.
 */
export async function reconcileOnReturn(
  order: { id: string; number: number; status: string; payment_provider: string | null },
  stripeSessionId?: string,
) {
  if (order.status !== 'pending') return
  try {
    if (order.payment_provider === 'stripe' && stripeSessionId) {
      const s = await stripeSessionStatus(stripeSessionId)
      if (s.orderId === order.id && s.authorized && s.paymentIntentId) {
        await confirmPayment({
          orderId: order.id,
          provider: 'stripe',
          ref: s.paymentIntentId,
          amountOre: s.amount,
          status: s.captured ? 'captured' : 'authorized',
        })
      }
    } else if (order.payment_provider === 'vipps') {
      const p = await getVippsPayment(vippsReference(order.number))
      if (p.state === 'AUTHORIZED') {
        await confirmPayment({
          orderId: order.id,
          provider: 'vipps',
          ref: vippsReference(order.number),
          amountOre: p.aggregate.authorizedAmount.value,
          status: p.aggregate.capturedAmount.value > 0 ? 'captured' : 'authorized',
        })
      } else if (p.state === 'ABORTED' || p.state === 'EXPIRED' || p.state === 'TERMINATED') {
        await releaseOrder(order.id, p.state === 'EXPIRED' ? 'expired' : 'cancelled')
      }
    }
  } catch (err) {
    log.warn('order.reconcile_failed', { err, orderId: order.id })
  }
}
