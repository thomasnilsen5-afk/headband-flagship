import { z } from 'zod'

/** Countries we ship to. Norway first; the rest map to Bring/Posten zones in shipping.ts. */
export const SHIP_COUNTRIES = [
  'NO',
  'SE',
  'DK',
  'FI',
  'IS',
  'DE',
  'NL',
  'BE',
  'FR',
  'GB',
  'IE',
  'ES',
  'IT',
  'AT',
  'CH',
  'PL',
  'PT',
  'EE',
  'LV',
  'LT',
  'US',
  'CA',
  'AU',
  'NZ',
  'JP',
  'KR',
  'SG',
] as const

export const checkoutSchema = z
  .object({
    locale: z.enum(['nb', 'en']),
    email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9 ]{8,20}$/, 'phone')
      .optional()
      .or(z.literal('').transform(() => undefined)),
    fullName: z.string().trim().min(2).max(200),
    line1: z.string().trim().min(2).max(200),
    line2: z
      .string()
      .trim()
      .max(200)
      .optional()
      .or(z.literal('').transform(() => undefined)),
    postalCode: z.string().trim().min(2).max(12),
    city: z.string().trim().min(1).max(120),
    country: z.enum(SHIP_COUNTRIES),
    shippingRate: z.string().regex(/^[a-z0-9_]{2,40}$/),
    paymentMethod: z.enum(['vipps', 'stripe', 'test']),
    acceptTerms: z.literal('on', { message: 'terms' }),
    marketing: z.literal('on').optional(),
  })
  .refine((v) => v.country !== 'NO' || /^\d{4}$/.test(v.postalCode), {
    message: 'postal',
    path: ['postalCode'],
  })

export type CheckoutInput = z.input<typeof checkoutSchema>
