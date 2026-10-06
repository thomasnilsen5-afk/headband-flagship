import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ReviewForm } from '@/components/reviews/ReviewForm'
import { getPathname } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { getUser } from '@/lib/auth'
import { getProduct } from '@/lib/catalog'

export const metadata: Metadata = { robots: { index: false, follow: false } }

type Props = { params: Promise<{ locale: string; slug: string }> }

export default async function WriteReviewPage({ params }: Props) {
  const { locale: l, slug } = await params
  const locale = l as Locale
  setRequestLocale(locale)
  const user = await getUser()
  if (!user) redirect(getPathname({ href: '/account/sign-in', locale }))
  const product = await getProduct(slug, locale)
  if (!product) notFound()
  const t = await getTranslations('reviews')
  const keys = [
    'rating',
    'headline',
    'body',
    'authorName',
    'photos',
    'photosHint',
    'submit',
    'sending',
    'ok',
    'invalid',
    'duplicate',
    'photo',
    'limited',
    'error',
    'signin',
  ]
  const fullName = (user.user_metadata?.full_name as string | undefined) ?? ''

  return (
    <section className="shell grid gap-10 pt-[calc(var(--header-h)+6vh)] pb-24">
      <h1 className="type-display text-display">{t('formTitle', { name: product.name })}</h1>
      <ReviewForm
        productId={product.id}
        locale={locale}
        defaultName={fullName.split(' ')[0] ?? ''}
        copy={Object.fromEntries(keys.map((k) => [k, t.has(k) ? t(k) : t('error')]))}
        starLabels={[1, 2, 3, 4, 5].map((n) => t('stars', { n }))}
      />
    </section>
  )
}
