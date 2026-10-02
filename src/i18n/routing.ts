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
    '/checkout/confirmation': { nb: '/kasse/bekreftelse', en: '/checkout/confirmation' },
    '/checkout/test-payment': { nb: '/kasse/testbetaling', en: '/checkout/test-payment' },
    '/account': { nb: '/konto', en: '/account' },
    '/account/sign-in': { nb: '/konto/logg-inn', en: '/account/sign-in' },
    '/account/orders/[id]': { nb: '/konto/ordre/[id]', en: '/account/orders/[id]' },
    '/privacy': { nb: '/personvern', en: '/privacy' },
    '/terms': { nb: '/vilkar', en: '/terms' },
    '/returns': { nb: '/retur-og-angrerett', en: '/returns' },
    '/cookies': { nb: '/informasjonskapsler', en: '/cookies' },
  },
})

export type AppPathname = keyof typeof routing.pathnames
