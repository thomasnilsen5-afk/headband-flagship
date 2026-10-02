'use client'

import { useEffect, useState } from 'react'

type Units = { d: string; h: string; m: string; s: string }

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  }
}

/** Live countdown. Renders the server time first, then ticks; screen readers get a calm summary. */
export function Countdown({
  to,
  units,
  liveLabel,
}: {
  to: string
  units: Units
  liveLabel: string
}) {
  const target = new Date(to).getTime()
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    const tick = () => setNow(Date.now())
    const first = window.setTimeout(tick, 0)
    const id = window.setInterval(tick, 1000)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(id)
    }
  }, [])

  const remaining = now === null ? null : target - now
  if (remaining !== null && remaining <= 0) {
    return <p className="type-display text-film text-display">{liveLabel}</p>
  }
  const p = parts(remaining ?? 0)
  const cells: [keyof Units, number][] = [
    ['d', p.d],
    ['h', p.h],
    ['m', p.m],
    ['s', p.s],
  ]
  return (
    <div>
      <p className="sr-only">
        {p.d} {units.d}, {p.h} {units.h}, {p.m} {units.m}
      </p>
      <ol className="grid grid-cols-4 gap-px overflow-hidden rounded-sm bg-hairline" aria-hidden>
        {cells.map(([k, v]) => (
          <li key={k} className="bg-void px-3 py-6 sm:px-6">
            <span className="type-data block text-[clamp(2.5rem,7vw,6.5rem)] leading-none font-extralight tracking-[-0.05em] tabular-nums">
              {remaining === null ? '––' : String(v).padStart(2, '0')}
            </span>
            <span className="type-label mt-3 block">{units[k]}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
