import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { brand } from '@/lib/brand'
import { LocaleSwitch } from './LocaleSwitch'
import { Wordmark } from './Wordmark'

export async function Footer() {
  const t = await getTranslations('footer')
  const year = new Date().getFullYear()
  return (
    <footer className="relative mt-[8vh] border-t border-hairline">
      <div className="shell grid gap-16 py-16 md:grid-cols-12">
        <div className="md:col-span-5">
          <p className="type-label mb-6">{brand.name}</p>
          <p className="max-w-[28ch] text-lg text-ash">{t('tagline')}</p>
          <ul className="type-label mt-8 space-y-2">
            <li>{t('shipping')}</li>
            <li>{t('returns')}</li>
          </ul>
        </div>
        <nav aria-label="Juridisk" className="md:col-span-4 md:col-start-7">
          <ul className="space-y-3 text-ash">
            <li>
              <Link href="/terms" className="hover:text-bone">
                {t('terms')}
              </Link>
            </li>
            <li>
              <Link href="/returns" className="hover:text-bone">
                {t('returnsLink')}
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-bone">
                {t('privacy')}
              </Link>
            </li>
            <li>
              <Link href="/cookies" className="hover:text-bone">
                {t('cookies')}
              </Link>
            </li>
          </ul>
        </nav>
        <div className="md:col-span-2 md:text-right">
          <LocaleSwitch />
        </div>
      </div>
      <div className="shell overflow-hidden pb-6">
        <Wordmark className="w-full text-strata" strokeWidth={1.2} />
        <p className="type-label mt-6 flex flex-wrap justify-between gap-4 text-ash-dim!">
          <span>
            © {year} {brand.legalName} · {t('org')} {brand.orgNumber}
          </span>
          <span>
            {brand.address.street}, {brand.address.postalCode} {brand.address.city}
          </span>
        </p>
      </div>
    </footer>
  )
}
