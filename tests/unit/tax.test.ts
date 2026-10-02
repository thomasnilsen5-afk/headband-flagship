import { describe, expect, it } from 'vitest'
import { netFromGross, roundDiv, vatFromGross, vatModeFor } from '@/lib/commerce'

describe('roundDiv', () => {
  it('rounds half up', () => {
    expect(roundDiv(5, 2)).toBe(3)
    expect(roundDiv(4, 2)).toBe(2)
    expect(roundDiv(1, 3)).toBe(0)
    expect(roundDiv(2, 3)).toBe(1)
  })
  it('rejects invalid input', () => {
    expect(() => roundDiv(1, 0)).toThrow()
    expect(() => roundDiv(-1, 2)).toThrow()
  })
})

describe('VAT (MVA)', () => {
  it('extracts 25 % MVA from gross prices', () => {
    expect(vatFromGross(69000, 2500)).toBe(13800) // 690 kr → 138 kr
    expect(vatFromGross(12500, 2500)).toBe(2500)
    expect(vatFromGross(100, 2500)).toBe(20)
    expect(vatFromGross(1, 2500)).toBe(0)
    expect(vatFromGross(3, 2500)).toBe(1) // 0.6 → 1
  })
  it('handles zero rate and zero amount', () => {
    expect(vatFromGross(69000, 0)).toBe(0)
    expect(vatFromGross(0, 2500)).toBe(0)
  })
  it('net + vat always equals gross', () => {
    for (let gross = 0; gross < 5000; gross += 7) {
      expect(netFromGross(gross, 2500) + vatFromGross(gross, 2500)).toBe(gross)
    }
  })
  it('applies other rates (15 % food, 12 % transport) correctly', () => {
    expect(vatFromGross(11500, 1500)).toBe(1500)
    expect(vatFromGross(11200, 1200)).toBe(1200)
  })
})

describe('vatModeFor', () => {
  it('is domestic for mainland Norway', () => {
    expect(vatModeFor('NO', '0150')).toBe('domestic')
    expect(vatModeFor('no')).toBe('domestic')
  })
  it('is export outside Norway', () => {
    expect(vatModeFor('SE', '11122')).toBe('export')
    expect(vatModeFor('US')).toBe('export')
  })
  it('treats Svalbard as outside the MVA area', () => {
    expect(vatModeFor('NO', '9170')).toBe('export')
    expect(vatModeFor('NO', '9171')).toBe('export')
    expect(vatModeFor('NO', '9180')).toBe('domestic')
  })
})
