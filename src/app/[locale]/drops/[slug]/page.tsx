import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Countdown } from '@/components/home/Countdown'
import { ProductViewer } from '@/components/product/ProductViewer'
import { WaitlistForm } from '@/components/waitlist/WaitlistForm'
import type { BandForm } from '@/gl/finishes'
import { getPathname, Link } from '@/i18n/navigation'
import { routing, type Locale } from '@/i18n/routing'
import { getDrop, getDropSlugs } from '@/lib/catalog'
import { dropPhase, formatPrice } from '@/lib/commerce'

export const revalidate = 60

export async function generateStaticParams() {
  return (await getDropSlugs()).map((slug) => ({ slug }))
}

type Props = { params: Promise<{ locale: string; slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const drop = await getDrop(slug, locale as Locale)
  if (!drop) return {}
  const path = (l: Locale) =>
    getPathname({ href: { pathname: '/drops/[slug]', params: { slug } }, locale: l })
  return {
    title: drop.name,
    description: drop.description,
    alternates: {
      canonical: path(locale as Locale),
      languages: Object.fromEntries(routing.locales.map((l) => [l, path(l)])),
    },
    openGraph: drop.product
      ? {
          images: [
            { url: `/og/products/${drop.product.slug}`, width: 1200, height: 630, alt: drop.name },
          ],
        }
      : undefined,
  }
}

export default async function DropPage({ params }: Props) {
  const { locale: l, slug } = await params
  const locale = l as Locale
  setRequestLocale(locale)
  const drop = await getDrop(slug, locale)
  if (!drop) notFound()

  const t = await getTranslations('drop')
  const th = await getTranslations('home.drop')
  const tw = await getTranslations('waitlist')
  const tp = await getTranslations('product')
  const phase = dropPhase(new Date(drop.startsAt), drop.endsAt ? new Date(drop.endsAt) : null)
  const date = new Intl.DateTimeFormat(locale === 'nb' ? 'nb-NO' : 'en-GB', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Europe/Oslo',
  }).format(new Date(drop.startsAt))
  const pieces = drop.product?.variants.reduce((s, v) => s + v.available, 0) ?? 0

  return (
    <article className="relative overflow-hidden pt-[calc(var(--header-h)+6vh)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(50% 40% at 50% 30%, oklch(0.32 0.14 300 / 0.35), transparent 70%)',
        }}
      />
      <div className="shell relative">
        <p className="type-label mb-8">
          {t('eyebrow')} · <time dateTime={drop.startsAt}>{date}</time>
        </p>
        <h1 className="type-display text-film -ml-[0.04em] text-[clamp(3rem,10.2vw,15rem)] leading-[0.85] whitespace-nowrap">
          {drop.name}
        </h1>

        <div className="mt-16 grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-6">
            {drop.product && (
              <ProductViewer
                form={drop.product.form as BandForm}
                colorHex={drop.product.colors[0]?.hex ?? '#8f7cf7'}
                label={tp('viewerLabel', { name: drop.name })}
                hint={tp('viewerHint')}
              />
            )}
          </div>
          <div className="space-y-10 lg:col-span-5 lg:col-start-8">
            <p className="text-xl leading-relaxed text-ash">{drop.description}</p>
            <dl className="grid grid-cols-2 gap-6 border-t border-hairline pt-6">
              {drop.product && (
                <div>
                  <dt className="type-label">{tp('from')}</dt>
                  <dd className="type-data mt-2 text-2xl">
                    {formatPrice(drop.product.priceOre, locale)}
                  </dd>
                </div>
              )}
              <div>
                <dt className="type-label">{t('pieces')}</dt>
                <dd className="type-data mt-2 text-2xl">{pieces}</dd>
              </div>
              {drop.maxPerCustomer && (
                <div className="col-span-2">
                  <dd className="type-label">{t('limit', { count: drop.maxPerCustomer })}</dd>
                </div>
              )}
            </dl>

            {phase === 'upcoming' && (
              <>
                <Countdown
                  to={drop.startsAt}
                  units={th.raw('units') as { d: string; h: string; m: string; s: string }}
                  liveLabel={t('live')}
                />
                <WaitlistForm
                  kind="drop"
                  dropId={drop.id}
                  locale={locale}
                  title={t('waitlistTitle')}
                  copy={{
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
              </>
            )}
            {phase === 'live' && drop.product && (
              <Link
                href={{ pathname: '/products/[slug]', params: { slug: drop.product.slug } }}
                className="type-label inline-flex rounded-full bg-bone px-8 py-5 text-void!"
              >
                {t('shopNow')} →
              </Link>
            )}
            {phase === 'ended' && <p className="text-xl text-ash">{t('ended')}</p>}
          </div>
        </div>
      </div>
    </article>
  )
}
