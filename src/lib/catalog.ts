import 'server-only'
import { cache } from 'react'
import type { Locale } from '@/i18n/routing'
import { createPublicClient } from '@/lib/supabase/public'
import type { Json } from '@/lib/supabase/database.types'

export type I18n = { nb: string; en?: string }

export function tr(value: Json | null | undefined, locale: Locale): string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ''
  const v = value as Record<string, unknown>
  return String(v[locale] ?? v.nb ?? '')
}

export type ProductSummary = {
  id: string
  slug: string
  name: string
  tagline: string
  priceOre: number
  compareAtOre: number | null
  isLimited: boolean
  form: Record<string, unknown>
  colors: { key: string; hex: string; name: string }[]
  available: number
  collection: string | null
}

/** Active products for listings. Public, cacheable (RLS: active only). */
export const getProducts = cache(async (locale: Locale): Promise<ProductSummary[]> => {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from('products')
    .select(
      'id, slug, name, tagline, price_ore, compare_at_ore, is_limited, form, position, collections(slug), product_variants(color_key, color_hex, color_name, position, inventory(available))',
    )
    .eq('status', 'active')
    .order('position')
  if (error) throw new Error(`getProducts: ${error.message}`)

  return (data ?? []).map((p) => {
    const seen = new Set<string>()
    const variants = [...(p.product_variants ?? [])].sort((a, b) => a.position - b.position)
    const colors = variants
      .filter((v) => !seen.has(v.color_key) && seen.add(v.color_key))
      .map((v) => ({ key: v.color_key, hex: v.color_hex, name: tr(v.color_name, locale) }))
    const available = variants.reduce((sum, v) => sum + (v.inventory?.available ?? 0), 0)
    return {
      id: p.id,
      slug: p.slug,
      name: tr(p.name, locale),
      tagline: tr(p.tagline, locale),
      priceOre: p.price_ore,
      compareAtOre: p.compare_at_ore,
      isLimited: p.is_limited,
      form: (p.form ?? {}) as Record<string, unknown>,
      colors,
      available,
      collection: p.collections?.slug ?? null,
    }
  })
})

export type DropSummary = {
  slug: string
  name: string
  description: string
  startsAt: string
  endsAt: string | null
  maxPerCustomer: number | null
}

export const getNextDrop = cache(async (locale: Locale): Promise<DropSummary | null> => {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from('drops')
    .select('slug, name, description, starts_at, ends_at, max_per_customer')
    .eq('is_published', true)
    .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
    .order('starts_at')
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`getNextDrop: ${error.message}`)
  if (!data) return null
  return {
    slug: data.slug,
    name: tr(data.name, locale),
    description: tr(data.description, locale),
    startsAt: data.starts_at,
    endsAt: data.ends_at,
    maxPerCustomer: data.max_per_customer,
  }
})

export type Variant = {
  id: string
  sku: string
  colorKey: string
  colorName: string
  colorHex: string
  size: string
  priceOre: number
  available: number
  lowStockThreshold: number
}

export type ProductDetail = ProductSummary & {
  description: string
  vatRateBp: number
  materials: { name: string; pct: number }[]
  specs: Record<string, unknown>
  variants: Variant[]
  sizes: string[]
  drop: (DropSummary & { id: string }) | null
  bundles: BundleSummary[]
}

export type BundleSummary = {
  slug: string
  name: string
  description: string
  discountBp: number
  products: { slug: string; name: string; priceOre: number; hex: string; finish: string }[]
}

const SIZE_ORDER = ['XS', 'S', 'S/M', 'M', 'M/L', 'L', 'XL', 'ONE']

export const getProductSlugs = cache(async (): Promise<string[]> => {
  const { data, error } = await createPublicClient()
    .from('products')
    .select('slug')
    .eq('status', 'active')
  if (error) throw new Error(`getProductSlugs: ${error.message}`)
  return (data ?? []).map((p) => p.slug)
})

