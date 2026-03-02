import type { Metadata } from 'next'

import './globals.css'

export const metadata: Metadata = {
  title: 'LDS Symptom Tracker',
  description: 'Symptom-Tracking für Patienten mit seltenen Erkrankungen',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="de">
      <body className="antialiased">{children}</body>
    </html>
  )
}
