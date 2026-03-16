import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PdfReportData } from '@/types/report'

// Mock @react-pdf/renderer — render as simple HTML equivalents
vi.mock('@react-pdf/renderer', () => ({
  Document: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="document">{children}</div>
  ),
  Page: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="page">{children}</div>
  ),
  Text: ({
    children,
  }: {
    children: React.ReactNode
    style?: unknown
    render?: unknown
  }) => <span>{children}</span>,
  View: ({
    children,
  }: {
    children: React.ReactNode
    style?: unknown
    fixed?: boolean
  }) => <div>{children}</div>,
  Image: ({ src }: { src: string }) => (
    <img src={src.slice(0, 40)} alt="photo" />
  ),
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
      symptoms: [],
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
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ist eine React-Komponente (Funktion)', () => {
    expect(typeof SymptomReportDocument).toBe('function')
  })

  it('rendert Titel und Zeitraum im Header', () => {
    const { container } = render(<SymptomReportDocument data={sampleData} />)
    const text = container.textContent ?? ''
    expect(text).toContain('Symptom-Report')
    expect(text).toContain('Zeitraum:')
  })

  it('rendert KI-Zusammenfassung', () => {
    const { container } = render(<SymptomReportDocument data={sampleData} />)
    const text = container.textContent ?? ''
    expect(text).toContain('KI-Zusammenfassung')
    expect(text).toContain(sampleData.summary)
  })

  it('rendert Symptom-Ranking mit allen Einträgen', () => {
    const { container } = render(<SymptomReportDocument data={sampleData} />)
    const text = container.textContent ?? ''
    expect(text).toContain('Symptom-Ranking')
    expect(text).toContain('Kopfschmerzen')
    expect(text).toContain('Schwindel')
    expect(text).toContain('5x')
    expect(text).toContain('3x')
  })

  it('rendert Trend-Labels auf Deutsch', () => {
    const { container } = render(<SymptomReportDocument data={sampleData} />)
    const text = container.textContent ?? ''
    expect(text).toContain('Stabil')
    expect(text).toContain('Sinkend')
  })

  it('rendert Timeline-Übersicht', () => {
    const { container } = render(<SymptomReportDocument data={sampleData} />)
    const text = container.textContent ?? ''
    expect(text).toContain('Timeline-Übersicht')
  })

  it('rendert Event-Details mit Transkription', () => {
    const { container } = render(<SymptomReportDocument data={sampleData} />)
    const text = container.textContent ?? ''
    expect(text).toContain('Event-Details')
    expect(text).toContain('Starke Kopfschmerzen rechts')
  })

  it('rendert Intensität und Körperregion in Event-Meta', () => {
    const { container } = render(<SymptomReportDocument data={sampleData} />)
    const text = container.textContent ?? ''
    expect(text).toContain('Kopf')
    expect(text).toContain('7/10')
  })

  it('rendert Footer mit Vertraulichkeitshinweis', () => {
    const { container } = render(<SymptomReportDocument data={sampleData} />)
    const text = container.textContent ?? ''
    expect(text).toContain('Vertraulich')
  })

  it('zeigt Durchschnittsintensität mit einer Dezimalstelle', () => {
    const { container } = render(<SymptomReportDocument data={sampleData} />)
    const text = container.textContent ?? ''
    expect(text).toContain('6.2 / 10')
  })

  it('zeigt Strich für fehlende Intensität', () => {
    const { container } = render(<SymptomReportDocument data={sampleData} />)
    const text = container.textContent ?? ''
    expect(text).toContain('–')
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
    const { container } = render(<SymptomReportDocument data={emptyData} />)
    const text = container.textContent ?? ''
    expect(text).toContain('Keine Symptome')
    expect(text).toContain('Keine Events')
  })

  it('verarbeitet Events mit Fotos als Image-Elemente', () => {
    const dataWithPhotos: PdfReportData = {
      ...sampleData,
      events: [
        {
          ...sampleData.events[0],
          photoBase64: ['/9j/photo1base64', '/9j/photo2base64'],
        },
      ],
    }
    const { container } = render(
      <SymptomReportDocument data={dataWithPhotos} />,
    )
    const images = container.querySelectorAll('img')
    expect(images).toHaveLength(2)
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
          symptoms: [],
          photoBase64: [],
        },
      ],
    }
    const { container } = render(<SymptomReportDocument data={dataWithMed} />)
    const text = container.textContent ?? ''
    expect(text).toContain('Ibuprofen 400mg')
  })
})
