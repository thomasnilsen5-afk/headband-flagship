import type { Ore } from './money'

export type ShippingZone = 'NO' | 'NORDIC' | 'EU' | 'WORLD'

const NORDIC = new Set(['SE', 'DK', 'FI', 'IS', 'FO', 'AX', 'GL'])
const EU = new Set([
  'AT',
  'BE',
  'BG',
  'HR',
  'CY',
  'CZ',
  'EE',
  'FR',
  'DE',
  'GR',
  'HU',
  'IE',
  'IT',
  'LV',
  'LT',
  'LU',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SK',
  'SI',
  'ES',
  'CH',
  'LI',
  'GB',
])

export function zoneForCountry(country: string): ShippingZone {
  const c = country.toUpperCase()
  if (c === 'NO' || c === 'SJ') return 'NO'
  if (NORDIC.has(c)) return 'NORDIC'
  if (EU.has(c)) return 'EU'
  return 'WORLD'
}

export type ShippingRate = {
  code: string
  zone: ShippingZone
  priceOre: Ore
  freeOverOre: Ore | null
  etaDaysMin: number
  etaDaysMax: number
}

/** Shipping price for a rate given the merchandise total after discounts. */
export function shippingPrice(
  rate: ShippingRate,
  merchandiseOre: Ore,
  freeShippingCode = false,
): Ore {
  if (freeShippingCode) return 0
  if (rate.freeOverOre !== null && merchandiseOre >= rate.freeOverOre) return 0
  return rate.priceOre
}

export function availableRates(rates: ShippingRate[], country: string): ShippingRate[] {
  const zone = zoneForCountry(country)
  return rates.filter((r) => r.zone === zone)
}
