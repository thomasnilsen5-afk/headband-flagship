import { createServerClient } from '@supabase/ssr'
import createIntlMiddleware from 'next-intl/middleware'
import { NextRequest } from 'next/server'
import { routing } from './i18n/routing'
import { strictCsp } from './lib/security/headers'
import { normalizeSiteUrl } from './lib/url'

const intl = createIntlMiddleware(routing)

// Only these areas need a live Supabase session. Everything else stays cacheable.
const AUTH_AREAS = /^\/(en\/)?(konto|account|kasse|checkout|admin)(\/|$)/

export default async function proxy(request: NextRequest) {
  if (!AUTH_AREAS.test(request.nextUrl.pathname)) return intl(request)

  // Next reads the nonce from the request's CSP header and stamps it on its own scripts;
  // next-intl forwards request headers through its rewrite.
  const nonce = btoa(crypto.randomUUID())
  const csp = strictCsp(nonce, process.env.NODE_ENV === 'development')
  const headers = new Headers(request.headers)
  headers.set('content-security-policy', csp)
  const response = intl(new NextRequest(request, { headers }))
  response.headers.set('Content-Security-Policy', csp)

  const supabase = createServerClient(
    // Read directly (validated at build by src/lib/env.ts) to keep the proxy bundle tiny.
    normalizeSiteUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          for (const { name, value, options } of toSet) response.cookies.set(name, value, options)
        },
      },
    },
  )
  // Refreshes an expiring session and writes the new cookies onto the response.
  await supabase.auth.getUser()
  response.headers.set('Cache-Control', 'private, no-store')

  return response
}

export const config = {
  // Skip API and auth callback routes, Next internals, Vercel internals and files with an extension.
  matcher: ['/((?!api|auth|og|_next|_vercel|monitoring|.*\\..*).*)'],
}
