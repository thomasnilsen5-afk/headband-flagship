import { describe, expect, it } from 'vitest'
import {
  availableRates,
  dropPhase,
  maxPurchasable,
  stockState,
  zoneForCountry,
  shippingPrice,
} from '@/lib/commerce'

describe('stockState', () => {
  it('classifies stock levels', () => {
    expect(stockState(0)).toBe('sold_out')
    expect(stockState(-2)).toBe('sold_out')
    expect(stockState(3)).toBe('low')
    expect(stockState(5)).toBe('low')
    expect(stockState(6)).toBe('in_stock')
    expect(stockState(2, 1)).toBe('in_stock')
  })
})

describe('maxPurchasable', () => {
  it('is bounded by stock and cart cap', () => {
    expect(maxPurchasable({ available: 3 })).toBe(3)
    expect(maxPurchasable({ available: 40 })).toBe(10)
    expect(maxPurchasable({ available: 40, inCart: 8 })).toBe(2)
    expect(maxPurchasable({ available: 0 })).toBe(0)
  })
  it('respects drop limits including previous purchases', () => {
    expect(maxPurchasable({ available: 300, dropLimit: 2 })).toBe(2)
    expect(maxPurchasable({ available: 300, dropLimit: 2, alreadyPurchased: 1 })).toBe(1)
    expect(maxPurchasable({ available: 300, dropLimit: 2, alreadyPurchased: 2 })).toBe(0)
    expect(maxPurchasable({ available: 300, dropLimit: 2, inCart: 1 })).toBe(1)
  })
})

describe('dropPhase', () => {
  const start = new Date('2026-10-11T12:00:00Z')
  const end = new Date('2026-10-12T12:00:00Z')
  it('moves through upcoming → live → ended', () => {
    expect(dropPhase(start, end, new Date('2026-10-11T11:59:59Z'))).toBe('upcoming')
    expect(dropPhase(start, end, start)).toBe('live')
    expect(dropPhase(start, end, end)).toBe('ended')
    expect(dropPhase(start, null, new Date('2030-01-01'))).toBe('live')
  })
})

describe('shipping', () => {
  it('maps countries to zones', () => {
    expect(zoneForCountry('NO')).toBe('NO')
    expect(zoneForCountry('SJ')).toBe('NO')
    expect(zoneForCountry('se')).toBe('NORDIC')
    expect(zoneForCountry('DE')).toBe('EU')
    expect(zoneForCountry('US')).toBe('WORLD')
  })
  const rate = {
    code: 'posten_mailbox',
    zone: 'NO' as const,
    priceOre: 4900,
    freeOverOre: 99900,
    etaDaysMin: 2,
    etaDaysMax: 4,
  }
  it('is free over the threshold or with a free-shipping code', () => {
    expect(shippingPrice(rate, 99899)).toBe(4900)
    expect(shippingPrice(rate, 99900)).toBe(0)
    expect(shippingPrice(rate, 100, true)).toBe(0)
    expect(shippingPrice({ ...rate, freeOverOre: null }, 10_000_000)).toBe(4900)
  })
  it('lists only the rates for the destination zone', () => {
    const world = { ...rate, code: 'posten_world', zone: 'WORLD' as const }
    expect(availableRates([rate, world], 'NO').map((r) => r.code)).toEqual(['posten_mailbox'])
    expect(availableRates([rate, world], 'JP').map((r) => r.code)).toEqual(['posten_world'])
  })
})
