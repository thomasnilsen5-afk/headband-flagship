import localFont from 'next/font/local'

/**
 * Layout shift budget (CLS ≤ 0.05) with a display face at width 150, far wider than any
 * fallback: Anybody blocks briefly (preloaded, 49 KB) and the hero headline has explicit,
 * no-wrap lines so its box never depends on font metrics. Azeret Mono is `optional`: if it
 * isn't ready in ~100 ms the system mono is used for that visit, so labels never reflow.
 */

/** Anybody: variable width (50–150) and weight. The display voice and the body text. */
export const anybody = localFont({
  src: './fonts/anybody.woff2',
  variable: '--font-anybody',
  weight: '100 900',
  display: 'block',
  preload: true,
  declarations: [{ prop: 'font-stretch', value: '50% 150%' }],
})

/** Azeret Mono: precise numerals for prices, specs and data. */
export const azeret = localFont({
  src: './fonts/azeret-mono.woff2',
  variable: '--font-azeret',
  weight: '100 900',
  display: 'optional',
  preload: true,
})
