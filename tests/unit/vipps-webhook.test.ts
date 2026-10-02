import { createHash, createHmac } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
const { verifyVippsWebhook, orderNumberFromReference, vippsReference } =
  await import('@/lib/payments/vipps')

const secret = 'whsec-test-secret'
function sign(
  body: string,
  path = '/api/webhooks/vipps',
  host = 'shop.example',
  date = 'Thu, 02 Oct 2026 19:00:00 GMT',
) {
  const hash = createHash('sha256').update(body).digest('base64')
  const sig = createHmac('sha256', secret)
    .update(`POST\n${path}\n${date};${host};${hash}`)
    .digest('base64')
  return {
    hash,
    date,
    authorization: `HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=${sig}`,
  }
}

describe('Vipps webhook verification', () => {
  const body = JSON.stringify({
    reference: 'hyal-100001',
    name: 'AUTHORIZED',
    amount: { value: 73900 },
  })
  it('accepts a correctly signed request', () => {
    const s = sign(body)
    expect(
      verifyVippsWebhook({
        body,
        pathAndQuery: '/api/webhooks/vipps',
        host: 'shop.example',
        date: s.date,
        contentSha256: s.hash,
        authorization: s.authorization,
        secret,
      }),
    ).toBe(true)
  })
  it('rejects a tampered body, wrong secret, wrong host or missing headers', () => {
    const s = sign(body)
    const base = {
      pathAndQuery: '/api/webhooks/vipps',
      host: 'shop.example',
      date: s.date,
      contentSha256: s.hash,
      authorization: s.authorization,
      secret,
    }
    expect(verifyVippsWebhook({ ...base, body: body.replace('73900', '1') })).toBe(false)
    expect(verifyVippsWebhook({ ...base, body, secret: 'other' })).toBe(false)
    expect(verifyVippsWebhook({ ...base, body, host: 'evil.example' })).toBe(false)
    expect(verifyVippsWebhook({ ...base, body, authorization: null })).toBe(false)
  })
  it('round-trips order references', () => {
    expect(orderNumberFromReference(vippsReference(100042))).toBe(100042)
    expect(orderNumberFromReference('other-1')).toBeNull()
  })
})
