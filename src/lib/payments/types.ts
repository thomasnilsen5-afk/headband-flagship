import type { PricedLine } from '@/lib/commerce'

export type PaymentRequest = {
  orderId: string
  orderNumber: number
  totalOre: number
  shippingOre: number
  email: string
  phone?: string
  locale: 'nb' | 'en'
  lines: (PricedLine & { name: string; variantLabel: string })[]
  /** Absolute URLs. */
  returnUrl: string
  cancelUrl: string
}

export type PaymentStart = { redirectUrl: string; providerRef: string }
