import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'

export default async function NotFound() {
  const t = await getTranslations('notFound')
  return (
    <section className="shell grid min-h-[80dvh] content-center gap-10 pt-[var(--header-h)]">
      <p className="type-label">404</p>
      <h1 className="type-display max-w-[14ch] text-display">{t('title')}</h1>
      <Link
        href="/"
        className="type-label text-bone! underline decoration-hairline underline-offset-8"
      >
        {t('back')}
      </Link>
    </section>
  )
}
