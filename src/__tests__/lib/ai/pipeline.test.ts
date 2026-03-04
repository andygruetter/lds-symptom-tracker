import { beforeEach, describe, expect, it, vi } from 'vitest'

import { symptomExtraction } from '@/lib/ai/__fixtures__/extractions'

// Mock extract
const mockExtractSymptomData = vi.fn()
vi.mock('@/lib/ai/extract', () => ({
  extractSymptomData: (...args: unknown[]) => mockExtractSymptomData(...args),
}))

// Mock transcribe
const mockTranscribeAudio = vi.fn()
vi.mock('@/lib/ai/transcribe', () => ({
  transcribeAudio: (...args: unknown[]) => mockTranscribeAudio(...args),
}))

// Mock media helpers
const mockGetSignedAudioUrl = vi.fn()
vi.mock('@/lib/db/media', () => ({
  getSignedAudioUrl: (...args: unknown[]) => mockGetSignedAudioUrl(...args),
}))

// Mock corrections loader
const mockGetRecentCorrections = vi.fn()
vi.mock('@/lib/db/corrections', () => ({
  getRecentCorrections: (...args: unknown[]) =>
    mockGetRecentCorrections(...args),
}))

// Mock vocabulary loader
const mockGetVocabulary = vi.fn()
vi.mock('@/lib/db/vocabulary', () => ({
  getVocabulary: (...args: unknown[]) => mockGetVocabulary(...args),
}))

// Mock push notification
const mockSendPushNotification = vi.fn()
vi.mock('@/lib/push/send-notification', () => ({
  sendPushNotification: (...args: unknown[]) =>
    mockSendPushNotification(...args),
}))

