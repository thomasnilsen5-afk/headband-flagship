import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { updateCartItem } from '@/app/actions/cart'
import { DiscountForm } from '@/components/cart/DiscountForm'
import { Totals } from '@/components/checkout/Totals'
import { ObjectBand } from '@/components/home/ObjectBand'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { bundleRules, loadCart, toPricingLines } from '@/lib/cart/server'
import { formatPrice, priceCart, type CodeDiscount } from '@/lib/commerce'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata: Metadata = { robots: { index: false, follow: false } }

type Props = { params: Promise<{ locale: string }> }

export default async function CartPage({ params }: Props) {
  const { locale: l } = await params
  const locale = l as Locale
  setRequestLocale(locale)
  const t = await getTranslations('cart')
  const cart = await loadCart(locale)

  if (!cart || cart.items.length === 0) {
    return (
      <section className="shell grid min-h-[70vh] content-center gap-8 pt-[var(--header-h)]">
        <h1 className="type-display text-mega leading-[0.86]">{t('title')}</h1>
        <p className="text-xl text-ash">{t('empty')}</p>
        <Link
          href="/products"
          className="type-label w-fit rounded-full bg-bone px-7 py-4 text-void!"
        >
          {t('emptyCta')} →
        </Link>
      </section>
    )
  }

  let discount: CodeDiscount | null = null
  if (cart.discountCode) {
    const { data: d } = await createAdminClient().rpc('lookup_discount', {
      p_code: cart.discountCode,
    })
    if (d?.id)
      discount = { code: d.code, kind: d.kind, value: d.value, minSubtotalOre: d.min_subtotal_ore }
  }
  const lines = toPricingLines(cart.items, await bundleRules(locale))
  const priced = priceCart({ lines, vatMode: 'domestic', discount })

  return (
    <div className="shell pt-[calc(var(--header-h)+6vh)]">
      <h1 className="type-display mb-14 text-mega leading-[0.86]">{t('title')}</h1>
      <div className="grid gap-16 lg:grid-cols-12">
        <ul className="divide-y divide-hairline border-y border-hairline lg:col-span-7">
          {priced.lines.map((line) => {
            const item = line.item
            return (
              <li
                key={`${item.id}-${line.bundleGroup ?? 'single'}`}
                className="grid grid-cols-[6rem_1fr_auto] items-center gap-6 py-6"
              >
                <div className="w-24">
                  <ObjectBand finish={item.finish} hex={item.colorHex} />
                </div>
                <div>
                  <Link
                    href={{ pathname: '/products/[slug]', params: { slug: item.slug } }}
                    className="type-display text-2xl"
                  >
                    {item.name}
                  </Link>
                  <p className="mt-1 text-sm text-ash">{item.variantLabel}</p>
                  {line.bundleSlug && (
                    <p className="type-label mt-2 text-ichor!">
                      {t('set', { name: line.bundleSlug.toUpperCase() })}
                    </p>
                  )}
                  {item.available <= 5 && (
                    <p className="type-label mt-2 text-ash-dim!">
                      {t('stockLow', { count: item.available })}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="type-data">
                    {line.discountOre > 0 && (
                      <s className="mr-2 text-ash-dim">{formatPrice(line.subtotalOre, locale)}</s>
                    )}
                    {formatPrice(line.lineTotalOre, locale)}
                  </p>
                  {!line.bundleSlug || line.qty === item.qty ? (
                    <form
                      action={updateCartItem}
                      className="mt-3 flex items-center justify-end gap-1"
                    >
                      <input type="hidden" name="itemId" value={item.id} />
                      <input type="hidden" name="locale" value={locale} />
                      <button
                        name="qty"
                        value={item.qty - 1}
                        aria-label={t('decrease')}
                        className="h-9 w-9 rounded-full border border-hairline-strong"
                      >
                        −
                      </button>
                      <span className="type-data w-8 text-center" aria-label={t('qty')}>
                        {item.qty}
                      </span>
                      <button
                        name="qty"
                        value={item.qty + 1}
                        aria-label={t('increase')}
                        disabled={item.qty >= Math.min(10, item.available)}
                        className="h-9 w-9 rounded-full border border-hairline-strong disabled:opacity-30"
                      >
                        +
                      </button>
                      <button
                        name="qty"
                        value={0}
                        className="type-label ml-3 underline underline-offset-4"
                      >
                        {t('remove')}
                      </button>
                    </form>
                  ) : (
                    <p className="type-label mt-3">× {line.qty}</p>
                  )}
                </div>
              </li>
            )
          })}
        </ul>

        <aside className="space-y-8 lg:col-span-4 lg:col-start-9">
          <DiscountForm
            locale={locale}
            current={priced.discount?.applied ? priced.discount.code : null}
            copy={{
              code: t('code'),
              apply: t('apply'),
              invalid: t('codeInvalid'),
              remove: t('codeRemove'),
              limited: t('limited'),
            }}
          />
          {priced.discount && !priced.discount.applied && discount && (
            <p className="text-sm text-ash">
              {t('codeMin', { amount: formatPrice(discount.minSubtotalOre, locale) })}
            </p>
          )}
          <Totals
            priced={priced}
            locale={locale}
            shippingKnown={false}
            copy={{
              subtotal: t('subtotal'),
              setDiscount: t('setDiscount'),
              codeDiscount: t.raw('codeDiscount') as string,
              shipping: t('shipping'),
              shippingCalc: t('shippingCalc'),
              freeShipping: t('freeShipping'),
              total: t('total'),
              vatIncluded: t.raw('vatIncluded') as string,
            }}
          />
          <Link
            href="/checkout"
            className="type-label block rounded-full bg-bone px-8 py-5 text-center text-void!"
          >
            {t('checkout')} →
          </Link>
        </aside>
      </div>
    </div>
  )
}
