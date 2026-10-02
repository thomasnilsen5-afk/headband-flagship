'use client'

import { useActionState } from 'react'
import { signInStep, type SignInState } from '@/app/actions/auth'

const field =
  'w-full rounded-sm border border-hairline-strong bg-transparent px-4 py-3.5 text-bone placeholder:text-ash-dim focus:border-ichor focus:outline-none aria-[invalid=true]:border-danger'

export function SignInForm({
  locale,
  copy,
}: {
  locale: 'nb' | 'en'
  copy: Record<string, string>
}) {
  const [state, action, pending] = useActionState<SignInState, FormData>(signInStep, {
    step: 'email',
  })
  const message = state.status && state.status !== 'sent' ? copy[state.status] : ''

  return (
    <form action={action} className="grid max-w-md gap-5" noValidate>
      <input type="hidden" name="locale" value={locale} />
      {state.step === 'email' ? (
        <label className="grid gap-2">
          <span className="type-label">{copy.email}</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={state.status === 'invalid'}
            aria-describedby="signin-msg"
            className={field}
          />
        </label>
      ) : (
        <>
          <p role="status" className="text-ash">
            {(copy.sent ?? '').replace('{email}', state.email)}
          </p>
          <input type="hidden" name="email" value={state.email} />
          <label className="grid gap-2">
            <span className="type-label">{copy.code}</span>
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={10}
              required
              autoFocus
              aria-invalid={state.status === 'invalid'}
              aria-describedby="signin-msg"
              className={`${field} type-data text-2xl tracking-[0.3em]`}
            />
          </label>
        </>
      )}
      <p id="signin-msg" role="alert" className="min-h-6 text-sm text-danger">
        {message}
      </p>
      <button
        disabled={pending}
        className="type-label w-fit rounded-full bg-bone px-7 py-4 text-void! disabled:opacity-60"
      >
        {pending ? copy.working : state.step === 'email' ? copy.send : copy.verify}
      </button>
      {state.step === 'code' && (
        <div className="flex gap-6 text-sm text-ash">
          <button
            name="intent"
            value="resend"
            className="underline underline-offset-4 hover:text-bone"
          >
            {copy.resend}
          </button>
          <button
            name="intent"
            value="restart"
            className="underline underline-offset-4 hover:text-bone"
          >
            {copy.otherEmail}
          </button>
        </div>
      )}
    </form>
  )
}
