import { Link } from '@/i18n/navigation'
import { requireStaff } from '@/lib/admin'
import { formatPrice } from '@/lib/commerce'

const STATUSES = ['paid', 'shipped', 'delivered', 'pending', 'cancelled', 'refunded'] as const
const LABEL: Record<string, string> = {
  pending: 'Venter betaling',
  paid: 'Betalt',
  fulfilled: 'Pakkes',
  shipped: 'Sendt',
  delivered: 'Levert',
  cancelled: 'Kansellert',
  expired: 'Utløpt',
  refunded: 'Refundert',
  partially_refunded: 'Delvis refundert',
}

type Props = { searchParams: Promise<{ status?: string }> }

export default async function AdminOrders({ searchParams }: Props) {
  const { supabase } = await requireStaff()
  const status = (await searchParams).status
  let q = supabase
    .from('orders')
    .select('id, number, status, email, total_ore, created_at')
    .order('created_at', { ascending: false })
    .limit(100)
  if (status && status in LABEL) q = q.eq('status', status as (typeof STATUSES)[number])
  const { data: orders } = await q

  return (
    <section className="grid gap-6">
      <h1 className="type-display text-display">Ordre</h1>
      <nav aria-label="Filter" className="flex flex-wrap gap-2 text-sm">
        <Link
          href="/admin/orders"
          className="rounded-full border border-hairline px-3 py-1.5"
          aria-current={!status ? 'page' : undefined}
        >
          Alle
        </Link>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={{ pathname: '/admin/orders', query: { status: s } }}
            aria-current={status === s ? 'page' : undefined}
            className="rounded-full border border-hairline px-3 py-1.5 aria-[current=page]:border-ichor"
          >
            {LABEL[s]}
          </Link>
        ))}
      </nav>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="type-label">
            <tr className="hairline border-b">
              <th className="py-3 font-normal">Nr.</th>
              <th className="font-normal">Dato</th>
              <th className="font-normal">E-post</th>
              <th className="font-normal">Status</th>
              <th className="text-right font-normal">Total</th>
            </tr>
          </thead>
          <tbody>
            {(orders ?? []).map((o) => (
              <tr key={o.id} className="hairline border-b">
                <td className="py-3">
                  <Link
                    href={{ pathname: '/admin/orders/[id]', params: { id: o.id } }}
                    className="type-data underline underline-offset-4"
                  >
                    {o.number}
                  </Link>
                </td>
                <td className="text-ash">
                  {new Date(o.created_at).toLocaleString('nb-NO', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </td>
                <td className="text-ash">{o.email}</td>
                <td>{LABEL[o.status] ?? o.status}</td>
                <td className="type-data text-right">{formatPrice(o.total_ore, 'nb')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
