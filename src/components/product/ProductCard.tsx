import { ObjectBand } from '@/components/home/ObjectBand'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import type { ProductSummary } from '@/lib/catalog'
import { formatPrice, stockState } from '@/lib/commerce'

export type ProductCardLabels = { soldOut: string; lowStock: (count: number) => string }

/** Listing card. Plain component: usable from server pages and the client catalog grid. */
export function ProductCard({
  product: p,
  index,
  locale,
  labels,
  headingLevel = 3,
}: {
  product: ProductSummary
  index: number
  locale: Locale
  labels: ProductCardLabels
  /** h2 where the card list sits directly under the page h1, h3 under a section h2. */
  headingLevel?: 2 | 3
}) {
  const state = stockState(p.available)
  const Heading = headingLevel === 2 ? 'h2' : 'h3'
  return (
    <Link
      href={{ pathname: '/products/[slug]', params: { slug: p.slug } }}
      className="group block"
      data-cursor
    >
      <div className="relative px-[12%] py-[6%]">
        <ObjectBand
          finish={String(p.form.finish ?? 'satin')}
          hex={p.colors[0]?.hex ?? '#c9ccd4'}
          roll={-16 + ((index * 11) % 24)}
        />
        <span className="type-label absolute top-0 left-0">
          {String(index + 1).padStart(2, '0')}
        </span>
        {p.isLimited && <span className="type-label absolute top-0 right-0 text-ichor!">Λ</span>}
      </div>
      <div className="mt-6 flex items-baseline justify-between gap-4 border-t border-hairline pt-5">
        <Heading className="type-display text-3xl tracking-[-0.03em] transition-[font-variation-settings] duration-700 ease-fluid group-hover:[font-variation-settings:'wdth'_70]">
          {p.name}
        </Heading>
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
        <p className={`type-label mt-3 ${state === 'sold_out' ? 'text-ash-dim!' : 'text-ichor!'}`}>
          {state === 'sold_out' ? labels.soldOut : labels.lowStock(p.available)}
        </p>
      )}
    </Link>
  )
}
