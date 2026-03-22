import { createOgImage, OG_SIZE } from '@/lib/og-image'

export const runtime = 'edge'
export const alt = 'Symptomchat — Symptome erfassen, Muster erkennen'
export const size = OG_SIZE
export const contentType = 'image/png'

export default async function Image() {
  return createOgImage({
    title: 'Symptome erfassen.',
    highlightText: 'Muster erkennen.',
    subtitle:
      'Sprich oder tippe — die KI erledigt den Rest. In unter 10 Sekunden.',
  })
}
