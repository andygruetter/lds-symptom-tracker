import type { TranscriptionProvider, TranscriptionResult } from '@/types/ai'

/**
 * Mock Transkriptions-Provider — deterministisch für Tests.
 * Aktiviert via E2E_MOCK_TRANSCRIPTION=true.
 */
export const mockWhisperProvider: TranscriptionProvider = {
  async transcribe(audioBuffer: Buffer): Promise<TranscriptionResult> {
    if (audioBuffer.length === 0) {
      throw new Error('Audio-Buffer ist leer')
    }

    return {
      text: 'Ich habe Rückenschmerzen links im Schulterblatt',
    }
  },
}
