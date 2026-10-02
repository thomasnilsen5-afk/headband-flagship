import type { SVGProps } from 'react'

/**
 * PLACEHOLDER wordmark for the working name. Drawn with geometric primitives so the
 * letterforms share one stroke and one radius (impossible-symmetry rule: H and A mirror Y).
 */
export function Wordmark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 120 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
      {...props}
    >
      {/* H */}
      <path d="M1 1v18M19 1v18M1 10h18" />
      {/* Y */}
      <path d="M31 1l9 9 9-9M40 10v9" />
      {/* A */}
      <path d="M61 19l9-18 9 18M64.5 12h11" />
      {/* L */}
      <path d="M91 1v18h18" />
      {/* the dot: a band seen edge-on */}
      <ellipse cx="116" cy="17.5" rx="3" ry="1" strokeWidth="1.2" />
    </svg>
  )
}
