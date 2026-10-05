import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { ReactNode } from 'react'
import { brand } from '@/lib/brand'

// Email clients ignore CSS variables and most of the site's type system: the same palette,
// spelled out, with system fonts. Light text on near-black passes AA; dark-mode clients that
// invert still keep the hierarchy.
export const c = {
  void: '#0b0d12',
  panel: '#12151c',
  bone: '#f2f0ea',
  ash: '#a7adb8',
  dim: '#6f7682',
  ichor: '#5ef0c8',
  line: '#232833',
}
const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif'
export const mono = 'Menlo, Consolas, "SFMono-Regular", monospace'

export function Layout({
  locale,
  preview,
  children,
  siteUrl,
}: {
  locale: 'nb' | 'en'
  preview: string
  children: ReactNode
  siteUrl: string
}) {
  const a = brand.address
  return (
    <Html lang={locale}>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ margin: 0, background: c.void, color: c.bone, fontFamily: font }}>
        <Container style={{ maxWidth: 560, padding: '40px 24px' }}>
          <Text
            style={{
              fontFamily: mono,
              fontSize: 12,
              letterSpacing: '0.16em',
              color: c.ash,
              margin: 0,
            }}
          >
            {brand.name}
          </Text>
          <Section style={{ paddingTop: 24 }}>{children}</Section>
          <Hr style={{ borderColor: c.line, margin: '40px 0 16px' }} />
          <Text style={{ fontSize: 12, lineHeight: '18px', color: c.dim, margin: 0 }}>
            {brand.legalName} · org.nr. {brand.orgNumber} · {a.street}, {a.postalCode} {a.city}
            <br />
            <Link href={siteUrl} style={{ color: c.dim }}>
              {siteUrl.replace(/^https?:\/\//, '')}
            </Link>{' '}
            · {brand.email}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export function H({ children }: { children: ReactNode }) {
  return (
    <Text
      style={{
        fontSize: 30,
        lineHeight: '34px',
        fontWeight: 300,
        color: c.bone,
        margin: '0 0 12px',
      }}
    >
      {children}
    </Text>
  )
}

export function P({ children }: { children: ReactNode }) {
  return (
    <Text style={{ fontSize: 15, lineHeight: '24px', color: c.ash, margin: '0 0 16px' }}>
      {children}
    </Text>
  )
}

export function Button({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        display: 'inline-block',
        background: c.bone,
        color: c.void,
        padding: '14px 26px',
        borderRadius: 999,
        fontFamily: mono,
        fontSize: 12,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        textDecoration: 'none',
      }}
    >
      {children}
    </Link>
  )
}
