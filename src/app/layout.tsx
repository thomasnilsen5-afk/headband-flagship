import type { ReactNode } from 'react'
import './globals.css'

// The real <html> lives in [locale]/layout.tsx so the lang attribute is always correct.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children
}
