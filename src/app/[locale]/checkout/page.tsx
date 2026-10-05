import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { CheckoutForm } from '@/components/checkout/CheckoutForm'
import { redirect } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { bundleRules, loadCart, toPricingLines } from '@/lib/cart/server'
import { tr } from '@/lib/catalog'
import type { CodeDiscount } from '@/lib/commerce'
import { availablePaymentMethods } from '@/lib/env.server'
import { getUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const metadata: Metadata = { robots: { index: false, follow: false } }

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ avbrutt?: string }> }

export default async function CheckoutPage({ params, searchParams }: Props) {
  const { locale: l } = await params
  const locale = l as Locale
  setRequestLocale(locale)
  const cart = await loadCart(locale)
  if (!cart || cart.items.length === 0) redirect({ href: '/cart', locale })

  const t = await getTranslations('checkout')
  const tc = await getTranslations('cart')
  const db = createAdminClient()
  const [{ data: rateRows }, rules] = await Promise.all([
    db
      .from('shipping_rates')
      .select('code, zone, name, price_ore, free_over_ore, eta_days_min, eta_days_max, position')
      .eq('is_active', true)
      .order('position'),
    bundleRules(locale),
  ])
  let discount: CodeDiscount | null = null
  if (cart!.discountCode) {
    const { data: d } = await db.rpc('lookup_discount', { p_code: cart!.discountCode })
    if (d?.id)
      discount = { code: d.code, kind: d.kind, value: d.value, minSubtotalOre: d.min_subtotal_ore }
  }
  const lines = toPricingLines(cart!.items, rules).map(({ item, ...l }) => ({
    ...l,
    name: item.name,
    variantLabel: item.variantLabel,
  }))
  const cancelled = (await searchParams).avbrutt

  return (
    <div className="shell pt-[calc(var(--header-h)+6vh)]">
      <h1 className="type-display mb-6 text-mega leading-[0.86]">{t('title')}</h1>
      {cancelled && (
        <p className="mb-10 rounded-sm border border-hairline p-4 text-ash">{t('cancelled')}</p>
      )}
      <CheckoutForm
        locale={locale}
        lines={lines}
        discount={discount}
        methods={availablePaymentMethods()}
        defaults={await checkoutDefaults(cart!.email)}
        rates={(rateRows ?? []).map((r) => ({
          code: r.code,
          zone: r.zone as 'NO' | 'NORDIC' | 'EU' | 'WORLD',
          name: tr(r.name, locale),
          priceOre: r.price_ore,
          freeOverOre: r.free_over_ore,
          etaDaysMin: r.eta_days_min,
          etaDaysMax: r.eta_days_max,
        }))}
        copy={{
          ...Object.fromEntries(
            [
              'contact',
              'email',
              'phone',
              'delivery',
              'fullName',
              'line1',
              'line2',
              'postalCode',
              'city',
              'country',
              'shippingMethod',
              'free',
              'payment',
              'methodVipps',
              'methodVippsHint',
              'methodStripe',
              'methodStripeHint',
              'methodTest',
              'methodTestHint',
              'termsLink',
              'withdrawalLink',
              'marketing',
              'paying',
              'summary',
              'export',
              'svalbard',
            ].map((k) => [k, t(k)]),
          ),
          days: t.raw('days') as string,
          terms: t.raw('terms') as string,
          pay: t.raw('pay') as string,
        }}
        errors={t.raw('errors') as Record<string, string>}
        totalsCopy={{
          subtotal: tc('subtotal'),
          setDiscount: tc('setDiscount'),
          codeDiscount: tc.raw('codeDiscount') as string,
          shipping: tc('shipping'),
          freeShipping: tc('freeShipping'),
          total: tc('total'),
          vatIncluded: tc.raw('vatIncluded') as string,
        }}
      />
    </div>
  )
}

async function checkoutDefaults(cartEmail: string | null) {
  const user = await getUser()
  if (!user) return { email: cartEmail ?? '' }
  const supabase = await createSupabaseServerClient()
  const { data: a } = await supabase
    .from('addresses')
    .select('full_name, line1, line2, postal_code, city, country, phone')
    .eq('is_default', true)
    .maybeSingle()
  return {
    email: cartEmail ?? user.email ?? '',
    fullName: a?.full_name,
    line1: a?.line1,
    line2: a?.line2 ?? undefined,
    postalCode: a?.postal_code,
    city: a?.city,
    country: a?.country,
    phone: a?.phone ?? undefined,
  }
}
