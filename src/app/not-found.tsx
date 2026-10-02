import Link from 'next/link'

// Requests outside any locale (rare: the proxy handles almost everything).
export default function GlobalNotFound() {
  return (
    <html lang="nb">
      <body
        style={{
          background: '#07090d',
          color: '#eeece6',
          fontFamily: 'system-ui',
          display: 'grid',
          placeItems: 'center',
          minHeight: '100dvh',
        }}
      >
        <Link href="/">404 — Tilbake til start</Link>
      </body>
    </html>
  )
}
