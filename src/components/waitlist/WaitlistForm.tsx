'use client'

import { useActionState, useId } from 'react'
import { joinWaitlist, type WaitlistState } from '@/app/actions/waitlist'

export type WaitlistCopy = {
  email: string
  emailPlaceholder: string
  submit: string
  submitting: string
  consent: string
  ok: string
  invalid: string
  consentMissing: string
  limited: string
  error: string
}

/** Progressive enhancement: works as a plain HTML form post without JS. */
export function WaitlistForm({
  kind,
  dropId,
  variantId,
  locale,
  copy,
  title,
}: {
  kind: 'drop' | 'back_in_stock'
  dropId?: string
  variantId?: string
  locale: 'nb' | 'en'
  copy: WaitlistCopy
  title?: string
}) {
  const [state, action, pending] = useActionState<WaitlistState, FormData>(joinWaitlist, {
    status: 'idle',
  })
  const id = useId()
  const message = {
    idle: '',
    ok: copy.ok,
    invalid: copy.invalid,
    consent: copy.consentMissing,
    limited: copy.limited,
    error: copy.error,
  }[state.status]

  if (state.status === 'ok') {
    return (
      <p role="status" className="type-label border-t border-hairline pt-5 text-ichor!">
        {copy.ok}
      </p>
    )
  }

  return (
    <form action={action} className="border-t border-hairline pt-5" aria-describedby={`${id}-msg`}>
      {title && <p className="mb-4 text-lg">{title}</p>}
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="locale" value={locale} />
      {dropId && <input type="hidden" name="dropId" value={dropId} />}
      {variantId && <input type="hidden" name="variantId" value={variantId} />}
      {/* Honeypot: hidden from people and assistive tech. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Company <input type="text" name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <label htmlFor={`${id}-email`} className="type-label">
        {copy.email}
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder={copy.emailPlaceholder}
          aria-invalid={state.status === 'invalid' || undefined}
          className="min-w-0 flex-1 rounded-full border border-hairline-strong bg-transparent px-5 py-3.5 text-bone placeholder:text-ash-dim focus:border-ichor focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="type-label shrink-0 rounded-full bg-bone px-6 py-3.5 text-void! transition-opacity disabled:opacity-60"
        >
          {pending ? copy.submitting : copy.submit}
        </button>
      </div>
      <label className="mt-4 flex items-start gap-3 text-sm text-ash">
        <input
          type="checkbox"
          name="consent"
          required
          className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-ichor)]"
          aria-invalid={state.status === 'consent' || undefined}
        />
        <span>{copy.consent}</span>
      </label>
      <p
        id={`${id}-msg`}
        role="status"
        aria-live="polite"
        className="type-label mt-3 min-h-[1.2em] text-danger!"
      >
        {message}
      </p>
    </form>
  )
}
