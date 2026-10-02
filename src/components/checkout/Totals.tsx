import { formatPrice, type PricingResult } from '@/lib/commerce'

export type TotalsCopy = {
  subtotal: string
  setDiscount: string
  codeDiscount: string // {code}
  shipping: string
  shippingCalc?: string
  freeShipping: string
  total: string
  vatIncluded: string // {amount}
}

/** Totals block shared by cart, checkout and confirmation. Plain component (server or client). */
export function Totals({
  priced,
  locale,
  copy,
  shippingKnown = true,
}: {
  priced: Pick<
    PricingResult,
    | 'subtotalOre'
    | 'bundleDiscountOre'
    | 'codeDiscountOre'
    | 'shippingOre'
    | 'taxOre'
    | 'totalOre'
    | 'discount'
  >
  locale: 'nb' | 'en'
  copy: TotalsCopy
  shippingKnown?: boolean
}) {
  const fmt = (ore: number) => formatPrice(ore, locale)
  return (
    <dl className="space-y-3 text-sm">
      <div className="flex justify-between gap-4">
        <dt className="text-ash">{copy.subtotal}</dt>
        <dd className="type-data">{fmt(priced.subtotalOre)}</dd>
      </div>
      {priced.bundleDiscountOre > 0 && (
        <div className="flex justify-between gap-4 text-ichor">
          <dt>{copy.setDiscount}</dt>
          <dd className="type-data">−{fmt(priced.bundleDiscountOre)}</dd>
        </div>
      )}
      {priced.codeDiscountOre > 0 && priced.discount && (
        <div className="flex justify-between gap-4 text-ichor">
          <dt>{copy.codeDiscount.replace('{code}', priced.discount.code)}</dt>
          <dd className="type-data">−{fmt(priced.codeDiscountOre)}</dd>
        </div>
      )}
      <div className="flex justify-between gap-4">
        <dt className="text-ash">{copy.shipping}</dt>
        <dd className="type-data">
          {!shippingKnown
            ? copy.shippingCalc
            : priced.shippingOre === 0
              ? copy.freeShipping
              : fmt(priced.shippingOre)}
        </dd>
      </div>
      <div className="flex items-baseline justify-between gap-4 border-t border-hairline pt-4">
        <dt className="type-label">{copy.total}</dt>
        <dd className="type-data text-2xl font-light">{fmt(priced.totalOre)}</dd>
      </div>
      <div className="flex justify-end text-ash-dim">
        <dd>{copy.vatIncluded.replace('{amount}', fmt(priced.taxOre))}</dd>
      </div>
    </dl>
  )
}
