export type StockState = 'in_stock' | 'low' | 'sold_out'

export function stockState(available: number, lowThreshold = 5): StockState {
  if (available <= 0) return 'sold_out'
  if (available <= lowThreshold) return 'low'
  return 'in_stock'
}

/** Max units a customer may add: limited by stock, cart cap and an optional drop limit. */
export function maxPurchasable(opts: {
  available: number
  inCart?: number
  cartCap?: number
  dropLimit?: number | null
  alreadyPurchased?: number
}): number {
  const { available, inCart = 0, cartCap = 10, dropLimit = null, alreadyPurchased = 0 } = opts
  let max = Math.min(available, cartCap) - inCart
  if (dropLimit !== null) max = Math.min(max, dropLimit - alreadyPurchased - inCart)
  return Math.max(0, max)
}

export type DropPhase = 'upcoming' | 'live' | 'ended'

export function dropPhase(startsAt: Date, endsAt: Date | null, now = new Date()): DropPhase {
  if (now < startsAt) return 'upcoming'
  if (endsAt && now >= endsAt) return 'ended'
  return 'live'
}
