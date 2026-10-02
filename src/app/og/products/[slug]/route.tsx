import { ImageResponse } from 'next/og'
import { brand } from '@/lib/brand'
import { getProduct } from '@/lib/catalog'
import { formatPrice } from '@/lib/commerce'

export const revalidate = 3600

/** 1200×630 Open Graph image per product: the band as an ellipse in its colours, name, price. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = await getProduct(slug, 'nb')
  if (!product) return new Response('Not found', { status: 404 })

  const film = product.form.finish === 'film'
  const a = film ? '#3ee6c1' : (product.colors[0]?.hex ?? '#c9ccd4')
  const b = film ? '#8a5cff' : '#e9e6df'
  const ring = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="520" viewBox="0 0 900 520"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset=".5" stop-color="${b}"/><stop offset="1" stop-color="${film ? '#e9c97a' : a}"/></linearGradient></defs><ellipse cx="450" cy="260" rx="400" ry="150" fill="none" stroke="url(#g)" stroke-width="34" transform="rotate(-8 450 260)"/></svg>`

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: 'radial-gradient(60% 60% at 60% 50%, #1b1530, #07090d 70%)',
        color: '#eeece6',
        padding: 64,
      }}
    >
      <div
        style={{ display: 'flex', justifyContent: 'space-between', fontSize: 22, letterSpacing: 6 }}
      >
        <span>{brand.name}</span>
        <span>{formatPrice(product.priceOre, 'nb')}</span>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element -- satori renders <img> */}
      <img
        alt=""
        width={900}
        height={520}
        src={`data:image/svg+xml;base64,${Buffer.from(ring).toString('base64')}`}
        style={{ position: 'absolute', right: 0, top: 60 }}
      />
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 120, letterSpacing: -4, lineHeight: 1 }}>{product.name}</span>
        <span style={{ fontSize: 30, color: '#a9adb6', marginTop: 16 }}>{product.tagline}</span>
      </div>
    </div>,
    { width: 1200, height: 630 },
  )
}
