import { describe, expect, it } from 'vitest'

import {
  EVENT_LEVEL_FIELDS,
  formatDateTime,
  formatDurationMinutes,
  formatFieldValue,
  formatSymptomTimestamp,
  getConfidenceColor,
  groupBySymptomIndex,
} from '@/components/event/event-detail-utils'
import type { ExtractedField } from '@/types/analytics'

describe('event-detail-utils', () => {
  describe('EVENT_LEVEL_FIELDS', () => {
    it('enthält symptom_time und duration', () => {
      expect(EVENT_LEVEL_FIELDS.has('symptom_time')).toBe(true)
      expect(EVENT_LEVEL_FIELDS.has('duration')).toBe(true)
      expect(EVENT_LEVEL_FIELDS.has('symptom_name')).toBe(false)
    })
  })

  describe('groupBySymptomIndex', () => {
    it('gruppiert Felder nach symptomIndex', () => {
      const fields: ExtractedField[] = [
        {
          fieldName: 'symptom_name',
          value: 'Kopf',
          confidence: 90,
          confirmed: true,
          symptomIndex: 0,
        },
        {
          fieldName: 'symptom_name',
          value: 'Rücken',
          confidence: 80,
          confirmed: false,
          symptomIndex: 1,
        },
        {
          fieldName: 'intensity',
          value: '5',
          confidence: 70,
          confirmed: false,
          symptomIndex: 0,
        },
      ]
      const groups = groupBySymptomIndex(fields)
      expect(groups.size).toBe(2)
      expect(groups.get(0)!.length).toBe(2)
      expect(groups.get(1)!.length).toBe(1)
    })

    it('verwendet Index 0 als Fallback bei fehlendem symptomIndex', () => {
      const fields: ExtractedField[] = [
        {
          fieldName: 'symptom_name',
          value: 'Test',
          confidence: 90,
          confirmed: true,
          symptomIndex: undefined as unknown as number,
        },
      ]
      const groups = groupBySymptomIndex(fields)
      expect(groups.get(0)!.length).toBe(1)
    })
  })

  describe('getConfidenceColor', () => {
    it('gibt grün für >= 85 zurück', () => {
      expect(getConfidenceColor(85)).toBe('bg-green-500')
      expect(getConfidenceColor(100)).toBe('bg-green-500')
    })

    it('gibt gelb für >= 70 zurück', () => {
      expect(getConfidenceColor(70)).toBe('bg-yellow-500')
      expect(getConfidenceColor(84)).toBe('bg-yellow-500')
    })

    it('gibt rot für < 70 zurück', () => {
      expect(getConfidenceColor(69)).toBe('bg-red-500')
      expect(getConfidenceColor(0)).toBe('bg-red-500')
    })
  })

  describe('formatSymptomTimestamp', () => {
    it('formatiert ISO-String als lokales Datum', () => {
      const result = formatSymptomTimestamp('2026-03-14T09:30:00Z')
      expect(result).toBeTruthy()
      expect(result).not.toBe('2026-03-14T09:30:00Z')
    })

    it('gibt Original-String bei ungültigem Datum zurück', () => {
      expect(formatSymptomTimestamp('invalid')).toBe('invalid')
    })
  })

  describe('formatDurationMinutes', () => {
    it('formatiert Minuten', () => {
      expect(formatDurationMinutes('30')).toBe('30 Min.')
    })

    it('formatiert Stunden und Minuten', () => {
      expect(formatDurationMinutes('90')).toBe('1 Std. 30 Min.')
    })

    it('formatiert nur Stunden', () => {
      expect(formatDurationMinutes('120')).toBe('2 Std.')
    })

    it('gibt null bei ungültiger Eingabe zurück', () => {
      expect(formatDurationMinutes('abc')).toBeNull()
      expect(formatDurationMinutes('-5')).toBeNull()
    })

    it('gibt "< 30 Sek." für Wert 0 zurück', () => {
      expect(formatDurationMinutes('0')).toBe('< 30 Sek.')
    })
  })

  describe('formatFieldValue', () => {
    it('formatiert Intensität mit /10', () => {
      const field: ExtractedField = {
        fieldName: 'intensity',
        value: '7',
        confidence: 90,
        confirmed: true,
        symptomIndex: 0,
      }
      expect(formatFieldValue(field)).toBe('7/10')
    })

    it('gibt "Nicht erfasst" bei leerem Wert zurück', () => {
      const field: ExtractedField = {
        fieldName: 'symptom_name',
        value: null as unknown as string,
        confidence: null,
        confirmed: false,
        symptomIndex: 0,
      }
      expect(formatFieldValue(field)).toBe('Nicht erfasst')
    })

    it('formatiert symptom_time als Timestamp', () => {
      const field: ExtractedField = {
        fieldName: 'symptom_time',
        value: '2026-03-14T09:30:00Z',
        confidence: 90,
        confirmed: true,
        symptomIndex: 0,
      }
      const result = formatFieldValue(field)
      expect(result).not.toBe('2026-03-14T09:30:00Z')
    })

    it('formatiert duration als Dauer', () => {
      const field: ExtractedField = {
        fieldName: 'duration',
        value: '90',
        confidence: 80,
        confirmed: false,
        symptomIndex: 0,
      }
      expect(formatFieldValue(field)).toBe('1 Std. 30 Min.')
    })

    it('gibt normalen Wert für andere Felder zurück', () => {
      const field: ExtractedField = {
        fieldName: 'body_region',
        value: 'Rücken',
        confidence: 85,
        confirmed: true,
        symptomIndex: 0,
      }
      expect(formatFieldValue(field)).toBe('Rücken')
    })
  })

  describe('formatDateTime', () => {
    it('gibt date, time und combined zurück', () => {
      const result = formatDateTime('2026-03-14T09:30:00Z')
      expect(result.date).toBeTruthy()
      expect(result.time).toBeTruthy()
      expect(result.combined).toContain(result.date)
      expect(result.combined).toContain(result.time)
    })
  })
})
