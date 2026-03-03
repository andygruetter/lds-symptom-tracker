import { beforeEach, describe, expect, it, vi } from 'vitest'

import { symptomExtraction } from '@/lib/ai/__fixtures__/extractions'

// Mock extract
const mockExtractSymptomData = vi.fn()
vi.mock('@/lib/ai/extract', () => ({
  extractSymptomData: (...args: unknown[]) =>
    mockExtractSymptomData(...args),
}))

// Mock corrections loader
const mockGetRecentCorrections = vi.fn()
vi.mock('@/lib/db/corrections', () => ({
  getRecentCorrections: (...args: unknown[]) =>
    mockGetRecentCorrections(...args),
}))

// Mock prompt enrichment
const mockBuildCorrectionContext = vi.fn()
vi.mock('@/lib/ai/prompt-enrichment', () => ({
  buildCorrectionContext: (...args: unknown[]) =>
    mockBuildCorrectionContext(...args),
}))

const mockSelect = vi.fn()
const mockSingle = vi.fn()
const mockEq = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()

function createMockSupabase() {
  // Reset chain for each call
  mockEq.mockReturnThis()
  mockSingle.mockResolvedValue({
    data: {
      id: 'event-1',
      account_id: 'user-1',
      raw_input: 'Kopfschmerzen rechts',
      status: 'pending',
    },
    error: null,
  })
  mockSelect.mockReturnValue({ eq: mockEq })
  mockInsert.mockResolvedValue({ error: null })
  mockUpdate.mockReturnValue({ eq: mockEq })

  // Chain: select → eq → single
  mockEq.mockImplementation(function (this: unknown) {
    return { single: mockSingle, eq: mockEq }
  })

  return {
    from: vi.fn((table: string) => {
      if (table === 'symptom_events') {
        return {
          select: () => ({ eq: mockEq }),
          update: (data: unknown) => {
            mockUpdate(data)
            return { eq: vi.fn().mockResolvedValue({ error: null }) }
          },
        }
      }
      if (table === 'extracted_data') {
        return {
          insert: mockInsert,
        }
      }
      return {}
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockExtractSymptomData.mockResolvedValue(symptomExtraction)
  mockGetRecentCorrections.mockResolvedValue([])
  mockBuildCorrectionContext.mockReturnValue('')
})

describe('runExtractionPipeline', () => {
  it('extrahiert Daten und speichert in DB', async () => {
    const supabase = createMockSupabase()

    const { runExtractionPipeline } = await import('@/lib/ai/pipeline')
    await runExtractionPipeline(supabase as never, 'event-1')

    expect(mockExtractSymptomData).toHaveBeenCalledWith(
      'Kopfschmerzen rechts',
      undefined,
    )
    expect(mockInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          symptom_event_id: 'event-1',
          field_name: 'symptom_name',
          value: 'Kopfschmerzen',
          confidence: 95,
        }),
      ]),
    )
    expect(mockUpdate).toHaveBeenCalledWith({
      status: 'extracted',
      event_type: 'symptom',
    })
  })

  it('setzt extraction_failed bei KI-Fehler', async () => {
    mockExtractSymptomData.mockRejectedValue(new Error('API error'))
    const supabase = createMockSupabase()

    const { runExtractionPipeline } = await import('@/lib/ai/pipeline')

    await expect(
      runExtractionPipeline(supabase as never, 'event-1'),
    ).rejects.toThrow()

    expect(mockUpdate).toHaveBeenCalledWith({
      status: 'extraction_failed',
    })
  })

  it('überspringt bereits verarbeitete Events', async () => {
    const supabase = createMockSupabase()
    mockSingle.mockResolvedValue({
      data: {
        id: 'event-1',
        status: 'extracted',
        raw_input: 'Test',
      },
      error: null,
    })

    const { runExtractionPipeline } = await import('@/lib/ai/pipeline')
    await runExtractionPipeline(supabase as never, 'event-1')

    expect(mockExtractSymptomData).not.toHaveBeenCalled()
  })

  it('setzt extraction_failed bei Timeout', async () => {
    vi.useFakeTimers()

    // Mock: extractSymptomData löst sich nie auf
    mockExtractSymptomData.mockImplementation(
      () => new Promise(() => {}),
    )
    const supabase = createMockSupabase()

    const { runExtractionPipeline } = await import('@/lib/ai/pipeline')

    const promise = runExtractionPipeline(supabase as never, 'event-1')
    promise.catch(() => {}) // Prevent unhandled rejection warning

    // Pipeline-Timeout ist 30s — vorspulen
    await vi.advanceTimersByTimeAsync(30_001)

    await expect(promise).rejects.toThrow(/timeout/i)

    expect(mockUpdate).toHaveBeenCalledWith({
      status: 'extraction_failed',
    })

    vi.useRealTimers()
  })

  it('lädt Corrections und übergibt Kontext an Extraktion', async () => {
    const corrections = [
      {
        fieldName: 'body_region',
        originalValue: 'Rügge',
        correctedValue: 'Rücken',
      },
    ]
    const correctionContext = 'Frühere Korrekturen...'
    mockGetRecentCorrections.mockResolvedValue(corrections)
    mockBuildCorrectionContext.mockReturnValue(correctionContext)

    const supabase = createMockSupabase()

    const { runExtractionPipeline } = await import('@/lib/ai/pipeline')
    await runExtractionPipeline(supabase as never, 'event-1')

    expect(mockGetRecentCorrections).toHaveBeenCalledWith(
      supabase,
      'user-1',
      50,
    )
    expect(mockBuildCorrectionContext).toHaveBeenCalledWith(corrections)
    expect(mockExtractSymptomData).toHaveBeenCalledWith(
      'Kopfschmerzen rechts',
      { corrections: correctionContext },
    )
  })

  it('übergibt keinen Context wenn keine Korrekturen vorhanden', async () => {
    mockGetRecentCorrections.mockResolvedValue([])
    mockBuildCorrectionContext.mockReturnValue('')

    const supabase = createMockSupabase()

    const { runExtractionPipeline } = await import('@/lib/ai/pipeline')
    await runExtractionPipeline(supabase as never, 'event-1')

    expect(mockExtractSymptomData).toHaveBeenCalledWith(
      'Kopfschmerzen rechts',
      undefined,
    )
  })

  it('wirft Fehler bei nicht gefundenem Event', async () => {
    const supabase = createMockSupabase()
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: 'Not found' },
    })

    const { runExtractionPipeline } = await import('@/lib/ai/pipeline')

    await expect(
      runExtractionPipeline(supabase as never, 'nonexistent'),
    ).rejects.toThrow('Event not found')
  })

  it('überspringt Voice-Events ohne raw_input (Transkription ausstehend)', async () => {
    const supabase = createMockSupabase()
    mockSingle.mockResolvedValue({
      data: {
        id: 'voice-1',
        account_id: 'user-1',
        event_type: 'voice',
        raw_input: null,
        audio_url: 'user-1/voice-1.webm',
        status: 'pending',
      },
      error: null,
    })

    const { runExtractionPipeline } = await import('@/lib/ai/pipeline')
    await runExtractionPipeline(supabase as never, 'voice-1')

    // Kein Claude-Aufruf, kein Status-Update, kein Fehler
    expect(mockExtractSymptomData).not.toHaveBeenCalled()
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('verarbeitet Voice-Events mit raw_input normal (nach Transkription)', async () => {
    const supabase = createMockSupabase()
    mockSingle.mockResolvedValue({
      data: {
        id: 'voice-2',
        account_id: 'user-1',
        event_type: 'voice',
        raw_input: 'Kopfschmerzen rechts',
        audio_url: 'user-1/voice-2.webm',
        status: 'pending',
      },
      error: null,
    })

    const { runExtractionPipeline } = await import('@/lib/ai/pipeline')
    await runExtractionPipeline(supabase as never, 'voice-2')

    // Sollte normal extrahieren
    expect(mockExtractSymptomData).toHaveBeenCalledWith(
      'Kopfschmerzen rechts',
      undefined,
    )
  })
})
