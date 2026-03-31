import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SummaryEventData } from '@/types/summary'

// Mock dependencies
const mockGetSharedEventsForSummary = vi.fn<() => Promise<SummaryEventData[]>>()
const mockGenerateSummary = vi.fn<() => Promise<string>>()

vi.mock('@/lib/db/sharing', () => ({
  getSharedEventsForSummary: () => mockGetSharedEventsForSummary(),
}))

vi.mock('@/lib/ai/summarize', () => ({
  generateSummary: () => mockGenerateSummary(),
}))

vi.mock('lucide-react', () => ({
  Sparkles: () => <span data-testid="sparkles-icon" />,
}))

const defaultProps = {
  accountId: 'account-1',
  dateFrom: '2026-01-01',
  dateTo: '2026-03-31',
}

const sampleEvents: SummaryEventData[] = [
  {
    id: 'evt-1',
    eventType: 'symptom',
    occurredAt: '2026-03-01T08:00:00Z',
    endedAt: null,
    rawInput: 'Kopfschmerzen',
    extractedFields: [
      { fieldName: 'symptom_name', value: 'Kopfschmerzen', confidence: 95 },
    ],
  },
  {
    id: 'evt-2',
    eventType: 'symptom',
    occurredAt: '2026-03-15T10:00:00Z',
    endedAt: null,
    rawInput: 'Rückenschmerzen',
    extractedFields: [
      { fieldName: 'symptom_name', value: 'Rückenschmerzen', confidence: 90 },
    ],
  },
]

describe('InsightsSummaryCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('zeigt generierte Summary mit Event-Count an', async () => {
    mockGetSharedEventsForSummary.mockResolvedValue(sampleEvents)
    mockGenerateSummary.mockResolvedValue(
      'Im Zeitraum wurden 2 Symptome dokumentiert.',
    )

    const { InsightsSummaryCard } =
      await import('@/components/insights/insights-summary-card')
    const element = await InsightsSummaryCard(defaultProps)
    render(element)

    expect(
      screen.getByText('Im Zeitraum wurden 2 Symptome dokumentiert.'),
    ).toBeInTheDocument()
    expect(screen.getByText('KI-Zusammenfassung')).toBeInTheDocument()
    expect(screen.getByText(/2 Events/)).toBeInTheDocument()
    expect(mockGenerateSummary).toHaveBeenCalled()
  })

  it('zeigt Leer-Zustand wenn keine Events vorhanden', async () => {
    mockGetSharedEventsForSummary.mockResolvedValue([])

    const { InsightsSummaryCard } =
      await import('@/components/insights/insights-summary-card')
    const element = await InsightsSummaryCard(defaultProps)
    render(element)

    expect(
      screen.getByText(
        'Keine Events im Zeitraum — bitte zuerst Symptome oder Medikamente erfassen.',
      ),
    ).toBeInTheDocument()
    expect(mockGenerateSummary).not.toHaveBeenCalled()
  })

  it('zeigt Fehler-Fallback bei Ausnahme in der Datenbankabfrage', async () => {
    mockGetSharedEventsForSummary.mockRejectedValue(new Error('DB Fehler'))

    const { InsightsSummaryCard } =
      await import('@/components/insights/insights-summary-card')
    const element = await InsightsSummaryCard(defaultProps)
    render(element)

    expect(
      screen.getByText('Zusammenfassung konnte nicht generiert werden.'),
    ).toBeInTheDocument()
  })

  it('zeigt Fehler-Fallback bei Ausnahme in generateSummary', async () => {
    mockGetSharedEventsForSummary.mockResolvedValue(sampleEvents)
    mockGenerateSummary.mockRejectedValue(new Error('AI Fehler'))

    const { InsightsSummaryCard } =
      await import('@/components/insights/insights-summary-card')
    const element = await InsightsSummaryCard(defaultProps)
    render(element)

    expect(
      screen.getByText('Zusammenfassung konnte nicht generiert werden.'),
    ).toBeInTheDocument()
  })

  it('rendert Markdown-Fettschrift korrekt (**text**)', async () => {
    mockGetSharedEventsForSummary.mockResolvedValue(sampleEvents)
    mockGenerateSummary.mockResolvedValue(
      'Der häufigste Befund war **Kopfschmerzen** in diesem Zeitraum.',
    )

    const { InsightsSummaryCard } =
      await import('@/components/insights/insights-summary-card')
    const element = await InsightsSummaryCard(defaultProps)
    const { container } = render(element)

    expect(container.querySelector('strong')).toHaveTextContent('Kopfschmerzen')
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === 'P' &&
          element.textContent ===
            'Der häufigste Befund war Kopfschmerzen in diesem Zeitraum.',
      ),
    ).toBeInTheDocument()
  })

  it('rendert mehrzeilige Summary als mehrere Absätze', async () => {
    mockGetSharedEventsForSummary.mockResolvedValue(sampleEvents)
    mockGenerateSummary.mockResolvedValue(
      'Erster Absatz mit Infos.\n\nZweiter Absatz mit Details.',
    )

    const { InsightsSummaryCard } =
      await import('@/components/insights/insights-summary-card')
    const element = await InsightsSummaryCard(defaultProps)
    render(element)

    expect(screen.getByText('Erster Absatz mit Infos.')).toBeInTheDocument()
    expect(screen.getByText('Zweiter Absatz mit Details.')).toBeInTheDocument()
  })
})
