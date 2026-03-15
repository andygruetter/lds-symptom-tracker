import { describe, expect, it, vi } from 'vitest'

import type { PdfReportData } from '@/types/report'

// Mock @react-pdf/renderer to avoid complex PDF rendering in unit tests
vi.mock('@react-pdf/renderer', () => ({
  Document: ({ children }: { children: React.ReactNode }) => children,
  Page: ({ children }: { children: React.ReactNode }) => children,
  Text: ({ children }: { children: React.ReactNode }) => children,
  View: ({ children }: { children: React.ReactNode }) => children,
  Image: () => null,
  StyleSheet: {
    create: (styles: Record<string, unknown>) => styles,
  },
}))

// Import after mocks are set up
const { SymptomReportDocument } = await import('@/lib/pdf/symptom-report')

const sampleData: PdfReportData = {
  summary: 'Zusammenfassung der Symptome im Zeitraum.',
  ranking: [
    {
      name: 'Kopfschmerzen',
      totalCount: 5,
      monthlyCounts: [{ year: 2026, month: 2, count: 5 }],
      trend: 'stable',
      avgIntensity: 6.2,
    },
    {
      name: 'Schwindel',
      totalCount: 3,
      monthlyCounts: [{ year: 2026, month: 2, count: 3 }],
      trend: 'decreasing',
      avgIntensity: null,
    },
  ],
  timeline: [
    {
      year: 2026,
      month: 2,
      days: [
        {
          date: '2026-02-15',
          symptomCount: 2,
          medicationCount: 1,
          totalCount: 3,
          maxIntensity: 7,
        },
      ],
      totalEvents: 3,
    },
  ],
  events: [
    {
      id: 'evt-1',
      eventType: 'symptom',
      occurredAt: '2026-02-15T09:00:00Z',
      endedAt: null,
      symptomName: 'Kopfschmerzen',
      medication: null,
      bodyRegion: 'Kopf',
      side: 'rechts',
      intensity: 7,
      rawInput: 'Starke Kopfschmerzen rechts',
      photoBase64: [],
    },
  ],
  metadata: {
    dateFrom: '2026-02-01',
    dateTo: '2026-02-28',
    generatedAt: '2026-03-15T10:00:00Z',
    totalEvents: 1,
  },
}

describe('SymptomReportDocument', () => {
  it('ist eine React-Komponente (Funktion)', () => {
    expect(typeof SymptomReportDocument).toBe('function')
  })

  it('akzeptiert PdfReportData als Props', () => {
    // Should not throw when called with valid data
    expect(() => SymptomReportDocument({ data: sampleData })).not.toThrow()
  })

  it('akzeptiert leere Daten ohne Fehler', () => {
    const emptyData: PdfReportData = {
      summary: 'Keine Events im Zeitraum.',
      ranking: [],
      timeline: [],
      events: [],
      metadata: {
        dateFrom: '2026-02-01',
        dateTo: '2026-02-28',
        generatedAt: '2026-03-15T10:00:00Z',
        totalEvents: 0,
      },
    }
    expect(() => SymptomReportDocument({ data: emptyData })).not.toThrow()
  })

  it('verarbeitet Events mit Fotos', () => {
    const dataWithPhotos: PdfReportData = {
      ...sampleData,
      events: [
        {
          ...sampleData.events[0],
          photoBase64: ['/9j/photo1base64', '/9j/photo2base64'],
        },
      ],
    }
    expect(() => SymptomReportDocument({ data: dataWithPhotos })).not.toThrow()
  })

  it('verarbeitet Medikamenten-Events', () => {
    const dataWithMed: PdfReportData = {
      ...sampleData,
      events: [
        {
          id: 'med-1',
          eventType: 'medication',
          occurredAt: '2026-02-15T08:00:00Z',
          endedAt: null,
          symptomName: null,
          medication: 'Ibuprofen 400mg',
          bodyRegion: null,
          side: null,
          intensity: null,
          rawInput: 'Ibuprofen 400 genommen',
          photoBase64: [],
        },
      ],
    }
    expect(() => SymptomReportDocument({ data: dataWithMed })).not.toThrow()
  })
})
