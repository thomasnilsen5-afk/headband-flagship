import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { SignInForm } from '@/components/account/SignInForm'
import { getPathname } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { getUser } from '@/lib/auth'

export const metadata: Metadata = { robots: { index: false, follow: false } }

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ feil?: string }> }

export default async function SignInPage({ params, searchParams }: Props) {
  const locale = (await params).locale as Locale
  setRequestLocale(locale)
  if (await getUser()) redirect(getPathname({ href: '/account', locale }))
  const t = await getTranslations('account')
  const linkError = (await searchParams).feil === 'lenke'
  const keys = [
    'email',
    'send',
    'sent',
    'code',
    'verify',
    'working',
    'resend',
    'otherEmail',
    'invalid',
    'limited',
    'error',
  ]

  return (
    <section className="shell grid min-h-[80vh] content-center gap-8 pt-[var(--header-h)]">
      <h1 className="type-display text-mega leading-[0.86]">{t('signInTitle')}</h1>
      <p className="max-w-[44ch] text-xl text-ash">{t('signInBody')}</p>
      {linkError && (
        <p className="max-w-md rounded-sm border border-hairline p-4 text-ash">{t('linkError')}</p>
      )}
      <SignInForm
        locale={locale}
        copy={Object.fromEntries(keys.map((k) => [k, t.raw(k) as string]))}
      />
    </section>
  )
}
