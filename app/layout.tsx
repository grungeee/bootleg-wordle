import '../css/tailwind.css'
import '../css/tailwind-overrides.css'
import '../css/keyframes.css'
import '../css/webfontkit/stylesheet.css'
import type { ReactNode } from 'react'
import SupabaseProvider from '@/components/SupabaseProvider'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-purple font-inter">
        <SupabaseProvider>{children}</SupabaseProvider>
      </body>
    </html>
  )
}
