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
    '/account/addresses': { nb: '/konto/adresser', en: '/account/addresses' },
    '/account/wishlist': { nb: '/konto/onskeliste', en: '/account/wishlist' },
    '/account/review/[slug]': { nb: '/konto/anmeld/[slug]', en: '/account/review/[slug]' },
    // Back office: Norwegian-only tool, same paths in both locales.
    '/admin': '/admin',
    '/admin/orders': { nb: '/admin/ordre', en: '/admin/orders' },
    '/admin/orders/[id]': { nb: '/admin/ordre/[id]', en: '/admin/orders/[id]' },
    '/admin/stock': { nb: '/admin/lager', en: '/admin/stock' },
    '/admin/returns': { nb: '/admin/retur', en: '/admin/returns' },
    '/admin/reviews': { nb: '/admin/anmeldelser', en: '/admin/reviews' },
    '/privacy': { nb: '/personvern', en: '/privacy' },
    '/terms': { nb: '/vilkar', en: '/terms' },
    '/returns': { nb: '/retur-og-angrerett', en: '/returns' },
    '/cookies': { nb: '/informasjonskapsler', en: '/cookies' },
  },
})

export type AppPathname = keyof typeof routing.pathnames
