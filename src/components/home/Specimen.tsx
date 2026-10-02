import { getTranslations } from 'next-intl/server'
import { KnitMacro } from './KnitMacro'

type Item = { value: string; unit: string; label: string }

/** Microscopic detail next to monumental scale. */
export async function Specimen() {
  const t = await getTranslations('home.specimen')
  const items = t.raw('items') as Item[]
  return (
    <section
      className="shell relative grid gap-16 py-[18vh] md:grid-cols-12"
      aria-labelledby="specimen-title"
    >
      <div className="md:col-span-5">
        <div className="md:sticky md:top-[18vh]">
          <p className="type-label mb-8">{t('label')}</p>
          <h2 id="specimen-title" className="type-display max-w-[16ch] text-display" data-reveal>
            {t('title')}
          </h2>
          <figure className="mt-14">
            <div className="relative aspect-square w-full max-w-[26rem] overflow-hidden rounded-full border border-hairline">
              <KnitMacro className="absolute inset-[-10%] h-[120%] w-[120%] animate-[knit-drift_38s_var(--ease-tide)_infinite_alternate]" />
              {/* Reticle: we are looking through an instrument. */}
              <div aria-hidden className="absolute inset-0 grid place-items-center">
                <div className="h-px w-8 bg-bone/60" />
                <div className="absolute h-8 w-px bg-bone/60" />
              </div>
            </div>
            <figcaption className="type-label mt-5">{t('macro')}</figcaption>
          </figure>
        </div>
      </div>
      <ol className="space-y-[14vh] md:col-span-6 md:col-start-7">
        {items.map((item, i) => (
          <li key={i} className="border-t border-hairline pt-8" data-reveal>
            <p className="type-display flex items-baseline gap-4 text-giga leading-none">
              <span className="font-extralight tracking-[-0.06em] tabular-nums">{item.value}</span>
              <span className="type-label text-sm! text-ichor!">{item.unit}</span>
            </p>
            <p className="mt-6 max-w-[30ch] text-xl text-ash">{item.label}</p>
          </li>
        ))}
      </ol>
      <style>{`@keyframes knit-drift{to{transform:translate3d(-6%,-4%,0) rotate(4deg)}}`}</style>
    </section>
  )
}
