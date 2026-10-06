/** Rating as five glyphs; the number is the accessible name, the glyphs are decoration. */
export function Stars({
  rating,
  label,
  size = 'text-base',
}: {
  rating: number
  label: string
  size?: string
}) {
  return (
    <span role="img" aria-label={label} className={`inline-flex gap-0.5 ${size} leading-none`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          aria-hidden
          className={n <= Math.round(rating) ? 'text-ichor' : 'text-ash-dim'}
        >
          {n <= Math.round(rating) ? '◆' : '◇'}
        </span>
      ))}
    </span>
  )
}
