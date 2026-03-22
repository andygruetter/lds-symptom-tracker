import { createOgImage, OG_SIZE } from '@/lib/og-image'

export const runtime = 'edge'
export const alt = 'Symptomchat — Symptom-Tracking für seltene Erkrankungen'
export const size = OG_SIZE
export const contentType = 'image/png'

export default async function Image() {
  return createOgImage({
    title: 'Symptom-Tracking für seltene Erkrankungen',
  })
}
