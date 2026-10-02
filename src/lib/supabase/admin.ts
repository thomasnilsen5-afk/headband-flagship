import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { publicEnv } from '@/lib/env'
import { requireServerEnv } from '@/lib/env.server'
import type { Database } from './database.types'

/**
 * Service-role client. Bypasses RLS: use ONLY in server code after authorising the caller
 * (webhooks, checkout, admin actions). Never pass its results to the client unfiltered.
 */
export function createAdminClient() {
  return createClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    requireServerEnv('SUPABASE_SECRET_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}
