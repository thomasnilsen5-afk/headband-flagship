'use server'

import { randomUUID } from 'node:crypto'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPathname } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { bundleRules, loadCart, toPricingLines } from '@/lib/cart/server'
import {
  priceCart,
  vatModeFor,
  zoneForCountry,
  type CodeDiscount,
  type ShippingRate,
} from '@/lib/commerce'
import { siteUrl } from '@/lib/env'
import { availablePaymentMethods } from '@/lib/env.server'
import { log } from '@/lib/log'
import { createStripePayment } from '@/lib/payments/stripe'
import { createVippsPayment } from '@/lib/payments/vipps'
import { checkoutSchema } from '@/lib/schemas/checkout'
import { clientIp, rateLimit } from '@/lib/security/rate-limit'
import { signOrder } from '@/lib/security/tokens'
import { getUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export type CheckoutState = {
  status:
    'idle' | 'invalid' | 'empty' | 'stock' | 'changed' | 'drop' | 'payment' | 'limited' | 'error'
  fields?: string[]
}

const DB_ERRORS: Record<string, CheckoutState['status']> = {
  insufficient_stock: 'stock',
  price_mismatch: 'changed',
  totals_mismatch: 'changed',
  variant_unavailable: 'stock',
  drop_not_live: 'drop',
  drop_limit_exceeded: 'drop',
}

/**
 * The money boundary. Everything is re-derived on the server: prices and stock from the
 * database, sets and VAT from the pure pricing engine, the shipping rate from the zone. The
 * client only says which rate and method it wants. place_order then reserves stock atomically
 * and re-checks every unit price before any payment is created.
 */
export async function startCheckout(_prev: CheckoutState, form: FormData): Promise<CheckoutState> {
  const parsed = checkoutSchema.safeParse(Object.fromEntries(form))
  if (!parsed.success) {
    return {
      status: 'invalid',
      fields: [...new Set(parsed.error.issues.map((i) => String(i.path[0] ?? i.message)))],
    }
  }
  const v = parsed.data
  const locale = v.locale as Locale

  const limit = await rateLimit('checkout', clientIp(await headers()), 10, '10 m')
  if (!limit.ok) return { status: 'limited' }
  if (!availablePaymentMethods().includes(v.paymentMethod))
    return { status: 'invalid', fields: ['paymentMethod'] }

  const db = createAdminClient()
  const cart = await loadCart(locale)
  if (!cart || cart.items.length === 0) return { status: 'empty' }

  // Shipping: the chosen rate must belong to the destination zone.
  const { data: rateRows } = await db
    .from('shipping_rates')
    .select('code, zone, price_ore, free_over_ore, eta_days_min, eta_days_max')
    .eq('is_active', true)
  const rate = (rateRows ?? []).find(
    (r) => r.code === v.shippingRate && r.zone === zoneForCountry(v.country),
  )
  if (!rate) return { status: 'invalid', fields: ['shippingRate'] }
  const shippingRate: ShippingRate = {
    code: rate.code,
    zone: rate.zone as ShippingRate['zone'],
    priceOre: rate.price_ore,
    freeOverOre: rate.free_over_ore,
    etaDaysMin: rate.eta_days_min,
    etaDaysMax: rate.eta_days_max,
  }

  // Discount: re-validated now, against this email (per-customer limits).
  let discount: CodeDiscount | null = null
  if (cart.discountCode) {
    const { data: d } = await db.rpc('lookup_discount', {
      p_code: cart.discountCode,
      p_email: v.email,
    })
    if (d?.id) {
      discount = { code: d.code, kind: d.kind, value: d.value, minSubtotalOre: d.min_subtotal_ore }
    }
  }

  const vatMode = vatModeFor(v.country, v.postalCode)
  const lines = toPricingLines(cart.items, await bundleRules(locale))
  const priced = priceCart({ lines, vatMode, discount, shippingRate })
  const groupIds = new Map<string, string>()
  const groupId = (slug: string | null | undefined) => {
    if (!slug) return null
    if (!groupIds.has(slug)) groupIds.set(slug, randomUUID())
    return groupIds.get(slug)!
  }

  const address = {
    full_name: v.fullName,
    line1: v.line1,
    line2: v.line2 ?? null,
    postal_code: v.postalCode,
    city: v.city,
    country: v.country,
  }
  const reservationMinutes = v.paymentMethod === 'stripe' ? 35 : 20

  const { data: order, error } = await db.rpc('place_order', {
    p_reservation_minutes: reservationMinutes,
    p_order: {
      user_id: (await getUser())?.id ?? '',
      email: v.email,
      phone: v.phone ?? '',
      locale,
      vat_mode: vatMode,
      subtotal_ore: priced.subtotalOre,
      discount_ore: priced.discountOre,
      shipping_ore: priced.shippingOre,
      tax_ore: priced.taxOre,
      total_ore: priced.totalOre,
      discount_code: priced.discount?.applied ? priced.discount.code : '',
      shipping_rate_code: shippingRate.code,
      shipping_address: address,
      billing_address: address,
      payment_provider: v.paymentMethod,
      cart_id: cart.id,
    },
    p_items: priced.lines.map((l) => ({
      variant_id: l.variantId,
      qty: l.qty,
      unit_price_ore: l.unitPriceOre,
      discount_ore: l.discountOre,
      line_total_ore: l.lineTotalOre,
      vat_rate_bp: l.appliedVatRateBp,
      tax_ore: l.taxOre,
      bundle_group: groupId(l.bundleGroup),
    })),
  })
  if (error || !order) {
    const status = DB_ERRORS[error?.message ?? ''] ?? 'error'
    if (status === 'error')
      log.error('checkout.place_order_failed', { err: error, cartId: cart.id })
    return { status }
  }

  // Remember who this cart belongs to (abandoned-cart email, phase 5).
  await db.from('carts').update({ email: v.email, locale, country: v.country }).eq('id', cart.id)
  if (v.marketing) log.info('checkout.marketing_opt_in', { orderId: order.id })

  const token = signOrder(order.id)
  const confirmation = `${siteUrl}${getPathname({ href: '/checkout/confirmation', locale })}?ordre=${order.id}&t=${token}`
  const cancel = `${siteUrl}${getPathname({ href: '/checkout', locale })}?avbrutt=${order.id}`

  let redirectUrl: string
  try {
    if (priced.totalOre === 0) {
      await db.rpc('confirm_order_payment', {
        p_order_id: order.id,
        p_provider: v.paymentMethod,
        p_provider_ref: `free-${order.id}`,
        p_amount_ore: 0,
        p_payment_status: 'captured',
      })
      redirectUrl = confirmation
    } else if (v.paymentMethod === 'test') {
      redirectUrl = `${siteUrl}${getPathname({ href: '/checkout/test-payment', locale })}?ordre=${order.id}&t=${token}`
    } else {
      const request = {
        orderId: order.id,
        orderNumber: order.number,
        totalOre: priced.totalOre,
        shippingOre: priced.shippingOre,
        email: v.email,
        phone: v.phone,
        locale,
        returnUrl: confirmation,
        cancelUrl: cancel,
        lines: priced.lines.map((l) => ({
          ...l,
          name: l.item.name,
          variantLabel: l.item.variantLabel,
        })),
      }
      const start =
        v.paymentMethod === 'stripe'
          ? await createStripePayment(request)
          : await createVippsPayment(request)
      redirectUrl = start.redirectUrl
    }
    log.info('checkout.started', {
      orderId: order.id,
      number: order.number,
      method: v.paymentMethod,
      total: priced.totalOre,
    })
  } catch (err) {
    log.error('checkout.payment_start_failed', { err, orderId: order.id, method: v.paymentMethod })
    await db.rpc('release_order', { p_order_id: order.id, p_status: 'cancelled' })
    return { status: 'payment' }
  }

  redirect(redirectUrl)
}
