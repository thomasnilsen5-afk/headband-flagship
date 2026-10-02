'use client'

import { useActionState } from 'react'
import { applyDiscount, removeDiscount, type DiscountState } from '@/app/actions/cart'

export function DiscountForm({
  locale,
  current,
  copy,
}: {
  locale: 'nb' | 'en'
  current: string | null
  copy: { code: string; apply: string; invalid: string; remove: string; limited: string }
}) {
  const [state, action, pending] = useActionState<DiscountState, FormData>(applyDiscount, {
    status: 'idle',
  })
  if (current) {
    return (
      <form action={removeDiscount} className="flex items-center justify-between gap-4 text-sm">
        <input type="hidden" name="locale" value={locale} />
        <span className="type-label text-ichor!">{current}</span>
        <button type="submit" className="type-label underline underline-offset-4">
          {copy.remove}
        </button>
      </form>
    )
  }
  return (
    <form action={action}>
      <input type="hidden" name="locale" value={locale} />
      <label htmlFor="code" className="type-label">
        {copy.code}
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="code"
          name="code"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-invalid={state.status === 'invalid' || undefined}
          className="type-data min-w-0 flex-1 rounded-full border border-hairline-strong bg-transparent px-4 py-2.5 uppercase focus:border-ichor focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="type-label rounded-full border border-hairline-strong px-5"
        >
          {copy.apply}
        </button>
      </div>
      <p role="status" aria-live="polite" className="mt-2 min-h-[1.2em] text-sm text-danger">
        {state.status === 'invalid' ? copy.invalid : state.status === 'limited' ? copy.limited : ''}
      </p>
    </form>
  )
}
