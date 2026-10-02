'use client'

import { useEffect, useRef, useState, type ComponentType } from 'react'
import type HeadbandScene from '@/gl/HeadbandScene'
import type { SceneInputs } from '@/gl/HeadbandScene'
import { heroForm } from '@/gl/finishes'
import { canRunWebGL, whenIdleOrInteracted } from '@/lib/hooks/useWebGLCapable'
import { Link } from '@/i18n/navigation'

type SceneComponent = ComponentType<Parameters<typeof HeadbandScene>[0]>

type Copy = {
  eyebrow: string
  title: string
  lede: string
  cta: string
  scroll: string
  canvasLabel: string
  motionOn: string
  booting: string
  live: string
}

/**
 * The hero: a 220vh scroll stage with a sticky viewport. The CSS band paints instantly
 * (and is the LCP-safe poster); the WebGL object streams in after first interaction / idle
 * and crossfades over it. Scroll turns the object and compresses the headline's width axis.
 */
export function HeroStage({ copy }: { copy: Copy }) {
  const section = useRef<HTMLElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const readout = useRef<HTMLSpanElement>(null)
  const inputs = useRef<SceneInputs>({
    pointer: { x: 0, y: 0 },
    tilt: { x: 0, y: 0 },
    progress: 0,
    active: true,
  })
  const [Scene, setScene] = useState<SceneComponent | null>(null)
  const [ready, setReady] = useState(false)
  const [needsMotionPermission, setNeedsMotionPermission] = useState(false)

  // Lazy-load the WebGL scene on capable devices.
  useEffect(() => {
    if (!canRunWebGL()) return
    return whenIdleOrInteracted(() => {
      void import('@/gl/HeadbandScene').then((m) => setScene(() => m.default))
    })
  }, [])

  // Pointer, scroll progress, visibility, and the live data readout.
  useEffect(() => {
    const el = section.current
    if (!el) return
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    const start = performance.now()

    const onPointer = (e: PointerEvent) => {
      inputs.current.pointer.x = (e.clientX / innerWidth) * 2 - 1
      inputs.current.pointer.y = (e.clientY / innerHeight) * 2 - 1
    }
    const frame = () => {
      const rect = el.getBoundingClientRect()
      const travel = Math.max(1, rect.height - innerHeight)
      const p = Math.min(1, Math.max(0, -rect.top / travel))
      inputs.current.progress = p
      inputs.current.active = rect.bottom > 0 && rect.top < innerHeight
      el.style.setProperty('--p', p.toFixed(4))
      if (title.current && !reduce) {
        // 150 → 62: the headline condenses as the object turns away.
        title.current.style.fontVariationSettings = `'wdth' ${(150 - p * 88).toFixed(1)}`
      }
      if (readout.current) {
        const t = (performance.now() - start) / 1000
        const theta = (35 + inputs.current.pointer.y * 12 + p * 48).toFixed(1).padStart(5, '0')
        const phi = ((t * 4.3 + inputs.current.pointer.x * 28 + p * 109) % 360)
          .toFixed(1)
          .padStart(5, '0')
        readout.current.textContent = `θ ${theta}°  φ ${phi}°  t ${t.toFixed(1).padStart(6, '0')}`
      }
      raf = requestAnimationFrame(frame)
    }
    addEventListener('pointermove', onPointer, { passive: true })
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('pointermove', onPointer)
    }
  }, [])

  // Device tilt (phones). iOS needs an explicit permission tap.
  useEffect(() => {
    if (!matchMedia('(pointer: coarse)').matches || typeof DeviceOrientationEvent === 'undefined')
      return
    const onTilt = (e: DeviceOrientationEvent) => {
      inputs.current.tilt.x = Math.max(-1, Math.min(1, (e.gamma ?? 0) / 35))
      inputs.current.tilt.y = Math.max(-1, Math.min(1, ((e.beta ?? 45) - 45) / 35))
    }
    const needsPermission =
      typeof (DeviceOrientationEvent as unknown as { requestPermission?: unknown })
        .requestPermission === 'function'
    if (needsPermission) {
      // Shown as a button; the permission prompt must come from a user gesture.
      queueMicrotask(() => setNeedsMotionPermission(true))
      ;(window as unknown as { __enableTilt?: () => void }).__enableTilt = () =>
        addEventListener('deviceorientation', onTilt)
    } else {
      addEventListener('deviceorientation', onTilt)
    }
    return () => removeEventListener('deviceorientation', onTilt)
  }, [])

  const requestTilt = async () => {
    const api = DeviceOrientationEvent as unknown as {
      requestPermission: () => Promise<'granted' | 'denied'>
    }
    if ((await api.requestPermission()) === 'granted') {
      ;(window as unknown as { __enableTilt?: () => void }).__enableTilt?.()
      setNeedsMotionPermission(false)
    }
  }

  return (
    <section ref={section} className="relative h-[220vh]" aria-labelledby="hero-title">
      <div className="sticky top-0 h-dvh overflow-hidden">
        {/* Atmosphere */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(60% 50% at 50% 46%, oklch(0.3 0.08 290 / 0.35), transparent 70%), radial-gradient(40% 30% at 70% 70%, oklch(0.5 0.12 170 / 0.12), transparent 70%)',
          }}
        />

        {/* CSS band: poster, fallback and reduced-motion state */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 grid place-items-center transition-opacity duration-[1600ms] ease-fluid"
          style={{ opacity: ready ? 0 : 1 }}
        >
          <div className="relative w-[min(92vw,64rem)] translate-y-[-4vh]">
            <div className="band-glow" />
            <div className="band-css" />
          </div>
        </div>

        {/* WebGL object */}
        {Scene && (
          <div
            className="absolute inset-0 transition-opacity duration-[1800ms] ease-fluid"
            style={{ opacity: ready ? 1 : 0 }}
          >
            <Scene
              inputs={inputs}
              form={heroForm}
              label={copy.canvasLabel}
              onReady={() => setReady(true)}
            />
          </div>
        )}

        {/* Instrument readout */}
        <div className="shell pointer-events-none absolute inset-x-0 top-[calc(var(--header-h)+1rem)] flex justify-between">
          <p className="type-label">{copy.eyebrow}</p>
          <p className="type-label hidden text-right sm:block" aria-hidden>
            <span className="block">{ready ? copy.live : copy.booting}</span>
            <span ref={readout} className="type-data block text-ash-dim">
              θ 035.0° φ 000.0° t 0000.0
            </span>
          </p>
        </div>

        {/* Copy */}
        <div className="shell pointer-events-none absolute inset-x-0 bottom-0 pb-[9vh]">
          <h1
            id="hero-title"
            ref={title}
            className="type-display max-w-[12ch] text-mega will-change-[font-variation-settings]"
            style={{ transform: 'translate3d(0, calc(var(--p, 0) * -6vh), 0)' }}
          >
            {copy.title}
          </h1>
          <div className="mt-8 flex flex-wrap items-end justify-between gap-8">
            <p className="max-w-[36ch] text-lg text-ash">{copy.lede}</p>
            <div className="pointer-events-auto flex items-center gap-6">
              {needsMotionPermission && (
                <button
                  type="button"
                  onClick={requestTilt}
                  className="type-label text-bone! underline underline-offset-8"
                >
                  {copy.motionOn}
                </button>
              )}
              <Link
                href="/products"
                className="type-label group flex items-center gap-3 rounded-full border border-hairline-strong px-6 py-4 text-bone! transition-colors duration-500 hover:bg-bone hover:text-void!"
              >
                {copy.cta}
                <span
                  aria-hidden
                  className="transition-transform duration-700 ease-fluid group-hover:translate-x-1"
                >
                  →
                </span>
              </Link>
            </div>
          </div>
        </div>

        <p
          aria-hidden
          className="type-label absolute bottom-6 left-1/2 -translate-x-1/2"
          style={{ opacity: 'calc(1 - var(--p, 0) * 6)' }}
        >
          {copy.scroll}
        </p>
      </div>
    </section>
  )
}
