'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { whenIdleOrInteracted } from '@/lib/hooks/useWebGLCapable'

/**
 * Scroll reveals for every [data-reveal] element on the page. Content is visible without JS;
 * GSAP only hides elements that are still below the fold, then lets them surface slowly.
 * GSAP loads after first interaction / idle so it never competes with hydration.
 */
export function Reveal() {
  const pathname = usePathname()
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let ctx: { revert: () => void } | undefined
    let cancelled = false
    const load = () =>
      Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(
        ([{ gsap }, { ScrollTrigger }]) => {
          if (cancelled) return
          gsap.registerPlugin(ScrollTrigger)
          ctx = gsap.context(() => {
            for (const el of gsap.utils.toArray<HTMLElement>('[data-reveal]')) {
              if (el.getBoundingClientRect().top < innerHeight * 0.92) continue
              gsap.from(el, {
                y: 60,
                opacity: 0,
                filter: 'blur(8px)',
                duration: 1.6,
                ease: 'expo.out',
                scrollTrigger: { trigger: el, start: 'top 88%', once: true },
              })
            }
          })
        },
      )
    const stop = whenIdleOrInteracted(() => void load())
    return () => {
      cancelled = true
      stop()
      ctx?.revert()
    }
  }, [pathname])
  return null
}
