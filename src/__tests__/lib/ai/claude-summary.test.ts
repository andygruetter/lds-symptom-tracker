import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SummaryEventData } from '@/types/summary'

const mockCreate = vi.fn()
vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    messages = { create: mockCreate }
    constructor(_options?: unknown) {}
  }
  return { default: MockAnthropic }
})

beforeEach(() => {
  vi.clearAllMocks()
})

const mockTextResponse = (text: string) => ({
  content: [{ type: 'text', text }],
})

describe('claudeSummaryProvider', () => {
  it('generiert Summary für leere Event-Liste', async () => {
    mockCreate.mockResolvedValue(
      mockTextResponse(
        'Im gewählten Zeitraum wurden keine Symptom-Events erfasst.',
      ),
    )

    const { claudeSummaryProvider } = await import('@/lib/ai/providers/claude')
    const result = await claudeSummaryProvider.summarize([])

    expect(result).toContain('keine Symptom-Events')
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        max_tokens: 2048,
        model: 'claude-sonnet-4-20250514',
      }),
    )
  })

  it('generiert Summary für ein einzelnes Symptom', async () => {
    const summaryText =
      'Im Zeitraum wurde 1 Symptom-Event erfasst: Kopfschmerzen mit Intensität 7.'
    mockCreate.mockResolvedValue(mockTextResponse(summaryText))

    const events: SummaryEventData[] = [
      {
        id: 'evt-1',
        eventType: 'symptom',
        occurredAt: '2026-03-01T08:00:00Z',
        endedAt: null,
        rawInput: 'Kopfschmerzen rechts',
        extractedFields: [
          { fieldName: 'symptom_name', value: 'Kopfschmerzen', confidence: 95 },
          { fieldName: 'intensity', value: '7', confidence: 85 },
        ],
      },
    ]

    const { claudeSummaryProvider } = await import('@/lib/ai/providers/claude')
    const result = await claudeSummaryProvider.summarize(events)

    expect(result).toBe(summaryText)
    expect(mockCreate).toHaveBeenCalledTimes(1)
  })

  it('generiert Summary für mehrere Symptome', async () => {
    const summaryText =
      'Im Zeitraum wurden 3 Symptom-Events erfasst. Häufigste Beschwerde: Kopfschmerzen (2x).'
    mockCreate.mockResolvedValue(mockTextResponse(summaryText))

    const events: SummaryEventData[] = [
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
        occurredAt: '2026-03-02T14:00:00Z',
        endedAt: null,
        rawInput: 'Kopfschmerzen und Schwindel',
        extractedFields: [
          { fieldName: 'symptom_name', value: 'Kopfschmerzen', confidence: 90 },
          { fieldName: 'symptom_name', value: 'Schwindel', confidence: 85 },
        ],
      },
      {
        id: 'evt-3',
        eventType: 'medication',
        occurredAt: '2026-03-03T09:00:00Z',
        endedAt: null,
        rawInput: 'Ibuprofen genommen',
        extractedFields: [
          { fieldName: 'medication_name', value: 'Ibuprofen', confidence: 95 },
          { fieldName: 'action', value: 'eingenommen', confidence: 95 },
        ],
      },
    ]

    const { claudeSummaryProvider } = await import('@/lib/ai/providers/claude')
    const result = await claudeSummaryProvider.summarize(events)

    expect(result).toBe(summaryText)
    // Prompt sollte alle Events enthalten
    const callArgs = mockCreate.mock.calls[0][0]
    expect(callArgs.messages[0].content).toContain('SYMPTOM')
    expect(callArgs.messages[0].content).toContain('MEDICATION')
  })

  it('wirft Fehler wenn kein Text-Block zurückkommt', async () => {
    mockCreate.mockResolvedValue({ content: [] })

    const { claudeSummaryProvider } = await import('@/lib/ai/providers/claude')

    await expect(claudeSummaryProvider.summarize([])).rejects.toThrow(
      'Claude returned no text response for summary',
    )
  })
})
