import 'server-only'
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { serverEnv } from '@/lib/env.server'

/**
 * Server-side secret for hashing cart tokens and signing order links. Uses CART_TOKEN_PEPPER
 * when set; otherwise it is derived from the Supabase secret key, so every environment that can
 * write orders also has a stable secret without extra configuration.
 */
function secret(): string {
  const env = serverEnv()
  if (env.CART_TOKEN_PEPPER) return env.CART_TOKEN_PEPPER
  if (env.SUPABASE_SECRET_KEY)
    return createHash('sha256').update(`hyal:${env.SUPABASE_SECRET_KEY}`).digest('hex')
  if (process.env.VERCEL_ENV === 'production')
    throw new Error('CART_TOKEN_PEPPER is required in production')
  return 'dev-only-insecure-secret'
}

export const newToken = () => randomBytes(32).toString('base64url')

/** What the database stores for a cart cookie: never the token itself. */
export const hashToken = (token: string) =>
  createHmac('sha256', secret()).update(`cart:${token}`).digest('hex')

/** Unguessable link to an order confirmation for guests (no account needed). */
export const signOrder = (orderId: string) =>
  createHmac('sha256', secret()).update(`order:${orderId}`).digest('base64url').slice(0, 32)

export function verifyOrder(orderId: string, token: string | undefined | null): boolean {
  if (!token) return false
  const a = Buffer.from(signOrder(orderId))
  const b = Buffer.from(token)
  return a.length === b.length && timingSafeEqual(a, b)
}
