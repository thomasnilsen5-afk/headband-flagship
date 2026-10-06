import { getFormatter, getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import type { PublishedReview } from '@/lib/reviews'
import { Stars } from './Stars'

export async function Reviews({
  slug,
  reviews,
  count,
  average,
}: {
  slug: string
  reviews: PublishedReview[]
  count: number
  average: number
}) {
  const t = await getTranslations('reviews')
  const format = await getFormatter()
  return (
    <section aria-labelledby="reviews" className="hairline border-t py-20">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h2 id="reviews" className="type-display text-display">
            {t('title')}
          </h2>
          {count > 0 && (
            <p className="mt-3 flex items-center gap-3 text-ash">
              <Stars rating={average} label={t('stars', { n: average })} />
              {t('summary', { average: format.number(average), count })}
            </p>
          )}
        </div>
        <Link
          href={{ pathname: '/account/review/[slug]', params: { slug } }}
          className="type-label rounded-full border border-hairline-strong px-6 py-3 text-bone!"
        >
          {t('write')}
        </Link>
      </div>
      {count === 0 ? (
        <p className="text-ash">{t('none')}</p>
      ) : (
        <ul className="grid gap-10 md:grid-cols-2">
          {reviews.map((r) => (
            <li key={r.id} className="grid content-start gap-3">
              <p className="flex flex-wrap items-center gap-3 text-sm">
                <Stars rating={r.rating} label={t('stars', { n: r.rating })} />
                <span>{r.authorName}</span>
                {r.verified && <span className="type-label text-ichor!">{t('verified')}</span>}
                <time dateTime={r.publishedAt} className="text-ash-dim">
                  {format.dateTime(new Date(r.publishedAt), { dateStyle: 'medium' })}
                </time>
              </p>
              {r.title && <h3 className="text-xl">{r.title}</h3>}
              <p className="leading-relaxed whitespace-pre-line text-ash">{r.body}</p>
              {r.photos.length > 0 && (
                <ul className="flex gap-3">
                  {r.photos.map((src, n) => (
                    <li key={src}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- already resized WebP from our own route */}
                      <img
                        src={src}
                        alt={t('photoAlt', { n: n + 1, name: r.authorName })}
                        loading="lazy"
                        decoding="async"
                        width={120}
                        height={120}
                        className="h-28 w-28 rounded-sm object-cover"
                      />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
