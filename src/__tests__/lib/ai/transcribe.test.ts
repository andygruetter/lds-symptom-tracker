import { afterEach, describe, expect, it, vi } from 'vitest'

// Mock both providers
const mockWhisperTranscribe = vi.fn()
vi.mock('@/lib/ai/providers/whisper', () => ({
  whisperProvider: { transcribe: (...args: unknown[]) => mockWhisperTranscribe(...args) },
}))

const mockMockTranscribe = vi.fn()
vi.mock('@/lib/ai/providers/mock-whisper', () => ({
  mockWhisperProvider: { transcribe: (...args: unknown[]) => mockMockTranscribe(...args) },
}))

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('transcribeAudio', () => {
  it('verwendet Whisper-Provider standardmässig', async () => {
    vi.stubEnv('E2E_MOCK_TRANSCRIPTION', undefined as unknown as string)
    mockWhisperTranscribe.mockResolvedValue({ text: 'Echte Transkription' })

    const { transcribeAudio } = await import('@/lib/ai/transcribe')
    const result = await transcribeAudio(Buffer.from('audio'), 'audio/webm')

    expect(mockWhisperTranscribe).toHaveBeenCalledWith(
      Buffer.from('audio'),
      'audio/webm',
    )
    expect(result).toEqual({ text: 'Echte Transkription' })
  })

  it('verwendet Mock-Provider wenn E2E_MOCK_TRANSCRIPTION=true', async () => {
    vi.stubEnv('E2E_MOCK_TRANSCRIPTION', 'true')
    mockMockTranscribe.mockResolvedValue({
      text: 'Ich habe Rückenschmerzen links im Schulterblatt',
    })

    const { transcribeAudio } = await import('@/lib/ai/transcribe')
    const result = await transcribeAudio(Buffer.from('audio'), 'audio/webm')

    expect(mockMockTranscribe).toHaveBeenCalled()
    expect(result.text).toBe(
      'Ich habe Rückenschmerzen links im Schulterblatt',
    )
  })
})
