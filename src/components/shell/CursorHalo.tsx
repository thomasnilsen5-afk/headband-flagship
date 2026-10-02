'use client'

import { useEffect, useRef } from 'react'
import { useFinePointer, useReducedMotion } from '@/lib/hooks/useMediaQuery'

/** A ring that trails the native cursor with fluid lag and swells over interactive things. */
export function CursorHalo() {
  const ref = useRef<HTMLDivElement>(null)
  const fine = useFinePointer()
  const reduce = useReducedMotion()
  const enabled = fine && !reduce

  useEffect(() => {
    if (!enabled) return
    const el = ref.current
    if (!el) return
    const target = { x: innerWidth / 2, y: innerHeight / 2 }
    const pos = { ...target }
    let raf = 0
    let visible = false

    const loop = () => {
      pos.x += (target.x - pos.x) * 0.16
      pos.y += (target.y - pos.y) * 0.16
      el.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`
      raf = requestAnimationFrame(loop)
    }
    const onMove = (e: PointerEvent) => {
      target.x = e.clientX
      target.y = e.clientY
      if (!visible) {
        visible = true
        pos.x = target.x
        pos.y = target.y
        el.dataset.state = 'idle'
      }
      const interactive = (e.target as Element | null)?.closest(
        'a, button, [role="button"], [data-cursor], input, select, textarea, label',
      )
      el.dataset.state = interactive ? 'active' : 'idle'
    }
    const onLeave = () => {
      visible = false
      el.dataset.state = 'hidden'
    }
    addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
    }
  }, [enabled])

  if (!enabled) return null
  return <div ref={ref} className="cursor-halo" data-state="hidden" aria-hidden />
}
