import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { removeFromWishlist } from '@/app/actions/account'
import { AccountNav } from '@/components/account/AccountNav'
import { getPathname, Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { getUser } from '@/lib/auth'
import { tr } from '@/lib/catalog'
import { formatPrice } from '@/lib/commerce'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const metadata: Metadata = { robots: { index: false, follow: false } }

type Props = { params: Promise<{ locale: string }> }

export default async function WishlistPage({ params }: Props) {
  const locale = (await params).locale as Locale
  setRequestLocale(locale)
  if (!(await getUser())) redirect(getPathname({ href: '/account/sign-in', locale }))
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('wishlist_items')
    .select('product_id, created_at, products(slug, name, tagline, price_ore)')
    .order('created_at', { ascending: false })
  const t = await getTranslations('account')
  const items = (data ?? []).filter((i) => i.products)

  return (
    <section className="shell grid max-w-[56rem]! gap-10 pt-[calc(var(--header-h)+6vh)] pb-24">
      <AccountNav current="/account/wishlist" />
      <h1 className="type-display text-display">{t('wishlist')}</h1>
      {!items.length ? (
        <p className="max-w-[44ch] text-ash">{t('emptyWishlist')}</p>
      ) : (
        <ul className="divide-y divide-hairline border-y border-hairline">
          {items.map(({ product_id, products: p }) => (
            <li key={product_id} className="flex items-center justify-between gap-6 py-5">
              <Link
                href={{ pathname: '/products/[slug]', params: { slug: p!.slug } }}
                className="grid gap-1 hover:text-bone"
              >
                <span className="text-lg">{tr(p!.name, locale)}</span>
                <span className="text-sm text-ash">{tr(p!.tagline, locale)}</span>
              </Link>
              <div className="flex items-center gap-6">
                <span className="type-data">{formatPrice(p!.price_ore, locale)}</span>
                <form action={removeFromWishlist}>
                  <input type="hidden" name="productId" value={product_id} />
                  <button className="text-sm text-ash underline underline-offset-4 hover:text-bone">
                    {t('remove')}
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
