import { Inter } from 'next/font/google'

import type { Metadata, Viewport } from 'next'

import { Toaster } from '@/components/ui/sonner'

import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://symptomchat.ch'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Symptomchat — Symptom-Tracking für seltene Erkrankungen',
    template: '%s | Symptomchat',
  },
  description:
    'Ereignisbasiertes Symptom-Tracking für Patienten mit seltenen Erkrankungen. Sprich oder tippe — die KI erledigt den Rest.',
  keywords: [
    'Symptom-Tracking',
    'seltene Erkrankungen',
    'Symptom-Tagebuch',
    'Gesundheits-App',
    'Schweiz',
    'Spracheingabe',
    'LDS',
    'EDS',
    'Bindegewebserkrankung',
  ],
  authors: [{ name: 'Symptomchat' }],
  creator: 'Symptomchat',
  publisher: 'Symptomchat',
  openGraph: {
    title: 'Symptomchat — Symptom-Tracking für seltene Erkrankungen',
    description:
      'Ereignisbasiertes Symptom-Tracking für Patienten mit seltenen Erkrankungen. Sprich oder tippe — die KI erledigt den Rest.',
    url: BASE_URL,
    siteName: 'Symptomchat',
    locale: 'de_CH',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Symptomchat — Symptom-Tracking für seltene Erkrankungen',
    description:
      'Ereignisbasiertes Symptom-Tracking für Patienten mit seltenen Erkrankungen. Sprich oder tippe — die KI erledigt den Rest.',
  },
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

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Symptomchat',
  url: 'https://symptomchat.ch',
  logo: 'https://symptomchat.ch/icons/icon-512.png',
  description:
    'Ereignisbasiertes Symptom-Tracking für Patienten mit seltenen Erkrankungen',
  areaServed: {
    '@type': 'Country',
    name: 'Schweiz',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="de">
      <body className={`${inter.variable} antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        {children}
        <Toaster />
      </body>
    </html>
  )
}
