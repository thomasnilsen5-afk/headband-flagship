import { describe, expect, it } from 'vitest'
import { assertOre, formatPrice } from '@/lib/commerce'

describe('formatPrice', () => {
  it('formats whole kroner in Norwegian retail style', () => {
    expect(formatPrice(69000, 'nb')).toBe('690 kr')
    expect(formatPrice(149000, 'nb')).toBe('1 490 kr')
  })
  it('shows øre only when present', () => {
    expect(formatPrice(69050, 'nb')).toBe('690,50 kr')
  })
  it('formats English with currency code', () => {
    expect(formatPrice(149000, 'en')).toBe('NOK 1,490')
  })
})

describe('assertOre', () => {
  it('accepts non-negative integers', () => {
    expect(() => assertOre(0)).not.toThrow()
    expect(() => assertOre(69000)).not.toThrow()
  })
  it('rejects floats, negatives and NaN', () => {
    expect(() => assertOre(1.5)).toThrow()
    expect(() => assertOre(-1)).toThrow()
    expect(() => assertOre(Number.NaN)).toThrow()
  })
})
