import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import type { Metadata, Viewport } from 'next'
import { notFound } from 'next/navigation'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import type { ReactNode } from 'react'
import { anybody, azeret } from '@/app/fonts'
import { CursorHalo } from '@/components/shell/CursorHalo'
import { Footer } from '@/components/shell/Footer'
import { Header } from '@/components/shell/Header'
import { NavigationTransitions } from '@/components/shell/NavigationTransitions'
import { SmoothScroll } from '@/components/shell/SmoothScroll'
import { routing } from '@/i18n/routing'
import { brand } from '@/lib/brand'
import { siteUrl } from '@/lib/env'

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export const viewport: Viewport = {
  themeColor: '#07090d',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'meta' })
  return {
    metadataBase: new URL(siteUrl),
    title: { default: t('title'), template: `%s — ${brand.name}` },
    description: t('description'),
    applicationName: brand.name,
    alternates: {
      canonical: locale === routing.defaultLocale ? '/' : `/${locale}`,
      languages: { nb: '/', en: '/en', 'x-default': '/' },
    },
    openGraph: {
      type: 'website',
      siteName: brand.name,
      locale: locale === 'nb' ? 'nb_NO' : 'en_GB',
      title: t('title'),
      description: t('description'),
    },
    twitter: { card: 'summary_large_image' },
    robots:
      process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production'
        ? { index: false, follow: false }
        : { index: true, follow: true },
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'a11y' })
  // Client components only need these namespaces; the rest stays on the server.
  const { a11y } = await getMessages({ locale })

  return (
    <html lang={locale === 'nb' ? 'nb' : 'en'} className={`${anybody.variable} ${azeret.variable}`}>
      <body>
        <a
          href="#main"
          className="type-label fixed top-3 left-3 z-[100] -translate-y-24 bg-bone px-4 py-3 text-void! transition-transform focus:translate-y-0"
        >
          {t('skip')}
        </a>
        <NextIntlClientProvider messages={{ a11y }}>
          <SmoothScroll />
          <NavigationTransitions />
          <Header />
          <main id="main" tabIndex={-1} className="outline-none">
            {children}
          </main>
          <Footer />
          <CursorHalo />
        </NextIntlClientProvider>
        <div className="grain" aria-hidden />
        {process.env.VERCEL && (
          <>
            <Analytics />
            <SpeedInsights />
          </>
        )}
      </body>
    </html>
  )
}
