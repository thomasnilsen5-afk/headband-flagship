import 'server-only'
import { createPublicClient } from '@/lib/supabase/public'

export type PublishedReview = {
  id: string
  rating: number
  title: string | null
  body: string
  authorName: string
  verified: boolean
  publishedAt: string
  photos: string[] // /api/review-media/<path>
}

/** Published reviews only (RLS for anon), cookie-less so product pages stay ISR. */
export async function getPublishedReviews(productId: string) {
  const { data } = await createPublicClient()
    .from('reviews')
    .select(
      'id, rating, title, body, author_name, is_verified, published_at, review_media(storage_path)',
    )
    .eq('product_id', productId)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(50)
  const reviews: PublishedReview[] = (data ?? []).map((r) => ({
    id: r.id,
    rating: r.rating,
    title: r.title,
    body: r.body,
    authorName: r.author_name,
    verified: r.is_verified,
    publishedAt: r.published_at!,
    photos: r.review_media.map((m) => `/api/review-media/${m.storage_path}`),
  }))
  const count = reviews.length
  const average = count ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0
  return { reviews, count, average: Math.round(average * 10) / 10 }
}
