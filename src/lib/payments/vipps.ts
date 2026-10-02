import 'server-only'
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { requireServerEnv, serverEnv } from '@/lib/env.server'
import type { PaymentRequest, PaymentStart } from './types'

/**
 * Vipps MobilePay ePayment API v1. WEB_REDIRECT flow: the customer approves in the app,
 * the amount is reserved (AUTHORIZED) and captured when the order ships.
 */
const base = () =>
  serverEnv().VIPPS_ENV === 'production' ? 'https://api.vipps.no' : 'https://apitest.vipps.no'

function systemHeaders() {
  return {
    'Ocp-Apim-Subscription-Key': requireServerEnv('VIPPS_SUBSCRIPTION_KEY'),
    'Merchant-Serial-Number': requireServerEnv('VIPPS_MSN'),
    'Vipps-System-Name': 'hyal-flagship',
    'Vipps-System-Version': '1.0.0',
    'Vipps-System-Plugin-Name': 'nextjs',
    'Vipps-System-Plugin-Version': '16',
  }
}

let token: { value: string; expires: number } | undefined
async function accessToken(): Promise<string> {
  if (token && token.expires > Date.now() + 60_000) return token.value
  const res = await fetch(`${base()}/accesstoken/get`, {
    method: 'POST',
    headers: {
      client_id: requireServerEnv('VIPPS_CLIENT_ID'),
      client_secret: requireServerEnv('VIPPS_CLIENT_SECRET'),
      ...systemHeaders(),
    },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Vipps token ${res.status}`)
  const json = (await res.json()) as { access_token: string; expires_in: string | number }
  token = { value: json.access_token, expires: Date.now() + Number(json.expires_in) * 1000 }
  return token.value
}

/** Reference shown to Vipps and in webhooks; the order number is recoverable from it. */
export const vippsReference = (orderNumber: number) => `hyal-${orderNumber}`
export const orderNumberFromReference = (ref: string) => {
  const m = /^hyal-(\d+)$/.exec(ref)
  return m ? Number(m[1]) : null
}

export async function createVippsPayment(req: PaymentRequest): Promise<PaymentStart> {
  const reference = vippsReference(req.orderNumber)
  const phone = req.phone?.replace(/\D/g, '')
  const res = await fetch(`${base()}/epayment/v1/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `create-${req.orderId}`,
      ...systemHeaders(),
    },
    body: JSON.stringify({
      amount: { currency: 'NOK', value: req.totalOre },
      paymentMethod: { type: 'WALLET' },
      customer:
        phone && phone.length >= 8
          ? { phoneNumber: phone.length === 8 ? `47${phone}` : phone }
          : undefined,
      reference,
      returnUrl: req.returnUrl,
      userFlow: 'WEB_REDIRECT',
      paymentDescription:
        req.locale === 'nb' ? `Ordre ${req.orderNumber}` : `Order ${req.orderNumber}`,
    }),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Vipps create ${res.status}: ${await res.text()}`)
  const json = (await res.json()) as { redirectUrl: string }
  return { redirectUrl: json.redirectUrl, providerRef: reference }
}

export async function getVippsPayment(reference: string) {
  const res = await fetch(`${base()}/epayment/v1/payments/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${await accessToken()}`, ...systemHeaders() },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Vipps get ${res.status}`)
  return (await res.json()) as {
    state: 'CREATED' | 'AUTHORIZED' | 'ABORTED' | 'EXPIRED' | 'TERMINATED'
    pspReference: string
    aggregate: { authorizedAmount: { value: number }; capturedAmount: { value: number } }
  }
}

/**
 * Webhook authentication (Vipps Webhooks API): the body hash must match x-ms-content-sha256, and
 * the HMAC-SHA256 of "POST\n<path+query>\n<date>;<host>;<hash>" with the webhook secret must
 * match the Authorization signature. Constant-time comparisons throughout.
 */
export function verifyVippsWebhook(opts: {
  body: string
  pathAndQuery: string
  host: string
  date: string | null
  contentSha256: string | null
  authorization: string | null
  secret: string
}): boolean {
  const { body, pathAndQuery, host, date, contentSha256, authorization, secret } = opts
  if (!date || !contentSha256 || !authorization) return false
  const actualHash = createHash('sha256').update(body, 'utf8').digest('base64')
  if (!safeEqual(actualHash, contentSha256)) return false
  const signed = `POST\n${pathAndQuery}\n${date};${host};${contentSha256}`
  const expected = createHmac('sha256', secret).update(signed, 'utf8').digest('base64')
  const match = /Signature=([^&\s]+)/.exec(authorization)
  return !!match && safeEqual(expected, match[1]!)
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}
