/**
 * Normalises a site URL from configuration: adds https:// when the scheme is missing (a common
 * way to paste a domain into Vercel), and strips trailing slashes. Returns undefined for blanks.
 */
export function normalizeSiteUrl(value: string | undefined | null): string | undefined {
  const v = value?.trim()
  if (!v) return undefined
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(v) ? v : `https://${v}`
  return withScheme.replace(/\/+$/, '')
}
