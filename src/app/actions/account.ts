'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { after } from 'next/server'
import { z } from 'zod'
import { sendReturnUpdate } from '@/lib/email/orders'
import { SHIP_COUNTRIES } from '@/lib/schemas/checkout'
import { clientIp, rateLimit } from '@/lib/security/rate-limit'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * Account mutations run as the signed-in user: RLS (addresses_own, wishlist_own) and the
 * request_return function enforce ownership in the database, not here.
 */

export type FormStatus = {
  status: 'idle' | 'ok' | 'invalid' | 'signin' | 'limited' | 'error' | string
  fields?: string[]
}

const addressSchema = z
  .object({
    label: z.string().trim().max(60).optional(),
    fullName: z.string().trim().min(1).max(200),
    line1: z.string().trim().min(1).max(200),
    line2: z.string().trim().max(200).optional(),
    postalCode: z.string().trim().min(2).max(12),
    city: z.string().trim().min(1).max(120),
    country: z.enum(SHIP_COUNTRIES),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9 ]{6,20}$/)
      .optional()
      .or(z.literal('')),
    isDefault: z.literal('on').optional(),
  })
  .refine((a) => a.country !== 'NO' || /^\d{4}$/.test(a.postalCode), { path: ['postalCode'] })

async function authed() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getUser()
  return data.user ? { supabase, user: data.user } : null
}

export async function saveAddress(_: FormStatus, form: FormData): Promise<FormStatus> {
  const a = await authed()
  if (!a) return { status: 'signin' }
  const v = addressSchema.safeParse(Object.fromEntries([...form].filter(([, x]) => x !== '')))
  if (!v.success) return { status: 'invalid', fields: v.error.issues.map((i) => String(i.path[0])) }
  const d = v.data
  // Only one default per user (unique partial index): clear the old one first.
  if (d.isDefault)
    await a.supabase.from('addresses').update({ is_default: false }).eq('user_id', a.user.id)
  const { error } = await a.supabase.from('addresses').insert({
    user_id: a.user.id,
    label: d.label || null,
    full_name: d.fullName,
    line1: d.line1,
    line2: d.line2 || null,
    postal_code: d.postalCode,
    city: d.city,
    country: d.country,
    phone: d.phone || null,
    is_default: !!d.isDefault,
  })
  if (error) return { status: 'error' }
  revalidatePath('/[locale]/account/addresses', 'page')
  return { status: 'ok' }
}

const idSchema = z.uuid()

export async function deleteAddress(form: FormData) {
  const a = await authed()
  const id = idSchema.safeParse(form.get('id'))
  if (!a || !id.success) return
  await a.supabase.from('addresses').delete().eq('id', id.data)
  revalidatePath('/[locale]/account/addresses', 'page')
}

export async function setDefaultAddress(form: FormData) {
  const a = await authed()
  const id = idSchema.safeParse(form.get('id'))
  if (!a || !id.success) return
  await a.supabase.from('addresses').update({ is_default: false }).eq('user_id', a.user.id)
  await a.supabase.from('addresses').update({ is_default: true }).eq('id', id.data)
  revalidatePath('/[locale]/account/addresses', 'page')
}

/** Product pages are static, so they ask for the saved state only when a session cookie exists. */
export async function wishlistState(productId: string): Promise<boolean> {
  const a = await authed()
  const id = idSchema.safeParse(productId)
  if (!a || !id.success) return false
  const { data } = await a.supabase
    .from('wishlist_items')
    .select('product_id')
    .eq('product_id', id.data)
    .maybeSingle()
  return !!data
}

export async function toggleWishlist(
  productId: string,
): Promise<'saved' | 'removed' | 'signin' | 'error'> {
  const a = await authed()
  if (!a) return 'signin'
  const id = idSchema.safeParse(productId)
  if (!id.success) return 'error'
  if (!(await rateLimit('wishlist', a.user.id, 60, '1 m')).ok) return 'error'
  const { data } = await a.supabase
    .from('wishlist_items')
    .select('product_id')
    .eq('product_id', id.data)
    .maybeSingle()
  const { error } = data
    ? await a.supabase.from('wishlist_items').delete().eq('product_id', id.data)
    : await a.supabase.from('wishlist_items').insert({ user_id: a.user.id, product_id: id.data })
  if (error) return 'error'
  revalidatePath('/[locale]/account/wishlist', 'page')
  return data ? 'removed' : 'saved'
}

export async function removeFromWishlist(form: FormData) {
  const id = idSchema.safeParse(form.get('productId'))
  if (id.success) await toggleWishlist(id.data)
}

const RETURN_ERRORS: Record<string, string> = {
  return_window_closed: 'window',
  not_returnable: 'notReturnable',
  return_qty_exceeded: 'qty',
}

export async function requestReturn(_: FormStatus, form: FormData): Promise<FormStatus> {
  const a = await authed()
  if (!a) return { status: 'signin' }
  if (!(await rateLimit('return', `${a.user.id}:${clientIp(await headers())}`, 10, '1 h')).ok) {
    return { status: 'limited' }
  }
  const orderId = idSchema.safeParse(form.get('orderId'))
  const items = [...form.keys()]
    .filter((k) => k.startsWith('qty:'))
    .map((k) => ({ order_item_id: k.slice(4), qty: Number(form.get(k)) }))
    .filter(
      (i) => idSchema.safeParse(i.order_item_id).success && Number.isInteger(i.qty) && i.qty > 0,
    )
  if (!orderId.success || items.length === 0) return { status: 'invalid' }
  const reason = z.string().max(2000).catch('').parse(form.get('reason'))

  const { data: created, error } = await a.supabase.rpc('request_return', {
    p_order_id: orderId.data,
    p_items: items,
    p_reason: reason,
  })
  if (error) return { status: RETURN_ERRORS[error.message] ?? 'error' }
  after(() => sendReturnUpdate(created.id))
  revalidatePath('/[locale]/account/orders/[id]', 'page')
  return { status: 'ok' }
}
