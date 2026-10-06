import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Link } from '@/i18n/navigation'
import { requireStaff } from '@/lib/admin'

export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } }

const NAV = [
  { href: '/admin', label: 'Oversikt' },
  { href: '/admin/orders', label: 'Ordre' },
  { href: '/admin/stock', label: 'Lager' },
  { href: '/admin/returns', label: 'Retur' },
] as const

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireStaff()
  return (
    <div className="shell grid gap-8 pt-[calc(var(--header-h)+4vh)] pb-24">
      <nav aria-label="Admin" className="hairline flex flex-wrap items-center gap-2 border-b pb-4">
        <span className="type-label mr-4 text-ichor">Admin</span>
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="type-label rounded-full border border-hairline px-4 py-2 hover:text-bone"
          >
            {n.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  )
}
