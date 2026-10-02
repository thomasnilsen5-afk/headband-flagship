import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { BundleCard } from '@/components/product/BundleCard'
import { CatalogGrid } from '@/components/catalog/CatalogGrid'
import { getPathname } from '@/i18n/navigation'
import { routing, type Locale } from '@/i18n/routing'
import { getBundles, getCollections, getProducts } from '@/lib/catalog'

export const revalidate = 300

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'catalog' })
  const path = (l: Locale) => getPathname({ href: '/products', locale: l })
  return {
    title: t('title'),
    description: t('lede'),
    alternates: {
      canonical: path(locale as Locale),
      languages: Object.fromEntries(routing.locales.map((l) => [l, path(l)])),
    },
  }
}

export default async function CatalogPage({ params }: Props) {
  const { locale: l } = await params
  const locale = l as Locale
  setRequestLocale(locale)
  const t = await getTranslations('catalog')
  const tp = await getTranslations('product')
  const [products, collections, bundles] = await Promise.all([
    getProducts(locale),
    getCollections(locale),
    getBundles(locale),
  ])

  return (
    <div className="shell pt-[calc(var(--header-h)+6vh)]">
      <header className="mb-14">
        <h1 className="type-display text-mega leading-[0.86]">{t('title')}</h1>
        <p className="mt-6 max-w-[40ch] text-xl text-ash">{t('lede')}</p>
      </header>

      <CatalogGrid
        products={products}
        collections={collections}
        locale={locale}
        copy={{
          all: t('all'),
          inStock: t('inStock'),
          color: t('color'),
          collection: t('collection'),
          sort: t('sort'),
          sortFeatured: t('sortFeatured'),
          sortPriceAsc: t('sortPriceAsc'),
          sortPriceDesc: t('sortPriceDesc'),
          count: t('count', { count: 99 }).replace('99', '{count}'),
          countOne: t('count', { count: 1 }),
          countZero: t('count', { count: 0 }),
          empty: t('empty'),
          clear: t('clear'),
          soldOut: tp('soldOut'),
          lowStock: tp.raw('lowStock') as string,
        }}
      />

      {bundles.length > 0 && (
        <section className="mt-[16vh] border-t border-hairline pt-12" aria-labelledby="sets">
          <h2 id="sets" className="type-display mb-12 text-display">
            {t('bundles')}
          </h2>
          <ul className="grid gap-6 md:grid-cols-2">
            {bundles.map((b) => (
              <li key={b.slug} data-reveal>
                <BundleCard
                  bundle={b}
                  locale={locale}
                  saveLabel={t('bundleSave', { pct: b.discountBp / 100 })}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
