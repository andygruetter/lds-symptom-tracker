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

  // --- Dynamic body_region question ---

  it('generiert dynamische body_region Frage mit extrahiertem Wert', () => {
    const fields = [
      makeField({
        field_name: 'body_region',
        confidence: 40,
        value: 'Kopf',
      }),
    ]

    const result = generateClarificationQuestions(fields)
    expect(result[0].question).toContain('Kopf')
    expect(result[0].question).toContain('genauer eingrenzen')
  })

  it('generiert body_region Fallback-Frage ohne extrahierten Wert', () => {
    const fields = [
      makeField({
        field_name: 'body_region',
        confidence: 40,
        value: '',
      }),
    ]

    const result = generateClarificationQuestions(fields)
    expect(result[0].question).toBe('Welche Region genauer?')
  })

  // --- Dynamic body_region options ---

  it('gibt Kopf-Suboptionen wenn Wert "Kopf" enthält', () => {
    const fields = [
      makeField({
        field_name: 'body_region',
        confidence: 40,
        value: 'Kopf',
      }),
    ]

    const result = generateClarificationQuestions(fields)
    expect(result[0].options).toEqual([
      'Stirn',
      'Schläfe',
      'Hinterkopf',
      'Scheitel',
    ])
  })

  it('gibt Rücken-Suboptionen wenn Wert "Rücken" enthält', () => {
    const fields = [
      makeField({
        field_name: 'body_region',
        confidence: 40,
        value: 'Rücken',
      }),
    ]

    const result = generateClarificationQuestions(fields)
    expect(result[0].options).toEqual([
      'Oberer Rücken',
      'Unterer Rücken',
      'Schulterblatt',
      'Lendenbereich',
    ])
  })

  it('gibt allgemeine Suboptionen wenn body_region Wert keinem Schlüssel entspricht', () => {
    const fields = [
      makeField({
        field_name: 'body_region',
        confidence: 40,
        value: 'Hals',
      }),
    ]

    const result = generateClarificationQuestions(fields)
    expect(result[0].options).toEqual([
      'Oberer Bereich',
      'Unterer Bereich',
      'Links',
      'Rechts',
      'Mitte',
    ])
  })

  it('gibt Hauptregionen als Optionen wenn body_region keinen Wert hat', () => {
    const fields = [
      makeField({
        field_name: 'body_region',
        confidence: 40,
        value: '',
      }),
    ]

    const result = generateClarificationQuestions(fields)
    expect(result[0].options).toEqual([
      'Kopf',
      'Nacken',
      'Schulter',
      'Rücken',
      'Brust',
      'Bauch',
      'Bein',
      'Arm',
    ])
  })

  // --- Dynamic symptom_type question ---

  it('generiert dynamische symptom_type Frage mit extrahiertem Wert', () => {
    const fields = [
      makeField({
        field_name: 'symptom_type',
        confidence: 40,
        value: 'stechend',
      }),
    ]

    const result = generateClarificationQuestions(fields)
    expect(result[0].question).toContain('stechend')
    expect(result[0].question).toContain('genauer an')
  })

  it('generiert symptom_type Fallback-Frage ohne extrahierten Wert', () => {
    const fields = [
      makeField({
        field_name: 'symptom_type',
        confidence: 40,
        value: '',
      }),
    ]

    const result = generateClarificationQuestions(fields)
    expect(result[0].question).toBe('Wie fühlt es sich an?')
  })

  // --- New field templates: trigger and frequency ---

  it('generiert Frage für trigger-Feld', () => {
    const fields = [makeField({ field_name: 'trigger', confidence: 50 })]

    const result = generateClarificationQuestions(fields)
    expect(result).toHaveLength(1)
    expect(result[0].fieldName).toBe('trigger')
    expect(result[0].question).toContain('aufgetreten')
    expect(result[0].options).toEqual([
      'Sport / Bewegung',
      'Arbeit / Bildschirm',
      'Nach dem Essen',
      'Beim Aufstehen',
      'In Ruhe',
    ])
  })

  it('generiert Frage für frequency-Feld', () => {
    const fields = [makeField({ field_name: 'frequency', confidence: 50 })]

    const result = generateClarificationQuestions(fields)
    expect(result).toHaveLength(1)
    expect(result[0].fieldName).toBe('frequency')
    expect(result[0].question).toContain('Wie oft')
    expect(result[0].options).toEqual([
      'Erstmalig',
      'Gelegentlich',
      'Täglich',
      'Mehrmals täglich',
      'Seit mehreren Tagen',
    ])
  })

  // --- Priority of new fields ---

  it('sortiert trigger und frequency nach body_region/side/symptom_type/intensity', () => {
    const fields = [
      makeField({ field_name: 'trigger', confidence: 40 }),
      makeField({ field_name: 'frequency', confidence: 40 }),
      makeField({ field_name: 'side', confidence: 40 }),
    ]

    const result = generateClarificationQuestions(fields)
    // side (priority 2) should come before trigger (7) and frequency (8)
    expect(result[0].fieldName).toBe('side')
    expect(result[1].fieldName).toBe('trigger')
  })
})
