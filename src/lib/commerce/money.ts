/**
 * Money is always an integer number of øre (1 NOK = 100 øre). Never use floats for money.
 */
export type Ore = number

export const ORE_PER_NOK = 100

export function assertOre(value: number, label = 'amount'): asserts value is Ore {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative integer number of øre, got ${value}`)
  }
}

/** Half-up rounding for non-negative rationals expressed as numerator/denominator. */
export function roundDiv(numerator: number, denominator: number): number {
  if (denominator <= 0) throw new RangeError('denominator must be positive')
  if (numerator < 0) throw new RangeError('numerator must be non-negative')
  return Math.floor((2 * numerator + denominator) / (2 * denominator))
}

const formatters = new Map<string, Intl.NumberFormat>()

/** "690 kr" (nb) / "NOK 690" (en). Shows øre only when they are non-zero. */
export function formatPrice(ore: Ore, locale: 'nb' | 'en' = 'nb'): string {
  const hasOre = ore % ORE_PER_NOK !== 0
  const key = `${locale}:${hasOre}`
  let fmt = formatters.get(key)
  if (!fmt) {
    fmt = new Intl.NumberFormat(locale === 'nb' ? 'nb-NO' : 'en-GB', {
      style: 'currency',
      currency: 'NOK',
      currencyDisplay: locale === 'nb' ? 'symbol' : 'code',
      minimumFractionDigits: hasOre ? 2 : 0,
      maximumFractionDigits: 2,
    })
    formatters.set(key, fmt)
  }
  // nb-NO puts "kr" first; Norwegian retail convention is "690 kr".
  const out = fmt.format(ore / ORE_PER_NOK).replace(/ /g, ' ')
  return locale === 'nb' ? out.replace(/^kr\s?(.*)$/, '$1 kr') : out
}
