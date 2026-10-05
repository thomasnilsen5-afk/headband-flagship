import { Column, Row, Section, Text } from '@react-email/components'
import { Button, c, H, Layout, mono, P } from './Layout'

export type OrderEmailProps = {
  locale: 'nb' | 'en'
  siteUrl: string
  number: number
  items: { name: string; variantLabel: string; qty: number; total: string }[]
  subtotal: string
  discount: string | null
  shipping: string
  total: string
  vat: string
  address: string
  accountUrl: string
}

const copy = {
  nb: {
    preview: (n: number) => `Ordre ${n} er bekreftet`,
    title: 'Takk. Ordren er bekreftet.',
    body: 'Beløpet er reservert og trekkes først når vi sender pakken. Du får sporingslenke på e-post.',
    order: 'Ordre',
    subtotal: 'Varer',
    discount: 'Rabatt',
    shipping: 'Frakt',
    total: 'Totalt',
    vat: 'herav mva.',
    shipTo: 'Leveres til',
    cta: 'Se ordren',
    returns:
      'Du har 14 dagers angrerett og 30 dagers åpent kjøp fra levering. Retur bestiller du fra kontoen din.',
  },
  en: {
    preview: (n: number) => `Order ${n} is confirmed`,
    title: 'Thank you. Your order is confirmed.',
    body: 'The amount is reserved and only charged when we ship. You will get a tracking link by email.',
    order: 'Order',
    subtotal: 'Items',
    discount: 'Discount',
    shipping: 'Shipping',
    total: 'Total',
    vat: 'incl. VAT',
    shipTo: 'Shipping to',
    cta: 'View order',
    returns:
      'You have a 14-day right of withdrawal and 30 days of open purchase from delivery. Start a return from your account.',
  },
}

const cell = { fontSize: 14, lineHeight: '22px', color: c.bone, margin: 0 }
const muted = { ...cell, color: c.ash }

export default function OrderConfirmation(p: OrderEmailProps) {
  const t = copy[p.locale]
  const line = (label: string, value: string, strong = false) => (
    <Row>
      <Column>
        <Text style={strong ? { ...cell, fontSize: 16 } : muted}>{label}</Text>
      </Column>
      <Column align="right">
        <Text style={{ ...cell, fontFamily: mono, fontSize: strong ? 16 : 14 }}>{value}</Text>
      </Column>
    </Row>
  )
  return (
    <Layout locale={p.locale} preview={t.preview(p.number)} siteUrl={p.siteUrl}>
      <Text style={{ fontFamily: mono, fontSize: 12, color: c.ichor, margin: '0 0 8px' }}>
        {t.order} {p.number}
      </Text>
      <H>{t.title}</H>
      <P>{t.body}</P>
      <Section
        style={{
          borderTop: `1px solid ${c.line}`,
          borderBottom: `1px solid ${c.line}`,
          padding: '12px 0',
          margin: '16px 0',
        }}
      >
        {p.items.map((i, n) => (
          <Row key={n} style={{ padding: '6px 0' }}>
            <Column>
              <Text style={cell}>{i.name}</Text>
              <Text style={{ ...muted, fontSize: 13 }}>
                {i.variantLabel} × {i.qty}
              </Text>
            </Column>
            <Column align="right" style={{ verticalAlign: 'top' }}>
              <Text style={{ ...cell, fontFamily: mono }}>{i.total}</Text>
            </Column>
          </Row>
        ))}
      </Section>
      {line(t.subtotal, p.subtotal)}
      {p.discount && line(t.discount, `−${p.discount}`)}
      {line(t.shipping, p.shipping)}
      {line(t.total, p.total, true)}
      <Text style={{ ...muted, fontSize: 12, textAlign: 'right' }}>
        {t.vat} {p.vat}
      </Text>
      <Text
        style={{
          ...muted,
          margin: '24px 0 4px',
          fontFamily: mono,
          fontSize: 11,
          letterSpacing: '0.14em',
        }}
      >
        {t.shipTo.toUpperCase()}
      </Text>
      <P>{p.address}</P>
      <Section style={{ padding: '8px 0 16px' }}>
        <Button href={p.accountUrl}>{t.cta}</Button>
      </Section>
      <Text style={{ ...muted, fontSize: 13 }}>{t.returns}</Text>
    </Layout>
  )
}
