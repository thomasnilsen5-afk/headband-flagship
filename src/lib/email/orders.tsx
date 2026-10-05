import 'server-only'
import OrderConfirmation from '@/emails/OrderConfirmation'
import ReturnUpdate, { type ReturnStatus } from '@/emails/ReturnUpdate'
import ShippingConfirmation from '@/emails/ShippingConfirmation'
import { getPathname } from '@/i18n/navigation'
import { formatPrice } from '@/lib/commerce'
import { siteUrl } from '@/lib/env'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendOnce } from './send'

type Address = {
  full_name?: string
  line1?: string
  line2?: string | null
  postal_code?: string
  city?: string
  country?: string
}

const subjects = {
  order_confirmation: {
    nb: (n: number) => `Ordre ${n} er bekreftet`,
    en: (n: number) => `Order ${n} is confirmed`,
  },
  shipping_confirmation: {
    nb: (n: number) => `Ordre ${n} er sendt`,
    en: (n: number) => `Order ${n} has shipped`,
  },
  return_update: {
    nb: (n: number) => `Retur for ordre ${n}`,
    en: (n: number) => `Return for order ${n}`,
  },
}

async function loadOrder(orderId: string) {
  const { data } = await createAdminClient()
    .from('orders')
    .select(
      'id, number, email, locale, subtotal_ore, discount_ore, shipping_ore, tax_ore, total_ore, shipping_address, carrier, tracking_url, order_items(name, variant_label, qty, line_total_ore)',
    )
    .eq('id', orderId)
    .maybeSingle()
  return data
}

export async function sendOrderConfirmation(orderId: string) {
  const o = await loadOrder(orderId)
  if (!o) return
  const fmt = (ore: number) => formatPrice(ore, o.locale)
  const a = o.shipping_address as Address
  return sendOnce({
    kind: 'order_confirmation',
    ref: o.id,
    to: o.email,
    subject: subjects.order_confirmation[o.locale](o.number),
    email: (
      <OrderConfirmation
        locale={o.locale}
        siteUrl={siteUrl}
        number={o.number}
        items={o.order_items.map((i) => ({
          name: i.name,
          variantLabel: i.variant_label,
          qty: i.qty,
          total: fmt(i.line_total_ore),
        }))}
        subtotal={fmt(o.subtotal_ore)}
        discount={o.discount_ore > 0 ? fmt(o.discount_ore) : null}
        shipping={fmt(o.shipping_ore)}
        total={fmt(o.total_ore)}
        vat={fmt(o.tax_ore)}
        address={[
          a.full_name,
          a.line1,
          a.line2,
          [a.postal_code, a.city].filter(Boolean).join(' '),
          a.country,
        ]
          .filter(Boolean)
          .join(', ')}
        accountUrl={`${siteUrl}${getPathname({ href: { pathname: '/account/orders/[id]', params: { id: o.id } }, locale: o.locale })}`}
      />
    ),
  })
}

export async function sendShippingConfirmation(orderId: string) {
  const o = await loadOrder(orderId)
  if (!o) return
  return sendOnce({
    kind: 'shipping_confirmation',
    ref: o.id,
    to: o.email,
    subject: subjects.shipping_confirmation[o.locale](o.number),
    email: (
      <ShippingConfirmation
        locale={o.locale}
        siteUrl={siteUrl}
        number={o.number}
        carrier={o.carrier}
        trackingUrl={o.tracking_url}
      />
    ),
  })
}

/** One email per return per status (ref = "<return id>:<status>"). */
export async function sendReturnUpdate(returnId: string) {
  const { data: r } = await createAdminClient()
    .from('returns')
    .select('id, status, refund_ore, orders(id, number, email, locale)')
    .eq('id', returnId)
    .maybeSingle()
  const o = r?.orders
  if (!r || !o) return
  return sendOnce({
    kind: 'return_update',
    ref: `${r.id}:${r.status}`,
    to: o.email,
    subject: subjects.return_update[o.locale](o.number),
    email: (
      <ReturnUpdate
        locale={o.locale}
        siteUrl={siteUrl}
        number={o.number}
        status={r.status as ReturnStatus}
        refund={r.refund_ore != null ? formatPrice(r.refund_ore, o.locale) : null}
      />
    ),
  })
}
