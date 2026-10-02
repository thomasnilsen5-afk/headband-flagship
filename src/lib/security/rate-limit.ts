import 'server-only'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { serverEnv } from '@/lib/env.server'
import { log } from '@/lib/log'

type Window = `${number} ${'s' | 'm' | 'h'}`
type Result = { ok: boolean; remaining: number }

const limiters = new Map<string, Ratelimit>()
const memory = new Map<string, { count: number; reset: number }>()
let warned = false

/**
 * Sliding-window rate limit per (bucket, key). Upstash Redis in production (shared across all
 * serverless instances). Without Upstash env (local dev, early previews) it falls back to a
 * per-instance in-memory window and logs a warning once: fine for development, not a defence.
 */
export async function rateLimit(
  bucket: string,
  key: string,
  limit: number,
  window: Window,
): Promise<Result> {
  const { UPSTASH_REDIS_REST_URL: url, UPSTASH_REDIS_REST_TOKEN: token } = serverEnv()
  if (url && token) {
    const id = `${bucket}:${limit}:${window}`
    let limiter = limiters.get(id)
    if (!limiter) {
      limiter = new Ratelimit({
        redis: new Redis({ url, token }),
        limiter: Ratelimit.slidingWindow(limit, window),
        prefix: `rl:${bucket}`,
        analytics: false,
      })
      limiters.set(id, limiter)
    }
    const r = await limiter.limit(key)
    return { ok: r.success, remaining: r.remaining }
  }

  if (!warned && process.env.VERCEL_ENV === 'production') {
    warned = true
    log.warn('rate-limit: Upstash not configured, using per-instance memory fallback')
  }
  const ms = parseWindow(window)
  const now = Date.now()
  const k = `${bucket}:${key}`
  const entry = memory.get(k)
  if (!entry || entry.reset < now) {
    memory.set(k, { count: 1, reset: now + ms })
    return { ok: true, remaining: limit - 1 }
  }
  entry.count++
  return { ok: entry.count <= limit, remaining: Math.max(0, limit - entry.count) }
}

function parseWindow(w: Window): number {
  const [n, unit] = w.split(' ') as [string, 's' | 'm' | 'h']
  return Number(n) * (unit === 's' ? 1_000 : unit === 'm' ? 60_000 : 3_600_000)
}

/** Best-effort client IP behind Vercel's proxy. */
export function clientIp(headers: Headers): string {
  return (
    headers.get('x-real-ip') ?? headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  )
}
