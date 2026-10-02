/** Surface presets for the procedural band. Product rows choose one via products.form.finish. */
export type Finish = 'chrome' | 'film' | 'satin' | 'knit'

export type FinishParams = {
  chrome: number // 0 = dielectric fabric, 1 = mirror
  film: number // thin-film interference strength
  rough: number // blurs the environment
  knit: number // microstructure strength
  tint: number // how much the variant colour tints the metal
}

export const finishes: Record<Finish, FinishParams> = {
  chrome: { chrome: 1, film: 0.35, rough: 0.04, knit: 0, tint: 0.45 },
  film: { chrome: 1, film: 1, rough: 0.06, knit: 0, tint: 0 },
  satin: { chrome: 0.45, film: 0.2, rough: 0.5, knit: 0.25, tint: 0.6 },
  knit: { chrome: 0.18, film: 0.08, rough: 0.82, knit: 1, tint: 0.6 },
}

export type BandForm = {
  width_mm?: number
  thickness?: number
  twist?: number
  waves?: number
  finish?: Finish
}

export const heroForm: Required<BandForm> = {
  width_mm: 44,
  thickness: 0.07,
  twist: 0.22,
  waves: 3,
  finish: 'chrome',
}
