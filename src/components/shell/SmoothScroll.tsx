'use client'

import { useEffect } from 'react'

/**
 * Lenis smooth scrolling, synced to GSAP's ticker so ScrollTrigger and Lenis share one
 * frame. Skipped for reduced motion and for touch (native momentum is better there).
 */
export function SmoothScroll() {
  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const coarse = matchMedia('(pointer: coarse)').matches
    if (reduce || coarse) return

    let cleanup = () => {}
    let cancelled = false
    void Promise.all([import('lenis'), import('gsap'), import('gsap/ScrollTrigger')]).then(
      ([{ default: Lenis }, { gsap }, { ScrollTrigger }]) => {
        if (cancelled) return
        gsap.registerPlugin(ScrollTrigger)
        const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 })
        lenis.on('scroll', ScrollTrigger.update)
        const tick = (time: number) => lenis.raf(time * 1000)
        gsap.ticker.add(tick)
        gsap.ticker.lagSmoothing(0)
        ;(window as unknown as { __lenis?: typeof lenis }).__lenis = lenis
        cleanup = () => {
          gsap.ticker.remove(tick)
          lenis.destroy()
        }
      },
    )
    return () => {
      cancelled = true
      cleanup()
    }
  }, [])
  return null
}
