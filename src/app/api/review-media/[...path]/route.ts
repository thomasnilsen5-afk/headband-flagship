import { type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * Serves review photos from the private bucket. Storage RLS decides: anyone may read photos of
 * published reviews; the author and staff may also read pending ones. Published photos are
 * cached publicly (they never change: paths are unique per upload); the rest are private.
 */
export async function GET(_: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const path = (await params).path.join('/')
  if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\/\d\.webp$/.test(path))
    return new Response(null, { status: 404 })

  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.storage.from('review-media').download(path)
  if (!data) return new Response(null, { status: 404 })
  const { data: media } = await supabase
    .from('review_media')
    .select('reviews(status)')
    .eq('storage_path', path)
    .maybeSingle()
  const published = media?.reviews?.status === 'published'
  return new Response(data, {
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': published
        ? 'public, max-age=86400, s-maxage=604800, immutable'
        : 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
