'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { getPathname } from '@/i18n/navigation'
import { availablePaymentMethods } from '@/lib/env.server'
import { getOrderForCustomer } from '@/lib/orders'
import { confirmPayment, releaseOrder } from '@/lib/payments/confirm'
import { signOrder, verifyOrder } from '@/lib/security/tokens'

const schema = z.object({
  orderId: z.uuid(),
  token: z.string().min(10),
  locale: z.enum(['nb', 'en']),
  outcome: z.enum(['pay', 'cancel']),
})

/**
 * Simulated payment provider for previews, local development and CI. Unavailable in
 * production (availablePaymentMethods never returns 'test' there) and only for orders that
 * were created with the test provider.
 */
export async function completeTestPayment(form: FormData) {
  const v = schema.parse(Object.fromEntries(form))
  if (!availablePaymentMethods().includes('test') || !verifyOrder(v.orderId, v.token))
    throw new Error('Not allowed')
  const order = await getOrderForCustomer(v.orderId)
  if (!order || order.payment_provider !== 'test') throw new Error('Not allowed')

  if (v.outcome === 'pay') {
    await confirmPayment({
      orderId: order.id,
      provider: 'test',
      ref: `test-${order.id}`,
      amountOre: order.total_ore,
      status: 'authorized',
    })
    redirect(
      `${getPathname({ href: '/checkout/confirmation', locale: v.locale })}?ordre=${order.id}&t=${signOrder(order.id)}`,
    )
  }
  await releaseOrder(order.id, 'cancelled')
  redirect(`${getPathname({ href: '/checkout', locale: v.locale })}?avbrutt=${order.id}`)
}
