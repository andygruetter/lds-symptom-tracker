import { describe, expect, it } from 'vitest'

import { generateClarificationQuestions } from '@/lib/ai/clarification'
import type { ExtractedData } from '@/types/ai'

function makeField(
  overrides: Partial<ExtractedData> & {
    field_name: string
    confidence: number
  },
): ExtractedData {
  return {
    id: `field-${overrides.field_name}`,
    symptom_event_id: 'event-1',
    value: 'test-value',
    confirmed: false,
    created_at: '2026-03-03T10:00:00Z',
    ...overrides,
  }
}

describe('generateClarificationQuestions', () => {
  it('gibt leeres Array zurück wenn alle Felder ≥70% haben', () => {
    const fields = [
      makeField({ field_name: 'symptom_name', confidence: 92 }),
      makeField({ field_name: 'body_region', confidence: 85 }),
    ]

    const result = generateClarificationQuestions(fields)
    expect(result).toEqual([])
  })

  it('generiert Fragen nur für Felder mit confidence <70%', () => {
    const fields = [
      makeField({ field_name: 'symptom_name', confidence: 92 }),
      makeField({ field_name: 'side', confidence: 55 }),
    ]

    const result = generateClarificationQuestions(fields)
    expect(result).toHaveLength(1)
    expect(result[0].fieldName).toBe('side')
  })

  it('begrenzt auf maximal 2 Fragen', () => {
    const fields = [
      makeField({ field_name: 'body_region', confidence: 40 }),
      makeField({ field_name: 'side', confidence: 50 }),
      makeField({ field_name: 'intensity', confidence: 60 }),
      makeField({ field_name: 'symptom_type', confidence: 30 }),
    ]

    const result = generateClarificationQuestions(fields)
    expect(result).toHaveLength(2)
  })

  it('sortiert nach Priorität: body_region > side > symptom_type > intensity', () => {
    const fields = [
      makeField({ field_name: 'intensity', confidence: 40 }),
      makeField({ field_name: 'body_region', confidence: 50 }),
      makeField({ field_name: 'symptom_type', confidence: 30 }),
      makeField({ field_name: 'side', confidence: 60 }),
    ]

    const result = generateClarificationQuestions(fields)
    expect(result[0].fieldName).toBe('body_region')
    expect(result[1].fieldName).toBe('side')
  })

  it('gibt vordefinierte Optionen für bekannte Feldtypen', () => {
    const fields = [makeField({ field_name: 'side', confidence: 55 })]

    const result = generateClarificationQuestions(fields)
    expect(result[0].options).toEqual(['Links', 'Rechts', 'Beidseits'])
    expect(result[0].question).toBe('Welche Seite?')
  })

  it('gibt generische Frage für unbekannte Feldtypen', () => {
    // 'Dauer' (Deutsch) ist kein bekanntes Feld — nur 'duration' (Englisch) ist bekannt
    const fields = [makeField({ field_name: 'Dauer', confidence: 50 })]

    const result = generateClarificationQuestions(fields)
    expect(result[0].question).toContain('Dauer')
    expect(result[0].options).toEqual([])
  })

  it('setzt allowFreeText auf true', () => {
    const fields = [makeField({ field_name: 'side', confidence: 55 })]

    const result = generateClarificationQuestions(fields)
    expect(result[0].allowFreeText).toBe(true)
  })

  it('ignoriert bereits bestätigte Felder', () => {
    const fields = [
      makeField({ field_name: 'side', confidence: 55, confirmed: true }),
      makeField({
        field_name: 'body_region',
        confidence: 40,
        confirmed: false,
      }),
    ]

    const result = generateClarificationQuestions(fields)
    expect(result).toHaveLength(1)
    expect(result[0].fieldName).toBe('body_region')
  })

  it('gibt leeres Array zurück bei leerer Feldliste', () => {
    const result = generateClarificationQuestions([])
    expect(result).toEqual([])
  })

  it('gibt Frage für symptom_time mit höchster Priorität', () => {
    const fields = [
      makeField({ field_name: 'body_region', confidence: 40 }),
      makeField({ field_name: 'symptom_time', confidence: 55 }),
    ]

    const result = generateClarificationQuestions(fields)
    expect(result[0].fieldName).toBe('symptom_time')
    expect(result[0].question).toContain('Wann')
  })
})
