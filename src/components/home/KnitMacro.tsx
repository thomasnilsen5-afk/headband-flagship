/**
 * Microscopic knit structure at ×400: one single-jersey stitch defined once as an SVG
 * pattern and tiled, masked onto a thin-film gradient. A few hundred bytes, no image.
 */
export function KnitMacro({ className = '' }: { className?: string }) {
  const stitch = 'M4 0C2 12 14 26 20 34C26 26 38 12 36 0'
  return (
    <svg viewBox="0 0 360 360" className={className} aria-hidden>
      <defs>
        <pattern id="knit-stitch" width="40" height="30" patternUnits="userSpaceOnUse">
          <path d={stitch} fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
          <path d={stitch} fill="none" stroke="#000" strokeWidth="1.2" opacity="0.6" />
        </pattern>
        <radialGradient id="knit-fade">
          <stop offset="0.35" stopColor="#fff" />
          <stop offset="1" stopColor="#000" />
        </radialGradient>
        <mask id="knit-mask">
          <rect width="360" height="360" fill="url(#knit-stitch)" />
        </mask>
        <mask id="knit-vignette">
          <rect width="360" height="360" fill="url(#knit-fade)" />
        </mask>
        <linearGradient id="knit-film" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="oklch(0.88 0.17 170)" />
          <stop offset="0.45" stopColor="oklch(0.68 0.26 300)" />
          <stop offset="0.75" stopColor="oklch(0.86 0.12 85)" />
          <stop offset="1" stopColor="oklch(0.88 0.17 170)" />
        </linearGradient>
      </defs>
      <g mask="url(#knit-vignette)">
        <rect width="360" height="360" fill="url(#knit-film)" mask="url(#knit-mask)" />
      </g>
    </svg>
  )
}
