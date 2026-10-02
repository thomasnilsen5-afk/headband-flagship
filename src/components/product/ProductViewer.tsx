'use client'

import { useEffect, useRef, useState, type ComponentType, type CSSProperties } from 'react'
import type HeadbandScene from '@/gl/HeadbandScene'
import type { SceneInputs } from '@/gl/HeadbandScene'
import type { BandForm } from '@/gl/finishes'
import { canRunWebGL, whenIdleOrInteracted } from '@/lib/hooks/useWebGLCapable'

type SceneComponent = ComponentType<Parameters<typeof HeadbandScene>[0]>

/**
 * Product 3D viewer: drag (or arrow keys) to rotate, variant colour and finish ease in live.
 * The CSS band is the poster and the fallback, so the page is complete without WebGL.
 */
export function ProductViewer({
  form,
  colorHex,
  label,
  hint,
}: {
  form: BandForm
  colorHex: string
  label: string
  hint: string
}) {
  const inputs = useRef<SceneInputs>({
    pointer: { x: 0, y: 0 },
    tilt: { x: 0, y: 0 },
    progress: 0,
    active: true,
  })
  const box = useRef<HTMLDivElement>(null)
  const [Scene, setScene] = useState<SceneComponent | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!canRunWebGL()) return
    return whenIdleOrInteracted(() => {
      void import('@/gl/HeadbandScene').then((m) => setScene(() => m.default))
    })
  }, [])

  // Pause when scrolled away.
  useEffect(() => {
    const el = box.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => {
      inputs.current.active = !!e?.isIntersecting
    })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // Drag to rotate (pointer capture keeps it smooth outside the box).
  const drag = useRef<{ x: number; y: number } | null>(null)
  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    inputs.current.pointer.x += (e.clientX - drag.current.x) / 140
    inputs.current.pointer.y = Math.max(
      -1.6,
      Math.min(1.6, inputs.current.pointer.y + (e.clientY - drag.current.y) / 220),
    )
    drag.current = { x: e.clientX, y: e.clientY }
  }
  const onPointerUp = () => {
    drag.current = null
  }
  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = 0.35
    if (e.key === 'ArrowLeft') inputs.current.pointer.x -= step
    else if (e.key === 'ArrowRight') inputs.current.pointer.x += step
    else if (e.key === 'ArrowUp')
      inputs.current.pointer.y = Math.max(-1.6, inputs.current.pointer.y - step)
    else if (e.key === 'ArrowDown')
      inputs.current.pointer.y = Math.min(1.6, inputs.current.pointer.y + step)
    else return
    e.preventDefault()
  }

  const finish = String(form.finish ?? 'satin')
  const cssBand = {
    '--band-a':
      finish === 'film' ? undefined : `color-mix(in oklch, ${colorHex} 45%, oklch(0.95 0.008 95))`,
    '--band-b': finish === 'film' ? undefined : colorHex,
    '--band-thickness': 'clamp(18px, 3vw, 34px)',
  } as CSSProperties

  return (
    <div
      ref={box}
      tabIndex={0}
      role="img"
      aria-label={label}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="relative aspect-square w-full cursor-grab touch-pan-y select-none active:cursor-grabbing"
      data-cursor
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(50% 50% at 50% 50%, oklch(0.3 0.08 290 / 0.35), transparent 70%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[12%] transition-opacity duration-[1400ms] ease-fluid"
        style={{ opacity: ready ? 0 : 1 }}
      >
        <div className="band-glow" />
        <div className="band-css" style={cssBand} />
      </div>
      {Scene && (
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-[1600ms] ease-fluid"
          style={{ opacity: ready ? 1 : 0 }}
        >
          <Scene
            inputs={inputs}
            form={form}
            color={colorHex}
            mode="viewer"
            label={label}
            onReady={() => setReady(true)}
          />
        </div>
      )}
      <p aria-hidden className="type-label absolute bottom-3 left-1/2 -translate-x-1/2">
        {hint}
      </p>
    </div>
  )
}
