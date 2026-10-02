'use client'

import { useEffect, useState } from 'react'
import { whenIdleOrInteracted } from './useWebGLCapable'

/**
 * Live stock for the variants on screen. Starts from server-rendered numbers, then subscribes
 * to Supabase Realtime (inventory UPDATEs) on first interaction or idle, so the ~50 KB
 * websocket client never competes with loading. Returns { [variantId]: available }.
 */
export function useLiveInventory(initial: Record<string, number>): Record<string, number> {
  const [stock, setStock] = useState(initial)
  const ids = Object.keys(initial).sort().join(',')

  useEffect(() => {
    if (!ids) return
    let cleanup = () => {}
    let cancelled = false
    const start = () =>
      import('@/lib/supabase/browser').then(({ getBrowserClient }) => {
        if (cancelled) return
        const supabase = getBrowserClient()
        const channel = supabase
          .channel(`inventory:${ids}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'inventory',
              filter: `variant_id=in.(${ids})`,
            },
            (payload) => {
              const row = payload.new as { variant_id: string; available: number }
              setStock((s) => ({ ...s, [row.variant_id]: row.available }))
            },
          )
          .subscribe()
        cleanup = () => void supabase.removeChannel(channel)
      })
    const stop = whenIdleOrInteracted(() => void start())
    return () => {
      cancelled = true
      stop()
      cleanup()
    }
  }, [ids])

  return stock
}
