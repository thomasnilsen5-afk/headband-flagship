import type { CSSProperties } from 'react'

const filmStops = [
  'oklch(0.88 0.17 170)',
  'oklch(0.68 0.26 300)',
  'oklch(0.86 0.12 85)',
  'oklch(0.35 0.03 255)',
]
const chromeStops = [
  'oklch(0.97 0.005 255)',
  'oklch(0.55 0.01 255)',
  'oklch(0.9 0.01 255)',
  'oklch(0.25 0.012 255)',
]

/** The CSS band, tinted per product finish and colour. No WebGL in listings. */
export function ObjectBand({
  finish,
  hex,
  size = 'md',
  roll = -8,
}: {
  finish: string
  hex: string
  size?: 'md' | 'lg'
  roll?: number
}) {
  const stops =
    finish === 'film'
      ? filmStops
      : finish === 'chrome'
        ? [chromeStops[0], hex, chromeStops[2], chromeStops[3]]
        : [
            `color-mix(in oklch, ${hex} 45%, oklch(0.95 0.008 95))`,
            hex,
            `color-mix(in oklch, ${hex} 70%, oklch(0.68 0.26 300))`,
            `color-mix(in oklch, ${hex} 60%, oklch(0.88 0.17 170))`,
          ]
  const style = {
    '--band-a': stops[0],
    '--band-b': stops[1],
    '--band-c': stops[2],
    '--band-d': stops[3],
    '--band-thickness': size === 'lg' ? 'clamp(18px, 3vw, 34px)' : 'clamp(14px, 2.2vw, 24px)',
    '--band-roll': `${roll}deg`,
  } as CSSProperties
  return (
    <div className="relative aspect-square w-full" aria-hidden>
      <div className="band-glow opacity-60" />
      <div
        className="band-css transition-transform duration-[1400ms] ease-fluid group-hover:[--band-tilt:48deg]"
        style={style}
      />
    </div>
  )
}
