import { describe, expect, it } from 'vitest'

import type { Correction } from '@/types/ai'

import { buildCorrectionContext } from '@/lib/ai/prompt-enrichment'

describe('buildCorrectionContext', () => {
  it('gibt leeren String zurück wenn keine Korrekturen vorhanden', () => {
    const result = buildCorrectionContext([])
    expect(result).toBe('')
  })

  it('formatiert einzelne Korrektur korrekt', () => {
    const corrections: Correction[] = [
      {
        fieldName: 'body_region',
        originalValue: 'Rügge',
        correctedValue: 'Rücken',
      },
    ]

    const result = buildCorrectionContext(corrections)

    expect(result).toContain('Rügge')
    expect(result).toContain('Rücken')
    expect(result).toContain('body_region')
    expect(result).toContain('1x')
  })

  it('fasst Duplikate zusammen und annotiert Häufigkeit', () => {
    const corrections: Correction[] = [
      {
        fieldName: 'body_region',
        originalValue: 'Rügge',
        correctedValue: 'Rücken',
      },
      {
        fieldName: 'body_region',
        originalValue: 'Rügge',
        correctedValue: 'Rücken',
      },
      {
        fieldName: 'body_region',
        originalValue: 'Rügge',
        correctedValue: 'Rücken',
      },
    ]

    const result = buildCorrectionContext(corrections)

    expect(result).toContain('3x')
    // Sollte nur einmal erscheinen, nicht 3x
    const lines = result
      .split('\n')
      .filter((l) => l.includes('Rügge'))
    expect(lines).toHaveLength(1)
  })

  it('sortiert häufigste Korrekturen zuerst', () => {
    const corrections: Correction[] = [
      {
        fieldName: 'symptom_name',
        originalValue: 'Chopfweh',
        correctedValue: 'Kopfschmerzen',
      },
      {
        fieldName: 'body_region',
        originalValue: 'Rügge',
        correctedValue: 'Rücken',
      },
      {
        fieldName: 'body_region',
        originalValue: 'Rügge',
        correctedValue: 'Rücken',
      },
      {
        fieldName: 'body_region',
        originalValue: 'Rügge',
        correctedValue: 'Rücken',
      },
    ]

    const result = buildCorrectionContext(corrections)

    const rüggePos = result.indexOf('Rügge')
    const chopfwehPos = result.indexOf('Chopfweh')
    // Rügge (3x) sollte vor Chopfweh (1x) kommen
    expect(rüggePos).toBeLessThan(chopfwehPos)
  })

  it('enthält Instruktion für Claude', () => {
    const corrections: Correction[] = [
      {
        fieldName: 'body_region',
        originalValue: 'Rügge',
        correctedValue: 'Rücken',
      },
    ]

    const result = buildCorrectionContext(corrections)

    expect(result).toContain('Konfidenz')
    expect(result).toContain('korrigiert')
  })

  it('verarbeitet mehrere unterschiedliche Korrekturen', () => {
    const corrections: Correction[] = [
      {
        fieldName: 'body_region',
        originalValue: 'Rügge',
        correctedValue: 'Rücken',
      },
      {
        fieldName: 'body_region',
        originalValue: 'links',
        correctedValue: 'Schulterblatt',
      },
      {
        fieldName: 'symptom_name',
        originalValue: 'Chopfweh',
        correctedValue: 'Kopfschmerzen',
      },
    ]

    const result = buildCorrectionContext(corrections)

    expect(result).toContain('Rügge')
    expect(result).toContain('links')
    expect(result).toContain('Chopfweh')
  })
})
