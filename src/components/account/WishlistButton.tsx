'use client'

import { useEffect, useState, useTransition } from 'react'
import { toggleWishlist, wishlistState } from '@/app/actions/account'
import { useRouter } from '@/i18n/navigation'

/** Supabase keeps the session in sb-<ref>-auth-token cookies; no cookie means no request. */
const hasSession = () => /(?:^|;\s*)sb-[^=]+-auth-token/.test(document.cookie)

export function WishlistButton({
  productId,
  copy,
}: {
  productId: string
  copy: { save: string; saved: string }
}) {
  const [saved, setSaved] = useState(false)
  const [pending, start] = useTransition()
  const router = useRouter()

  useEffect(() => {
    if (!hasSession()) return
    let live = true
    wishlistState(productId).then((s) => live && setSaved(s))
    return () => {
      live = false
    }
  }, [productId])

  return (
    <button
      type="button"
      aria-pressed={saved}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await toggleWishlist(productId)
          if (r === 'signin') router.push('/account/sign-in')
          else if (r !== 'error') setSaved(r === 'saved')
        })
      }
      className="type-label inline-flex w-fit items-center gap-2 rounded-full border border-hairline-strong px-5 py-3 text-bone! hover:border-ichor disabled:opacity-60 aria-pressed:border-ichor"
    >
      <span aria-hidden className={saved ? 'text-ichor' : ''}>
        {saved ? '◆' : '◇'}
      </span>
      {saved ? copy.saved : copy.save}
    </button>
  )
}
