import { describe, expect, it } from 'vitest'
import { applyBundles, priceCart, type BundleRule, type CartLineInput } from '@/lib/commerce'

const dyad: BundleRule = { slug: 'dyad', discountBp: 1500, productIds: ['nacre', 'isobar'] }
const triad: BundleRule = {
  slug: 'triad',
  discountBp: 2000,
  productIds: ['nacre', 'isobar', 'fathom'],
}
const line = (productId: string, qty: number, listPriceOre: number): CartLineInput => ({
  variantId: `${productId}-v`,
  productId,
  qty,
  listPriceOre,
  vatRateBp: 2500,
})

describe('applyBundles', () => {
  it('discounts a complete set automatically', () => {
    const out = applyBundles([line('nacre', 1, 69000), line('isobar', 1, 59000)], [dyad])
    expect(out.map((l) => [l.productId, l.qty, l.bundleSlug, l.bundleDiscountBp])).toEqual([
      ['nacre', 1, 'dyad', 1500],
      ['isobar', 1, 'dyad', 1500],
    ])
    expect(priceCart({ lines: out, vatMode: 'domestic' }).totalOre).toBe(108800)
  })

  it('splits lines so only matched units are discounted', () => {
    const out = applyBundles([line('nacre', 2, 69000), line('isobar', 1, 59000)], [dyad])
    expect(out.map((l) => [l.productId, l.qty, l.bundleSlug])).toEqual([
      ['nacre', 1, 'dyad'],
      ['nacre', 1, null],
      ['isobar', 1, 'dyad'],
    ])
  })

  it('prefers the bigger discount, then fills smaller sets with what is left', () => {
    const out = applyBundles(
      [line('nacre', 2, 69000), line('isobar', 2, 59000), line('fathom', 1, 79000)],
      [dyad, triad],
    )
    const units = (slug: string | null) =>
      out.filter((l) => l.bundleSlug === slug).reduce((a, l) => a + l.qty, 0)
    expect(units('triad')).toBe(3)
    expect(units('dyad')).toBe(2)
    expect(units(null)).toBe(0)
  })

  it('leaves carts without a full set untouched', () => {
    const out = applyBundles([line('nacre', 3, 69000)], [dyad, triad])
    expect(out).toHaveLength(1)
    expect(out[0]?.bundleSlug).toBeNull()
  })

  it('never changes the number of units', () => {
    const lines = [
      line('nacre', 3, 69000),
      line('isobar', 2, 59000),
      line('fathom', 4, 79000),
      line('serac', 1, 89000),
    ]
    const out = applyBundles(lines, [dyad, triad])
    for (const l of lines) {
      expect(out.filter((o) => o.productId === l.productId).reduce((a, o) => a + o.qty, 0)).toBe(
        l.qty,
      )
    }
  })
})
