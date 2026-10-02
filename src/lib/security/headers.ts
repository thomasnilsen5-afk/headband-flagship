/**
 * Security headers applied to every response (next.config.ts → headers()).
 *
 * CSP trade-off, documented on purpose: public pages are statically generated / ISR so they
 * can be served from the edge cache, which rules out per-request nonces. They therefore allow
 * inline scripts (Next's hydration payload) but nothing else: no third-party script origins
 * beyond the payment providers, no eval in production, no plugins, no framing, no base-uri.
 * Checkout, account and admin are dynamic; phase 4 adds a strict nonce-based CSP for them in
 * proxy.ts (browsers enforce both policies, so the stricter one wins there).
 */
export function buildCsp({ supabaseUrl, dev }: { supabaseUrl: string; dev: boolean }): string {
  const supabase = new URL(supabaseUrl)
  const supabaseWs = `wss://${supabase.host}`
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
    'form-action': ["'self'"],
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
