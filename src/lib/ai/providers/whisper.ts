import OpenAI, { toFile } from 'openai'

import { audioExtensionFromMime } from '@/lib/utils/mime'
import type {
  TranscriptionContext,
  TranscriptionProvider,
  TranscriptionResult,
} from '@/types/ai'

const WHISPER_MODEL = 'gpt-4o-transcribe'

const BASE_PROMPT =
  'Transkribiere in Hochdeutsch. Schweizerdeutsch und Dialekt immer in korrektes Standarddeutsch übersetzen. Beispiel: "Chopfweh" wird zu "Kopfschmerzen", "Buuchschmerze" wird zu "Bauchschmerzen".'

const MEDICAL_DOMAIN_TERMS = [
  'Kopfschmerzen',
  'Migräne',
  'Rückenschmerzen',
  'Nackenschmerzen',
  'Schulterschmerzen',
  'Gelenkschmerzen',
  'Bauchschmerzen',
  'Schwindel',
  'Übelkeit',
  'Erbrechen',
  'Müdigkeit',
  'Erschöpfung',
  'Herzrasen',
  'Atemnot',
  'Ibuprofen',
  'Paracetamol',
  'Aspirin',
  'Dafalgan',
  'Voltaren',
  'Novalgin',
  'stechend',
  'ziehend',
  'dumpf',
  'pochend',
  'brennend',
  'kribbelnd',
  'drückend',
]

/**
 * Baut einen dynamischen Whisper-Prompt mit medizinischem Domain-Priming
 * und optionalem patientenspezifischem Vokabular.
 */
export function buildWhisperPrompt(context?: TranscriptionContext): string {
  const parts = [BASE_PROMPT]

  // Medizinische Domain-Begriffe als Priming
  const domainTerms = [...MEDICAL_DOMAIN_TERMS]

  // Patientenspezifisches Vokabular hinzufügen (gemappte Begriffe)
  if (context?.vocabularyTerms && context.vocabularyTerms.length > 0) {
    // Deduplizieren gegen Domain-Begriffe
    const existingLower = new Set(domainTerms.map((t) => t.toLowerCase()))
    const uniquePatientTerms = context.vocabularyTerms.filter(
      (t) => !existingLower.has(t.toLowerCase()),
    )
    domainTerms.push(...uniquePatientTerms)
  }

  parts.push(`Medizinische Begriffe: ${domainTerms.join(', ')}.`)

  return parts.join(' ')
}

function createClient(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

export const whisperProvider: TranscriptionProvider = {
  async transcribe(
    audioBuffer: Buffer,
    mimeType: string,
    context?: TranscriptionContext,
  ): Promise<TranscriptionResult> {
    const client = createClient()
    const extension = audioExtensionFromMime(mimeType)

    const file = await toFile(audioBuffer, `audio.${extension}`, {
      type: mimeType,
    })

    const result = await client.audio.transcriptions.create({
      file,
      model: WHISPER_MODEL,
      language: 'de',
      temperature: 0,
      prompt: buildWhisperPrompt(context),
    })

    return { text: result.text }
  },
}
