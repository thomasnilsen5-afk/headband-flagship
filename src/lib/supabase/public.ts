import { createClient } from '@supabase/supabase-js'
import { publicEnv } from '@/lib/env'
import type { Database } from './database.types'

/**
 * Cookie-less client for public, cacheable reads (catalog, content). Using this instead of
 * the cookie-aware client keeps pages static/ISR. RLS limits it to published data.
 */
export function createPublicClient() {
  return createClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}
