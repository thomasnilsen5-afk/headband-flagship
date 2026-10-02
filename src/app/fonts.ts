import localFont from 'next/font/local'

/** Anybody: variable width (50–150) and weight. The display voice and the body text. */
export const anybody = localFont({
  src: './fonts/anybody.woff2',
  variable: '--font-anybody',
  weight: '100 900',
  display: 'swap',
  preload: true,
  declarations: [{ prop: 'font-stretch', value: '50% 150%' }],
})

/** Azeret Mono: precise numerals for prices, specs and data. */
export const azeret = localFont({
  src: './fonts/azeret-mono.woff2',
  variable: '--font-azeret',
  weight: '100 900',
  display: 'swap',
  preload: false,
})
