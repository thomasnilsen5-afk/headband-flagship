import { assertOre, roundDiv, type Ore } from './money'
import { shippingPrice, type ShippingRate } from './shipping'
import { netFromGross, STANDARD_VAT_BP, vatFromGross, type VatMode } from './tax'

/**
 * The single source of truth for what a customer pays. Pure and deterministic so it can be
 * unit tested exhaustively; the database (place_order) re-checks the result.
 *
 * Order of operations:
 *   list price → (export: strip MVA) → bundle discount → code discount → shipping → VAT
 * Discounts reduce the VAT base, so VAT is computed per line on the discounted line total.
 */

export type PricingLine = {
  variantId: string
  /** Catalog price incl. MVA. */
  listPriceOre: Ore
  qty: number
  vatRateBp: number
  bundleGroup?: string | null
  /** Bundle discount in basis points (1500 = 15 %). 0 when the line is not in a bundle. */
  bundleDiscountBp?: number
}

export type CodeDiscount = {
  code: string
  kind: 'percent' | 'fixed' | 'free_shipping'
  /** percent: basis points. fixed: øre. free_shipping: ignored. */
  value: number
  minSubtotalOre: Ore
}

export type PricingInput = {
  lines: PricingLine[]
  vatMode: VatMode
  discount?: CodeDiscount | null
  shippingRate?: ShippingRate | null
}

export type PricedLine = PricingLine & {
  unitPriceOre: Ore
  appliedVatRateBp: number
  subtotalOre: Ore
  bundleDiscountOre: Ore
  codeDiscountOre: Ore
  discountOre: Ore
  lineTotalOre: Ore
  taxOre: Ore
}

export type PricingResult = {
  lines: PricedLine[]
  subtotalOre: Ore
  bundleDiscountOre: Ore
  codeDiscountOre: Ore
  discountOre: Ore
  merchandiseOre: Ore
  shippingOre: Ore
  shippingTaxOre: Ore
  taxOre: Ore
  totalOre: Ore
  discount: { code: string; applied: boolean; reason?: 'min_subtotal' } | null
}

export const MAX_LINE_QTY = 10

/**
 * Split `amount` across `weights` proportionally so the parts sum exactly to `amount`
 * (largest-remainder method). Ties go to the earlier line, which keeps results stable.
 */
export function allocate(amount: Ore, weights: number[]): Ore[] {
  const total = weights.reduce((a, b) => a + b, 0)
  if (amount === 0 || total === 0) return weights.map(() => 0)
  const exact = weights.map((w) => (amount * w) / total)
  const parts = exact.map(Math.floor)
  let remainder = amount - parts.reduce((a, b) => a + b, 0)
  const order = exact
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i)
  for (const { i } of order) {
    if (remainder === 0) break
    parts[i] = (parts[i] ?? 0) + 1
    remainder--
  }
  return parts
}

export function priceCart(input: PricingInput): PricingResult {
  const { vatMode } = input

  const base = input.lines.map((line) => {
    assertOre(line.listPriceOre, 'listPriceOre')
    if (!Number.isInteger(line.qty) || line.qty < 1 || line.qty > MAX_LINE_QTY) {
      throw new RangeError(`qty must be 1–${MAX_LINE_QTY}`)
    }
    const bp = line.bundleDiscountBp ?? 0
    if (bp < 0 || bp > 5000) throw new RangeError('bundleDiscountBp out of range')

    const unitPriceOre =
      vatMode === 'export' ? netFromGross(line.listPriceOre, line.vatRateBp) : line.listPriceOre
    const subtotalOre = unitPriceOre * line.qty
    const bundleDiscountOre = bp > 0 ? roundDiv(subtotalOre * bp, 10_000) : 0
    return { line, unitPriceOre, subtotalOre, bundleDiscountOre }
  })

  const subtotalOre = base.reduce((a, l) => a + l.subtotalOre, 0)
  const bundleDiscountOre = base.reduce((a, l) => a + l.bundleDiscountOre, 0)
  const afterBundles = subtotalOre - bundleDiscountOre

  // Code discount
  let codeDiscountOre = 0
  let freeShipping = false
  let discount: PricingResult['discount'] = null
  if (input.discount) {
    const d = input.discount
    if (afterBundles < d.minSubtotalOre) {
      discount = { code: d.code, applied: false, reason: 'min_subtotal' }
    } else {
      discount = { code: d.code, applied: true }
      if (d.kind === 'percent') {
        codeDiscountOre = roundDiv(afterBundles * Math.min(d.value, 10_000), 10_000)
      } else if (d.kind === 'fixed') {
        codeDiscountOre = Math.min(d.value, afterBundles)
      } else {
        freeShipping = true
      }
    }
  }
  const codeShares = allocate(
    codeDiscountOre,
    base.map((l) => l.subtotalOre - l.bundleDiscountOre),
  )

  const lines: PricedLine[] = base.map((l, i) => {
    const code = codeShares[i] ?? 0
    const discountOre = l.bundleDiscountOre + code
    const lineTotalOre = l.subtotalOre - discountOre
    const appliedVatRateBp = vatMode === 'export' ? 0 : l.line.vatRateBp
    return {
      ...l.line,
      unitPriceOre: l.unitPriceOre,
      appliedVatRateBp,
      subtotalOre: l.subtotalOre,
      bundleDiscountOre: l.bundleDiscountOre,
      codeDiscountOre: code,
      discountOre,
      lineTotalOre,
      taxOre: vatFromGross(lineTotalOre, appliedVatRateBp),
    }
  })

  const discountOre = bundleDiscountOre + codeDiscountOre
  const merchandiseOre = subtotalOre - discountOre
  const shippingOre = input.shippingRate
    ? shippingPrice(input.shippingRate, merchandiseOre, freeShipping)
    : 0
  const shippingTaxOre = vatMode === 'domestic' ? vatFromGross(shippingOre, STANDARD_VAT_BP) : 0
  const taxOre = lines.reduce((a, l) => a + l.taxOre, 0) + shippingTaxOre

  return {
    lines,
    subtotalOre,
    bundleDiscountOre,
    codeDiscountOre,
    discountOre,
    merchandiseOre,
    shippingOre,
    shippingTaxOre,
    taxOre,
    totalOre: merchandiseOre + shippingOre,
    discount,
  }
}
