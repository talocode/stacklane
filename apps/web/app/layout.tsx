import './globals.css'
import { type ReactNode } from 'react'
import { RootFrame } from '@/components/root-frame'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <RootFrame>{children}</RootFrame>
      </body>
    </html>
  )
}
