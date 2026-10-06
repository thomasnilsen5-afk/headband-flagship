import { Link } from '@/i18n/navigation'
import { requireStaff } from '@/lib/admin'
import { formatPrice } from '@/lib/commerce'

export default async function AdminHome() {
  const { supabase } = await requireStaff()
  // Staff read through RLS (is_staff policies); no service role needed for reporting.
  const since = new Date(new Date().setHours(0, 0, 0, 0)).toISOString()
  const [toShip, openReturns, today, stock] = await Promise.all([
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .in('status', ['paid', 'fulfilled']),
    supabase
      .from('returns')
      .select('id', { count: 'exact', head: true })
      .in('status', ['requested', 'approved', 'received']),
    supabase
      .from('orders')
      .select('total_ore')
      .gte('paid_at', since)
      .not('status', 'in', '(cancelled,expired)'),
    supabase.from('inventory').select('available'),
  ])
  const revenue = (today.data ?? []).reduce((s, o) => s + o.total_ore, 0)
  const low = (stock.data ?? []).filter((i) => (i.available ?? 0) <= 5).length
  const tiles = [
    { label: 'Skal sendes', value: String(toShip.count ?? 0), href: '/admin/orders' as const },
    {
      label: 'Åpne returer',
      value: String(openReturns.count ?? 0),
      href: '/admin/returns' as const,
    },
    { label: 'Omsetning i dag', value: formatPrice(revenue, 'nb'), href: '/admin/orders' as const },
    { label: 'Varianter med ≤ 5 igjen', value: String(low), href: '/admin/stock' as const },
  ]
  return (
    <section className="grid gap-8">
      <h1 className="type-display text-display">Oversikt</h1>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <li key={t.label}>
            <Link
              href={t.href}
              className="grid gap-3 rounded-sm border border-hairline p-5 hover:border-ichor"
            >
              <span className="type-label">{t.label}</span>
              <span className="type-data text-3xl">{t.value}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