export const getProduct = cache(
  async (slug: string, locale: Locale): Promise<ProductDetail | null> => {
    const supabase = createPublicClient()
    const { data: p, error } = await supabase
      .from('products')
      .select(
        `id, slug, name, tagline, description, price_ore, compare_at_ore, vat_rate_bp, is_limited, form,
       materials, specs, collections(slug),
       drops(id, slug, name, description, starts_at, ends_at, max_per_customer),
       product_variants(id, sku, color_key, color_name, color_hex, size, price_ore, position, is_active,
         inventory(available, low_stock_threshold))`,
      )
      .eq('slug', slug)
      .eq('status', 'active')
      .maybeSingle()
    if (error) throw new Error(`getProduct: ${error.message}`)
    if (!p) return null

    const variants: Variant[] = [...(p.product_variants ?? [])]
      .filter((v) => v.is_active)
      .sort((a, b) => a.position - b.position)
      .map((v) => ({
        id: v.id,
        sku: v.sku,
        colorKey: v.color_key,
        colorName: tr(v.color_name, locale),
        colorHex: v.color_hex,
        size: v.size,
        priceOre: v.price_ore ?? p.price_ore,
        available: v.inventory?.available ?? 0,
        lowStockThreshold: v.inventory?.low_stock_threshold ?? 5,
      }))
    const seen = new Set<string>()
    const colors = variants
      .filter((v) => !seen.has(v.colorKey) && seen.add(v.colorKey))
      .map((v) => ({ key: v.colorKey, hex: v.colorHex, name: v.colorName }))
    const sizes = [...new Set(variants.map((v) => v.size))].sort(
      (a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b),
    )
    const materials = (Array.isArray(p.materials) ? p.materials : []).map((m) => {
      const mm = m as { name?: Json; pct?: number }
      return { name: tr(mm.name ?? null, locale), pct: Number(mm.pct ?? 0) }
    })

    return {
      id: p.id,
      slug: p.slug,
      name: tr(p.name, locale),
      tagline: tr(p.tagline, locale),
      description: tr(p.description, locale),
      priceOre: p.price_ore,
      compareAtOre: p.compare_at_ore,
      vatRateBp: p.vat_rate_bp,
      isLimited: p.is_limited,
      form: (p.form ?? {}) as Record<string, unknown>,
      materials,
      specs: (p.specs ?? {}) as Record<string, unknown>,
      colors,
      sizes,
      variants,
      available: variants.reduce((sum, v) => sum + v.available, 0),
      collection: p.collections?.slug ?? null,
      drop: p.drops
        ? {
            id: p.drops.id,
            slug: p.drops.slug,
            name: tr(p.drops.name, locale),
            description: tr(p.drops.description, locale),
            startsAt: p.drops.starts_at,
            endsAt: p.drops.ends_at,
            maxPerCustomer: p.drops.max_per_customer,
          }
        : null,
      bundles: (await getBundles(locale)).filter((b) =>
        b.products.some((bp) => bp.slug === p.slug),
      ),
    }
  },
)

export const getBundles = cache(async (locale: Locale): Promise<BundleSummary[]> => {
  const { data, error } = await createPublicClient()
    .from('bundles')
    .select(
      'slug, name, description, discount_bp, position, bundle_items(products(slug, name, price_ore, form, product_variants(color_hex, position)))',
    )
    .eq('status', 'active')
    .order('position')
  if (error) throw new Error(`getBundles: ${error.message}`)
  return (data ?? []).map((b) => ({
    slug: b.slug,
    name: tr(b.name, locale),
    description: tr(b.description, locale),
    discountBp: b.discount_bp,
    products: (b.bundle_items ?? [])
      .map((i) => i.products)
      .filter((p): p is NonNullable<typeof p> => !!p)
      .map((p) => ({
        slug: p.slug,
        name: tr(p.name, locale),
        priceOre: p.price_ore,
        finish: String((p.form as Record<string, unknown> | null)?.finish ?? 'satin'),
        hex:
          [...(p.product_variants ?? [])].sort((a, z) => a.position - z.position)[0]?.color_hex ??
          '#c9ccd4',
      })),
  }))
})

export const getDrop = cache(async (slug: string, locale: Locale) => {
  const { data, error } = await createPublicClient()
    .from('drops')
    .select('id, slug, name, description, starts_at, ends_at, max_per_customer, products(slug)')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle()
  if (error) throw new Error(`getDrop: ${error.message}`)
  if (!data) return null
  const productSlug = data.products?.[0]?.slug
  return {
    id: data.id,
    slug: data.slug,
    name: tr(data.name, locale),
    description: tr(data.description, locale),
    startsAt: data.starts_at,
    endsAt: data.ends_at,
    maxPerCustomer: data.max_per_customer,
    product: productSlug ? await getProduct(productSlug, locale) : null,
  }
})

/** Full-text (nb + en) with trigram fallback, ranked in Postgres. RLS: active only. */
export async function searchProducts(query: string, locale: Locale): Promise<ProductSummary[]> {
  const q = query.trim().slice(0, 80)
  if (q.length < 2) return []
  const { data, error } = await createPublicClient().rpc('search_products', {
    p_query: q,
    p_limit: 24,
  })
  if (error) throw new Error(`searchProducts: ${error.message}`)
  const ids = (data ?? []).map((p) => p.id)
  const all = await getProducts(locale)
  return ids.map((id) => all.find((p) => p.id === id)).filter((p): p is ProductSummary => !!p)
}

export const getCollections = cache(async (locale: Locale) => {
  const { data, error } = await createPublicClient()
    .from('collections')
    .select('slug, name, position')
    .eq('status', 'active')
    .order('position')
  if (error) throw new Error(`getCollections: ${error.message}`)
  return (data ?? []).map((c) => ({ slug: c.slug, name: tr(c.name, locale) }))
})

export const getDropSlugs = cache(async (): Promise<string[]> => {
  const { data, error } = await createPublicClient()
    .from('drops')
    .select('slug')
    .eq('is_published', true)
  if (error) throw new Error(`getDropSlugs: ${error.message}`)
  return (data ?? []).map((d) => d.slug)
})
