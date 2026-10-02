'use client'

import { useSyncExternalStore } from 'react'
import { Link } from '@/i18n/navigation'

const EVENT = 'cart:count'

function readCount(): number {
  const m = /(?:^|;\s*)hyal_cart_n=(\d+)/.exec(document.cookie)
  return m ? Number(m[1]) : 0
}

/** Tell the header the count changed (server actions also refresh the cookie). */
export function announceCartCount(count: number) {
  document.cookie = `hyal_cart_n=${count}; path=/; max-age=${60 * 60 * 24 * 60}; samesite=lax`
  window.dispatchEvent(new Event(EVENT))
}

/**
 * Header cart link. The count lives in a small readable cookie so every page stays static and
 * edge-cached: no request, no cookies read on the server for the shell.
 */
export function CartButton({ label, a11y }: { label: string; a11y: string }) {
  const count = useSyncExternalStore(
    (cb) => {
      window.addEventListener(EVENT, cb)
      window.addEventListener('focus', cb)
      return () => {
        window.removeEventListener(EVENT, cb)
        window.removeEventListener('focus', cb)
      }
    },
    readCount,
    () => 0,
  )
  return (
    <Link
      href="/cart"
      className="type-label text-bone! tabular-nums"
      aria-label={a11y.replace('{count}', String(count))}
    >
      {label} <span className="type-data">({count})</span>
    </Link>
  )
}
