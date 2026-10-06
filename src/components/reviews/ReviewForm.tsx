'use client'

import { useActionState, type ChangeEvent } from 'react'
import { submitReview, type ReviewState } from '@/app/actions/reviews'

const MAX_PHOTOS = 3

/**
 * Downscale and re-encode in the browser before upload: a 12 MP phone photo becomes a ~300 KB
 * JPEG (and loses its EXIF on the way). The server re-encodes again and is the real guard.
 */
async function shrink(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.85))
  return blob
    ? new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
    : file
}

async function onPhotos(e: ChangeEvent<HTMLInputElement>) {
  const input = e.currentTarget
  const picked = [...(input.files ?? [])].slice(0, MAX_PHOTOS)
  const dt = new DataTransfer()
  for (const f of await Promise.all(picked.map((f) => shrink(f).catch(() => f)))) dt.items.add(f)
  input.files = dt.files
}

const field =
  'w-full rounded-sm border border-hairline-strong bg-transparent px-4 py-3 text-bone focus:border-ichor focus:outline-none aria-[invalid=true]:border-danger'

export function ReviewForm({
  productId,
  locale,
  defaultName,
  copy,
  starLabels,
}: {
  productId: string
  locale: 'nb' | 'en'
  defaultName: string
  copy: Record<string, string>
  starLabels: string[]
}) {
  const [state, action, pending] = useActionState<ReviewState, FormData>(submitReview, {
    status: 'idle',
  })
  const bad = (f: string) => state.status === 'invalid' && !!state.fields?.includes(f)

  if (state.status === 'ok') {
    return (
      <p role="status" className="max-w-[44ch] text-xl text-ash">
        {copy.ok}
      </p>
    )
  }

  return (
    <form action={action} className="grid max-w-xl gap-6">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="locale" value={locale} />
      <fieldset aria-invalid={bad('rating')} className="grid gap-3">
        <legend className="type-label mb-3">{copy.rating}</legend>
        <div className="flex flex-wrap gap-2">
          {[5, 4, 3, 2, 1].map((n) => (
            <label
              key={n}
              className="cursor-pointer rounded-full border border-hairline-strong px-4 py-2 has-[:checked]:border-ichor has-[:checked]:text-ichor"
            >
              <input type="radio" name="rating" value={n} required className="sr-only" />
              {'◆'.repeat(n)} <span className="sr-only">{starLabels[n - 1]}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="grid gap-2">
        <span className="type-label">{copy.headline}</span>
        <input name="title" maxLength={120} className={field} />
      </label>
      <label className="grid gap-2">
        <span className="type-label">{copy.body}</span>
        <textarea
          name="body"
          required
          minLength={10}
          maxLength={4000}
          rows={6}
          aria-invalid={bad('body')}
          className={field}
        />
      </label>
      <label className="grid gap-2">
        <span className="type-label">{copy.authorName}</span>
        <input
          name="authorName"
          required
          maxLength={80}
          defaultValue={defaultName}
          aria-invalid={bad('authorName')}
          className={field}
        />
      </label>
      <label className="grid gap-2">
        <span className="type-label">{copy.photos}</span>
        <input
          name="photos"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif"
          onChange={onPhotos}
          className="text-sm text-ash file:mr-4 file:rounded-full file:border-0 file:bg-bone file:px-4 file:py-2 file:text-void"
          aria-describedby="photos-hint"
        />
        <span id="photos-hint" className="text-sm text-ash-dim">
          {copy.photosHint}
        </span>
      </label>
      <p role="alert" className="min-h-6 text-sm text-danger">
        {state.status !== 'idle' ? copy[state.status] : ''}
      </p>
      <button
        disabled={pending}
        className="type-label w-fit rounded-full bg-bone px-7 py-4 text-void! disabled:opacity-60"
      >
        {pending ? copy.sending : copy.submit}
      </button>
    </form>
  )
}
