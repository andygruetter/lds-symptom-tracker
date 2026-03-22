import { describe, expect, it } from 'vitest'

import { metadata } from '@/app/disclaimer/layout'

describe('Disclaimer Layout', () => {
  it('hat korrekten Titel', () => {
    expect(metadata.title).toBe('Nutzungshinweis')
  })

  it('hat Beschreibung', () => {
    expect(metadata.description).toContain('kein Medizinprodukt')
  })
})
