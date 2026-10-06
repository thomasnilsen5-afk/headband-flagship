import { moderateReview } from '@/app/actions/reviews'
import { adminButton } from '@/components/admin/AdminForm'
import { Stars } from '@/components/reviews/Stars'
import { requireStaff } from '@/lib/admin'
import { tr } from '@/lib/catalog'

export default async function AdminReviews() {
  const { supabase } = await requireStaff()
  const { data: reviews } = await supabase
    .from('reviews')
    .select(
      'id, rating, title, body, author_name, is_verified, created_at, products(name), review_media(storage_path)',
    )
    .eq('status', 'pending')
    .order('created_at')
    .limit(100)

  return (
    <section className="grid gap-6">
      <h1 className="type-display text-display">Anmeldelser</h1>
      <p className="text-sm text-ash">
        Til godkjenning. Publiserte vises på produktsiden innen fem minutter.
      </p>
      {!reviews?.length && <p className="text-ash">Ingenting venter.</p>}
      <ul className="grid gap-4">
        {(reviews ?? []).map((r) => (
          <li key={r.id} className="grid gap-3 rounded-sm border border-hairline p-5">
            <p className="flex flex-wrap items-center gap-3 text-sm">
              <strong className="font-normal">{tr(r.products?.name, 'nb')}</strong>
              <Stars rating={r.rating} label={`${r.rating} av 5`} />
              <span className="text-ash">{r.author_name}</span>
              {r.is_verified && <span className="type-label text-ichor!">Verifisert kjøp</span>}
            </p>
            {r.title && <p className="text-lg">{r.title}</p>}
            <p className="whitespace-pre-line text-ash">{r.body}</p>
            {r.review_media.length > 0 && (
              <ul className="flex gap-3">
                {r.review_media.map((m) => (
                  <li key={m.storage_path}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- private media served by our route */}
                    <img
                      src={`/api/review-media/${m.storage_path}`}
                      alt="Kundebilde"
                      width={112}
                      height={112}
                      className="h-28 w-28 rounded-sm object-cover"
                    />
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-3">
              {(['published', 'rejected'] as const).map((status) => (
                <form key={status} action={moderateReview}>
                  <input type="hidden" name="reviewId" value={r.id} />
                  <input type="hidden" name="status" value={status} />
                  <button
                    className={
                      status === 'published'
                        ? adminButton
                        : 'type-label rounded-full border border-hairline-strong px-5 py-2.5'
                    }
                  >
                    {status === 'published' ? 'Publiser' : 'Avvis'}
                  </button>
                </form>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
