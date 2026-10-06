import { notFound } from 'next/navigation'
import { markDelivered, shipOrder } from '@/app/actions/admin'
import { AdminForm, adminButton, adminField } from '@/components/admin/AdminForm'
import { Link } from '@/i18n/navigation'
import { requireStaff } from '@/lib/admin'
import { formatPrice } from '@/lib/commerce'

type Props = { params: Promise<{ id: string }> }
type Address = {
  full_name?: string
  line1?: string
  line2?: string | null
  postal_code?: string
  city?: string
  country?: string
}

export default async function AdminOrder({ params }: Props) {
  const { supabase } = await requireStaff()
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const { data: o } = await supabase
    .from('orders')
    .select(
      'id, number, status, email, phone, created_at, paid_at, shipped_at, delivered_at, total_ore, tax_ore, shipping_ore, discount_ore, shipping_rate_code, shipping_address, carrier, tracking_number, tracking_url, notes, order_items(id, sku, name, variant_label, qty, line_total_ore), payments(provider, provider_ref, status, amount_ore, refunded_ore)',
    )
    .eq('id', id)
    .maybeSingle()
  if (!o) notFound()
  const a = o.shipping_address as Address
  const fmt = (n: number) => formatPrice(n, 'nb')
  const when = (d: string | null) =>
    d ? new Date(d).toLocaleString('nb-NO', { dateStyle: 'short', timeStyle: 'short' }) : '–'

  return (
    <section className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
      <div className="grid content-start gap-8">
        <Link href="/admin/orders" className="type-label w-fit">
          ← Ordre
        </Link>
        <header>
          <h1 className="type-display text-display">Ordre {o.number}</h1>
          <p className="mt-2 text-ash">
            {o.status} · {o.email} {o.phone ? `· ${o.phone}` : ''}
          </p>
          {o.notes && (
            <p className="mt-3 rounded-sm border border-danger p-3 text-sm whitespace-pre-line">
              {o.notes}
            </p>
          )}
        </header>
        <table className="w-full text-sm">
          <tbody>
            {o.order_items.map((i) => (
              <tr key={i.id} className="hairline border-b">
                <td className="type-data py-2 pr-4 text-ash">{i.sku}</td>
                <td>
                  {i.name} · {i.variant_label}
                </td>
                <td className="type-data px-4">× {i.qty}</td>
                <td className="type-data text-right">{fmt(i.line_total_ore)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="type-data grid grid-cols-[1fr_auto] gap-y-1 text-sm">
          <dt className="text-ash">Rabatt</dt>
          <dd>−{fmt(o.discount_ore)}</dd>
          <dt className="text-ash">Frakt ({o.shipping_rate_code})</dt>
          <dd>{fmt(o.shipping_ore)}</dd>
          <dt>Total (mva. {fmt(o.tax_ore)})</dt>
          <dd>{fmt(o.total_ore)}</dd>
        </dl>
        <div>
          <h2 className="type-label mb-2">Leveringsadresse</h2>
          <address className="text-ash not-italic">
            {[a.full_name, a.line1, a.line2, `${a.postal_code ?? ''} ${a.city ?? ''}`, a.country]
              .filter(Boolean)
              .join(', ')}
          </address>
        </div>
      </div>

      <aside className="grid content-start gap-8">
        <div className="grid gap-1 text-sm text-ash">
          <p>Bestilt: {when(o.created_at)}</p>
          <p>Betalt: {when(o.paid_at)}</p>
          <p>Sendt: {when(o.shipped_at)}</p>
          <p>Levert: {when(o.delivered_at)}</p>
          {o.payments.map((p) => (
            <p key={p.provider_ref} className="type-data">
              {p.provider} · {p.status} · {fmt(p.amount_ore)}
              {p.refunded_ore > 0 ? ` · refundert ${fmt(p.refunded_ore)}` : ''}
            </p>
          ))}
        </div>

        {(o.status === 'paid' || o.status === 'fulfilled') && (
          <div className="rounded-sm border border-hairline p-5">
            <h2 className="type-label mb-4">Send pakken</h2>
            <p className="mb-4 text-sm text-ash">
              Beløpet trekkes hos betalingsleverandøren før ordren merkes som sendt.
            </p>
            <AdminForm
              action={shipOrder}
              className="grid gap-3"
              okText="Sendt. Kunden får e-post med sporing."
            >
              <input type="hidden" name="orderId" value={o.id} />
              <label className="grid gap-1 text-sm">
                Transportør
                <select name="carrier" className={adminField} defaultValue="posten">
                  <option value="posten">Posten</option>
                  <option value="bring">Bring</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                Sporingsnummer
                <input
                  name="trackingNumber"
                  required
                  pattern="[A-Za-z0-9-]{6,40}"
                  className={adminField}
                />
              </label>
              <button className={adminButton}>Trekk beløp og merk som sendt</button>
            </AdminForm>
          </div>
        )}

        {o.status === 'shipped' && (
          <div className="grid gap-3">
            {o.tracking_url && (
              <a
                href={o.tracking_url}
                className="text-sm underline underline-offset-4"
                rel="noopener"
              >
                {o.carrier} {o.tracking_number}
              </a>
            )}
            <form action={markDelivered}>
              <input type="hidden" name="orderId" value={o.id} />
              <button className={adminButton}>Merk som levert</button>
            </form>
          </div>
        )}
      </aside>
    </section>
  )
}
