import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { deleteAddress, setDefaultAddress } from '@/app/actions/account'
import { AccountNav } from '@/components/account/AccountNav'
import { AddressForm } from '@/components/account/AddressForm'
import { getPathname } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { getUser } from '@/lib/auth'
import { SHIP_COUNTRIES } from '@/lib/schemas/checkout'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const metadata: Metadata = { robots: { index: false, follow: false } }

type Props = { params: Promise<{ locale: string }> }

export default async function AddressesPage({ params }: Props) {
  const locale = (await params).locale as Locale
  setRequestLocale(locale)
  if (!(await getUser())) redirect(getPathname({ href: '/account/sign-in', locale }))
  const supabase = await createSupabaseServerClient()
  const { data: addresses } = await supabase
    .from('addresses')
    .select('id, label, full_name, line1, line2, postal_code, city, country, is_default')
    .order('is_default', { ascending: false })
    .order('created_at')
  const t = await getTranslations('account')
  const keys = [
    'label',
    'fullName',
    'line1',
    'line2',
    'postalCode',
    'city',
    'country',
    'phone',
    'isDefault',
    'save',
    'saved',
    'fieldsInvalid',
  ]

  return (
    <section className="shell grid max-w-[56rem]! gap-10 pt-[calc(var(--header-h)+6vh)] pb-24">
      <AccountNav current="/account/addresses" />
      <h1 className="type-display text-display">{t('addresses')}</h1>
      {!addresses?.length ? (
        <p className="text-ash">{t('noAddresses')}</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {addresses.map((a) => (
            <li key={a.id} className="grid gap-3 rounded-sm border border-hairline p-5">
              <p className="type-label flex justify-between gap-3">
                <span>{a.label || a.full_name}</span>
                {a.is_default && <span className="text-ichor">{t('default')}</span>}
              </p>
              <address className="text-ash not-italic">
                {[a.full_name, a.line1, a.line2, `${a.postal_code} ${a.city}`, a.country]
                  .filter(Boolean)
                  .join(', ')}
              </address>
              <div className="flex gap-5 text-sm">
                {!a.is_default && (
                  <form action={setDefaultAddress}>
                    <input type="hidden" name="id" value={a.id} />
                    <button className="underline underline-offset-4 hover:text-bone">
                      {t('makeDefault')}
                    </button>
                  </form>
                )}
                <form action={deleteAddress}>
                  <input type="hidden" name="id" value={a.id} />
                  <button className="text-ash underline underline-offset-4 hover:text-danger">
                    {t('delete')}
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="hairline border-t pt-8">
        <h2 className="type-label mb-6">{t('addAddress')}</h2>
        <AddressForm
          locale={locale}
          countries={SHIP_COUNTRIES}
          copy={Object.fromEntries(keys.map((k) => [k, t(k)]))}
        />
      </div>
    </section>
  )
}
