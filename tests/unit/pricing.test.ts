import { describe, expect, it } from 'vitest'
import {
  allocate,
  priceCart,
  vatFromGross,
  type PricingLine,
  type ShippingRate,
} from '@/lib/commerce'

const mailbox: ShippingRate = {
  code: 'posten_mailbox',
  zone: 'NO',
  priceOre: 4900,
  freeOverOre: 99900,
  etaDaysMin: 2,
  etaDaysMax: 4,
}
const eu: ShippingRate = {
  code: 'bring_eu',
  zone: 'EU',
  priceOre: 19900,
  freeOverOre: 249900,
  etaDaysMin: 3,
  etaDaysMax: 7,
}

const nacre = (qty = 1, extra: Partial<PricingLine> = {}): PricingLine => ({
  variantId: 'nacre',
  listPriceOre: 69000,
  qty,
  vatRateBp: 2500,
  ...extra,
})
const isobar = (qty = 1, extra: Partial<PricingLine> = {}): PricingLine => ({
  variantId: 'isobar',
  listPriceOre: 59000,
  qty,
  vatRateBp: 2500,
  ...extra,
})

describe('allocate', () => {
  it('splits exactly and proportionally', () => {
    expect(allocate(100, [1, 1, 1])).toEqual([34, 33, 33])
    expect(allocate(10, [3, 1])).toEqual([8, 2]) // 7.5 / 2.5 → tie broken by order
    expect(allocate(0, [5, 5])).toEqual([0, 0])
    expect(allocate(5, [0, 0])).toEqual([0, 0])
  })
  it('always sums to the amount', () => {
    expect(allocate(11, [5, 5]).reduce((a, b) => a + b, 0)).toBe(11)
    expect(allocate(7, [1, 2, 3, 4]).reduce((a, b) => a + b, 0)).toBe(7)
  })
})

describe('priceCart — domestic', () => {
  it('prices a single line with shipping and 25 % MVA', () => {
    const r = priceCart({ lines: [nacre()], vatMode: 'domestic', shippingRate: mailbox })
    expect(r.subtotalOre).toBe(69000)
    expect(r.shippingOre).toBe(4900)
    expect(r.totalOre).toBe(73900)
    expect(r.taxOre).toBe(13800 + 980)
  })

  it('gives free shipping above the threshold', () => {
    const r = priceCart({
      lines: [nacre(1), isobar(1)],
      vatMode: 'domestic',
      shippingRate: mailbox,
    })
    expect(r.subtotalOre).toBe(128000)
    expect(r.shippingOre).toBe(0)
    expect(r.shippingTaxOre).toBe(0)
  })

  it('applies a bundle discount per line and reduces the VAT base', () => {
    const g = 'bundle-1'
    const r = priceCart({
      lines: [
        nacre(1, { bundleGroup: g, bundleDiscountBp: 1500 }),
        isobar(1, { bundleGroup: g, bundleDiscountBp: 1500 }),
      ],
      vatMode: 'domestic',
    })
    expect(r.bundleDiscountOre).toBe(10350 + 8850)
    expect(r.lines[0]?.lineTotalOre).toBe(58650)
    expect(r.lines[0]?.taxOre).toBe(vatFromGross(58650, 2500))
    expect(r.totalOre).toBe(128000 - 19200)
  })

  it('stacks a percent code on top of bundles and allocates it across lines', () => {
    const r = priceCart({
      lines: [nacre(1, { bundleGroup: 'b', bundleDiscountBp: 1500 }), isobar(2)],
      vatMode: 'domestic',
      discount: { code: 'VELKOMMEN10', kind: 'percent', value: 1000, minSubtotalOre: 0 },
    })
    const afterBundles = 69000 - 10350 + 118000
    expect(r.codeDiscountOre).toBe(Math.round(afterBundles / 10))
    expect(r.lines.reduce((a, l) => a + l.codeDiscountOre, 0)).toBe(r.codeDiscountOre)
    expect(r.discount).toEqual({ code: 'VELKOMMEN10', applied: true })
  })

  it('caps a fixed discount at the merchandise value', () => {
    const r = priceCart({
      lines: [isobar()],
      vatMode: 'domestic',
      discount: { code: 'GIFT', kind: 'fixed', value: 100000, minSubtotalOre: 0 },
    })
    expect(r.codeDiscountOre).toBe(59000)
    expect(r.merchandiseOre).toBe(0)
    expect(r.taxOre).toBe(0)
  })

  it('rejects a code below its minimum subtotal without failing the cart', () => {
    const r = priceCart({
      lines: [isobar()],
      vatMode: 'domestic',
      shippingRate: mailbox,
      discount: { code: 'FRIFRAKT', kind: 'free_shipping', value: 0, minSubtotalOre: 60000 },
    })
    expect(r.discount).toEqual({ code: 'FRIFRAKT', applied: false, reason: 'min_subtotal' })
    expect(r.shippingOre).toBe(4900)
  })

  it('applies a free-shipping code', () => {
    const r = priceCart({
      lines: [isobar()],
      vatMode: 'domestic',
      shippingRate: mailbox,
      discount: { code: 'FRIFRAKT', kind: 'free_shipping', value: 0, minSubtotalOre: 50000 },
    })
    expect(r.shippingOre).toBe(0)
    expect(r.discountOre).toBe(0)
  })

  it('validates quantities and prices', () => {
    expect(() => priceCart({ lines: [nacre(0)], vatMode: 'domestic' })).toThrow()
    expect(() => priceCart({ lines: [nacre(11)], vatMode: 'domestic' })).toThrow()
    expect(() =>
      priceCart({ lines: [{ ...nacre(), listPriceOre: 10.5 }], vatMode: 'domestic' }),
    ).toThrow()
  })
})

