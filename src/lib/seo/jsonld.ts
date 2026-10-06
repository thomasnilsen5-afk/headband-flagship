import { brand } from '@/lib/brand'
import type { ProductDetail } from '@/lib/catalog'
import { siteUrl } from '@/lib/env'

const nok = (ore: number) => (ore / 100).toFixed(2)

/** schema.org Product with one Offer per variant (price incl. MVA, live availability at render). */
type ReviewSummary = {
  count: number
  average: number
  reviews: { rating: number; authorName: string; body: string; publishedAt: string }[]
}

export function productJsonLd(p: ProductDetail, url: string, r?: ReviewSummary) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.description || p.tagline,
    sku: p.variants[0]?.sku,
    brand: { '@type': 'Brand', name: brand.name },
    url,
    image: [`${siteUrl}/og/products/${p.slug}`],
    material: p.materials.map((m) => m.name).join(', ') || undefined,
    // Only real, moderated customer reviews; omitted entirely when there are none.
    aggregateRating: r?.count
      ? {
          '@type': 'AggregateRating',
          ratingValue: r.average,
          reviewCount: r.count,
          bestRating: 5,
          worstRating: 1,
        }
      : undefined,
    review: r?.reviews.slice(0, 10).map((x) => ({
      '@type': 'Review',
      reviewRating: { '@type': 'Rating', ratingValue: x.rating, bestRating: 5, worstRating: 1 },
      author: { '@type': 'Person', name: x.authorName },
      reviewBody: x.body,
      datePublished: x.publishedAt.slice(0, 10),
    })),
    offers: p.variants.map((v) => ({
      '@type': 'Offer',
      sku: v.sku,
      url,
      priceCurrency: 'NOK',
      price: nok(v.priceOre),
      itemCondition: 'https://schema.org/NewCondition',
      availability:
        v.available > 0
          ? 'https://schema.org/InStock'
          : p.drop
            ? 'https://schema.org/PreOrder'
            : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: brand.legalName },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'NO',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: 30,
        returnMethod: 'https://schema.org/ReturnByMail',
      },
      additionalProperty: [
        { '@type': 'PropertyValue', name: 'color', value: v.colorName },
        { '@type': 'PropertyValue', name: 'size', value: v.size },
      ],
    })),
  }
}

/** Safe for dangerouslySetInnerHTML: escapes "<" so content can never close the script tag. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
