import { getLocale, getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { getNextDrop } from '@/lib/catalog'
import { Countdown } from './Countdown'

export async function DropTeaser() {
  const locale = (await getLocale()) as Locale
  const drop = await getNextDrop(locale)
  if (!drop) return null
  const t = await getTranslations('home.drop')
  const units = t.raw('units') as { d: string; h: string; m: string; s: string }
  const date = new Intl.DateTimeFormat(locale === 'nb' ? 'nb-NO' : 'en-GB', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Europe/Oslo',
  }).format(new Date(drop.startsAt))

  return (
    <section className="relative overflow-hidden py-[16vh]" aria-labelledby="drop-title">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(50% 60% at 50% 50%, oklch(0.32 0.14 300 / 0.35), transparent 70%)',
        }}
      />
      <div className="shell relative">
        <p className="type-label mb-8">
          {t('label')} · <time dateTime={drop.startsAt}>{date}</time>
        </p>
        <h2
          id="drop-title"
          className="type-display text-film -ml-[0.04em] text-[clamp(3rem,10.2vw,15rem)] leading-[0.85] whitespace-nowrap"
        >
          {drop.name}
        </h2>
        <div className="mt-14 grid gap-12 md:grid-cols-12">
          <p className="max-w-[34ch] text-xl text-ash md:col-span-4">{drop.description}</p>
          <div className="md:col-span-7 md:col-start-6">
            <Countdown to={drop.startsAt} units={units} liveLabel={t('live')} />
            <Link
              href={{ pathname: '/drops/[slug]', params: { slug: drop.slug } }}
              className="type-label mt-8 inline-flex items-center gap-3 rounded-full bg-bone px-7 py-4 text-void! transition-transform duration-700 ease-fluid hover:scale-[1.03]"
            >
              {t('waitlist')} <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
