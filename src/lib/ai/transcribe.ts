import type { TranscriptionProvider, TranscriptionResult } from '@/types/ai'

import { mockWhisperProvider } from './providers/mock-whisper'
import { whisperProvider } from './providers/whisper'

const defaultProvider: TranscriptionProvider =
  process.env.E2E_MOCK_TRANSCRIPTION === 'true'
    ? mockWhisperProvider
    : whisperProvider

export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string,
): Promise<TranscriptionResult> {
  return defaultProvider.transcribe(audioBuffer, mimeType)
}
