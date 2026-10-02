'use client'

/**
 * Decides whether this device gets the real-time WebGL object or the CSS band.
 * Weak devices, data-saver, reduced motion and missing WebGL2 all get the CSS version,
 * which is designed to stand on its own rather than look like a fallback.
 */
export function canRunWebGL(): boolean {
  if (typeof window === 'undefined') return false
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  const nav = navigator as Navigator & {
    deviceMemory?: number
    connection?: { saveData?: boolean }
  }
  if (nav.connection?.saveData) return false
  if ((nav.deviceMemory ?? 8) < 4) return false
  if ((nav.hardwareConcurrency ?? 8) < 4) return false
  try {
    const gl = document.createElement('canvas').getContext('webgl2')
    return !!gl
  } catch {
    return false
  }
}

/**
 * Loads heavy work only when it can't hurt first paint: on first interaction, or (fine
 * pointers only) when the browser is idle after load. Touch devices wait for a touch or scroll.
 */
export function whenIdleOrInteracted(cb: () => void): () => void {
  let done = false
  const run = () => {
    if (done) return
    done = true
    cleanup()
    cb()
  }
  const events = ['pointermove', 'pointerdown', 'scroll', 'keydown', 'touchstart'] as const
  for (const e of events) addEventListener(e, run, { once: true, passive: true })
  let idleId: number | undefined
  let timer: number | undefined
  const fine = matchMedia('(pointer: fine)').matches
  const schedule = () => {
    timer = window.setTimeout(() => {
      if (typeof requestIdleCallback === 'function')
        idleId = requestIdleCallback(run, { timeout: 2000 })
      else run()
    }, 1200)
  }
  if (fine) {
    if (document.readyState === 'complete') schedule()
    else addEventListener('load', schedule, { once: true })
  }
  function cleanup() {
    for (const e of events) removeEventListener(e, run)
    removeEventListener('load', schedule)
    if (timer) clearTimeout(timer)
    if (idleId !== undefined) cancelIdleCallback(idleId)
  }
  return () => {
    done = true
    cleanup()
  }
}
