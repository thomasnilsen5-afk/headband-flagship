import { Section, Text } from '@react-email/components'
import { Button, c, H, Layout, mono, P } from './Layout'

export type ShippingEmailProps = {
  locale: 'nb' | 'en'
  siteUrl: string
  number: number
  carrier: string | null
  trackingUrl: string | null
}

const copy = {
  nb: {
    preview: (n: number) => `Ordre ${n} er sendt`,
    title: 'Pakken er på vei.',
    body: (carrier: string | null) =>
      `Vi har sendt ordren${carrier ? ` med ${carrier}` : ''}. Beløpet er nå trukket.`,
    track: 'Spor pakken',
  },
  en: {
    preview: (n: number) => `Order ${n} has shipped`,
    title: 'Your parcel is on its way.',
    body: (carrier: string | null) =>
      `We have shipped your order${carrier ? ` with ${carrier}` : ''}. The amount has now been charged.`,
    track: 'Track parcel',
  },
}

export default function ShippingConfirmation(p: ShippingEmailProps) {
  const t = copy[p.locale]
  return (
    <Layout locale={p.locale} preview={t.preview(p.number)} siteUrl={p.siteUrl}>
      <Text style={{ fontFamily: mono, fontSize: 12, color: c.ichor, margin: '0 0 8px' }}>
        #{p.number}
      </Text>
      <H>{t.title}</H>
      <P>{t.body(p.carrier)}</P>
      {p.trackingUrl && (
        <Section style={{ padding: '8px 0' }}>
          <Button href={p.trackingUrl}>{t.track}</Button>
        </Section>
      )}
    </Layout>
  )
}
