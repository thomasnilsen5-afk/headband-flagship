import { ObjectBand } from '@/components/home/ObjectBand'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import type { BundleSummary } from '@/lib/catalog'
import { formatPrice, priceCart } from '@/lib/commerce'

/** A set with its real price, computed by the same engine checkout uses. */
export function BundleCard({
  bundle: b,
  locale,
  saveLabel,
}: {
  bundle: BundleSummary
  locale: Locale
  saveLabel: string
}) {
  const priced = priceCart({
    vatMode: 'domestic',
    lines: b.products.map((p) => ({
      variantId: p.slug,
      listPriceOre: p.priceOre,
      qty: 1,
      vatRateBp: 2500,
      bundleDiscountBp: b.discountBp,
    })),
  })
  return (
    <div className="rounded-sm border border-hairline p-8">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="type-display text-4xl">{b.name}</h3>
        <p className="type-label text-ichor!">{saveLabel}</p>
      </div>
      <p className="mt-3 text-ash">{b.description}</p>
      <ul className="mt-8 grid grid-cols-3 gap-4">
        {b.products.map((p, i) => (
          <li key={p.slug}>
            <Link
              href={{ pathname: '/products/[slug]', params: { slug: p.slug } }}
              className="block"
            >
              <ObjectBand finish={p.finish} hex={p.hex} roll={-12 + i * 9} />
              <span className="type-label mt-2 block text-center">{p.name}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="type-data mt-8 text-right">
        <s className="mr-3 text-ash-dim">{formatPrice(priced.subtotalOre, locale)}</s>
        {formatPrice(priced.totalOre, locale)}
      </p>
    </div>
  )
}
