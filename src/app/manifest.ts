import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LDS Symptom Tracker',
    short_name: 'LDS Tracker',
    description: 'Symptom-Tracking für Patienten mit seltenen Erkrankungen',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    theme_color: '#C06A3C',
    background_color: '#F5EDE6',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
