import { describe, expect, it } from 'vitest'

import { validateExtractionFields } from '@/lib/ai/validation'
import type { ExtractionField } from '@/types/ai'

function field(
  overrides: Partial<ExtractionField> & Pick<ExtractionField, 'fieldName'>,
): ExtractionField {
  return {
    value: '',
    confidence: 80,
    symptomIndex: 0,
    ...overrides,
  }
}

describe('validateExtractionFields', () => {
  it('gibt leeres Array bei leerem Input zurück', () => {
    expect(validateExtractionFields([])).toEqual([])
  })

  it('lässt unbekannte Felder unverändert durch', () => {
    const fields: ExtractionField[] = [
      field({ fieldName: 'symptom_name', value: 'Kopfschmerzen' }),
      field({ fieldName: 'notes', value: 'Freitext' }),
    ]
    const result = validateExtractionFields(fields)
    expect(result).toEqual(fields)
  })

  describe('side', () => {
    it('akzeptiert gültige Werte und normalisiert zu Lowercase', () => {
      const fields: ExtractionField[] = [
        field({ fieldName: 'side', value: 'Links' }),
        field({ fieldName: 'side', value: 'RECHTS' }),
        field({ fieldName: 'side', value: 'Beidseits' }),
      ]
      const result = validateExtractionFields(fields)
      expect(result).toHaveLength(3)
      expect(result[0].value).toBe('links')
      expect(result[1].value).toBe('rechts')
      expect(result[2].value).toBe('beidseits')
    })

    it('behält die Original-Konfidenz bei gültigen Werten', () => {
      const fields: ExtractionField[] = [
        field({ fieldName: 'side', value: 'links', confidence: 95 }),
      ]
      const result = validateExtractionFields(fields)
      expect(result[0].confidence).toBe(95)
    })

    it('filtert ungültige Werte heraus (Konfidenz → 0)', () => {
      const fields: ExtractionField[] = [
        field({ fieldName: 'side', value: 'oben' }),
        field({ fieldName: 'side', value: 'vorne' }),
        field({ fieldName: 'side', value: '' }),
      ]
      const result = validateExtractionFields(fields)
      expect(result).toHaveLength(0)
    })

    it('trimmt Whitespace bei Side-Werten', () => {
      const fields: ExtractionField[] = [
        field({ fieldName: 'side', value: '  links  ' }),
      ]
      const result = validateExtractionFields(fields)
      expect(result).toHaveLength(1)
      expect(result[0].value).toBe('links')
    })
  })

  describe('status', () => {
    it('akzeptiert alle gültigen Status-Werte', () => {
      const validStatuses = ['active', 'resolved', 'improving', 'worsening']
      const fields = validStatuses.map((s) =>
        field({ fieldName: 'status', value: s }),
      )
      const result = validateExtractionFields(fields)
      expect(result).toHaveLength(4)
      result.forEach((f, i) => {
        expect(f.value).toBe(validStatuses[i])
      })
    })

    it('normalisiert Status-Werte zu Lowercase', () => {
      const fields: ExtractionField[] = [
        field({ fieldName: 'status', value: 'Active' }),
        field({ fieldName: 'status', value: 'RESOLVED' }),
      ]
      const result = validateExtractionFields(fields)
      expect(result).toHaveLength(2)
      expect(result[0].value).toBe('active')
      expect(result[1].value).toBe('resolved')
    })

    it('filtert ungültige Status-Werte heraus', () => {
      const fields: ExtractionField[] = [
        field({ fieldName: 'status', value: 'unknown' }),
        field({ fieldName: 'status', value: 'pending' }),
        field({ fieldName: 'status', value: '' }),
      ]
      const result = validateExtractionFields(fields)
      expect(result).toHaveLength(0)
    })
  })

  describe('intensity', () => {
    it('akzeptiert gültige Werte im Bereich 1-10', () => {
      const fields: ExtractionField[] = [
        field({ fieldName: 'intensity', value: '1', confidence: 85 }),
        field({ fieldName: 'intensity', value: '5', confidence: 90 }),
        field({ fieldName: 'intensity', value: '10', confidence: 75 }),
      ]
      const result = validateExtractionFields(fields)
      expect(result).toHaveLength(3)
      expect(result[0].value).toBe('1')
      expect(result[0].confidence).toBe(85)
      expect(result[1].value).toBe('5')
      expect(result[2].value).toBe('10')
    })

    it('filtert NaN-Werte heraus (Konfidenz → 0)', () => {
      const fields: ExtractionField[] = [
        field({ fieldName: 'intensity', value: 'abc' }),
        field({ fieldName: 'intensity', value: '' }),
        field({ fieldName: 'intensity', value: 'hoch' }),
      ]
      const result = validateExtractionFields(fields)
      expect(result).toHaveLength(0)
    })

    it('clampt Werte unter Minimum auf 1 mit reduzierter Konfidenz', () => {
      const fields: ExtractionField[] = [
        field({ fieldName: 'intensity', value: '0', confidence: 80 }),
        field({ fieldName: 'intensity', value: '-5', confidence: 90 }),
      ]
      const result = validateExtractionFields(fields)
      expect(result).toHaveLength(2)
      expect(result[0].value).toBe('1')
      expect(result[0].confidence).toBe(40)
      expect(result[1].value).toBe('1')
      expect(result[1].confidence).toBe(40)
    })

    it('clampt Werte über Maximum auf 10 mit reduzierter Konfidenz', () => {
      const fields: ExtractionField[] = [
        field({ fieldName: 'intensity', value: '11', confidence: 80 }),
        field({ fieldName: 'intensity', value: '100', confidence: 90 }),
      ]
      const result = validateExtractionFields(fields)
      expect(result).toHaveLength(2)
      expect(result[0].value).toBe('10')
      expect(result[0].confidence).toBe(40)
      expect(result[1].value).toBe('10')
      expect(result[1].confidence).toBe(40)
    })

    it('nimmt min(original, 40) als Konfidenz bei Out-of-Range', () => {
      const fields: ExtractionField[] = [
        field({ fieldName: 'intensity', value: '15', confidence: 30 }),
      ]
      const result = validateExtractionFields(fields)
      expect(result).toHaveLength(1)
      expect(result[0].value).toBe('10')
      expect(result[0].confidence).toBe(30) // 30 < 40, so keeps 30
    })
  })

  describe('duration', () => {
    it('akzeptiert gültige Werte im Bereich 0-43200', () => {
      const fields: ExtractionField[] = [
        field({ fieldName: 'duration', value: '0', confidence: 80 }),
        field({ fieldName: 'duration', value: '1', confidence: 80 }),
        field({ fieldName: 'duration', value: '60', confidence: 85 }),
        field({ fieldName: 'duration', value: '43200', confidence: 90 }),
      ]
      const result = validateExtractionFields(fields)
      expect(result).toHaveLength(4)
      expect(result[0].value).toBe('0')
      expect(result[0].confidence).toBe(80)
      expect(result[1].value).toBe('1')
      expect(result[2].value).toBe('60')
      expect(result[3].value).toBe('43200')
      expect(result[3].confidence).toBe(90)
    })

    it('filtert NaN-Werte heraus', () => {
      const fields: ExtractionField[] = [
        field({ fieldName: 'duration', value: 'lang' }),
        field({ fieldName: 'duration', value: 'NaN' }),
      ]
      const result = validateExtractionFields(fields)
      expect(result).toHaveLength(0)
    })

    it('clampt negative Werte auf 0 mit reduzierter Konfidenz', () => {
      const fields: ExtractionField[] = [
        field({ fieldName: 'duration', value: '-10', confidence: 85 }),
      ]
      const result = validateExtractionFields(fields)
      expect(result).toHaveLength(1)
      expect(result[0].value).toBe('0')
      expect(result[0].confidence).toBe(40)
    })

    it('clampt Werte über Maximum auf 43200', () => {
      const fields: ExtractionField[] = [
        field({ fieldName: 'duration', value: '50000', confidence: 80 }),
      ]
      const result = validateExtractionFields(fields)
      expect(result).toHaveLength(1)
      expect(result[0].value).toBe('43200')
      expect(result[0].confidence).toBe(40)
    })
  })

  describe('symptom_time', () => {
    it('akzeptiert gültige ISO-8601 Zeitstempel', () => {
      const fields: ExtractionField[] = [
        field({
          fieldName: 'symptom_time',
          value: '2026-03-15T10:30:00Z',
          confidence: 85,
        }),
      ]
      const result = validateExtractionFields(fields)
      expect(result).toHaveLength(1)
      expect(result[0].value).toBe('2026-03-15T10:30:00Z')
      expect(result[0].confidence).toBe(85)
    })

    it('filtert ungültige Zeitformate heraus', () => {
      const fields: ExtractionField[] = [
        field({ fieldName: 'symptom_time', value: 'gestern' }),
        field({ fieldName: 'symptom_time', value: 'not-a-date' }),
        field({ fieldName: 'symptom_time', value: '' }),
      ]
      const result = validateExtractionFields(fields)
      expect(result).toHaveLength(0)
    })

    it('begrenzt Konfidenz auf 30 bei Zeitstempel >1h in der Zukunft', () => {
      const twoHoursFromNow = new Date(
        Date.now() + 2 * 60 * 60 * 1000,
      ).toISOString()
      const fields: ExtractionField[] = [
        field({
          fieldName: 'symptom_time',
          value: twoHoursFromNow,
          confidence: 80,
        }),
      ]
      const result = validateExtractionFields(fields)
      expect(result).toHaveLength(1)
      expect(result[0].confidence).toBe(30)
    })

    it('behält Original-Konfidenz wenn diese unter 30 liegt (Zukunft)', () => {
      const twoHoursFromNow = new Date(
        Date.now() + 2 * 60 * 60 * 1000,
      ).toISOString()
      const fields: ExtractionField[] = [
        field({
          fieldName: 'symptom_time',
          value: twoHoursFromNow,
          confidence: 20,
        }),
      ]
      const result = validateExtractionFields(fields)
      expect(result).toHaveLength(1)
      expect(result[0].confidence).toBe(20)
    })

    it('lässt Zeitstempel bis 1h in der Zukunft unverändert', () => {
      const thirtyMinFromNow = new Date(
        Date.now() + 30 * 60 * 1000,
      ).toISOString()
      const fields: ExtractionField[] = [
        field({
          fieldName: 'symptom_time',
          value: thirtyMinFromNow,
          confidence: 85,
        }),
      ]
      const result = validateExtractionFields(fields)
      expect(result).toHaveLength(1)
      expect(result[0].confidence).toBe(85)
    })

    it('akzeptiert Zeitstempel in der Vergangenheit', () => {
      const fields: ExtractionField[] = [
        field({
          fieldName: 'symptom_time',
          value: '2026-03-14T08:00:00Z',
          confidence: 90,
        }),
      ]
      const result = validateExtractionFields(fields)
      expect(result).toHaveLength(1)
      expect(result[0].confidence).toBe(90)
    })
  })

  describe('gemischte Felder', () => {
    it('filtert nur ungültige Felder heraus, behält gültige', () => {
      const fields: ExtractionField[] = [
        field({
          fieldName: 'symptom_name',
          value: 'Kopfschmerzen',
          confidence: 95,
        }),
        field({ fieldName: 'side', value: 'Links', confidence: 85 }),
        field({ fieldName: 'side', value: 'oben', confidence: 70 }),
        field({ fieldName: 'intensity', value: '7', confidence: 80 }),
        field({ fieldName: 'intensity', value: 'abc', confidence: 60 }),
        field({ fieldName: 'status', value: 'active', confidence: 90 }),
        field({ fieldName: 'status', value: 'invalid', confidence: 50 }),
      ]
      const result = validateExtractionFields(fields)
      expect(result).toHaveLength(4)
      expect(result.map((f) => f.fieldName)).toEqual([
        'symptom_name',
        'side',
        'intensity',
        'status',
      ])
      expect(result[1].value).toBe('links') // normalized
    })

    it('bewahrt symptomIndex über alle Felder', () => {
      const fields: ExtractionField[] = [
        field({
          fieldName: 'symptom_name',
          value: 'Kopfschmerzen',
          symptomIndex: 0,
        }),
        field({ fieldName: 'side', value: 'links', symptomIndex: 0 }),
        field({
          fieldName: 'symptom_name',
          value: 'Übelkeit',
          symptomIndex: 1,
        }),
        field({ fieldName: 'intensity', value: '3', symptomIndex: 1 }),
      ]
      const result = validateExtractionFields(fields)
      expect(result).toHaveLength(4)
      expect(result[0].symptomIndex).toBe(0)
      expect(result[1].symptomIndex).toBe(0)
      expect(result[2].symptomIndex).toBe(1)
      expect(result[3].symptomIndex).toBe(1)
    })
  })
})
