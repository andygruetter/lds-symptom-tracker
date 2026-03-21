import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://symptomchat.ch'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/auth/', '/app/', '/doctor/', '/share/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
