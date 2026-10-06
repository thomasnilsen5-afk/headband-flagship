'use server'

import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { z } from 'zod'
import { CARRIERS, staffSession } from '@/lib/admin'
import { sendReturnUpdate, sendShippingConfirmation } from '@/lib/email/orders'
import { log } from '@/lib/log'
import { captureOrderPayment, refundOrderPayment } from '@/lib/payments/settle'
import { createAdminClient } from '@/lib/supabase/admin'

export type AdminState = {
  status: 'idle' | 'ok' | 'invalid' | 'forbidden' | 'capture' | 'refund' | 'error'
  message?: string
}

const uuid = z.uuid()

export async function shipOrder(_: AdminState, form: FormData): Promise<AdminState> {
  const staff = await staffSession()
  if (!staff) return { status: 'forbidden' }
  const v = z
    .object({
      orderId: uuid,
      carrier: z.enum(['posten', 'bring']),
      trackingNumber: z
        .string()
        .trim()
        .regex(/^[A-Za-z0-9-]{6,40}$/),
    })
    .safeParse(Object.fromEntries(form))
  if (!v.success) return { status: 'invalid' }

  const db = createAdminClient()
  const { data: order } = await db
    .from('orders')
    .select('id, status, total_ore')
    .eq('id', v.data.orderId)
    .maybeSingle()
  if (!order || !['paid', 'fulfilled'].includes(order.status)) return { status: 'invalid' }

  // Charge first: a parcel never leaves without the money being captured.
  try {
    await captureOrderPayment(order.id, order.total_ore)
  } catch (err) {
    log.error('admin.capture_failed', { err, orderId: order.id })
    return { status: 'capture', message: err instanceof Error ? err.message : undefined }
  }

  const carrier = CARRIERS[v.data.carrier]
  const { data: shipped, error } = await db.rpc('mark_order_shipped', {
    p_order_id: order.id,
    p_carrier: carrier.name,
    p_tracking_number: v.data.trackingNumber,
    p_tracking_url: carrier.track(v.data.trackingNumber),
    p_actor: staff.user.id,
  })
  if (error) return { status: 'error', message: error.message }
  if (shipped) after(() => sendShippingConfirmation(order.id))
  revalidatePath('/[locale]/admin', 'layout')
  return { status: 'ok' }
}

export async function markDelivered(form: FormData) {
  const staff = await staffSession()
  const id = uuid.safeParse(form.get('orderId'))
  if (!staff || !id.success) return
  await createAdminClient().rpc('mark_order_delivered', {
    p_order_id: id.data,
    p_actor: staff.user.id,
  })
  revalidatePath('/[locale]/admin', 'layout')
}

export async function adjustStock(_: AdminState, form: FormData): Promise<AdminState> {
  const staff = await staffSession()
  if (!staff) return { status: 'forbidden' }
  const v = z
    .object({
      variantId: uuid,
      delta: z.coerce
        .number()
        .int()
        .min(-1000)
        .max(1000)
        .refine((n) => n !== 0),
      reason: z.enum(['restock', 'adjustment', 'damage']),
    })
    .safeParse(Object.fromEntries(form))
  if (!v.success) return { status: 'invalid' }
  // Runs as the staff user: adjust_inventory re-checks the role in the database.
  const { error } = await staff.supabase.rpc('adjust_inventory', {
    p_variant_id: v.data.variantId,
    p_delta: v.data.delta,
    p_reason: v.data.reason,
    p_ref: `staff:${staff.user.id}`,
  })
  if (error)
    return {
      status: 'error',
      message: error.message === 'insufficient_stock' ? 'Kan ikke gå under null.' : error.message,
    }
  revalidatePath('/[locale]/admin/stock', 'page')
  return { status: 'ok' }
}

export async function updateReturn(_: AdminState, form: FormData): Promise<AdminState> {
  const staff = await staffSession()
  if (!staff) return { status: 'forbidden' }
  const v = z
    .object({
      returnId: uuid,
      status: z.enum(['approved', 'rejected', 'received', 'refunded']),
      refundKr: z.coerce.number().min(0).max(1_000_000).optional(),
    })
    .safeParse(Object.fromEntries([...form].filter(([, x]) => x !== '')))
  if (!v.success) return { status: 'invalid' }

  const db = createAdminClient()
  let refundOre: number | null = null
  if (v.data.status === 'refunded') {
    if (v.data.refundKr === undefined) return { status: 'invalid' }
    refundOre = Math.round(v.data.refundKr * 100)
    const { data: r } = await db
      .from('returns')
      .select('order_id, status')
      .eq('id', v.data.returnId)
      .maybeSingle()
    if (!r || r.status !== 'received') return { status: 'invalid' }
    try {
      await refundOrderPayment(r.order_id, refundOre, `refund-${v.data.returnId}`)
    } catch (err) {
      log.error('admin.refund_failed', { err, returnId: v.data.returnId })
      return { status: 'refund', message: err instanceof Error ? err.message : undefined }
    }
  }

  const { error } = await db.rpc('set_return_status', {
    p_return_id: v.data.returnId,
    p_status: v.data.status,
    p_refund_ore: refundOre as number,
    p_actor: staff.user.id,
  })
  if (error) return { status: 'error', message: error.message }
  after(() => sendReturnUpdate(v.data.returnId))
  revalidatePath('/[locale]/admin', 'layout')
  return { status: 'ok' }
}
