import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server'
import { ReturnForm } from '@/components/account/ReturnForm'
import { getPathname, Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { getUser } from '@/lib/auth'
import { formatPrice } from '@/lib/commerce'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const metadata: Metadata = { robots: { index: false, follow: false } }

type Props = { params: Promise<{ locale: string; id: string }> }
const RETURNABLE = new Set(['paid', 'fulfilled', 'shipped', 'delivered', 'partially_refunded'])
const RETURN_DAYS = 30

/** Before delivery the window has not started; afterwards it runs RETURN_DAYS. */
function returnWindowOpen(deliveredAt: string | null) {
  return !deliveredAt || Date.now() < new Date(deliveredAt).getTime() + RETURN_DAYS * 864e5
}

type Address = {
  full_name?: string
  line1?: string
  line2?: string | null
  postal_code?: string
  city?: string
  country?: string
}

export default async function AccountOrderPage({ params }: Props) {
  const { locale: l, id } = await params
  const locale = l as Locale
  setRequestLocale(locale)
  if (!(await getUser())) redirect(getPathname({ href: '/account/sign-in', locale }))
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()

  // RLS: another customer's order id simply returns no row.
  const supabase = await createSupabaseServerClient()
  const { data: order } = await supabase
    .from('orders')
    .select(
      'id, number, status, created_at, delivered_at, total_ore, tax_ore, shipping_address, tracking_url, order_items(id, name, variant_label, qty, line_total_ore), returns(id, status, items, requested_at)',
    )
    .eq('id', id)
    .maybeSingle()
  if (!order) notFound()
  const t = await getTranslations('account')
  const tc = await getTranslations('cart')
  const format = await getFormatter()
  const a = order.shipping_address as Address

  // Mirrors request_return (which has the final say): open while the order is paid or later and,
  // once delivered, for the return window; only units not already asked for.
  const asked = new Map<string, number>()
  for (const r of order.returns.filter((r) => r.status !== 'rejected')) {
    for (const i of r.items as { order_item_id: string; qty: number }[]) {
      asked.set(i.order_item_id, (asked.get(i.order_item_id) ?? 0) + i.qty)
    }
  }
  const returnable = order.order_items
    .map((i) => ({
      id: i.id,
      name: i.name,
      variantLabel: i.variant_label,
      returnable: i.qty - (asked.get(i.id) ?? 0),
    }))
    .filter((i) => i.returnable > 0)
  const windowOpen = returnWindowOpen(order.delivered_at)
  const canReturn = RETURNABLE.has(order.status) && windowOpen && returnable.length > 0
  const returnKeys = [
    'returnQty',
    'returnReason',
    'returnSubmit',
    'returnOk',
    'returnNone',
    'returnWindow',
    'returnNotReturnable',
    'returnQtyExceeded',
    'limited',
    'error',
  ]

  return (
    <section className="shell grid max-w-[56rem]! gap-10 pt-[calc(var(--header-h)+6vh)] pb-24">
      <Link href="/account" className="type-label w-fit hover:text-bone">
        ← {t('back')}
      </Link>
      <header>
        <h1 className="type-display text-display">{t('order', { number: order.number })}</h1>
        <p className="mt-3 text-ash">
          {t('placed', {
            date: format.dateTime(new Date(order.created_at), { dateStyle: 'long' }),
          })}{' '}
          · {t(`status.${order.status}`)}
        </p>
      </header>
      {order.tracking_url && (
        <a
          href={order.tracking_url}
          className="type-label w-fit rounded-full bg-bone px-6 py-3 text-void!"
          rel="noopener"
        >
          {t('track')} →
        </a>
      )}
      <div>
        <h2 className="type-label mb-4">{t('items')}</h2>
        <ul className="divide-y divide-hairline border-y border-hairline">
          {order.order_items.map((i) => (
            <li key={i.id} className="flex justify-between gap-4 py-4">
              <span>
                {i.name}{' '}
                <span className="text-ash">
                  · {i.variant_label} × {i.qty}
                </span>
              </span>
              <span className="type-data">{formatPrice(i.line_total_ore, locale)}</span>
            </li>
          ))}
        </ul>
        <p className="type-data mt-4 flex justify-between text-lg">
          <span>{t('total')}</span>
          <span>{formatPrice(order.total_ore, locale)}</span>
        </p>
        <p className="mt-1 text-right text-sm text-ash-dim">
          {tc('vatIncluded', { amount: formatPrice(order.tax_ore, locale) })}
        </p>
      </div>
      {(canReturn || order.returns.length > 0) && (
        <div className="hairline border-t pt-8">
          <h2 className="type-label mb-3">{t('returns')}</h2>
          {order.returns.length > 0 && (
            <ul className="mb-6 grid gap-2 text-ash">
              {order.returns.map((r) => (
                <li key={r.id} className="flex justify-between gap-4">
                  <span>
                    {t('returnRequested', {
                      date: format.dateTime(new Date(r.requested_at), { dateStyle: 'medium' }),
                    })}
                  </span>
                  <span className="type-label">{t(`returnStatus.${r.status}`)}</span>
                </li>
              ))}
            </ul>
          )}
          {canReturn && <p className="mb-6 max-w-[52ch] text-ash">{t('returnBody')}</p>}
          {/* Always mounted while this section shows, so the confirmation survives the refresh. */}
          <ReturnForm
            orderId={order.id}
            items={canReturn ? returnable : []}
            copy={Object.fromEntries(returnKeys.map((k) => [k, t(k)]))}
          />
        </div>
      )}
      <div>
        <h2 className="type-label mb-3">{t('shipTo')}</h2>
        <address className="text-ash not-italic">
          {[
            a.full_name,
            a.line1,
            a.line2,
            [a.postal_code, a.city].filter(Boolean).join(' '),
            a.country,
          ]
            .filter(Boolean)
            .join(', ')}
        </address>
      </div>
    </section>
  )
}
