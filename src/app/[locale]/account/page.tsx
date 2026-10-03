import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server'
import { signOut } from '@/app/actions/auth'
import { getPathname, Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { getUser } from '@/lib/auth'
import { formatPrice } from '@/lib/commerce'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const metadata: Metadata = { robots: { index: false, follow: false } }

type Props = { params: Promise<{ locale: string }> }

export default async function AccountPage({ params }: Props) {
  const locale = (await params).locale as Locale
  setRequestLocale(locale)
  const user = await getUser()
  if (!user) redirect(getPathname({ href: '/account/sign-in', locale }))

  // RLS scopes this to the signed-in customer's own orders.
  const supabase = await createSupabaseServerClient()
  const { data: orders } = await supabase
    .from('orders')
    .select('id, number, status, total_ore, created_at')
    .order('created_at', { ascending: false })
    .limit(50)
  const t = await getTranslations('account')
  const format = await getFormatter()
  const name = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? ''

  return (
    <section className="shell grid gap-12 pt-[calc(var(--header-h)+6vh)] pb-24">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="type-label mb-4">{t('title')}</p>
          <h1 className="type-display text-display">{t('hello', { name })}</h1>
        </div>
        <form action={signOut}>
          <input type="hidden" name="locale" value={locale} />
          <button className="type-label rounded-full border border-hairline-strong px-6 py-3 text-bone!">
            {t('signOut')}
          </button>
        </form>
      </header>

      <div>
        <h2 className="type-label mb-4">{t('orders')}</h2>
        {!orders?.length ? (
          <p className="text-ash">{t('noOrders')}</p>
        ) : (
          <ul className="divide-y divide-hairline border-y border-hairline">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  href={{ pathname: '/account/orders/[id]', params: { id: o.id } }}
                  className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 py-5 hover:text-bone sm:grid-cols-[10rem_1fr_auto_auto]"
                >
                  <span className="type-data">{t('order', { number: o.number })}</span>
                  <span className="text-ash max-sm:order-last max-sm:col-span-2">
                    {t('placed', {
                      date: format.dateTime(new Date(o.created_at), { dateStyle: 'medium' }),
                    })}
                  </span>
                  <span className="type-label">{t(`status.${o.status}`)}</span>
                  <span className="type-data max-sm:hidden">
                    {formatPrice(o.total_ore, locale)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
