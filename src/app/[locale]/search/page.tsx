import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ProductCard } from '@/components/product/ProductCard'
import { getPathname } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { searchProducts } from '@/lib/catalog'

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'search' })
  // Result pages are not indexed; the canonical is the empty search page.
  return {
    title: t('title'),
    robots: { index: false, follow: true },
    alternates: { canonical: getPathname({ href: '/search', locale: locale as Locale }) },
  }
}

export default async function SearchPage({ params, searchParams }: Props) {
  const { locale: l } = await params
  const locale = l as Locale
  setRequestLocale(locale)
  const t = await getTranslations('search')
  const tp = await getTranslations('product')
  const q = ((await searchParams).q ?? '').slice(0, 80)
  const results = q ? await searchProducts(q, locale) : []
  const action = getPathname({ href: '/search', locale })

  return (
    <div className="shell min-h-[70vh] pt-[calc(var(--header-h)+6vh)]">
      <h1 className="type-display text-mega leading-[0.86]">{t('title')}</h1>
      <form role="search" action={action} method="get" className="mt-12 max-w-3xl">
        <label htmlFor="q" className="type-label">
          {t('label')}
        </label>
        <div className="mt-3 flex gap-2">
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            minLength={2}
            maxLength={80}
            autoComplete="off"
            placeholder={t('placeholder')}
            className="min-w-0 flex-1 border-b border-hairline-strong bg-transparent py-4 text-3xl text-bone placeholder:text-ash-dim focus:border-ichor focus:outline-none"
          />
          <button
            type="submit"
            className="type-label shrink-0 rounded-full bg-bone px-7 text-void!"
          >
            {t('submit')}
          </button>
        </div>
        <p className="mt-3 text-sm text-ash">{t('hint')}</p>
      </form>

      {q && (
        <section className="mt-16" aria-live="polite">
          <p className="type-label mb-10">{t('results', { count: results.length, q })}</p>
          <ul
            data-testid="product-grid"
            className="grid gap-x-6 gap-y-20 sm:grid-cols-2 lg:grid-cols-3"
          >
            {results.map((p, i) => (
              <li key={p.id}>
                <ProductCard
                  product={p}
                  index={i}
                  locale={locale}
                  headingLevel={2}
                  labels={{
                    soldOut: tp('soldOut'),
                    lowStock: (count) => tp('lowStock', { count }),
                  }}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
