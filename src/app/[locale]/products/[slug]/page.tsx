import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { BundleCard } from '@/components/product/BundleCard'
import { Reveal } from '@/components/motion/Reveal'
import { ProductExperience } from '@/components/product/ProductExperience'
import type { BandForm } from '@/gl/finishes'
import { getPathname, Link } from '@/i18n/navigation'
import { routing, type Locale } from '@/i18n/routing'
import { getProduct, getProductSlugs } from '@/lib/catalog'
import { WishlistButton } from '@/components/account/WishlistButton'
import { Reviews } from '@/components/reviews/Reviews'
import { dropPhase } from '@/lib/commerce'
import { siteUrl } from '@/lib/env'
import { getPublishedReviews } from '@/lib/reviews'
import { jsonLdScript, productJsonLd } from '@/lib/seo/jsonld'

export const revalidate = 300

export async function generateStaticParams() {
  return (await getProductSlugs()).map((slug) => ({ slug }))
}

type Props = { params: Promise<{ locale: string; slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const product = await getProduct(slug, locale as Locale)
  if (!product) return {}
  const path = (l: Locale) =>
    getPathname({ href: { pathname: '/products/[slug]', params: { slug } }, locale: l })
  const description = `${product.tagline} ${product.description}`.slice(0, 160)
  return {
    title: product.name,
    description,
    alternates: {
      canonical: path(locale as Locale),
      languages: Object.fromEntries(routing.locales.map((l) => [l, path(l)])),
    },
    openGraph: {
      title: product.name,
      description,
      images: [{ url: `/og/products/${slug}`, width: 1200, height: 630, alt: product.name }],
    },
  }
}

export default async function ProductPage({ params }: Props) {
  const { locale: l, slug } = await params
  const locale = l as Locale
  setRequestLocale(locale)
  const product = await getProduct(slug, locale)
  if (!product) notFound()

  const t = await getTranslations('product')
  const tw = await getTranslations('waitlist')
  const tc = await getTranslations('catalog')
  const td = await getTranslations('drop')
  const tcart = await getTranslations('cart')
  const phase = product.drop
    ? dropPhase(
        new Date(product.drop.startsAt),
        product.drop.endsAt ? new Date(product.drop.endsAt) : null,
      )
    : null
  const dateFmt = new Intl.DateTimeFormat(locale === 'nb' ? 'nb-NO' : 'en-GB', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Europe/Oslo',
  })
  const reviews = await getPublishedReviews(product.id)
  const url = `${siteUrl}${getPathname({ href: { pathname: '/products/[slug]', params: { slug } }, locale })}`
  const weight = Number(product.specs.weight_g ?? 0)
  const width = Number(product.specs.width_mm ?? 0)

  return (
    <article className="shell pt-[calc(var(--header-h)+4vh)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(productJsonLd(product, url, reviews)) }}
      />

      <nav aria-label="Brødsmuler" className="type-label mb-10">
        <Link href="/products" className="hover:text-bone">
          {tc('title')}
        </Link>
        <span aria-hidden> / </span>
        <span aria-current="page" className="text-bone">
          {product.name}
        </span>
      </nav>

      <header className="mb-14 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="type-display text-mega leading-[0.86]">{product.name}</h1>
          <p className="mt-6 max-w-[36ch] text-xl text-ash">{product.tagline}</p>
        </div>
        <div className="type-label space-y-1 text-right">
          {product.isLimited && <p className="text-ichor!">Λ {td('eyebrow')}</p>}
          {product.drop && phase === 'upcoming' && (
            <p>{t('dropUpcoming', { date: dateFmt.format(new Date(product.drop.startsAt)) })}</p>
          )}
          {product.drop?.maxPerCustomer && (
            <p>{t('dropLimit', { count: product.drop.maxPerCustomer })}</p>
          )}
          {product.specs.placeholder === true && (
            <p className="text-ash-dim!">{t('placeholder')}</p>
          )}
        </div>
      </header>

      <ProductExperience
        name={product.name}
        form={product.form as BandForm}
        variants={product.variants}
        colors={product.colors}
        sizes={product.sizes}
        locale={locale}
        purchasable={phase !== 'upcoming'}
        copy={{
          color: t('color'),
          size: t('size'),
          sizeGuide: t('sizeGuide'),
          vat: t('vat'),
          inStock: t('inStock'),
          soldOut: t('soldOut'),
          lowStock: t.raw('lowStock') as string,
          live: t('live'),
          backInStock: t('backInStock'),
          viewerHint: t('viewerHint'),
          viewerLabel: t.raw('viewerLabel') as string,
          dropNote: product.drop
            ? t('dropUpcoming', { date: dateFmt.format(new Date(product.drop.startsAt)) })
            : undefined,
        }}
        wishlist={
          <WishlistButton productId={product.id} copy={{ save: t('save'), saved: t('saved') }} />
        }
        cartCopy={{
          add: tcart('add'),
          adding: tcart('adding'),
          added: tcart('added'),
          goToCart: tcart('goToCart'),
          limit: tcart('limit'),
          unavailable: tcart('unavailable'),
          error: tcart('error'),
          limited: tcart('limited'),
        }}
        waitlistCopy={{
          email: tw('email'),
          emailPlaceholder: tw('emailPlaceholder'),
          submit: tw('submit'),
          submitting: tw('submitting'),
          consent: tw('consent'),
          ok: tw('ok'),
          invalid: tw('invalid'),
          consentMissing: tw('consentMissing'),
          limited: tw('limited'),
          error: tw('error'),
        }}
      />

      <section
        className="mt-[14vh] grid gap-12 border-t border-hairline pt-12 md:grid-cols-12"
        aria-labelledby="details"
      >
        <h2 id="details" className="type-label md:col-span-3">
          {t('details')}
        </h2>
        <p className="max-w-[52ch] text-xl leading-relaxed text-ash md:col-span-5" data-reveal>
          {product.description}
        </p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-4 text-sm md:col-span-4" data-reveal>
          {product.materials.length > 0 && (
            <>
              <dt className="type-label">{t('materials')}</dt>
              <dd>
                {product.materials.map((m) => `${m.pct} % ${m.name.toLowerCase()}`).join(', ')}
              </dd>
            </>
          )}
          {weight > 0 && (
            <>
              <dt className="type-label">{t('weight')}</dt>
              <dd className="type-data">{weight} g</dd>
            </>
          )}
          {width > 0 && (
            <>
              <dt className="type-label">{t('width')}</dt>
              <dd className="type-data">{width} mm</dd>
            </>
          )}
          <dt className="type-label">{t('care')}</dt>
          <dd>{t('careValue')}</dd>
          <dt className="type-label">{t('shipping')}</dt>
          <dd>{t('shippingValue')}</dd>
        </dl>
      </section>

      {product.bundles.length > 0 && (
        <section className="mt-[12vh] border-t border-hairline pt-12" aria-labelledby="bundles">
          <h2 id="bundles" className="type-label mb-10">
            {t('bundleTitle')}
          </h2>
          <ul className="grid gap-6 md:grid-cols-2">
            {product.bundles.map((b) => (
              <li key={b.slug} data-reveal>
                <BundleCard
                  bundle={b}
                  locale={locale}
                  saveLabel={tc('bundleSave', { pct: b.discountBp / 100 })}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="mt-[12vh]">
        <Reviews slug={slug} {...reviews} />
      </div>
      <Reveal />
    </article>
  )
}
