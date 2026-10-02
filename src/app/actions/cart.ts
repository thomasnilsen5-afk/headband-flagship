'use server'

import { headers } from 'next/headers'
import { refresh } from 'next/cache'
import { z } from 'zod'
import { routing, type Locale } from '@/i18n/routing'
import { getCartId, loadCart, setCountCookie } from '@/lib/cart/server'
import { maxPurchasable } from '@/lib/commerce'
import { log } from '@/lib/log'
import { clientIp, rateLimit } from '@/lib/security/rate-limit'
import { createAdminClient } from '@/lib/supabase/admin'

export type CartActionState = {
  status: 'idle' | 'ok' | 'invalid' | 'unavailable' | 'limit' | 'limited' | 'error'
  count?: number
  max?: number
}

const localeSchema = z.enum(routing.locales)

async function limited(bucket: string) {
  const r = await rateLimit(bucket, clientIp(await headers()), 60, '1 m')
  return !r.ok
}

const addSchema = z.object({
  variantId: z.uuid(),
  qty: z.coerce.number().int().min(1).max(10),
  locale: localeSchema,
})

/**
 * Add a variant to the visitor's cart. Stock is checked here (soft) and reserved only at
 * checkout (hard, in place_order), so carts never lock inventory.
 */
export async function addToCart(_prev: CartActionState, form: FormData): Promise<CartActionState> {
  const parsed = addSchema.safeParse(Object.fromEntries(form))
  if (!parsed.success) return { status: 'invalid' }
  if (await limited('cart')) return { status: 'limited' }
  const { variantId, qty, locale } = parsed.data
  const db = createAdminClient()

  try {
    const { data: v } = await db
      .from('product_variants')
      .select(
        'id, is_active, inventory(available), products(status, drop_id, drops(starts_at, ends_at, max_per_customer))',
      )
      .eq('id', variantId)
      .maybeSingle()
    const product = v?.products
    if (!v || !v.is_active || product?.status !== 'active') return { status: 'unavailable' }
    const drop = product.drops
    if (
      drop &&
      (new Date(drop.starts_at) > new Date() ||
        (drop.ends_at && new Date(drop.ends_at) < new Date()))
    ) {
      return { status: 'unavailable' }
    }

    const cartId = (await getCartId({ create: true }, locale as Locale))!
    const { data: existing } = await db
      .from('cart_items')
      .select('id, qty')
      .eq('cart_id', cartId)
      .eq('variant_id', variantId)
      .is('bundle_group', null)
      .maybeSingle()

    const max = maxPurchasable({
      available: v.inventory?.available ?? 0,
      inCart: existing?.qty ?? 0,
      dropLimit: drop?.max_per_customer ?? null,
    })
    if (max < 1) return { status: 'limit', max: 0 }
    const add = Math.min(qty, max)

    if (existing) {
      await db
        .from('cart_items')
        .update({ qty: existing.qty + add })
        .eq('id', existing.id)
    } else {
      await db.from('cart_items').insert({ cart_id: cartId, variant_id: variantId, qty: add })
    }
    await db.from('carts').update({ updated_at: new Date().toISOString() }).eq('id', cartId)

    const cart = await loadCart(locale as Locale)
    await setCountCookie(cart?.count ?? 0)
    return { status: add < qty ? 'limit' : 'ok', count: cart?.count ?? 0, max }
  } catch (err) {
    log.error('cart.add_failed', { err, variantId })
    return { status: 'error' }
  }
}

const updateSchema = z.object({
  itemId: z.uuid(),
  qty: z.coerce.number().int().min(0).max(10),
  locale: localeSchema,
})

/** Set a line's quantity; 0 removes it. Never exceeds stock. */
export async function updateCartItem(form: FormData): Promise<void> {
  const parsed = updateSchema.safeParse(Object.fromEntries(form))
  if (!parsed.success || (await limited('cart'))) return
  const { itemId, qty, locale } = parsed.data
  const cartId = await getCartId({ create: false }, locale as Locale)
  if (!cartId) return
  const db = createAdminClient()
  // Scope every write to the visitor's own cart.
  if (qty === 0) {
    await db.from('cart_items').delete().eq('id', itemId).eq('cart_id', cartId)
  } else {
    const { data: item } = await db
      .from('cart_items')
      .select('variant_id, product_variants(inventory(available))')
      .eq('id', itemId)
      .eq('cart_id', cartId)
      .maybeSingle()
    if (!item) return
    const available = item.product_variants?.inventory?.available ?? 0
    await db
      .from('cart_items')
      .update({ qty: Math.max(1, Math.min(qty, available, 10)) })
      .eq('id', itemId)
      .eq('cart_id', cartId)
  }
  const cart = await loadCart(locale as Locale)
  await setCountCookie(cart?.count ?? 0)
  refresh()
}

export type DiscountState = { status: 'idle' | 'ok' | 'invalid' | 'limited' }

const codeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .regex(/^[A-Za-z0-9_-]+$/),
  locale: localeSchema,
})

/** Attach a discount code to the cart after validating it server-side. */
export async function applyDiscount(_prev: DiscountState, form: FormData): Promise<DiscountState> {
  const parsed = codeSchema.safeParse(Object.fromEntries(form))
  if (!parsed.success) return { status: 'invalid' }
  // Tight limit: codes must not be guessable by brute force.
  const r = await rateLimit('discount', clientIp(await headers()), 10, '10 m')
  if (!r.ok) return { status: 'limited' }
  const cartId = await getCartId({ create: false }, parsed.data.locale as Locale)
  if (!cartId) return { status: 'invalid' }
  const db = createAdminClient()
  const { data } = await db.rpc('lookup_discount', { p_code: parsed.data.code })
  if (!data?.id) return { status: 'invalid' }
  await db.from('carts').update({ discount_code: data.code }).eq('id', cartId)
  refresh()
  return { status: 'ok' }
}

export async function removeDiscount(form: FormData): Promise<void> {
  const locale = localeSchema.safeParse(form.get('locale'))
  const cartId = await getCartId({ create: false }, (locale.success ? locale.data : 'nb') as Locale)
  if (!cartId) return
  await createAdminClient().from('carts').update({ discount_code: null }).eq('id', cartId)
  refresh()
}
