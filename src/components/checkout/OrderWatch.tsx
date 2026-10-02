'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { announceCartCount } from '@/components/cart/CartButton'

/**
 * Confirmation page helper. While the order is pending it re-renders the server page every
 * two seconds (up to a minute) so the webhook result shows without a manual reload; once paid
 * it zeroes the header count, since the cart was converted server-side.
 */
export function OrderWatch({ status }: { status: string }) {
  const router = useRouter()
  useEffect(() => {
    if (status === 'paid') {
      announceCartCount(0)
      return
    }
    if (status !== 'pending') return
    let n = 0
    const id = setInterval(() => {
      if (++n > 30) return clearInterval(id)
      router.refresh()
    }, 2000)
    return () => clearInterval(id)
  }, [status, router])
  return null
}
