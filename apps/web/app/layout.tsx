import './globals.css'
import { type ReactNode } from 'react'
import { RootFrame } from '@/components/root-frame'
import { ThemeProvider } from '@/components/theme/theme-provider'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <RootFrame>{children}</RootFrame>
        </ThemeProvider>
      </body>
    </html>
  )
}
