import { createServerClient } from '@supabase/ssr'
import createIntlMiddleware from 'next-intl/middleware'
import { type NextRequest } from 'next/server'
import { routing } from './i18n/routing'

const intl = createIntlMiddleware(routing)

// Only these areas need a live Supabase session. Everything else stays cacheable.
const AUTH_AREAS = /^\/(en\/)?(konto|account|kasse|checkout|admin)(\/|$)/

export default async function proxy(request: NextRequest) {
  const response = intl(request)

  if (AUTH_AREAS.test(request.nextUrl.pathname)) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
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
  }

  return response
}

export const config = {
  // Skip API routes, Next internals, Vercel internals and files with an extension.
  matcher: ['/((?!api|_next|_vercel|monitoring|.*\\..*).*)'],
}
