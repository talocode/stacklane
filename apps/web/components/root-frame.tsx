'use client'

import { usePathname } from 'next/navigation'
import { type ReactNode } from 'react'
import { AppShell } from '@/components/app-shell'

export function RootFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  if (pathname === '/signin') {
    return <>{children}</>
  }

  return <AppShell>{children}</AppShell>
}
