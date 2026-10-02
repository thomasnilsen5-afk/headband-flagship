'use client'

import { useActionState, useMemo, useState } from 'react'
import { startCheckout, type CheckoutState } from '@/app/actions/checkout'
import { Link } from '@/i18n/navigation'
import {
  availableRates,
  formatPrice,
  priceCart,
  vatModeFor,
  type BundledLine,
  type CodeDiscount,
  type ShippingRate,
} from '@/lib/commerce'
import { SHIP_COUNTRIES } from '@/lib/schemas/checkout'
import { Totals, type TotalsCopy } from './Totals'

type Line = BundledLine & { name: string; variantLabel: string }
type Rate = ShippingRate & { name: string }
type Method = 'vipps' | 'stripe' | 'test'

export type CheckoutCopy = Record<string, string>

const field =
  'w-full rounded-sm border border-hairline-strong bg-transparent px-4 py-3.5 text-bone placeholder:text-ash-dim focus:border-ichor focus:outline-none aria-[invalid=true]:border-danger'

/**
 * Prices update instantly as the customer changes country or shipping (same pure engine as the
 * server), but nothing here is trusted: startCheckout recomputes everything from the database.
 * Works as a plain form without JavaScript.
 */
export function CheckoutForm({
  locale,
  lines,
  rates,
  discount,
  methods,
  defaults,
  copy,
  errors,
  totalsCopy,
}: {
  locale: 'nb' | 'en'
  lines: Line[]
  rates: Rate[]
  discount: CodeDiscount | null
  methods: Method[]
  defaults: { email: string }
  copy: CheckoutCopy
  errors: Record<string, string>
  totalsCopy: TotalsCopy
}) {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(startCheckout, {
    status: 'idle',
  })
  const [country, setCountry] = useState('NO')
  const [postal, setPostal] = useState('')
  const zoneRates = useMemo(() => availableRates(rates, country) as Rate[], [rates, country])
  const [rateCode, setRateCode] = useState(zoneRates[0]?.code ?? '')
  const rate = zoneRates.find((r) => r.code === rateCode) ?? zoneRates[0] ?? null
  const vatMode = vatModeFor(country, postal)
  const priced = useMemo(
    () => priceCart({ lines, vatMode, discount, shippingRate: rate }),
    [lines, vatMode, discount, rate],
  )
  const names = useMemo(
    () => new Intl.DisplayNames([locale === 'nb' ? 'nb' : 'en'], { type: 'region' }),
    [locale],
  )
  const invalid = (f: string) => state.status === 'invalid' && state.fields?.includes(f)
  const fmt = (ore: number) => formatPrice(ore, locale)

  const terms = copy.terms!.split(/(\{terms\}|\{withdrawal\})/)

  return (
    <form action={action} className="grid gap-16 lg:grid-cols-12" noValidate={false}>
      <input type="hidden" name="locale" value={locale} />
      <div className="space-y-12 lg:col-span-7">
        <fieldset className="space-y-4">
          <legend className="type-label mb-4">{copy.contact}</legend>
          <label className="block">
            <span className="mb-1.5 block text-sm text-ash">{copy.email}</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              defaultValue={defaults.email}
              aria-invalid={invalid('email')}
              className={field}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm text-ash">{copy.phone}</span>
            <input
              name="phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              aria-invalid={invalid('phone')}
              className={field}
            />
          </label>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="type-label mb-4">{copy.delivery}</legend>
          <label className="block">
            <span className="mb-1.5 block text-sm text-ash">{copy.country}</span>
            <select
              name="country"
              value={country}
              onChange={(e) => {
                setCountry(e.target.value)
                setRateCode('')
              }}
              autoComplete="country"
              className={`${field} bg-void`}
            >
              {SHIP_COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {names.of(c)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm text-ash">{copy.fullName}</span>
            <input
              name="fullName"
              required
              autoComplete="name"
              aria-invalid={invalid('fullName')}
              className={field}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm text-ash">{copy.line1}</span>
            <input
              name="line1"
              required
              autoComplete="address-line1"
              aria-invalid={invalid('line1')}
              className={field}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm text-ash">{copy.line2}</span>
            <input name="line2" autoComplete="address-line2" className={field} />
          </label>
          <div className="grid grid-cols-[10rem_1fr] gap-4">
            <label className="block">
              <span className="mb-1.5 block text-sm text-ash">{copy.postalCode}</span>
              <input
                name="postalCode"
                required
                autoComplete="postal-code"
                inputMode={country === 'NO' ? 'numeric' : 'text'}
                value={postal}
                onChange={(e) => setPostal(e.target.value)}
                aria-invalid={invalid('postalCode')}
                aria-describedby={invalid('postalCode') ? 'postal-err' : undefined}
                className={field}
              />
              {invalid('postalCode') && (
                <span id="postal-err" className="mt-1 block text-sm text-danger">
                  {errors.postal}
                </span>
              )}
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm text-ash">{copy.city}</span>
              <input
                name="city"
                required
                autoComplete="address-level2"
                aria-invalid={invalid('city')}
                className={field}
              />
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend className="type-label mb-4">{copy.shippingMethod}</legend>
          <div className="space-y-2">
            {zoneRates.map((r) => {
              const price = priced.merchandiseOre >= (r.freeOverOre ?? Infinity) ? 0 : r.priceOre
              return (
                <label
                  key={r.code}
                  className="flex cursor-pointer items-center gap-4 rounded-sm border border-hairline p-4 has-[:checked]:border-bone"
                >
                  <input
                    type="radio"
                    name="shippingRate"
                    value={r.code}
                    checked={rate?.code === r.code}
                    onChange={() => setRateCode(r.code)}
                    className="accent-[var(--color-ichor)]"
                  />
                  <span className="flex-1">
                    <span className="block">{r.name}</span>
                    <span className="text-sm text-ash">
                      {copy
                        .days!.replace('{min}', String(r.etaDaysMin))
                        .replace('{max}', String(r.etaDaysMax))}
                    </span>
                  </span>
                  <span className="type-data">{price === 0 ? copy.free : fmt(price)}</span>
                </label>
              )
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="type-label mb-4">{copy.payment}</legend>
          <div className="space-y-2">
            {methods.map((m, i) => (
              <label
                key={m}
                className="flex cursor-pointer items-start gap-4 rounded-sm border border-hairline p-4 has-[:checked]:border-bone"
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={m}
                  defaultChecked={i === 0}
                  required
                  className="mt-1 accent-[var(--color-ichor)]"
                />
                <span>
                  <span className="block">
                    {m === 'vipps'
                      ? copy.methodVipps
                      : m === 'stripe'
                        ? copy.methodStripe
                        : copy.methodTest}
                  </span>
                  <span className="text-sm text-ash">
                    {m === 'vipps'
                      ? copy.methodVippsHint
                      : m === 'stripe'
                        ? copy.methodStripeHint
                        : copy.methodTestHint}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="space-y-4">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="acceptTerms"
              required
              aria-invalid={invalid('acceptTerms') || invalid('terms')}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-ichor)]"
            />
            <span>
              {terms.map((part, i) =>
                part === '{terms}' ? (
                  <Link
                    key={i}
                    href="/terms"
                    target="_blank"
                    className="underline underline-offset-4"
                  >
                    {copy.termsLink}
                  </Link>
                ) : part === '{withdrawal}' ? (
                  <Link
                    key={i}
                    href="/returns"
                    target="_blank"
                    className="underline underline-offset-4"
                  >
                    {copy.withdrawalLink}
                  </Link>
                ) : (
                  part
                ),
              )}
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm text-ash">
            <input
              type="checkbox"
              name="marketing"
              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-ichor)]"
            />
            <span>{copy.marketing}</span>
          </label>
        </div>
      </div>

      <aside className="lg:col-span-4 lg:col-start-9">
        <div className="space-y-6 lg:sticky lg:top-[calc(var(--header-h)+2rem)]">
          <h2 className="type-label">{copy.summary}</h2>
          <ul className="space-y-3 border-b border-hairline pb-6 text-sm">
            {priced.lines.map((l, i) => (
              <li key={i} className="flex justify-between gap-4">
                <span>
                  {l.name} <span className="text-ash">· {l.variantLabel}</span>
                  {l.qty > 1 && <span className="text-ash"> × {l.qty}</span>}
                </span>
                <span className="type-data">{fmt(l.lineTotalOre)}</span>
              </li>
            ))}
          </ul>
          <Totals priced={priced} locale={locale} copy={totalsCopy} />
          {vatMode === 'export' && (
            <p className="text-sm text-ash">{country === 'NO' ? copy.svalbard : copy.export}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="type-label w-full rounded-full bg-bone px-8 py-5 text-void! transition-opacity disabled:opacity-60"
          >
            {pending ? copy.paying : copy.pay!.replace('{amount}', fmt(priced.totalOre))}
          </button>
          <p role="alert" aria-live="assertive" className="min-h-[1.5em] text-sm text-danger">
            {state.status !== 'idle' ? errors[state.status] : ''}
          </p>
        </div>
      </aside>
    </form>
  )
}
