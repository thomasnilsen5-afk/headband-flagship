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
  RESEND_API_KEY: z.string().startsWith('re_').optional(),
  EMAIL_FROM: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  BRING_API_UID: z.string().optional(),
  BRING_API_KEY: z.string().optional(),
  BRING_CUSTOMER_NUMBER: z.string().optional(),
  CRON_SECRET: z.string().min(16).optional(),
  CART_TOKEN_PEPPER: z.string().min(32).optional(),
})

export type ServerEnv = z.infer<typeof serverSchema>

let cached: ServerEnv | undefined
export function serverEnv(): ServerEnv {
  cached ??= serverSchema.parse(process.env)
  return cached
}

export function requireServerEnv<K extends keyof ServerEnv>(key: K): NonNullable<ServerEnv[K]> {
  const value = serverEnv()[key]
  if (value === undefined || value === '') {
    throw new Error(`Missing server env ${String(key)}. See README → Environment variables.`)
  }
  return value as NonNullable<ServerEnv[K]>
}
