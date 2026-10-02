import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { completeTestPayment } from '@/app/actions/test-payment'
import type { Locale } from '@/i18n/routing'
import { formatPrice } from '@/lib/commerce'
import { availablePaymentMethods } from '@/lib/env.server'
import { getOrderForCustomer } from '@/lib/orders'
import { verifyOrder } from '@/lib/security/tokens'

export const metadata: Metadata = { robots: { index: false, follow: false } }

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ ordre?: string; t?: string }>
}

export default async function TestPaymentPage({ params, searchParams }: Props) {
  const { locale: l } = await params
  const locale = l as Locale
  setRequestLocale(locale)
  const { ordre, t: token } = await searchParams
  if (!availablePaymentMethods().includes('test') || !ordre || !verifyOrder(ordre, token))
    notFound()
  const order = await getOrderForCustomer(ordre)
  if (!order || order.payment_provider !== 'test' || order.status !== 'pending') notFound()
  const t = await getTranslations('testPayment')

  return (
    <section className="shell grid min-h-[80vh] content-center gap-8 pt-[var(--header-h)]">
      <p className="type-label">PSP · SANDBOX</p>
      <h1 className="type-display text-display">{t('title')}</h1>
      <p className="max-w-[48ch] text-lg text-ash">{t('body')}</p>
      <p className="type-data text-4xl">{formatPrice(order.total_ore, locale)}</p>
      <form action={completeTestPayment} className="flex flex-wrap gap-4">
        <input type="hidden" name="orderId" value={order.id} />
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="locale" value={locale} />
        <button
          name="outcome"
          value="pay"
          className="type-label rounded-full bg-bone px-7 py-4 text-void!"
        >
          {t('pay')}
        </button>
        <button
          name="outcome"
          value="cancel"
          className="type-label rounded-full border border-hairline-strong px-7 py-4 text-bone!"
        >
          {t('cancel')}
        </button>
      </form>
    </section>
  )
}
