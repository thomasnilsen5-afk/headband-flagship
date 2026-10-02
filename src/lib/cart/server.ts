import 'server-only'
import { cookies } from 'next/headers'
import type { Locale } from '@/i18n/routing'
import { getBundles, tr } from '@/lib/catalog'
import { applyBundles, type BundleRule, type CartLineInput } from '@/lib/commerce'
import { hashToken, newToken } from '@/lib/security/tokens'
import { createAdminClient } from '@/lib/supabase/admin'

export const CART_COOKIE = 'hyal_cart'
/** Readable by the client: item count for the header only. Never trusted for anything. */
export const COUNT_COOKIE = 'hyal_cart_n'
const MAX_AGE = 60 * 60 * 24 * 60

export type CartItemView = {
  id: string
  variantId: string
  productId: string // product slug: stable key for bundle rules
  slug: string
  name: string
  variantLabel: string
  colorHex: string
  finish: string
  qty: number
  listPriceOre: number
  vatRateBp: number
  available: number
  dropId: string | null
}

export type CartView = {
  id: string
  email: string | null
  discountCode: string | null
  items: CartItemView[]
  count: number
}

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: MAX_AGE,
}

/** The visitor's open cart id, optionally creating one (and its cookie). */
export async function getCartId(
  { create }: { create: boolean },
  locale: Locale = 'nb',
): Promise<string | null> {
  const jar = await cookies()
  const token = jar.get(CART_COOKIE)?.value
  const db = createAdminClient()
  if (token) {
    const { data } = await db
      .from('carts')
      .select('id')
      .eq('token_hash', hashToken(token))
      .is('converted_order_id', null)
      .maybeSingle()
    if (data) return data.id
  }
  if (!create) return null
  const fresh = newToken()
  const { data, error } = await db
    .from('carts')
    .insert({ token_hash: hashToken(fresh), locale })
    .select('id')
    .single()
  if (error) throw error
  jar.set(CART_COOKIE, fresh, cookieOptions)
  return data.id
}

export async function setCountCookie(count: number) {
  ;(await cookies()).set(COUNT_COOKIE, String(count), { ...cookieOptions, httpOnly: false })
}

export async function loadCart(locale: Locale): Promise<CartView | null> {
  const id = await getCartId({ create: false }, locale)
  if (!id) return null
  const { data, error } = await createAdminClient()
    .from('carts')
    .select(
      `id, email, discount_code,
       cart_items(id, qty, created_at, variant_id,
         product_variants(id, color_name, color_hex, size, price_ore, is_active,
           inventory(available),
           products(slug, name, price_ore, vat_rate_bp, form, status, drop_id)))`,
    )
    .eq('id', id)
    .single()
  if (error) throw error

  const items: CartItemView[] = [...(data.cart_items ?? [])]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .flatMap((ci) => {
      const v = ci.product_variants
      const p = v?.products
      if (!v || !p || !v.is_active || p.status !== 'active') return []
      return [
        {
          id: ci.id,
          variantId: v.id,
          productId: p.slug,
          slug: p.slug,
          name: tr(p.name, locale),
          variantLabel: `${tr(v.color_name, locale)} / ${v.size}`,
          colorHex: v.color_hex,
          finish: String((p.form as Record<string, unknown> | null)?.finish ?? 'satin'),
          qty: ci.qty,
          listPriceOre: v.price_ore ?? p.price_ore,
          vatRateBp: p.vat_rate_bp,
          available: v.inventory?.available ?? 0,
          dropId: p.drop_id,
        },
      ]
    })
  return {
    id: data.id,
    email: data.email,
    discountCode: data.discount_code,
    items,
    count: items.reduce((n, i) => n + i.qty, 0),
  }
}

export async function bundleRules(locale: Locale): Promise<BundleRule[]> {
  return (await getBundles(locale)).map((b) => ({
    slug: b.slug,
    discountBp: b.discountBp,
    productIds: b.products.map((p) => p.slug),
  }))
}

/** Cart items → pricing lines with sets applied (shared by cart page and checkout). */
export function toPricingLines(items: CartItemView[], rules: BundleRule[]) {
  const inputs: (CartLineInput & { item: CartItemView })[] = items.map((i) => ({
    variantId: i.variantId,
    productId: i.productId,
    qty: i.qty,
    listPriceOre: i.listPriceOre,
    vatRateBp: i.vatRateBp,
    item: i,
  }))
  return applyBundles(inputs, rules) as (ReturnType<typeof applyBundles>[number] & {
    item: CartItemView
  })[]
}
