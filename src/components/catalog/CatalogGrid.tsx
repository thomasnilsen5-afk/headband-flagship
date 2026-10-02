'use client'

import { useMemo, useState } from 'react'
import { ProductCard } from '@/components/product/ProductCard'
import type { ProductSummary } from '@/lib/catalog'

type Copy = {
  all: string
  inStock: string
  color: string
  collection: string
  sort: string
  sortFeatured: string
  sortPriceAsc: string
  sortPriceDesc: string
  count: string // "{count}" placeholder, pre-pluralised by the server per count
  countOne: string
  countZero: string
  empty: string
  clear: string
  soldOut: string
  lowStock: string
}

type Sort = 'featured' | 'price-asc' | 'price-desc'

/**
 * Six to sixty products: filtering client-side keeps the page static (edge-cached) and
 * instant. Filters are plain buttons with aria-pressed; results are announced politely.
 */
export function CatalogGrid({
  products,
  collections,
  locale,
  copy,
}: {
  products: ProductSummary[]
  collections: { slug: string; name: string }[]
  locale: 'nb' | 'en'
  copy: Copy
}) {
  const [collection, setCollection] = useState<string | null>(null)
  const [color, setColor] = useState<string | null>(null)
  const [inStock, setInStock] = useState(false)
  const [sort, setSort] = useState<Sort>('featured')

  const colors = useMemo(() => {
    const map = new Map<string, { key: string; hex: string; name: string }>()
    for (const p of products) for (const c of p.colors) if (!map.has(c.key)) map.set(c.key, c)
    return [...map.values()]
  }, [products])

  const visible = useMemo(() => {
    const list = products.filter(
      (p) =>
        (!collection || p.collection === collection) &&
        (!color || p.colors.some((c) => c.key === color)) &&
        (!inStock || p.available > 0),
    )
    if (sort === 'price-asc') list.sort((a, b) => a.priceOre - b.priceOre)
    if (sort === 'price-desc') list.sort((a, b) => b.priceOre - a.priceOre)
    return list
  }, [products, collection, color, inStock, sort])

  const countLabel =
    visible.length === 0
      ? copy.countZero
      : visible.length === 1
        ? copy.countOne
        : copy.count.replace('{count}', String(visible.length))
  const chip = (active: boolean) =>
    `type-label rounded-full border px-4 py-2.5 transition-colors duration-500 ${active ? 'border-bone bg-bone text-void!' : 'border-hairline-strong text-bone! hover:border-bone'}`

  return (
    <div>
      <div className="mb-16 flex flex-col gap-6 border-y border-hairline py-6 lg:flex-row lg:items-center lg:justify-between">
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label={copy.collection}
        >
          <button
            type="button"
            aria-pressed={!collection}
            onClick={() => setCollection(null)}
            className={chip(!collection)}
          >
            {copy.all}
          </button>
          {collections.map((c) => (
            <button
              key={c.slug}
              type="button"
              aria-pressed={collection === c.slug}
              onClick={() => setCollection(collection === c.slug ? null : c.slug)}
              className={chip(collection === c.slug)}
            >
              {c.name}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex items-center gap-2" role="group" aria-label={copy.color}>
            {colors.map((c) => (
              <button
                key={c.key}
                type="button"
                aria-pressed={color === c.key}
                aria-label={c.name}
                title={c.name}
                onClick={() => setColor(color === c.key ? null : c.key)}
                className="h-7 w-7 rounded-full ring-1 ring-hairline-strong ring-offset-2 ring-offset-void transition-shadow aria-pressed:ring-2 aria-pressed:ring-bone"
                style={{ background: c.hex }}
              />
            ))}
          </div>
          <label className="type-label flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={inStock}
              onChange={(e) => setInStock(e.target.checked)}
              className="h-4 w-4 accent-[var(--color-ichor)]"
            />
            {copy.inStock}
          </label>
          <label className="type-label flex items-center gap-2">
            <span>{copy.sort}</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="rounded-full border border-hairline-strong bg-void px-3 py-2 text-bone"
            >
              <option value="featured">{copy.sortFeatured}</option>
              <option value="price-asc">{copy.sortPriceAsc}</option>
              <option value="price-desc">{copy.sortPriceDesc}</option>
            </select>
          </label>
        </div>
      </div>

      <p className="type-label mb-10" role="status" aria-live="polite">
        {countLabel}
      </p>

      {visible.length === 0 ? (
        <div className="py-24 text-center">
          <p className="text-xl text-ash">{copy.empty}</p>
          <button
            type="button"
            className="type-label mt-6 underline underline-offset-8"
            onClick={() => {
              setCollection(null)
              setColor(null)
              setInStock(false)
            }}
          >
            {copy.clear}
          </button>
        </div>
      ) : (
        <ul
          data-testid="product-grid"
          className="grid gap-x-6 gap-y-20 sm:grid-cols-2 lg:grid-cols-3"
        >
          {visible.map((p) => (
            <li key={p.id}>
              <ProductCard
                product={p}
                index={products.indexOf(p)}
                locale={locale}
                headingLevel={2}
                labels={{
                  soldOut: copy.soldOut,
                  lowStock: (n) => copy.lowStock.replace('{count}', String(n)),
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
