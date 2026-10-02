import 'server-only'
import { z } from 'zod'

/**
 * Server secrets. Each integration reads its keys lazily through `requireServerEnv` so a
 * preview without Stripe keys still builds and renders; the feature fails loudly when used.
 */
const serverSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(20).optional(),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_').optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_').optional(),
  VIPPS_CLIENT_ID: z.string().optional(),
  VIPPS_CLIENT_SECRET: z.string().optional(),
  VIPPS_SUBSCRIPTION_KEY: z.string().optional(),
  VIPPS_MSN: z.string().optional(),
  VIPPS_ENV: z.enum(['test', 'production']).default('test'),
  // Returned once when the webhook is registered (POST /webhooks/v1/webhooks).
  VIPPS_WEBHOOK_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().startsWith('re_').optional(),
  EMAIL_FROM: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  BRING_API_UID: z.string().optional(),
  BRING_API_KEY: z.string().optional(),
  BRING_CUSTOMER_NUMBER: z.string().optional(),
  CRON_SECRET: z.string().min(16).optional(),
  CART_TOKEN_PEPPER: z.string().min(32).optional(),
  // 'off' disables the simulated payment provider outside production (it is never on in production).
  PAYMENTS_TEST_MODE: z.enum(['on', 'off']).optional(),
})

export type ServerEnv = z.infer<typeof serverSchema>

let cached: ServerEnv | undefined
export function serverEnv(): ServerEnv {
  cached ??= serverSchema.parse({
    ...process.env,
    // The Supabase ↔ Vercel integration sets the legacy name; both work.
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  })
  return cached
}

export function requireServerEnv<K extends keyof ServerEnv>(key: K): NonNullable<ServerEnv[K]> {
  const value = serverEnv()[key]
  if (value === undefined || value === '') {
    throw new Error(`Missing server env ${String(key)}. See README → Environment variables.`)
  }
  return value as NonNullable<ServerEnv[K]>
}

export type PaymentMethod = 'vipps' | 'stripe' | 'test'

/** Payment methods this environment can actually take. Order = display order (Vipps first). */
export function availablePaymentMethods(): PaymentMethod[] {
  const env = serverEnv()
  const methods: PaymentMethod[] = []
  if (env.VIPPS_CLIENT_ID && env.VIPPS_CLIENT_SECRET && env.VIPPS_SUBSCRIPTION_KEY && env.VIPPS_MSN)
    methods.push('vipps')
  if (env.STRIPE_SECRET_KEY) methods.push('stripe')
  const production = process.env.VERCEL_ENV === 'production'
  if (!production && env.PAYMENTS_TEST_MODE !== 'off') methods.push('test')
  return methods
}
