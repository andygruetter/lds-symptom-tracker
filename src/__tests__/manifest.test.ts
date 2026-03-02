import { describe, expect, it } from 'vitest'

import manifest from '@/app/manifest'

describe('Web App Manifest', () => {
  const result = manifest()

  it('hat korrekten App-Namen', () => {
    expect(result.name).toBe('LDS Symptom Tracker')
    expect(result.short_name).toBe('LDS Tracker')
  })

  it('ist als standalone PWA konfiguriert', () => {
    expect(result.display).toBe('standalone')
    expect(result.orientation).toBe('portrait')
    expect(result.start_url).toBe('/')
  })

  it('nutzt Patient-Theme Farben', () => {
    expect(result.theme_color).toBe('#C06A3C')
    expect(result.background_color).toBe('#F5EDE6')
  })

  it('enthält PWA-Icons in korrekten Grössen', () => {
    expect(result.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sizes: '192x192', type: 'image/png' }),
        expect.objectContaining({ sizes: '512x512', type: 'image/png' }),
      ]),
    )
  })
})
