import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/** The signed-in user, verified with Supabase Auth (never trusts the cookie alone). */
export async function getUser() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getUser()
  return data.user
}

/** Only same-site relative paths survive; anything else falls back to the account page. */
export function safeNext(next: string | null | undefined, fallback: string): string {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\')
    ? next
    : fallback
}
