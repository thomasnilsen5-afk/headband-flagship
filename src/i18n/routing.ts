import { defineRouting } from 'next-intl/routing'

export const locales = ['nb', 'en'] as const
export type Locale = (typeof locales)[number]

/**
 * Norwegian is the default and lives at the root (/produkter). English is prefixed (/en/products).
 * Localised pathnames are good for SEO and for people.
 */
export const routing = defineRouting({
  locales,
  defaultLocale: 'nb',
  localePrefix: 'as-needed',
  localeDetection: false,
  pathnames: {
    '/': '/',
    '/products': { nb: '/produkter', en: '/products' },
    '/products/[slug]': { nb: '/produkter/[slug]', en: '/products/[slug]' },
    '/drops/[slug]': { nb: '/drop/[slug]', en: '/drops/[slug]' },
    '/search': { nb: '/sok', en: '/search' },
    '/cart': { nb: '/handlekurv', en: '/cart' },
    '/checkout': { nb: '/kasse', en: '/checkout' },
    '/account': { nb: '/konto', en: '/account' },
    '/privacy': { nb: '/personvern', en: '/privacy' },
    '/terms': { nb: '/vilkar', en: '/terms' },
    '/returns': { nb: '/retur-og-angrerett', en: '/returns' },
    '/cookies': { nb: '/informasjonskapsler', en: '/cookies' },
  },
})

export type AppPathname = keyof typeof routing.pathnames
