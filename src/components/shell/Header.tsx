import { getTranslations } from 'next-intl/server'
import { CartButton } from '@/components/cart/CartButton'
import { Link } from '@/i18n/navigation'
import { brand } from '@/lib/brand'
import { LocaleSwitch } from './LocaleSwitch'
import { MobileMenu } from './MobileMenu'
import { SoundToggle } from './SoundToggle'
import { Wordmark } from './Wordmark'

export async function Header() {
  const t = await getTranslations('nav')
  const ta = await getTranslations('a11y')
  const items = [
    { href: '/products', label: t('products') },
    { href: { pathname: '/drops/[slug]', params: { slug: 'halcyon' } }, label: t('drop') },
    { href: '/search', label: t('search') },
    { href: '/account', label: t('account') },
  ] as const

  return (
    <header className="fixed inset-x-0 top-0 z-50 mix-blend-difference">
      <div className="shell flex h-[var(--header-h)] items-center justify-between gap-6">
        <Link href="/" aria-label={brand.name} className="relative z-10 -m-2 p-2">
          <Wordmark className="h-4 w-auto text-bone" />
        </Link>

        <nav aria-label="Hoved" className="hidden md:block">
          <ul className="flex items-center gap-8">
            {items.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className="type-label text-bone! transition-opacity hover:opacity-60"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-5">
          <SoundToggle />
          <LocaleSwitch className="hidden md:flex" />
          <CartButton label={t('cart')} a11y={ta.raw('cart') as string} />
          <MobileMenu items={items.map((i) => ({ href: i.href, label: i.label }))} />
        </div>
      </div>
    </header>
  )
}
