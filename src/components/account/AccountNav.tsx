import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'

const ITEMS = [
  { href: '/account', key: 'orders' },
  { href: '/account/addresses', key: 'addresses' },
  { href: '/account/wishlist', key: 'wishlist' },
] as const

export async function AccountNav({ current }: { current: (typeof ITEMS)[number]['href'] }) {
  const t = await getTranslations('account.nav')
  return (
    <nav aria-label="Konto" className="flex flex-wrap gap-2">
      {ITEMS.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={i.href === current ? 'page' : undefined}
          className="type-label rounded-full border border-hairline px-4 py-2 hover:text-bone aria-[current=page]:border-ichor aria-[current=page]:text-bone"
        >
          {t(i.key)}
        </Link>
      ))}
    </nav>
  )
}
