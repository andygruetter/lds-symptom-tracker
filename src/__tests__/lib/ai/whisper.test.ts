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
      model: 'gpt-4o-mini-transcribe',
      language: 'de',
      response_format: 'json',
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
})
