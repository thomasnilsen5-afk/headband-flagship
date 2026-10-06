'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { z } from 'zod'
import { staffSession } from '@/lib/admin'
import { log } from '@/lib/log'
import { normaliseReviewPhoto } from '@/lib/review-image'
import { clientIp, rateLimit } from '@/lib/security/rate-limit'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type ReviewState = {
  status: 'idle' | 'ok' | 'invalid' | 'signin' | 'duplicate' | 'photo' | 'limited' | 'error'
  fields?: string[]
}

const MAX_PHOTOS = 3
const MAX_BYTES = 8 * 1024 * 1024
const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])

const schema = z.object({
  productId: z.uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().min(10).max(4000),
  authorName: z.string().trim().min(1).max(80),
  locale: z.enum(['nb', 'en']),
})

async function normalise(file: File) {
  return normaliseReviewPhoto(Buffer.from(await file.arrayBuffer()))
}

export async function submitReview(_: ReviewState, form: FormData): Promise<ReviewState> {
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { status: 'signin' }
  if (!(await rateLimit('review', `${auth.user.id}:${clientIp(await headers())}`, 5, '1 h')).ok) {
    return { status: 'limited' }
  }

  const v = schema.safeParse(
    Object.fromEntries([...form].filter(([k, x]) => k !== 'photos' && x !== '')),
  )
  if (!v.success) return { status: 'invalid', fields: v.error.issues.map((i) => String(i.path[0])) }
  const files = form.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0)
  if (files.length > MAX_PHOTOS || files.some((f) => f.size > MAX_BYTES || !TYPES.has(f.type))) {
    return { status: 'photo' }
  }

  // Decode every photo before writing anything, so a broken file fails the whole submission.
  let photos: Awaited<ReturnType<typeof normalise>>[]
  try {
    photos = await Promise.all(files.map(normalise))
  } catch {
    return { status: 'photo' }
  }

  // RLS + the guard_review trigger: own row only, always 'pending', verified flag computed.
  const { data: review, error } = await supabase
    .from('reviews')
    .insert({
      product_id: v.data.productId,
      user_id: auth.user.id,
      rating: v.data.rating,
      title: v.data.title || null,
      body: v.data.body,
      author_name: v.data.authorName,
      locale: v.data.locale,
    })
    .select('id')
    .single()
  if (error) return { status: error.code === '23505' ? 'duplicate' : 'error' }

  for (const [n, photo] of photos.entries()) {
    const path = `${auth.user.id}/${review.id}/${n}.webp`
    const up = await supabase.storage
      .from('review-media')
      .upload(path, photo.data, { contentType: 'image/webp' })
    if (up.error) {
      log.warn('review.photo_upload_failed', { err: up.error.message, reviewId: review.id })
      continue
    }
    await supabase.from('review_media').insert({
      review_id: review.id,
      storage_path: path,
      width: photo.info.width,
      height: photo.info.height,
    })
  }
  log.info('review.submitted', { reviewId: review.id, photos: photos.length })
  return { status: 'ok' }
}

export async function moderateReview(form: FormData) {
  const staff = await staffSession()
  const id = z.uuid().safeParse(form.get('reviewId'))
  const status = z.enum(['published', 'rejected']).safeParse(form.get('status'))
  if (!staff || !id.success || !status.success) return
  // reviews_staff policy: staff may update any review; guard_review stamps published_at.
  const { data } = await staff.supabase
    .from('reviews')
    .update({ status: status.data })
    .eq('id', id.data)
    .select('products(slug)')
    .single()
  revalidatePath('/[locale]/admin/reviews', 'page')
  if (data?.products?.slug) revalidatePath('/[locale]/products/[slug]', 'page')
}
