import { describe, expect, it } from 'vitest'
import { normalizeSiteUrl } from '@/lib/url'

describe('normalizeSiteUrl', () => {
  it('adds https:// to bare domains', () => {
    expect(normalizeSiteUrl('headband-flagship.vercel.app')).toBe(
      'https://headband-flagship.vercel.app',
    )
    expect(normalizeSiteUrl(' example.no/ ')).toBe('https://example.no')
  })
  it('keeps explicit schemes and strips trailing slashes', () => {
    expect(normalizeSiteUrl('http://localhost:3000/')).toBe('http://localhost:3000')
    expect(normalizeSiteUrl('https://hyal.no')).toBe('https://hyal.no')
  })
  it('treats blanks as missing', () => {
    expect(normalizeSiteUrl('')).toBeUndefined()
    expect(normalizeSiteUrl('   ')).toBeUndefined()
    expect(normalizeSiteUrl(undefined)).toBeUndefined()
  })
})
