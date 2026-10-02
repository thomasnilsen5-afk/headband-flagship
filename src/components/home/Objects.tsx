import { getLocale, getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { getProducts } from '@/lib/catalog'
import { formatPrice, stockState } from '@/lib/commerce'
import { ObjectBand } from './ObjectBand'

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
        {products.map((p, i) => {
          const state = stockState(p.available)
          const index = String(i + 1).padStart(2, '0')
          return (
            <li key={p.id} data-reveal>
              <Link
                href={{ pathname: '/products/[slug]', params: { slug: p.slug } }}
                className="group block"
                data-cursor
              >
                <div className="relative px-[12%] py-[6%]">
                  <ObjectBand
                    finish={String(p.form.finish ?? 'satin')}
                    hex={p.colors[0]?.hex ?? '#c9ccd4'}
                    roll={-16 + ((i * 11) % 24)}
                  />
                  <span className="type-label absolute top-0 left-0">{index}</span>
                  {p.isLimited && (
                    <span className="type-label absolute top-0 right-0 text-ichor!">Λ</span>
                  )}
                </div>
                <div className="mt-6 flex items-baseline justify-between gap-4 border-t border-hairline pt-5">
                  <h3 className="type-display text-3xl tracking-[-0.03em] transition-[font-variation-settings] duration-700 ease-fluid group-hover:[font-variation-settings:'wdth'_70]">
                    {p.name}
                  </h3>
                  <p className="type-data text-sm text-ash">
                    {p.compareAtOre && (
                      <s className="mr-2 text-ash-dim">{formatPrice(p.compareAtOre, locale)}</s>
                    )}
                    {formatPrice(p.priceOre, locale)}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between gap-4">
                  <p className="text-ash">{p.tagline}</p>
                  <ul className="flex gap-1.5" aria-label={p.colors.map((c) => c.name).join(', ')}>
                    {p.colors.map((c) => (
                      <li
                        key={c.key}
                        className="h-2.5 w-2.5 rounded-full ring-1 ring-hairline-strong"
                        style={{ background: c.hex }}
                      />
                    ))}
                  </ul>
                </div>
                {state !== 'in_stock' && (
                  <p
                    className={`type-label mt-3 ${state === 'sold_out' ? 'text-ash-dim!' : 'text-ichor!'}`}
                  >
                    {state === 'sold_out' ? tp('soldOut') : tp('lowStock', { count: p.available })}
                  </p>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
