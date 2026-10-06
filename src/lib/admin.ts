import 'server-only'
import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * Staff gate for back-office pages and actions. Checked in every page and every action (never
 * only in the layout). Outsiders get a 404, so the admin area does not advertise itself. The
 * role comes from the database (current_app_role), not from the session token.
 */
export async function staffSession() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) return null
  const { data: role } = await supabase.rpc('current_app_role')
  if (role !== 'staff' && role !== 'admin') return null
  return { supabase, user: data.user, role }
}

export async function requireStaff() {
  return (await staffSession()) ?? notFound()
}

export const CARRIERS = {
  posten: {
    name: 'Posten',
    track: (n: string) => `https://sporing.posten.no/sporing/${encodeURIComponent(n)}`,
  },
  bring: {
    name: 'Bring',
    track: (n: string) => `https://tracking.bring.com/tracking/${encodeURIComponent(n)}`,
  },
} as const
