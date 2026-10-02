import { roundDiv, type Ore } from './money'

/** VAT rates are basis points: 2500 = 25 % (standard Norwegian MVA). */
export const STANDARD_VAT_BP = 2500

/** VAT contained in a gross (VAT-inclusive) amount. 690 kr @ 25 % → 138 kr. */
export function vatFromGross(gross: Ore, rateBp: number): Ore {
  if (rateBp === 0 || gross === 0) return 0
  return roundDiv(gross * rateBp, 10_000 + rateBp)
}

export function netFromGross(gross: Ore, rateBp: number): Ore {
  return gross - vatFromGross(gross, rateBp)
}

export type VatMode = 'domestic' | 'export'

/**
 * Domestic sales carry Norwegian MVA. Goods shipped out of Norway are zero-rated exports
 * (merverdiavgiftsloven § 6-21). Svalbard (postcodes 9170–9179) is outside the MVA area.
 */
export function vatModeFor(country: string, postalCode?: string): VatMode {
  if (country.toUpperCase() !== 'NO') return 'export'
  if (postalCode && /^917\d$/.test(postalCode.trim())) return 'export'
  return 'domestic'
}
