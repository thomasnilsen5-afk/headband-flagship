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
