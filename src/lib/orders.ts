import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

export async function getOrderForCustomer(orderId: string) {
  const { data, error } = await createAdminClient()
    .from('orders')
    .select(
      'id, number, status, email, locale, vat_mode, subtotal_ore, discount_ore, shipping_ore, tax_ore, total_ore, shipping_address, shipping_rate_code, payment_provider, created_at, order_items(id, name, variant_label, qty, unit_price_ore, discount_ore, line_total_ore, sku)',
    )
    .eq('id', orderId)
    .maybeSingle()
  if (error) throw error
  return data
}

export type CustomerOrder = NonNullable<Awaited<ReturnType<typeof getOrderForCustomer>>>
