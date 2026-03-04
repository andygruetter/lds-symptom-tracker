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
      makeField({ field_name: 'Symptom', confidence: 92 }),
      makeField({ field_name: 'Körperteil', confidence: 85 }),
    ]

    const result = generateClarificationQuestions(fields)
    expect(result).toEqual([])
  })

  it('generiert Fragen nur für Felder mit confidence <70%', () => {
    const fields = [
      makeField({ field_name: 'Symptom', confidence: 92 }),
      makeField({ field_name: 'Seite', confidence: 55 }),
    ]

    const result = generateClarificationQuestions(fields)
    expect(result).toHaveLength(1)
    expect(result[0].fieldName).toBe('Seite')
  })

  it('begrenzt auf maximal 2 Fragen', () => {
    const fields = [
      makeField({ field_name: 'Körperregion', confidence: 40 }),
      makeField({ field_name: 'Seite', confidence: 50 }),
      makeField({ field_name: 'Intensität', confidence: 60 }),
      makeField({ field_name: 'Symptomtyp', confidence: 30 }),
    ]

    const result = generateClarificationQuestions(fields)
    expect(result).toHaveLength(2)
  })

  it('sortiert nach Priorität: Körperregion > Seite > Symptomtyp > Intensität', () => {
    const fields = [
      makeField({ field_name: 'Intensität', confidence: 40 }),
      makeField({ field_name: 'Körperregion', confidence: 50 }),
      makeField({ field_name: 'Symptomtyp', confidence: 30 }),
      makeField({ field_name: 'Seite', confidence: 60 }),
    ]

    const result = generateClarificationQuestions(fields)
    expect(result[0].fieldName).toBe('Körperregion')
    expect(result[1].fieldName).toBe('Seite')
  })

  it('gibt vordefinierte Optionen für bekannte Feldtypen', () => {
    const fields = [makeField({ field_name: 'Seite', confidence: 55 })]

    const result = generateClarificationQuestions(fields)
    expect(result[0].options).toEqual(['Links', 'Rechts', 'Beidseits'])
    expect(result[0].question).toBe('Welche Seite?')
  })

  it('gibt generische Frage für unbekannte Feldtypen', () => {
    const fields = [makeField({ field_name: 'Dauer', confidence: 50 })]

    const result = generateClarificationQuestions(fields)
    expect(result[0].question).toContain('Dauer')
    expect(result[0].options).toEqual([])
  })

  it('setzt allowFreeText auf true', () => {
    const fields = [makeField({ field_name: 'Seite', confidence: 55 })]

    const result = generateClarificationQuestions(fields)
    expect(result[0].allowFreeText).toBe(true)
  })

  it('ignoriert bereits bestätigte Felder', () => {
    const fields = [
      makeField({ field_name: 'Seite', confidence: 55, confirmed: true }),
      makeField({
        field_name: 'Körperregion',
        confidence: 40,
        confirmed: false,
      }),
    ]

    const result = generateClarificationQuestions(fields)
    expect(result).toHaveLength(1)
    expect(result[0].fieldName).toBe('Körperregion')
  })

  it('gibt leeres Array zurück bei leerer Feldliste', () => {
    const result = generateClarificationQuestions([])
    expect(result).toEqual([])
  })
})
