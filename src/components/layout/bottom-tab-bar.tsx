'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { BarChart3, Mic, Settings } from 'lucide-react'

import { cn } from '@/lib/utils'

const tabs = [
  { href: '/', label: 'Erfassen', icon: Mic },
  { href: '/insights', label: 'Auswertung', icon: BarChart3 },
  { href: '/more', label: 'Mehr', icon: Settings },
] as const

export function BottomTabBar() {
  const pathname = usePathname()

  return (
    <nav
      role="navigation"
      aria-label="Hauptnavigation"
      className="fixed bottom-0 z-50 w-full border-t border-border bg-background pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex h-16 items-center justify-around">
        {tabs.map((tab) => {
          const isActive =
            tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href)

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex min-h-11 min-w-11 flex-col items-center gap-1 py-2',
                isActive ? 'font-medium text-primary' : 'text-muted-foreground',
              )}
            >
              <tab.icon className="size-5" aria-hidden="true" />
              <span className="text-xs">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
