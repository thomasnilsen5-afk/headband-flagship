import { getLocale, getTranslations } from 'next-intl/server'

/**
 * Impossible symmetry: the line is mirrored in a liquid surface, but the reflection is in
 * the other language. Nobody is told; people notice.
 */
export async function Manifesto() {
  const locale = await getLocale()
  const t = await getTranslations('home')
  const other = await getTranslations({ locale: locale === 'nb' ? 'en' : 'nb', namespace: 'home' })
  return (
    <section
      className="relative grid min-h-[90vh] place-items-center overflow-hidden"
      aria-label={t('manifesto')}
    >
      <div className="text-center">
        <p className="type-display text-giga leading-[0.8]" aria-hidden>
          {t('manifesto')}
        </p>
        <p
          aria-hidden
          lang={locale === 'nb' ? 'en' : 'nb'}
          className="type-display text-giga leading-[0.8] text-ash-dim"
          style={{
            transform: 'scaleY(-1)',
            maskImage: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent 70%)',
            WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent 70%)',
            filter: 'blur(1.5px)',
            animation: 'liquid 9s var(--ease-tide) infinite alternate',
          }}
        >
          {other('manifesto')}
        </p>
      </div>
      <style>{`@keyframes liquid{0%{transform:scaleY(-1) skewX(0deg)}50%{transform:scaleY(-1.04) skewX(-1.5deg)}100%{transform:scaleY(-0.97) skewX(1deg)}}`}</style>
    </section>
  )
}
