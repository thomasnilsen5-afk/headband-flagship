/**
 * Security headers applied to every response (next.config.ts → headers()).
 *
 * CSP trade-off, documented on purpose: public pages are statically generated / ISR so they
 * can be served from the edge cache, which rules out per-request nonces. They therefore allow
 * inline scripts (Next's hydration payload) but nothing else: no third-party script origins
 * beyond the payment providers, no eval in production, no plugins, no framing, no base-uri.
 * Checkout, account and admin are dynamic and get a second, nonce-based policy from proxy.ts
 * (strictCsp below). Browsers enforce every policy they receive, so there the stricter one wins.
 */
const PAYMENT_ORIGINS = [
  'https://checkout.stripe.com',
  'https://*.vipps.no',
  'https://*.mobilepay.dk',
  'https://*.mobilepay.fi',
  'https://*.klarna.com',
]

/** Per-request policy for the money pages: only scripts carrying this response's nonce run. */
export function strictCsp(nonce: string, dev: boolean): string {
  return [
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}`,
    "object-src 'none'",
    "base-uri 'self'",
  ].join('; ')
}

export function buildCsp({ supabaseUrl, dev }: { supabaseUrl: string; dev: boolean }): string {
  const supabase = new URL(supabaseUrl)
  const supabaseWs = `${supabase.protocol === 'https:' ? 'wss' : 'ws'}://${supabase.host}`
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'",
      ...(dev ? ["'unsafe-eval'"] : []),
      'https://js.stripe.com',
      'https://va.vercel-scripts.com',
    ],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', supabase.origin, 'https://*.stripe.com'],
    'font-src': ["'self'"],
    'connect-src': [
      "'self'",
      supabase.origin,
      supabaseWs,
      'https://api.stripe.com',
      'https://*.ingest.sentry.io',
      'https://*.ingest.de.sentry.io',
      'https://vitals.vercel-insights.com',
      ...(dev ? ['ws:'] : []),
    ],
    'frame-src': ['https://js.stripe.com', 'https://hooks.stripe.com'],
    'worker-src': ["'self'", 'blob:'],
    'media-src': ["'self'", 'blob:', supabase.origin],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    // Non-JS form posts to the checkout action end in a redirect to the payment provider, and
    // Chromium checks form-action against redirect targets too.
    'form-action': ["'self'", ...PAYMENT_ORIGINS],
    'frame-ancestors': ["'none'"],
    'manifest-src': ["'self'"],
  }
  const csp = Object.entries(directives)
    .map(([k, v]) => `${k} ${v.join(' ')}`)
    .join('; ')
  return dev ? csp : `${csp}; upgrade-insecure-requests`
}

export function securityHeaders(opts: { supabaseUrl: string; dev: boolean }) {
  return [
    { key: 'Content-Security-Policy', value: buildCsp(opts) },
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
    {
      key: 'Permissions-Policy',
      value: [
        'camera=()',
        'microphone=()',
        'geolocation=()',
        'browsing-topics=()',
        'payment=(self "https://js.stripe.com")',
        // The hero responds to device tilt.
        'accelerometer=(self)',
        'gyroscope=(self)',
      ].join(', '),
    },
  ]
}
