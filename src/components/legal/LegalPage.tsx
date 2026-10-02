import { legal, LEGAL_REVIEWED, LEGAL_UPDATED, type LegalKey } from '@/content/legal'
import type { Locale } from '@/i18n/routing'

const draft = {
  nb: 'Utkast: teksten skal gjennomgås av jurist før lansering.',
  en: 'Draft: this text will be reviewed by a lawyer before launch.',
}
const updated = { nb: 'Sist oppdatert', en: 'Last updated' }

export function legalMetadata(key: LegalKey, locale: Locale) {
  const d = legal[locale][key]
  return { title: d.title, description: d.intro.slice(0, 155) }
}

export function LegalPage({ doc: key, locale }: { doc: LegalKey; locale: Locale }) {
  const d = legal[locale][key]
  return (
    <article className="shell max-w-[52rem]! pt-[calc(var(--header-h)+8vh)] pb-24">
      <p className="type-label mb-6">
        {updated[locale]} <time dateTime={LEGAL_UPDATED}>{LEGAL_UPDATED}</time>
      </p>
      <h1 className="type-display mb-8 text-display">{d.title}</h1>
      {!LEGAL_REVIEWED && (
        <p className="mb-8 rounded-sm border border-uv/50 p-4 text-sm text-ash">{draft[locale]}</p>
      )}
      <p className="mb-12 text-xl text-ash">{d.intro}</p>
      {d.sections.map((s) => (
        <section key={s.h} className="hairline mb-10 border-t pt-6">
          <h2 className="mb-4 text-xl font-medium">{s.h}</h2>
          {s.p.map((p) => (
            <p key={p} className="mb-3 leading-relaxed text-ash">
              {p}
            </p>
          ))}
        </section>
      ))}
    </article>
  )
}
