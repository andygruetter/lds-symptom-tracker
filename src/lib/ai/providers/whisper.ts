import OpenAI, { toFile } from 'openai'

import { audioExtensionFromMime } from '@/lib/utils/mime'
import type { TranscriptionProvider, TranscriptionResult } from '@/types/ai'

const WHISPER_MODEL = 'gpt-4o-transcribe'

function createClient(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

export const whisperProvider: TranscriptionProvider = {
  async transcribe(
    audioBuffer: Buffer,
    mimeType: string,
  ): Promise<TranscriptionResult> {
    const client = createClient()
    const extension = audioExtensionFromMime(mimeType)

    const file = await toFile(audioBuffer, `audio.${extension}`, {
      type: mimeType,
    })

    const result = await client.audio.transcriptions.create({
      file,
      model: WHISPER_MODEL,
      prompt:
        'Falls Deutsch oder Schweizerdeutsch gesprochen wird, bitte in Hochdeutsch transkribieren.',
    })

    return { text: result.text }
  },
}