// Mock prompt enrichment
const mockBuildCorrectionContext = vi.fn()
const mockBuildVocabularyContext = vi.fn()
vi.mock('@/lib/ai/prompt-enrichment', () => ({
  buildCorrectionContext: (...args: unknown[]) =>
    mockBuildCorrectionContext(...args),
  buildVocabularyContext: (...args: unknown[]) =>
    mockBuildVocabularyContext(...args),
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
  mockGetVocabulary.mockResolvedValue([])
  mockBuildCorrectionContext.mockReturnValue('')
  mockBuildVocabularyContext.mockReturnValue('')
  mockSendPushNotification.mockResolvedValue(undefined)
  mockTranscribeAudio.mockResolvedValue({
    text: 'Ich habe Kopfschmerzen rechts',
  })
  mockGetSignedAudioUrl.mockResolvedValue(
    'https://storage.example.com/signed-url',
  )

  // Mock global fetch for audio download
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
    }),
  )
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
    mockExtractSymptomData.mockImplementation(() => new Promise(() => {}))
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

  // --- Voice-Event Transkriptions-Tests (Story 3.2) ---

  it('transkribiert Voice-Events und startet dann Extraktion', async () => {
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

    // Transkription sollte aufgerufen worden sein
    expect(mockGetSignedAudioUrl).toHaveBeenCalledWith(
      supabase,
      'user-1/voice-1.webm',
    )
    expect(mockTranscribeAudio).toHaveBeenCalledWith(
      expect.any(Buffer),
      'audio/webm',
    )

    // raw_input + transcribed Status sollten gesetzt worden sein
    expect(mockUpdate).toHaveBeenCalledWith({
      raw_input: 'Ich habe Kopfschmerzen rechts',
      status: 'transcribed',
    })

    // Extraktion sollte mit transkribiertem Text aufgerufen worden sein
    expect(mockExtractSymptomData).toHaveBeenCalledWith(
      'Ich habe Kopfschmerzen rechts',
      undefined,
    )
  })

  it('setzt transcription_failed bei Transkriptions-Fehler', async () => {
    mockTranscribeAudio.mockRejectedValue(new Error('OpenAI API Error'))
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

    await expect(
      runExtractionPipeline(supabase as never, 'voice-1'),
    ).rejects.toThrow('OpenAI API Error')

    // Status sollte auf transcription_failed gesetzt worden sein
    expect(mockUpdate).toHaveBeenCalledWith({
      status: 'transcription_failed',
    })
    // Extraktion sollte NICHT aufgerufen worden sein
    expect(mockExtractSymptomData).not.toHaveBeenCalled()
  })

  it('wirft Fehler bei Voice-Event ohne audio_url', async () => {
    const supabase = createMockSupabase()
    mockSingle.mockResolvedValue({
      data: {
        id: 'voice-1',
        account_id: 'user-1',
        event_type: 'voice',
        raw_input: null,
        audio_url: null,
        status: 'pending',
      },
      error: null,
    })

    const { runExtractionPipeline } = await import('@/lib/ai/pipeline')

    await expect(
      runExtractionPipeline(supabase as never, 'voice-1'),
    ).rejects.toThrow(/audio_url/)
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

    // Keine Transkription nötig — raw_input ist bereits vorhanden
    expect(mockTranscribeAudio).not.toHaveBeenCalled()
    // Sollte normal extrahieren
    expect(mockExtractSymptomData).toHaveBeenCalledWith(
      'Kopfschmerzen rechts',
      undefined,
    )
  })

  it('erlaubt Retry für extraction_failed Events', async () => {
    const supabase = createMockSupabase()
    mockSingle.mockResolvedValue({
      data: {
        id: 'event-1',
        account_id: 'user-1',
        raw_input: 'Kopfschmerzen rechts',
        status: 'extraction_failed',
      },
      error: null,
    })

    const { runExtractionPipeline } = await import('@/lib/ai/pipeline')
    await runExtractionPipeline(supabase as never, 'event-1')

    expect(mockExtractSymptomData).toHaveBeenCalled()
  })

  it('erlaubt Retry für transcribed Events (Extraktion nach Server-Restart)', async () => {
    const supabase = createMockSupabase()
    mockSingle.mockResolvedValue({
      data: {
        id: 'voice-1',
        account_id: 'user-1',
        event_type: 'voice',
        raw_input: 'Ich habe Kopfschmerzen rechts',
        audio_url: 'user-1/voice-1.webm',
        status: 'transcribed',
      },
      error: null,
    })

    const { runExtractionPipeline } = await import('@/lib/ai/pipeline')
    await runExtractionPipeline(supabase as never, 'voice-1')

    // Transkription sollte NICHT erneut aufgerufen werden (raw_input existiert)
    expect(mockTranscribeAudio).not.toHaveBeenCalled()
    // Extraktion sollte mit bestehendem raw_input starten
    expect(mockExtractSymptomData).toHaveBeenCalledWith(
      'Ich habe Kopfschmerzen rechts',
      undefined,
    )
  })

  it('erlaubt Retry für transcription_failed Events', async () => {
    const supabase = createMockSupabase()
    mockSingle.mockResolvedValue({
      data: {
        id: 'voice-1',
        account_id: 'user-1',
        event_type: 'voice',
        raw_input: null,
        audio_url: 'user-1/voice-1.webm',
        status: 'transcription_failed',
      },
      error: null,
    })

    const { runExtractionPipeline } = await import('@/lib/ai/pipeline')
    await runExtractionPipeline(supabase as never, 'voice-1')

    expect(mockTranscribeAudio).toHaveBeenCalled()
    expect(mockExtractSymptomData).toHaveBeenCalled()
  })

  // --- Vokabular-Integration Tests (Story 3.6) ---

  it('lädt Vokabular und übergibt Kontext an Extraktion', async () => {
    const vocabulary = [
      {
        patientTerm: 'rügge',
        mappedTerm: 'Rücken',
        fieldName: 'body_region',
        usageCount: 5,
      },
    ]
    const vocabularyContext = 'Persönliches Vokabular...'
    mockGetVocabulary.mockResolvedValue(vocabulary)
    mockBuildVocabularyContext.mockReturnValue(vocabularyContext)

    const supabase = createMockSupabase()

    const { runExtractionPipeline } = await import('@/lib/ai/pipeline')
    await runExtractionPipeline(supabase as never, 'event-1')

    expect(mockGetVocabulary).toHaveBeenCalledWith(supabase, 'user-1')
    expect(mockBuildVocabularyContext).toHaveBeenCalledWith(vocabulary)
    expect(mockExtractSymptomData).toHaveBeenCalledWith(
      'Kopfschmerzen rechts',
      { vocabulary: vocabularyContext },
    )
  })

  it('kombiniert Corrections und Vokabular im Kontext', async () => {
    const corrections = [
      {
        fieldName: 'body_region',
        originalValue: 'Rügge',
        correctedValue: 'Rücken',
      },
    ]
    const vocabulary = [
      {
        patientTerm: 'rügge',
        mappedTerm: 'Rücken',
        fieldName: 'body_region',
        usageCount: 5,
      },
    ]
    const correctionContext = 'Frühere Korrekturen...'
    const vocabularyContext = 'Persönliches Vokabular...'
    mockGetRecentCorrections.mockResolvedValue(corrections)
    mockGetVocabulary.mockResolvedValue(vocabulary)
    mockBuildCorrectionContext.mockReturnValue(correctionContext)
    mockBuildVocabularyContext.mockReturnValue(vocabularyContext)

    const supabase = createMockSupabase()

    const { runExtractionPipeline } = await import('@/lib/ai/pipeline')
    await runExtractionPipeline(supabase as never, 'event-1')

    expect(mockExtractSymptomData).toHaveBeenCalledWith(
      'Kopfschmerzen rechts',
      { corrections: correctionContext, vocabulary: vocabularyContext },
    )
  })

  it('übergibt keinen Kontext wenn weder Korrekturen noch Vokabular', async () => {
    mockGetRecentCorrections.mockResolvedValue([])
    mockGetVocabulary.mockResolvedValue([])
    mockBuildCorrectionContext.mockReturnValue('')
    mockBuildVocabularyContext.mockReturnValue('')

    const supabase = createMockSupabase()

    const { runExtractionPipeline } = await import('@/lib/ai/pipeline')
    await runExtractionPipeline(supabase as never, 'event-1')

    expect(mockExtractSymptomData).toHaveBeenCalledWith(
      'Kopfschmerzen rechts',
      undefined,
    )
  })

  // --- Push-Notification Tests (Story 3.4) ---

  it('sendet Push-Notification nach erfolgreicher Extraktion', async () => {
    const supabase = createMockSupabase()

    const { runExtractionPipeline } = await import('@/lib/ai/pipeline')
    await runExtractionPipeline(supabase as never, 'event-1')

    expect(mockSendPushNotification).toHaveBeenCalledWith('user-1', {
      title: 'Symptom verarbeitet',
      body: 'Dein Symptom wurde verarbeitet — tippe zum Überprüfen',
      url: '/',
    })
  })

  it('sendet keinen Push bei extraction_failed', async () => {
    mockExtractSymptomData.mockRejectedValue(new Error('API error'))
    const supabase = createMockSupabase()

    const { runExtractionPipeline } = await import('@/lib/ai/pipeline')

    await expect(
      runExtractionPipeline(supabase as never, 'event-1'),
    ).rejects.toThrow()

    expect(mockSendPushNotification).not.toHaveBeenCalled()
  })

  it('sendet keinen Push bei transcription_failed', async () => {
    mockTranscribeAudio.mockRejectedValue(new Error('Transcription error'))
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

    await expect(
      runExtractionPipeline(supabase as never, 'voice-1'),
    ).rejects.toThrow()

    expect(mockSendPushNotification).not.toHaveBeenCalled()
  })

  it('Pipeline läuft weiter wenn Push fehlschlägt', async () => {
    mockSendPushNotification.mockRejectedValue(new Error('Push failed'))
    const supabase = createMockSupabase()

    const { runExtractionPipeline } = await import('@/lib/ai/pipeline')
    // Should NOT throw despite push failure
    await runExtractionPipeline(supabase as never, 'event-1')

    expect(mockSendPushNotification).toHaveBeenCalled()
    expect(mockUpdate).toHaveBeenCalledWith({
      status: 'extracted',
      event_type: 'symptom',
    })
  })
})
