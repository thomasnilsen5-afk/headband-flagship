'use client'

import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

/**
 * Cinematic page transitions with the View Transitions API. Internal link clicks are
 * intercepted in the capture phase (before Next's Link handler) and the navigation runs
 * inside document.startViewTransition; the CSS in globals.css choreographs old/new.
 * Falls back to normal navigation without the API or with reduced motion.
 */
export function NavigationTransitions() {
  const router = useRouter()
  const pathname = usePathname()
  const pending = useRef<(() => void) | null>(null)

  // Navigation finished → let the transition capture the new page.
  useEffect(() => {
    pending.current?.()
    pending.current = null
  }, [pathname])

  useEffect(() => {
    if (!('startViewTransition' in document)) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return
      const a = (e.target as Element | null)?.closest('a')
      if (
        !a ||
        a.target === '_blank' ||
        a.hasAttribute('download') ||
        a.dataset.noTransition !== undefined
      )
        return
      const url = new URL(a.href, location.href)
      if (url.origin !== location.origin) return
      if (url.pathname === location.pathname) return // same page / hash links
      e.preventDefault()
      e.stopPropagation()
      document.startViewTransition(
        () =>
          new Promise<void>((resolve) => {
            pending.current = resolve
            router.push(url.pathname + url.search + url.hash)
            // Safety net: never hold the transition longer than 2.5 s.
            setTimeout(resolve, 2500)
          }),
      )
    }
    document.addEventListener('click', onClick, { capture: true })
    return () => document.removeEventListener('click', onClick, { capture: true })
  }, [router])

  return null
}
