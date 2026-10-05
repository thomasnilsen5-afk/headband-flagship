'use client'

import { useMemo, useState } from 'react'
import { AddToCart, type AddToCartCopy } from '@/components/cart/AddToCart'
import { WaitlistForm, type WaitlistCopy } from '@/components/waitlist/WaitlistForm'
import type { BandForm } from '@/gl/finishes'
import type { Variant } from '@/lib/catalog'
import { formatPrice, stockState } from '@/lib/commerce'
import { useLiveInventory } from '@/lib/hooks/useLiveInventory'
import { ProductViewer } from './ProductViewer'

export type ProductCopy = {
  color: string
  size: string
  sizeGuide: string
  vat: string
  inStock: string
  soldOut: string
  lowStock: string // contains {count}
  live: string
  backInStock: string
  viewerHint: string
  viewerLabel: string
  dropNote?: string
}

/**
 * Viewer + variant picker share one selection. Colour and size are radio groups (keyboard and
 * screen-reader native); stock and price follow the selected variant and update live.
 */
export function ProductExperience({
  name,
  form,
  variants,
  colors,
  sizes,
  locale,
  copy,
  waitlistCopy,
  cartCopy,
  wishlist,
  purchasable,
}: {
  name: string
  form: BandForm
  variants: Variant[]
  colors: { key: string; hex: string; name: string }[]
  sizes: string[]
  locale: 'nb' | 'en'
  copy: ProductCopy
  waitlistCopy: WaitlistCopy
  cartCopy: AddToCartCopy
  /** Rendered under the purchase controls (server-provided so this stays account-agnostic). */
  wishlist?: React.ReactNode
  /** False before a drop goes live. */
  purchasable: boolean
}) {
  const stock = useLiveInventory(Object.fromEntries(variants.map((v) => [v.id, v.available])))
  const firstInStock = variants.find((v) => v.available > 0) ?? variants[0]
  const [color, setColor] = useState(firstInStock?.colorKey ?? colors[0]?.key ?? '')
  const [size, setSize] = useState(firstInStock?.size ?? sizes[0] ?? '')

  const variant = useMemo(
    () =>
      variants.find((v) => v.colorKey === color && v.size === size) ??
      variants.find((v) => v.colorKey === color),
    [variants, color, size],
  )
  const available = variant ? (stock[variant.id] ?? variant.available) : 0
  const state = stockState(available, variant?.lowStockThreshold)
  const colorHex = colors.find((c) => c.key === color)?.hex ?? '#c9ccd4'
  const sizeStock = (s: string) => {
    const v = variants.find((x) => x.colorKey === color && x.size === s)
    return v ? (stock[v.id] ?? v.available) : 0
  }

  return (
    <div className="grid gap-12 lg:grid-cols-12">
      <div className="lg:sticky lg:top-[calc(var(--header-h)+2rem)] lg:col-span-7 lg:self-start">
        <ProductViewer
          form={form}
          colorHex={colorHex}
          label={copy.viewerLabel.replace('{name}', name)}
          hint={copy.viewerHint}
        />
      </div>

      <div className="space-y-10 lg:col-span-5">
        <fieldset>
          <legend className="type-label mb-4">
            {copy.color} ·{' '}
            <span className="text-bone">{colors.find((c) => c.key === color)?.name}</span>
          </legend>
          <div className="flex flex-wrap gap-3">
            {colors.map((c) => (
              <label key={c.key} className="group relative cursor-pointer" title={c.name}>
                <input
                  type="radio"
                  name="color"
                  value={c.key}
                  checked={color === c.key}
                  onChange={() => setColor(c.key)}
                  className="peer sr-only"
                />
                <span className="sr-only">{c.name}</span>
                <span
                  aria-hidden
                  className="block h-11 w-11 rounded-full ring-1 ring-hairline-strong ring-offset-4 ring-offset-void transition-shadow duration-500 peer-checked:ring-2 peer-checked:ring-bone peer-focus-visible:ring-2 peer-focus-visible:ring-ichor"
                  style={{ background: c.hex }}
                />
              </label>
            ))}
          </div>
        </fieldset>

        {sizes.length > 1 && (
          <fieldset>
            <legend className="type-label mb-4">{copy.size}</legend>
            <div className="flex flex-wrap gap-3">
              {sizes.map((s) => {
                const out = sizeStock(s) <= 0
                return (
                  <label key={s} className="cursor-pointer">
                    <input
                      type="radio"
                      name="size"
                      value={s}
                      checked={size === s}
                      onChange={() => setSize(s)}
                      className="peer sr-only"
                    />
                    <span
                      className={`type-label block min-w-20 rounded-full border px-5 py-3 text-center transition-colors duration-500 peer-checked:border-bone peer-checked:bg-bone peer-checked:text-void! peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ichor ${out ? 'border-hairline text-ash-dim! line-through' : 'border-hairline-strong text-bone!'}`}
                    >
                      {s}
                    </span>
                  </label>
                )
              })}
            </div>
            <p className="mt-3 text-sm text-ash">{copy.sizeGuide}</p>
          </fieldset>
        )}

        <div className="border-t border-hairline pt-6">
          <div className="flex items-baseline justify-between gap-6">
            <p className="type-data text-3xl font-light tracking-[-0.02em]">
              {variant ? formatPrice(variant.priceOre, locale) : ''}
            </p>
            <p
              aria-live="polite"
              className={`type-label ${state === 'sold_out' ? 'text-ash-dim!' : state === 'low' ? 'text-ichor!' : ''}`}
            >
              {state === 'sold_out'
                ? copy.soldOut
                : state === 'low'
                  ? copy.lowStock.replace('{count}', String(available))
                  : copy.inStock}
            </p>
          </div>
          <p className="mt-2 text-sm text-ash-dim">{copy.vat}</p>
        </div>

        {state === 'sold_out' && variant ? (
          <WaitlistForm
            key={variant.id}
            kind="back_in_stock"
            variantId={variant.id}
            locale={locale}
            copy={waitlistCopy}
            title={copy.backInStock}
          />
        ) : (
          <div>
            {purchasable && variant ? (
              <AddToCart key={variant.id} variantId={variant.id} locale={locale} copy={cartCopy} />
            ) : (
              <p className="border-t border-hairline pt-5 text-ash">{copy.dropNote}</p>
            )}
          </div>
        )}

        {wishlist}

        <p className="type-label flex items-center gap-2 text-ash-dim!">
          <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-ichor" />
          {copy.live}
        </p>
      </div>
    </div>
  )
}
