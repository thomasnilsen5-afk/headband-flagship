import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { brand } from '@/lib/brand'
import { LocaleSwitch } from './LocaleSwitch'
import { Wordmark } from './Wordmark'

export async function Footer() {
  const t = await getTranslations('footer')
  const year = new Date().getFullYear()
  return (
    <footer className="border-hairline relative mt-[20vh] border-t">
      <div className="shell grid gap-16 py-16 md:grid-cols-12">
        <div className="md:col-span-5">
          <p className="type-label mb-6">{brand.name}</p>
          <p className="text-ash max-w-[28ch] text-lg">{t('tagline')}</p>
          <ul className="type-label mt-8 space-y-2">
            <li>{t('shipping')}</li>
            <li>{t('returns')}</li>
          </ul>
        </div>
        <nav aria-label="Juridisk" className="md:col-span-4 md:col-start-7">
          <ul className="text-ash space-y-3">
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
        <Wordmark className="text-strata w-full" strokeWidth={1.2} />
        <p className="type-label text-ash-dim! mt-6 flex flex-wrap justify-between gap-4">
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
