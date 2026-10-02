import { brand } from '@/lib/brand'
import type { ProductDetail } from '@/lib/catalog'
import { siteUrl } from '@/lib/env'

const nok = (ore: number) => (ore / 100).toFixed(2)

/** schema.org Product with one Offer per variant (price incl. MVA, live availability at render). */
export function productJsonLd(p: ProductDetail, url: string) {
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
