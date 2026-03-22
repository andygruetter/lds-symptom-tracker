import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Nutzungshinweis',
  description:
    'Wichtige Hinweise zur Nutzung von Symptomchat — kein Medizinprodukt, keine ärztliche Diagnose.',
}

export default function DisclaimerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
