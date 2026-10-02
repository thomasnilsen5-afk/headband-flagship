import { getLocale, getTranslations } from 'next-intl/server'
import { ProductCard } from '@/components/product/ProductCard'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { getProducts } from '@/lib/catalog'

export async function Objects() {
  const locale = (await getLocale()) as Locale
  const t = await getTranslations('home.objects')
  const tp = await getTranslations('product')
  const products = await getProducts(locale)

  return (
    <section className="shell py-[14vh]" aria-labelledby="objects-title">
      <div className="mb-20 flex flex-wrap items-end justify-between gap-8">
        <div>
          <p className="type-label mb-6">{t('label')}</p>
          <h2 id="objects-title" className="type-display text-display" data-reveal>
            {t('title')}
          </h2>
        </div>
        <Link
          href="/products"
          className="type-label border-b border-hairline-strong pb-1 text-bone!"
        >
          {t('all')}
        </Link>
      </div>

      <ul className="grid gap-x-6 gap-y-20 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p, i) => (
          <li key={p.id} data-reveal>
            <ProductCard
              product={p}
              index={i}
              locale={locale}
              labels={{ soldOut: tp('soldOut'), lowStock: (count) => tp('lowStock', { count }) }}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
