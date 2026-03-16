import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { CachedSummary, SummaryEventData } from '@/types/summary'

// Mock dependencies
const mockGetCachedSummary = vi.fn<() => Promise<CachedSummary | null>>()
const mockCheckSummaryFreshness = vi.fn<() => Promise<boolean>>()
const mockSaveSummary = vi.fn<() => Promise<void>>()
const mockGetSharedEventsForSummary = vi.fn<() => Promise<SummaryEventData[]>>()
const mockGenerateSummary = vi.fn<() => Promise<string>>()

vi.mock('@/lib/db/summaries', () => ({
  getCachedSummary: () => mockGetCachedSummary(),
  checkSummaryFreshness: () => mockCheckSummaryFreshness(),
  saveSummary: (...args: unknown[]) => mockSaveSummary(...args),
}))

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
  sharingLinkId: 'link-1',
  accountId: 'account-1',
  dateFrom: '2026-03-01',
  dateTo: '2026-03-15',
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
]

describe('AISummaryCard', () => {
  it('zeigt gecachte Summary sofort an (Cache Hit)', async () => {
    mockGetCachedSummary.mockResolvedValue({
      summaryText: 'Im Zeitraum wurden 5 Symptom-Events erfasst.',
      generatedAt: '2026-03-10T10:00:00Z',
      eventCount: 5,
    })
    mockCheckSummaryFreshness.mockResolvedValue(true)

    const { AISummaryCard } =
      await import('@/components/sharing/ai-summary-card')
    const element = await AISummaryCard(defaultProps)
    render(element)

    expect(
      screen.getByText('Im Zeitraum wurden 5 Symptom-Events erfasst.'),
    ).toBeInTheDocument()
    expect(screen.getByText('KI-Zusammenfassung')).toBeInTheDocument()
    expect(screen.getByText('5 Events')).toBeInTheDocument()
    expect(mockGenerateSummary).not.toHaveBeenCalled()
  })

  it('generiert neue Summary wenn kein Cache vorhanden', async () => {
    mockGetCachedSummary.mockResolvedValue(null)
    mockGetSharedEventsForSummary.mockResolvedValue(sampleEvents)
    mockGenerateSummary.mockResolvedValue(
      'Neue KI-Zusammenfassung wurde generiert.',
    )
    mockSaveSummary.mockResolvedValue(undefined)

    const { AISummaryCard } =
      await import('@/components/sharing/ai-summary-card')
    const element = await AISummaryCard(defaultProps)
    render(element)

    expect(
      screen.getByText('Neue KI-Zusammenfassung wurde generiert.'),
    ).toBeInTheDocument()
    expect(mockGenerateSummary).toHaveBeenCalled()
    expect(mockSaveSummary).toHaveBeenCalled()
  })

  it('zeigt Fallback-UI bei Fehler (Error Boundary)', async () => {
    mockGetCachedSummary.mockRejectedValue(new Error('DB Verbindungsfehler'))
    mockGetSharedEventsForSummary.mockResolvedValue(sampleEvents)

    const { AISummaryCard } =
      await import('@/components/sharing/ai-summary-card')
    const element = await AISummaryCard(defaultProps)
    render(element)

    expect(
      screen.getByText('Zusammenfassung konnte nicht generiert werden.'),
    ).toBeInTheDocument()
    expect(screen.getByText('1 Events im Zeitraum')).toBeInTheDocument()
  })

  it('generiert neue Summary wenn stale (neue Events vorhanden)', async () => {
    mockGetCachedSummary.mockResolvedValue({
      summaryText: 'Alte Summary.',
      generatedAt: '2026-03-10T10:00:00Z',
      eventCount: 3,
    })
    mockCheckSummaryFreshness.mockResolvedValue(false) // stale
    mockGetSharedEventsForSummary.mockResolvedValue(sampleEvents)
    mockGenerateSummary.mockResolvedValue('Aktualisierte KI-Zusammenfassung.')
    mockSaveSummary.mockResolvedValue(undefined)

    const { AISummaryCard } =
      await import('@/components/sharing/ai-summary-card')
    const element = await AISummaryCard(defaultProps)
    render(element)

    expect(
      screen.getByText('Aktualisierte KI-Zusammenfassung.'),
    ).toBeInTheDocument()
    expect(mockGenerateSummary).toHaveBeenCalled()
  })

  it('zeigt Fallback wenn auch Events-Laden fehlschlägt', async () => {
    mockGetCachedSummary.mockRejectedValue(new Error('DB Fehler'))
    mockGetSharedEventsForSummary.mockRejectedValue(new Error('Events Fehler'))

    const { AISummaryCard } =
      await import('@/components/sharing/ai-summary-card')
    const element = await AISummaryCard(defaultProps)
    render(element)

    expect(
      screen.getByText('Zusammenfassung konnte nicht generiert werden.'),
    ).toBeInTheDocument()
    expect(screen.getByText('0 Events im Zeitraum')).toBeInTheDocument()
  })
})
