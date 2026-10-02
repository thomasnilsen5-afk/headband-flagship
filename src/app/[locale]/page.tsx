import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('home')
  return (
    <section className="relative grid min-h-dvh place-items-center overflow-hidden">
      <div className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden>
        <div className="relative w-[min(86vw,62rem)]">
          <div className="band-glow" />
          <div className="band-css" />
        </div>
      </div>
      <div className="shell relative z-10 flex min-h-dvh flex-col justify-end pb-[12vh]">
        <p className="type-label mb-6">{t('eyebrow')}</p>
        <h1 className="type-display text-mega max-w-[11ch]">{t('title')}</h1>
        <p className="text-ash mt-8 max-w-[38ch] text-lg">{t('lede')}</p>
        <Link
          href="/products"
          className="type-label border-hairline-strong text-bone! mt-10 w-fit border-b pb-1"
        >
          {t('cta')}
        </Link>
      </div>
    </section>
  )
}
