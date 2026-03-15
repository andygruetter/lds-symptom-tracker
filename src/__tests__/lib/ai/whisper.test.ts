import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock OpenAI SDK
const mockCreate = vi.fn()
const mockToFile = vi.fn()

vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      audio = {
        transcriptions: {
          create: mockCreate,
        },
      }
    },
    toFile: mockToFile,
  }
})

beforeEach(() => {
  vi.clearAllMocks()
  mockToFile.mockResolvedValue(new Blob())
  mockCreate.mockResolvedValue({ text: 'Ich habe Kopfschmerzen' })
})

describe('whisperProvider', () => {
  it('sendet Audio an OpenAI Transcriptions API', async () => {
    const { whisperProvider } = await import('@/lib/ai/providers/whisper')

    const buffer = Buffer.from('fake-audio-data')
    const result = await whisperProvider.transcribe(buffer, 'audio/webm')

    expect(mockToFile).toHaveBeenCalledWith(buffer, 'audio.webm', {
      type: 'audio/webm',
    })
    expect(mockCreate).toHaveBeenCalledWith({
      file: expect.anything(),
      model: 'gpt-4o-transcribe',
      language: 'de',
      temperature: 0,
      prompt: expect.stringContaining('Hochdeutsch'),
    })
    expect(result).toEqual({ text: 'Ich habe Kopfschmerzen' })
  })

  it('leitet MIME-Type korrekt in Extension um', async () => {
    const { whisperProvider } = await import('@/lib/ai/providers/whisper')

    const buffer = Buffer.from('audio')
    await whisperProvider.transcribe(buffer, 'audio/mp4')

    expect(mockToFile).toHaveBeenCalledWith(buffer, 'audio.m4a', {
      type: 'audio/mp4',
    })
  })

  it('verwendet webm als Fallback für unbekannte MIME-Types', async () => {
    const { whisperProvider } = await import('@/lib/ai/providers/whisper')

    const buffer = Buffer.from('audio')
    await whisperProvider.transcribe(buffer, 'audio/unknown')

    expect(mockToFile).toHaveBeenCalledWith(buffer, 'audio.webm', {
      type: 'audio/unknown',
    })
  })

  it('wirft Fehler bei API-Ausfall', async () => {
    mockCreate.mockRejectedValue(new Error('OpenAI API Error'))

    const { whisperProvider } = await import('@/lib/ai/providers/whisper')

    const buffer = Buffer.from('audio')
    await expect(
      whisperProvider.transcribe(buffer, 'audio/webm'),
    ).rejects.toThrow('OpenAI API Error')
  })

  it('behandelt MIME-Type mit Codec-Suffix korrekt', async () => {
    const { whisperProvider } = await import('@/lib/ai/providers/whisper')

    const buffer = Buffer.from('audio')
    await whisperProvider.transcribe(buffer, 'audio/webm;codecs=opus')

    expect(mockToFile).toHaveBeenCalledWith(buffer, 'audio.webm', {
      type: 'audio/webm;codecs=opus',
    })
  })

  it('leitet TranscriptionContext an buildWhisperPrompt weiter', async () => {
    const { whisperProvider } = await import('@/lib/ai/providers/whisper')

    const buffer = Buffer.from('audio')
    const context = { vocabularyTerms: ['Triptane', 'Sumatriptan'] }
    await whisperProvider.transcribe(buffer, 'audio/webm', context)

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('Triptane'),
      }),
    )
  })
})

describe('buildWhisperPrompt', () => {
  it('enthält Basis-Prompt und medizinische Domain-Begriffe', async () => {
    const { buildWhisperPrompt } = await import('@/lib/ai/providers/whisper')

    const prompt = buildWhisperPrompt()

    expect(prompt).toContain('Hochdeutsch')
    expect(prompt).toContain('Kopfschmerzen')
    expect(prompt).toContain('Ibuprofen')
    expect(prompt).toContain('Medizinische Begriffe:')
  })

  it('fügt patientenspezifisches Vokabular hinzu', async () => {
    const { buildWhisperPrompt } = await import('@/lib/ai/providers/whisper')

    const prompt = buildWhisperPrompt({
      vocabularyTerms: ['Triptane', 'Sumatriptan'],
    })

    expect(prompt).toContain('Triptane')
    expect(prompt).toContain('Sumatriptan')
  })

  it('dedupliziert gegen bestehende Domain-Begriffe', async () => {
    const { buildWhisperPrompt } = await import('@/lib/ai/providers/whisper')

    const prompt = buildWhisperPrompt({
      vocabularyTerms: ['Kopfschmerzen', 'Triptane'],
    })

    // Kopfschmerzen sollte nur einmal vorkommen (bereits in Domain-Begriffen)
    const matches = prompt.match(/Kopfschmerzen/g)
    expect(matches).toHaveLength(2) // einmal in Basis-Prompt, einmal in Domain-Begriffe
    expect(prompt).toContain('Triptane')
  })

  it('funktioniert mit leerem vocabularyTerms Array', async () => {
    const { buildWhisperPrompt } = await import('@/lib/ai/providers/whisper')

    const promptWithEmpty = buildWhisperPrompt({ vocabularyTerms: [] })
    const promptWithout = buildWhisperPrompt()

    expect(promptWithEmpty).toBe(promptWithout)
  })
})
