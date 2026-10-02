import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { LegalPage, legalMetadata } from '@/components/legal/LegalPage'
import type { Locale } from '@/i18n/routing'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return legalMetadata('returns', (await params).locale as Locale)
}

export default async function ReturnsPage({ params }: Props) {
  const locale = (await params).locale as Locale
  setRequestLocale(locale)
  return <LegalPage doc="returns" locale={locale} />
}
