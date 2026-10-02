// Client error monitoring: errors only (no replay, no tracing), and loaded lazily after the
// page has finished loading, and only when a DSN is configured. Keeps ~120 KB of Sentry out
// of the critical path so the 95+ mobile Lighthouse budget holds. Trade-off: errors thrown
// before `load` are not reported from the browser (server errors always are).
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn && typeof window !== 'undefined') {
  const start = () =>
    void import('@sentry/nextjs').then((Sentry) =>
      Sentry.init({
        dsn,
        environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
        sendDefaultPii: false,
        tracesSampleRate: 0,
      }),
    )
  if (document.readyState === 'complete') setTimeout(start, 0)
  else addEventListener('load', () => setTimeout(start, 0), { once: true })
}

export {}
