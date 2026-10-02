'use client'

import { useParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { useTransition } from 'react'
import { usePathname, useRouter } from '@/i18n/navigation'
import { routing, type Locale } from '@/i18n/routing'

export function LocaleSwitch({ className = '' }: { className?: string }) {
  const locale = useLocale()
  const t = useTranslations('a11y')
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const [pending, startTransition] = useTransition()

  return (
    <div role="group" aria-label={t('language')} className={`flex items-center gap-2 ${className}`}>
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={l === locale}
          disabled={pending}
          onClick={() =>
            startTransition(() => {
              // @ts-expect-error -- params always match the current pathname
              router.replace({ pathname, params }, { locale: l as Locale, scroll: false })
            })
          }
          className="type-label text-bone! uppercase transition-opacity hover:opacity-100 aria-[pressed=false]:opacity-60"
        >
          {l === 'nb' ? 'NO' : 'EN'}
        </button>
      ))}
    </div>
  )
}
