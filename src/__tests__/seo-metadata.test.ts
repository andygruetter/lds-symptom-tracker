import { describe, expect, it, vi } from 'vitest'

vi.mock('next/font/google', () => ({
  Inter: () => ({ variable: '--font-inter' }),
}))

import { metadata } from '@/app/layout'

describe('Root Layout SEO Metadata', () => {
  it('hat title template', () => {
    expect(metadata.title).toEqual(
      expect.objectContaining({
        default: expect.stringContaining('Symptomchat'),
        template: '%s | Symptomchat',
      }),
    )
  })

  it('hat Beschreibung mit Keywords', () => {
    expect(metadata.description).toContain('Symptom-Tracking')
    expect(metadata.description).toContain('seltene')
  })

  it('hat OpenGraph Konfiguration', () => {
    expect(metadata.openGraph).toEqual(
      expect.objectContaining({
        siteName: 'Symptomchat',
        locale: 'de_CH',
        type: 'website',
      }),
    )
  })

  it('hat Twitter Card Konfiguration', () => {
    expect(metadata.twitter).toEqual(
      expect.objectContaining({
        card: 'summary_large_image',
      }),
    )
  })

  it('hat keywords', () => {
    expect(metadata.keywords).toEqual(
      expect.arrayContaining([
        'Symptom-Tracking',
        'seltene Erkrankungen',
        'Schweiz',
      ]),
    )
  })

  it('hat Apple Web App Konfiguration', () => {
    expect(metadata.appleWebApp).toEqual(
      expect.objectContaining({
        capable: true,
        title: 'Symptomchat',
      }),
    )
  })
})
