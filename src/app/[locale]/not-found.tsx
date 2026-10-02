import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'

export default async function NotFound() {
  const t = await getTranslations('notFound')
  return (
    <section className="shell grid min-h-[80dvh] content-center gap-10 pt-[var(--header-h)]">
      <p className="type-label">404</p>
      <h1 className="type-display text-display max-w-[14ch]">{t('title')}</h1>
      <Link
        href="/"
        className="type-label text-bone! decoration-hairline underline underline-offset-8"
      >
        {t('back')}
      </Link>
    </section>
  )
}
