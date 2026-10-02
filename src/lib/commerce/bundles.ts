import type { PricingLine } from './pricing'

export type BundleRule = {
  slug: string
  discountBp: number
  /** One unit of each product makes one set. */
  productIds: string[]
}

export type CartLineInput = Omit<PricingLine, 'bundleGroup' | 'bundleDiscountBp'> & {
  productId: string
}

export type BundledLine = PricingLine & { productId: string; bundleSlug: string | null }

/**
 * Sets are applied automatically: if the cart holds one of each product in a set, those units
 * get the set discount. Greedy by discount (best for the customer first), one unit per product
 * per set instance. Lines are split so bundled and full-price units price separately.
 * Pure and deterministic; the result feeds straight into priceCart().
 */
export function applyBundles(lines: CartLineInput[], bundles: BundleRule[]): BundledLine[] {
  // Units still available per product, by line, most expensive first (customer-friendly).
  const pool = new Map<string, { index: number; left: number }[]>()
  lines.forEach((l, index) => {
    const list = pool.get(l.productId) ?? []
    list.push({ index, left: l.qty })
    pool.set(l.productId, list)
  })
  for (const list of pool.values()) {
    list.sort((a, b) => (lines[b.index]?.listPriceOre ?? 0) - (lines[a.index]?.listPriceOre ?? 0))
  }

  // bundled[index][slug] = units of that line used in that set
  const bundled = lines.map(() => new Map<string, number>())
  const sorted = [...bundles]
    .filter((b) => b.productIds.length > 1 && b.discountBp > 0)
    .sort((a, b) => b.discountBp - a.discountBp || a.slug.localeCompare(b.slug))

  for (const bundle of sorted) {
    for (;;) {
      const picks = bundle.productIds.map((pid) => pool.get(pid)?.find((e) => e.left > 0))
      if (picks.some((p) => !p)) break
      for (const p of picks) {
        p!.left--
        const m = bundled[p!.index]!
        m.set(bundle.slug, (m.get(bundle.slug) ?? 0) + 1)
      }
    }
  }

  const discountBySlug = new Map(sorted.map((b) => [b.slug, b.discountBp]))
  const out: BundledLine[] = []
  lines.forEach((line, i) => {
    let rest = line.qty
    for (const [slug, units] of bundled[i]!) {
      rest -= units
      out.push({
        ...line,
        qty: units,
        bundleGroup: slug,
        bundleSlug: slug,
        bundleDiscountBp: discountBySlug.get(slug) ?? 0,
      })
    }
    if (rest > 0)
      out.push({ ...line, qty: rest, bundleGroup: null, bundleSlug: null, bundleDiscountBp: 0 })
  })
  return out
}
