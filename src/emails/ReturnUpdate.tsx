import { Text } from '@react-email/components'
import { c, H, Layout, mono, P } from './Layout'

export type ReturnStatus = 'requested' | 'approved' | 'received' | 'refunded' | 'rejected'
export type ReturnEmailProps = {
  locale: 'nb' | 'en'
  siteUrl: string
  number: number
  status: ReturnStatus
  refund: string | null
}

const copy: Record<
  'nb' | 'en',
  Record<ReturnStatus, { title: string; body: (refund: string | null) => string }> & {
    preview: (n: number) => string
  }
> = {
  nb: {
    preview: (n) => `Retur for ordre ${n}`,
    requested: {
      title: 'Vi har mottatt returforespørselen.',
      body: () =>
        'Vi går gjennom den innen én virkedag og sender deg returetikett og instruksjoner på e-post.',
    },
    approved: {
      title: 'Returen er godkjent.',
      body: () =>
        'Pakk varene godt og send dem med returetiketten. Fristen for å sende er 14 dager.',
    },
    received: {
      title: 'Vi har mottatt returen.',
      body: () => 'Vi sjekker varene og refunderer så snart som mulig, senest innen 14 dager.',
    },
    refunded: {
      title: 'Pengene er på vei tilbake.',
      body: (r) =>
        `Vi har refundert ${r ?? 'beløpet'} til samme betalingsmåte. Det kan ta noen dager før det vises.`,
    },
    rejected: {
      title: 'Returen kunne ikke godkjennes.',
      body: () => 'Svar på denne e-posten hvis du har spørsmål, så hjelper vi deg.',
    },
  },
  en: {
    preview: (n) => `Return for order ${n}`,
    requested: {
      title: 'We have received your return request.',
      body: () =>
        'We review it within one business day and email you a return label and instructions.',
    },
    approved: {
      title: 'Your return is approved.',
      body: () => 'Pack the items well and send them with the return label within 14 days.',
    },
    received: {
      title: 'We have received your return.',
      body: () =>
        'We check the items and refund as soon as possible, within 14 days at the latest.',
    },
    refunded: {
      title: 'Your money is on its way back.',
      body: (r) =>
        `We have refunded ${r ?? 'the amount'} to your original payment method. It may take a few days to appear.`,
    },
    rejected: {
      title: 'We could not approve the return.',
      body: () => 'Reply to this email if you have questions and we will help.',
    },
  },
}

export default function ReturnUpdate(p: ReturnEmailProps) {
  const t = copy[p.locale]
  return (
    <Layout locale={p.locale} preview={t.preview(p.number)} siteUrl={p.siteUrl}>
      <Text style={{ fontFamily: mono, fontSize: 12, color: c.ichor, margin: '0 0 8px' }}>
        #{p.number}
      </Text>
      <H>{t[p.status].title}</H>
      <P>{t[p.status].body(p.refund)}</P>
    </Layout>
  )
}
