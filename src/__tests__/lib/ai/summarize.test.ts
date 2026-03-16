import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SummaryEventData } from '@/types/summary'

const mockSummarize = vi.fn()
vi.mock('@/lib/ai/providers/claude', () => ({
  claudeSummaryProvider: {
    summarize: (...args: unknown[]) => mockSummarize(...args),
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
})

const sampleEvents: SummaryEventData[] = [
  {
    id: 'evt-1',
    eventType: 'symptom',
    occurredAt: '2026-03-01T08:00:00Z',
    endedAt: null,
    rawInput: 'Kopfschmerzen rechts stechend',
    extractedFields: [
      { fieldName: 'symptom_name', value: 'Kopfschmerzen', confidence: 95 },
      { fieldName: 'body_region', value: 'Kopf', confidence: 90 },
      { fieldName: 'intensity', value: '7', confidence: 85 },
    ],
  },
]

describe('generateSummary', () => {
  it('routet zum Claude Provider für Summary-Generierung', async () => {
    mockSummarize.mockResolvedValue('KI-Zusammenfassung Text')

    const { generateSummary } = await import('@/lib/ai/summarize')
    const result = await generateSummary(sampleEvents)

    expect(result).toBe('KI-Zusammenfassung Text')
    expect(mockSummarize).toHaveBeenCalledWith(sampleEvents)
  })

  it('leitet leere Event-Liste an Provider weiter', async () => {
    mockSummarize.mockResolvedValue('Keine Events im Zeitraum erfasst.')

    const { generateSummary } = await import('@/lib/ai/summarize')
    const result = await generateSummary([])

    expect(result).toBe('Keine Events im Zeitraum erfasst.')
    expect(mockSummarize).toHaveBeenCalledWith([])
  })

  it('gibt Mock-Summary zurück wenn E2E_MOCK_SUMMARY=true', async () => {
    vi.stubEnv('E2E_MOCK_SUMMARY', 'true')

    const { generateSummary } = await import('@/lib/ai/summarize')
    const result = await generateSummary(sampleEvents)

    expect(result).toBe('Mock-Zusammenfassung: 1 Events im Zeitraum.')
    expect(mockSummarize).not.toHaveBeenCalled()

    vi.unstubAllEnvs()
  })
})
