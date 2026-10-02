import 'server-only'
import Stripe from 'stripe'
import { requireServerEnv } from '@/lib/env.server'
import type { PaymentRequest, PaymentStart } from './types'

let client: Stripe | undefined
export function stripe(): Stripe {
  client ??= new Stripe(requireServerEnv('STRIPE_SECRET_KEY'), {
    maxNetworkRetries: 2,
    timeout: 15_000,
  })
  return client
}

/**
 * Hosted Stripe Checkout: cards, Apple Pay, Google Pay and Klarna (enable it in the Stripe
 * dashboard). Funds are only authorised here (capture_method: manual) and captured when the
 * order ships. Line amounts are post-discount line totals so Stripe's total equals ours exactly.
 */
export async function createStripePayment(req: PaymentRequest): Promise<PaymentStart> {
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = req.lines.map((l) => ({
    quantity: 1,
    price_data: {
      currency: 'nok',
      unit_amount: l.lineTotalOre,
      product_data: {
        name: l.qty > 1 ? `${l.name} × ${l.qty}` : l.name,
        description: l.variantLabel,
      },
    },
  }))
  if (req.shippingOre > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: 'nok',
        unit_amount: req.shippingOre,
        product_data: { name: req.locale === 'nb' ? 'Frakt' : 'Shipping' },
      },
    })
  }

  const session = await stripe().checkout.sessions.create(
    {
      mode: 'payment',
      currency: 'nok',
      locale: req.locale === 'nb' ? 'nb' : 'en',
      customer_email: req.email,
      line_items: lineItems,
      metadata: { order_id: req.orderId, order_number: String(req.orderNumber) },
      payment_intent_data: {
        capture_method: 'manual',
        metadata: { order_id: req.orderId, order_number: String(req.orderNumber) },
      },
      success_url: `${req.returnUrl}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: req.cancelUrl,
      // Stripe's minimum; the stock reservation is held a little longer than this.
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
    },
    { idempotencyKey: `checkout-${req.orderId}` },
  )
  if (!session.url) throw new Error('Stripe returned no checkout URL')
  return { redirectUrl: session.url, providerRef: session.id }
}

/** Used by the confirmation page so a slow webhook never leaves a paid order looking pending. */
export async function stripeSessionStatus(sessionId: string) {
  const session = await stripe().checkout.sessions.retrieve(sessionId, {
    expand: ['payment_intent'],
  })
  const pi = session.payment_intent as Stripe.PaymentIntent | null
  return {
    orderId: session.metadata?.order_id ?? null,
    paymentIntentId: pi?.id ?? null,
    authorized: pi?.status === 'requires_capture' || pi?.status === 'succeeded',
    captured: pi?.status === 'succeeded',
    amount: pi?.status === 'requires_capture' ? pi.amount_capturable : (pi?.amount_received ?? 0),
  }
}
