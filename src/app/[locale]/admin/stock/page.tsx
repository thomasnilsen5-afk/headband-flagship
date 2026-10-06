import { adjustStock } from '@/app/actions/admin'
import { AdminForm, adminButton, adminField } from '@/components/admin/AdminForm'
import { requireStaff } from '@/lib/admin'
import { tr } from '@/lib/catalog'

export default async function AdminStock() {
  const { supabase } = await requireStaff()
  const { data: rows } = await supabase
    .from('product_variants')
    .select(
      'id, sku, size, color_name, products(name, position), inventory(on_hand, reserved, available)',
    )
    .order('sku')
  const variants = (rows ?? []).sort(
    (a, b) =>
      (a.products?.position ?? 0) - (b.products?.position ?? 0) || a.sku.localeCompare(b.sku),
  )

  return (
    <section className="grid gap-6">
      <h1 className="type-display text-display">Lager</h1>
      <p className="max-w-[60ch] text-sm text-ash">
        «Reservert» er varer i betalinger som pågår. Endringer logges med årsak i lagerbevegelsene.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[48rem] text-left text-sm">
          <thead className="type-label">
            <tr className="hairline border-b">
              <th className="py-3 font-normal">SKU</th>
              <th className="font-normal">Produkt</th>
              <th className="text-right font-normal">På lager</th>
              <th className="text-right font-normal">Reservert</th>
              <th className="text-right font-normal">Tilgjengelig</th>
              <th className="pl-6 font-normal">Juster</th>
            </tr>
          </thead>
          <tbody>
            {variants.map((v) => {
              const inv = v.inventory
              const available = inv?.available ?? 0
              return (
                <tr key={v.id} className="hairline border-b align-top">
                  <td className="type-data py-3">{v.sku}</td>
                  <td>
                    {tr(v.products?.name, 'nb')}{' '}
                    <span className="text-ash">
                      · {tr(v.color_name, 'nb')} / {v.size}
                    </span>
                  </td>
                  <td className="type-data text-right">{inv?.on_hand ?? 0}</td>
                  <td className="type-data text-right text-ash">{inv?.reserved ?? 0}</td>
                  <td className={`type-data text-right ${available <= 5 ? 'text-danger' : ''}`}>
                    {available}
                  </td>
                  <td className="pl-6">
                    <AdminForm action={adjustStock} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="variantId" value={v.id} />
                      <label className="sr-only" htmlFor={`d-${v.id}`}>
                        Antall for {v.sku}
                      </label>
                      <input
                        id={`d-${v.id}`}
                        name="delta"
                        type="number"
                        step={1}
                        required
                        className={`${adminField} w-20`}
                        placeholder="+10"
                      />
                      <label className="sr-only" htmlFor={`r-${v.id}`}>
                        Årsak for {v.sku}
                      </label>
                      <select
                        id={`r-${v.id}`}
                        name="reason"
                        className={adminField}
                        defaultValue="restock"
                      >
                        <option value="restock">Påfyll</option>
                        <option value="adjustment">Telling</option>
                        <option value="damage">Skade</option>
                      </select>
                      <button className={adminButton}>Lagre</button>
                    </AdminForm>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
