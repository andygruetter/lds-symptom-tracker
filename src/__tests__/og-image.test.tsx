import { describe, expect, it, vi } from 'vitest'

vi.mock('next/og', () => ({
  ImageResponse: class MockImageResponse {
    constructor(
      public element: React.ReactElement,
      public options: Record<string, unknown>,
    ) {}
  },
}))

import { createOgImage, OG_SIZE } from '@/lib/og-image'

describe('OG Image', () => {
  it('hat korrekte Standardgrösse', () => {
    expect(OG_SIZE).toEqual({ width: 1200, height: 630 })
  })

  it('erstellt ImageResponse mit Titel', () => {
    const result = createOgImage({ title: 'Test Titel' })
    expect(result).toBeDefined()
    expect(result).toHaveProperty('options')
    expect(
      (result as { options: { width: number; height: number } }).options,
    ).toEqual({
      width: 1200,
      height: 630,
    })
  })

  it('erstellt ImageResponse mit allen Optionen', () => {
    const result = createOgImage({
      title: 'Haupttitel',
      highlightText: 'Highlight',
      subtitle: 'Untertitel',
    })
    expect(result).toBeDefined()
  })
})
