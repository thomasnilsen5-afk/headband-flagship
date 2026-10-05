'use client'

import { useActionState } from 'react'
import { requestReturn, type FormStatus } from '@/app/actions/account'

type Item = { id: string; name: string; variantLabel: string; returnable: number }

export function ReturnForm({
  orderId,
  items,
  copy,
}: {
  orderId: string
  items: Item[]
  copy: Record<string, string>
}) {
  const [state, action, pending] = useActionState<FormStatus, FormData>(requestReturn, {
    status: 'idle',
  })
  const message: Record<string, string | undefined> = {
    ok: copy.returnOk,
    invalid: copy.returnNone,
    window: copy.returnWindow,
    notReturnable: copy.returnNotReturnable,
    qty: copy.returnQtyExceeded,
    limited: copy.limited,
    error: copy.error,
  }

  if (items.length === 0) {
    return (
      <p role="status" className="text-sm text-ash">
        {state.status === 'ok' ? copy.returnOk : ''}
      </p>
    )
  }

  return (
    <form action={action} className="grid gap-5">
      <input type="hidden" name="orderId" value={orderId} />
      <ul className="grid gap-3">
        {items.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-4">
            <span>
              {i.name} <span className="text-ash">· {i.variantLabel}</span>
            </span>
            <label className="flex items-center gap-3">
              <span className="sr-only">
                {copy.returnQty}: {i.name}
              </span>
              <select
                name={`qty:${i.id}`}
                defaultValue="0"
                className="rounded-sm border border-hairline-strong bg-void px-3 py-2"
              >
                {Array.from({ length: i.returnable + 1 }, (_, n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </li>
        ))}
      </ul>
      <label className="grid gap-2">
        <span className="type-label">{copy.returnReason}</span>
        <textarea
          name="reason"
          maxLength={2000}
          rows={3}
          className="rounded-sm border border-hairline-strong bg-transparent px-4 py-3 focus:border-ichor focus:outline-none"
        />
      </label>
      <div className="flex flex-wrap items-center gap-6">
        <button
          disabled={pending}
          className="type-label rounded-full border border-hairline-strong px-6 py-3 text-bone! disabled:opacity-60"
        >
          {copy.returnSubmit}
        </button>
        <p role="status" className="text-sm text-ash">
          {state.status === 'idle' ? '' : message[state.status]}
        </p>
      </div>
    </form>
  )
}
