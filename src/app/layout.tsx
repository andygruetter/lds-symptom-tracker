import { Inter } from 'next/font/google'

import type { Metadata, Viewport } from 'next'

import { Toaster } from '@/components/ui/sonner'

import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Symptomchat',
  description: 'Symptom-Tracking für Patienten mit seltenen Erkrankungen',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Symptomchat',
  },
  icons: {
    apple: '/icons/apple-touch-icon.png',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="de">
      <body className={`${inter.variable} antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
