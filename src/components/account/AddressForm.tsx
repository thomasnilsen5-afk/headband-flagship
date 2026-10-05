'use client'

import { useActionState, useMemo } from 'react'
import { saveAddress, type FormStatus } from '@/app/actions/account'

const field =
  'w-full rounded-sm border border-hairline-strong bg-transparent px-4 py-3 text-bone focus:border-ichor focus:outline-none aria-[invalid=true]:border-danger'

export function AddressForm({
  locale,
  countries,
  copy,
}: {
  locale: 'nb' | 'en'
  countries: readonly string[]
  copy: Record<string, string>
}) {
  const [state, action, pending] = useActionState<FormStatus, FormData>(saveAddress, {
    status: 'idle',
  })
  const names = useMemo(() => new Intl.DisplayNames([locale], { type: 'region' }), [locale])
  const bad = (f: string) => state.status === 'invalid' && !!state.fields?.includes(f)
  const input = (
    name: string,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <label className="grid gap-2">
      <span className="type-label">{label}</span>
      <input name={name} aria-invalid={bad(name)} className={field} {...props} />
    </label>
  )

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {input('label', copy.label!)}
      {input('fullName', copy.fullName!, { required: true, autoComplete: 'name' })}
      {input('line1', copy.line1!, { required: true, autoComplete: 'address-line1' })}
      {input('line2', copy.line2!, { autoComplete: 'address-line2' })}
      {input('postalCode', copy.postalCode!, {
        required: true,
        autoComplete: 'postal-code',
        inputMode: 'numeric',
      })}
      {input('city', copy.city!, { required: true, autoComplete: 'address-level2' })}
      <label className="grid gap-2">
        <span className="type-label">{copy.country}</span>
        <select name="country" defaultValue="NO" className={field}>
          {countries.map((c) => (
            <option key={c} value={c} className="bg-void">
              {names.of(c)}
            </option>
          ))}
        </select>
      </label>
      {input('phone', copy.phone!, { type: 'tel', autoComplete: 'tel' })}
      <label className="flex items-center gap-3 sm:col-span-2">
        <input type="checkbox" name="isDefault" className="h-4 w-4 accent-[var(--color-ichor)]" />
        <span>{copy.isDefault}</span>
      </label>
      <div className="flex flex-wrap items-center gap-6 sm:col-span-2">
        <button
          disabled={pending}
          className="type-label rounded-full bg-bone px-7 py-4 text-void! disabled:opacity-60"
        >
          {copy.save}
        </button>
        <p role="status" className="text-sm text-ash">
          {state.status === 'ok'
            ? copy.saved
            : state.status === 'invalid'
              ? copy.fieldsInvalid
              : ''}
        </p>
      </div>
    </form>
  )
}
