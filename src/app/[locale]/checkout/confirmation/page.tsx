import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { OrderWatch } from '@/components/checkout/OrderWatch'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { formatPrice } from '@/lib/commerce'
import { getOrderForCustomer } from '@/lib/orders'
import { reconcileOnReturn } from '@/lib/payments/confirm'
import { verifyOrder } from '@/lib/security/tokens'

export const metadata: Metadata = { robots: { index: false, follow: false } }

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ ordre?: string; t?: string; session_id?: string }>
}

type Address = {
  full_name?: string
  line1?: string
  line2?: string | null
  postal_code?: string
  city?: string
  country?: string
}

const PAID = new Set(['paid', 'fulfilled', 'shipped', 'delivered'])

export default async function ConfirmationPage({ params, searchParams }: Props) {
  const { locale: l } = await params
  const locale = l as Locale
  setRequestLocale(locale)
  const { ordre, t: token, session_id } = await searchParams
  // The signed token is the only way in: order ids are unguessable, but never sufficient alone.
  if (!ordre || !verifyOrder(ordre, token)) notFound()
  let order = await getOrderForCustomer(ordre)
  if (!order) notFound()
  if (order.status === 'pending') {
    await reconcileOnReturn(order, session_id)
    order = (await getOrderForCustomer(ordre)) ?? order
  }
  const t = await getTranslations('confirmation')
  const tc = await getTranslations('cart')
  const paid = PAID.has(order.status)
  const state = paid ? 'paid' : order.status === 'pending' ? 'pending' : 'cancelled'
  const a = order.shipping_address as Address
  const fmt = (ore: number) => formatPrice(ore, locale)

  return (
    <section className="shell grid gap-12 pt-[calc(var(--header-h)+6vh)] pb-24 lg:grid-cols-[1.2fr_1fr]">
      <OrderWatch status={paid ? 'paid' : order.status} />
      <div className="grid content-start gap-6">
        <p className="type-label type-data">{t('order', { number: order.number })}</p>
        <h1 className="type-display text-mega leading-[0.86]">
          {paid ? <span className="text-film">{t('title')}</span> : t('title')}
        </h1>
        <p role="status" aria-live="polite" className="max-w-[44ch] text-xl text-ash">
          {state === 'paid' ? t('paid', { email: order.email }) : t(state)}
        </p>
        {paid && (
          <div className="hairline mt-6 max-w-[52ch] border-t pt-6">
            <h2 className="type-label mb-3">{t('next')}</h2>
            <p className="text-ash">{t('nextBody')}</p>
          </div>
        )}
        <Link
          href="/products"
          className="type-label mt-4 w-fit rounded-full border border-hairline-strong px-7 py-4 text-bone!"
        >
          {t('continue')} →
        </Link>
      </div>

      <div className="grid content-start gap-8 rounded-sm border border-hairline p-6">
        <div>
          <h2 className="type-label mb-4">{t('items')}</h2>
          <ul className="grid gap-3">
            {order.order_items.map((i) => (
              <li key={i.id} className="flex justify-between gap-4">
                <span>
                  {i.name}{' '}
                  <span className="text-ash">
                    · {i.variant_label} × {i.qty}
                  </span>
                </span>
                <span className="type-data">{fmt(i.line_total_ore)}</span>
              </li>
            ))}
          </ul>
        </div>
        <dl className="type-data hairline grid grid-cols-[1fr_auto] gap-y-2 border-t pt-4 text-sm">
          <dt className="text-ash">{tc('subtotal')}</dt>
          <dd>{fmt(order.subtotal_ore)}</dd>
          {order.discount_ore > 0 && (
            <>
              <dt className="text-ash">{t('discount')}</dt>
              <dd>−{fmt(order.discount_ore)}</dd>
            </>
          )}
          <dt className="text-ash">{tc('shipping')}</dt>
          <dd>{order.shipping_ore === 0 ? tc('freeShipping') : fmt(order.shipping_ore)}</dd>
          <dt className="mt-2 text-base">{tc('total')}</dt>
          <dd className="mt-2 text-base">{fmt(order.total_ore)}</dd>
          <dt className="col-span-2 text-ash-dim">
            {tc('vatIncluded', { amount: fmt(order.tax_ore) })}
          </dt>
        </dl>
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
      </div>
    </section>
  )
}
