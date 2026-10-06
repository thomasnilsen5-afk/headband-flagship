'use client'

import { useActionState, type ReactNode } from 'react'
import type { AdminState } from '@/app/actions/admin'

const MESSAGES: Record<AdminState['status'], string> = {
  idle: '',
  ok: 'Lagret.',
  invalid: 'Sjekk feltene.',
  forbidden: 'Ingen tilgang.',
  capture: 'Kunne ikke trekke betalingen. Ordren er ikke merket som sendt.',
  refund: 'Refusjonen feilet hos betalingsleverandøren. Returen er uendret.',
  error: 'Noe gikk galt.',
}

/** Back-office form: disables while pending and reports the action's outcome politely. */
export function AdminForm({
  action,
  children,
  className,
  okText,
}: {
  action: (state: AdminState, form: FormData) => Promise<AdminState>
  children: ReactNode
  className?: string
  okText?: string
}) {
  const [state, formAction, pending] = useActionState(action, { status: 'idle' })
  const text = state.status === 'ok' && okText ? okText : MESSAGES[state.status]
  return (
    <form action={formAction} className={className}>
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      <p
        role="status"
        className={`text-sm ${state.status === 'ok' ? 'text-ichor' : 'text-danger'}`}
      >
        {text}
        {state.message && state.status !== 'ok' ? ` (${state.message})` : ''}
      </p>
    </form>
  )
}

export const adminField =
  'rounded-sm border border-hairline-strong bg-void px-3 py-2 text-bone focus:border-ichor focus:outline-none'
export const adminButton =
  'type-label rounded-full bg-bone px-5 py-2.5 text-void! disabled:opacity-50'