describe('priceCart — export (international)', () => {
  it('strips Norwegian MVA and charges zero VAT', () => {
    const r = priceCart({ lines: [nacre()], vatMode: 'export', shippingRate: eu })
    expect(r.lines[0]?.unitPriceOre).toBe(55200)
    expect(r.lines[0]?.appliedVatRateBp).toBe(0)
    expect(r.taxOre).toBe(0)
    expect(r.totalOre).toBe(55200 + 19900)
  })
})

describe('priceCart — invariants (randomised)', () => {
  // Deterministic PRNG so failures are reproducible.
  let seed = 42
  const rand = (n: number) => {
    seed = (seed * 1103515245 + 12345) % 2147483648
    return seed % n
  }

  it('always reconciles for 2 000 random carts', () => {
    for (let i = 0; i < 2000; i++) {
      const lines: PricingLine[] = Array.from({ length: 1 + rand(4) }, (_, j) => ({
        variantId: `v${j}`,
        listPriceOre: (1 + rand(3000)) * 100 + rand(100),
        qty: 1 + rand(10),
        vatRateBp: 2500,
        bundleDiscountBp: rand(3) === 0 ? 1500 : 0,
      }))
      const kinds = ['percent', 'fixed', 'free_shipping'] as const
      const discount = rand(2)
        ? {
            code: 'X',
            kind: kinds[rand(3)]!,
            value: 1 + rand(5000) * 10,
            minSubtotalOre: rand(2) * 50000,
          }
        : null
      const r = priceCart({
        lines,
        vatMode: rand(4) ? 'domestic' : 'export',
        discount,
        shippingRate: mailbox,
      })

      expect(r.totalOre).toBe(r.subtotalOre - r.discountOre + r.shippingOre)
      expect(r.subtotalOre).toBe(r.lines.reduce((a, l) => a + l.unitPriceOre * l.qty, 0))
      expect(r.discountOre).toBe(r.lines.reduce((a, l) => a + l.discountOre, 0))
      for (const l of r.lines) {
        expect(l.lineTotalOre).toBe(l.unitPriceOre * l.qty - l.discountOre)
        expect(l.lineTotalOre).toBeGreaterThanOrEqual(0)
        expect(Number.isInteger(l.taxOre)).toBe(true)
      }
      expect(r.totalOre).toBeGreaterThanOrEqual(0)
      expect(r.taxOre).toBeLessThanOrEqual(r.totalOre)
    }
  })
})
