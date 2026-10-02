import { describe, expect, it } from 'vitest'
import { waitlistSchema } from '@/lib/schemas/waitlist'

const dropId = '6f1c8c1e-1d2b-4c43-9a43-7b8e3f5d9a10'
const variantId = '0b8f7e6d-5c4b-4a39-8281-7f6e5d4c3b2a'
const base = { email: 'Ola@Example.no ', locale: 'nb', consent: 'on' } as const

describe('waitlistSchema', () => {
  it('accepts a drop signup and normalises the email', () => {
    const r = waitlistSchema.safeParse({ ...base, kind: 'drop', dropId })
    expect(r.success).toBe(true)
    expect(r.success && r.data.email).toBe('ola@example.no')
  })
  it('accepts a back-in-stock signup', () => {
    expect(waitlistSchema.safeParse({ ...base, kind: 'back_in_stock', variantId }).success).toBe(
      true,
    )
  })
  it('requires explicit consent', () => {
    const r = waitlistSchema.safeParse({ ...base, consent: undefined, kind: 'drop', dropId })
    expect(r.success).toBe(false)
    expect(!r.success && r.error.issues.some((i) => i.message === 'consent_required')).toBe(true)
  })
  it('rejects mismatched targets and bad emails', () => {
    expect(waitlistSchema.safeParse({ ...base, kind: 'drop', variantId }).success).toBe(false)
    expect(waitlistSchema.safeParse({ ...base, kind: 'back_in_stock', dropId }).success).toBe(false)
    expect(waitlistSchema.safeParse({ ...base, kind: 'drop', dropId, email: 'nope' }).success).toBe(
      false,
    )
    expect(waitlistSchema.safeParse({ ...base, kind: 'drop', dropId: 'x' }).success).toBe(false)
  })
  it('flags the honeypot', () => {
    expect(
      waitlistSchema.safeParse({ ...base, kind: 'drop', dropId, company: 'Bot AS' }).success,
    ).toBe(false)
  })
})
