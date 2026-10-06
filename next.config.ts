import { withSentryConfig } from '@sentry/nextjs/config'
import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'
import { securityHeaders } from './src/lib/security/headers'
import { normalizeSiteUrl } from './src/lib/url'

// Normalised like src/lib/env.ts: a bare domain or a blank value must never crash the build
// here, before env validation can explain what is wrong.
const supabaseUrl =
  normalizeSiteUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) ?? 'https://example.supabase.co'
const dev = process.env.NODE_ENV !== 'production'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: new URL(supabaseUrl).hostname, pathname: '/storage/v1/**' },
    ],
  },
  experimental: {
    optimizePackageImports: ['three', '@react-three/fiber'],
    // ~11 KB of CSS: inlining removes two render-blocking requests from the LCP path.
    inlineCss: true,
    // Review photos are downscaled in the browser first (~0.3 MB each); this leaves room for
    // three while staying under Vercel's 4.5 MB request limit.
    serverActions: { bodySizeLimit: '4mb' },
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders({ supabaseUrl, dev }) }]
  },
}

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  telemetry: false,
})
