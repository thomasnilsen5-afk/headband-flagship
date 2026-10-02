'use client'

import { useActionState, useEffect } from 'react'
import { addToCart, type CartActionState } from '@/app/actions/cart'
import { Link } from '@/i18n/navigation'
import { announceCartCount } from './CartButton'

export type AddToCartCopy = {
  add: string
  adding: string
  added: string
  goToCart: string
  limit: string
  unavailable: string
  error: string
  limited: string
}

export function AddToCart({
  variantId,
  locale,
  copy,
}: {
  variantId: string
  locale: 'nb' | 'en'
  copy: AddToCartCopy
}) {
  const [state, action, pending] = useActionState<CartActionState, FormData>(addToCart, {
    status: 'idle',
  })

  useEffect(() => {
    if (state.count !== undefined) announceCartCount(state.count)
  }, [state])

  const message =
    state.status === 'ok'
      ? null
      : {
          idle: '',
          invalid: copy.error,
          unavailable: copy.unavailable,
          limit: copy.limit,
          limited: copy.limited,
          error: copy.error,
        }[state.status]

  return (
    <form action={action}>
      <input type="hidden" name="variantId" value={variantId} />
      <input type="hidden" name="qty" value="1" />
      <input type="hidden" name="locale" value={locale} />
      <button
        type="submit"
        disabled={pending}
        className="type-label group relative w-full overflow-hidden rounded-full bg-bone px-8 py-5 text-void! transition-transform duration-700 ease-fluid hover:scale-[1.01] disabled:opacity-70"
      >
        <span
          aria-hidden
          className="absolute inset-0 -translate-x-full bg-[linear-gradient(100deg,transparent,oklch(0.88_0.17_170/0.5),oklch(0.68_0.26_300/0.5),transparent)] transition-transform duration-[1400ms] ease-fluid group-hover:translate-x-full"
        />
        <span className="relative">{pending ? copy.adding : copy.add}</span>
      </button>
      <div role="status" aria-live="polite" className="mt-3 min-h-[1.5em]">
        {state.status === 'ok' || (state.status === 'limit' && (state.count ?? 0) > 0) ? (
          <p className="flex items-center justify-between gap-4 text-sm">
            <span className="text-ichor">{state.status === 'ok' ? copy.added : copy.limit}</span>
            <Link href="/cart" className="type-label text-bone! underline underline-offset-8">
              {copy.goToCart} →
            </Link>
          </p>
        ) : (
          message && <p className="text-sm text-danger">{message}</p>
        )}
      </div>
    </form>
  )
}
