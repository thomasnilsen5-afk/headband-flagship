'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState, type ComponentProps } from 'react'
import { Link, usePathname } from '@/i18n/navigation'
import { LocaleSwitch } from './LocaleSwitch'

type Item = { href: ComponentProps<typeof Link>['href']; label: string }

export function MobileMenu({ items }: { items: Item[] }) {
  const t = useTranslations('a11y')
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const dialogRef = useRef<HTMLDialogElement>(null)

  // Close on navigation (state adjusted during render, no effect needed).
  const [lastPath, setLastPath] = useState(pathname)
  if (pathname !== lastPath) {
    setLastPath(pathname)
    setOpen(false)
  }

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <>
      <button
        type="button"
        className="type-label text-bone! md:hidden"
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen(true)}
      >
        {t('menu')}
      </button>
      {/* <dialog> gives us focus trapping, Escape and inert background for free. */}
      <dialog
        id="mobile-menu"
        ref={dialogRef}
        onClose={() => setOpen(false)}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-void p-0 text-bone backdrop:bg-void/80 md:hidden"
      >
        <div className="shell flex h-full flex-col pt-5 pb-10">
          <div className="flex justify-end">
            <button type="button" className="type-label text-bone!" onClick={() => setOpen(false)}>
              {t('close')}
            </button>
          </div>
          <nav className="mt-auto">
            <ul className="space-y-2">
              {items.map((item, i) => (
                <li key={item.label} className="line-mask">
                  <Link
                    href={item.href}
                    className="type-display block py-1 text-[13vw] leading-none"
                    style={{
                      animation: open ? `var(--animate-rise)` : undefined,
                      animationDelay: `${i * 70}ms`,
                    }}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <LocaleSwitch className="mt-12" />
        </div>
      </dialog>
    </>
  )
}
