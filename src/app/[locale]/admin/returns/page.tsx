import { updateReturn } from '@/app/actions/admin'
import { AdminForm, adminButton, adminField } from '@/components/admin/AdminForm'
import { Link } from '@/i18n/navigation'
import { requireStaff } from '@/lib/admin'
import { formatPrice } from '@/lib/commerce'

const NEXT: Record<string, { status: string; label: string }[]> = {
  requested: [
    { status: 'approved', label: 'Godkjenn' },
    { status: 'rejected', label: 'Avvis' },
  ],
  approved: [
    { status: 'received', label: 'Mottatt (legg på lager)' },
    { status: 'rejected', label: 'Avvis' },
  ],
  received: [{ status: 'refunded', label: 'Refunder' }],
}
const LABEL: Record<string, string> = {
  requested: 'Forespurt',
  approved: 'Godkjent',
  received: 'Mottatt',
  refunded: 'Refundert',
  rejected: 'Avvist',
}

export default async function AdminReturns() {
  const { supabase } = await requireStaff()
  const { data: returns } = await supabase
    .from('returns')
    .select(
      'id, status, reason, items, refund_ore, requested_at, orders(id, number, email, shipping_ore, order_items(id, name, variant_label, qty, line_total_ore))',
    )
    .order('requested_at', { ascending: false })
    .limit(100)

  return (
    <section className="grid gap-6">
      <h1 className="type-display text-display">Retur</h1>
      {!returns?.length && <p className="text-ash">Ingen returer.</p>}
      <ul className="grid gap-4">
        {(returns ?? []).map((r) => {
          const o = r.orders!
          const lines = (r.items as { order_item_id: string; qty: number }[]).map((i) => {
            const item = o.order_items.find((x) => x.id === i.order_item_id)
            return {
              ...i,
              item,
              value: item ? Math.round((item.line_total_ore / item.qty) * i.qty) : 0,
            }
          })
          // Suggested refund: what the customer paid for the returned units (after discounts).
          // Withdrawing from the whole purchase also refunds the original standard delivery
          // (angrerettloven § 23); staff can still adjust the amount.
          const fullReturn =
            lines.reduce((n, l) => n + l.qty, 0) === o.order_items.reduce((n, i) => n + i.qty, 0)
          const suggested =
            lines.reduce((s, l) => s + l.value, 0) + (fullReturn ? o.shipping_ore : 0)
          return (
            <li
              key={r.id}
              className="grid gap-4 rounded-sm border border-hairline p-5 lg:grid-cols-[1.4fr_1fr]"
            >
              <div className="grid gap-2 text-sm">
                <p className="flex flex-wrap gap-3">
                  <Link
                    href={{ pathname: '/admin/orders/[id]', params: { id: o.id } }}
                    className="type-data underline underline-offset-4"
                  >
                    Ordre {o.number}
                  </Link>
                  <span className="text-ash">{o.email}</span>
                  <span className="type-label">{LABEL[r.status]}</span>
                </p>
                <ul className="text-ash">
                  {lines.map((l) => (
                    <li key={l.order_item_id}>
                      {l.item?.name} · {l.item?.variant_label} × {l.qty} (
                      {formatPrice(l.value, 'nb')})
                    </li>
                  ))}
                </ul>
                {r.reason && <p className="italic">«{r.reason}»</p>}
                {fullReturn && r.status === 'received' && (
                  <p className="text-ash">
                    Hele ordren returneres: forslaget inkluderer frakt (
                    {formatPrice(o.shipping_ore, 'nb')}).
                  </p>
                )}
                {r.refund_ore != null && <p>Refundert: {formatPrice(r.refund_ore, 'nb')}</p>}
              </div>
              <div className="grid content-start gap-3">
                {(NEXT[r.status] ?? []).map((n) => (
                  <AdminForm
                    key={n.status}
                    action={updateReturn}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <input type="hidden" name="returnId" value={r.id} />
                    <input type="hidden" name="status" value={n.status} />
                    {n.status === 'refunded' && (
                      <label className="flex items-center gap-2 text-sm">
                        Beløp (kr)
                        <input
                          name="refundKr"
                          type="number"
                          step="0.01"
                          min="0"
                          defaultValue={(suggested / 100).toFixed(2)}
                          className={`${adminField} w-28`}
                        />
                      </label>
                    )}
                    <button className={adminButton}>{n.label}</button>
                  </AdminForm>
                ))}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
