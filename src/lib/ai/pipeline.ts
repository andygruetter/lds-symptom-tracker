import type { SupabaseClient } from '@supabase/supabase-js'

import { getRecentCorrections } from '@/lib/db/corrections'
import { getSignedAudioUrl } from '@/lib/db/media'
import { getVocabulary } from '@/lib/db/vocabulary'
import { sendPushNotification } from '@/lib/push/send-notification'
import { audioMimeFromPath } from '@/lib/utils/mime'
import type { ExtractionContext } from '@/types/ai'
import type { Database } from '@/types/database'
import type { SymptomEvent } from '@/types/symptom'

import { extractSymptomData } from './extract'
import {
  buildCorrectionContext,
  buildVocabularyContext,
} from './prompt-enrichment'
import { transcribeAudio } from './transcribe'

const PIPELINE_TIMEOUT_MS = 30_000 // 30 Sekunden für Claude API + Retries
const TRANSCRIPTION_TIMEOUT_MS = 15_000 // 15 Sekunden für Transkription

async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000,
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (attempt === maxAttempts) throw error
      await new Promise((resolve) =>
        setTimeout(resolve, baseDelay * Math.pow(2, attempt - 1)),
      )
    }
  }
  throw new Error('Unreachable')
}

async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Pipeline timeout after ${timeoutMs}ms`)),
        timeoutMs,
      ),
    ),
  ])
}

export async function runExtractionPipeline(
  supabase: SupabaseClient<Database>,
  symptomEventId: string,
): Promise<void> {
  // 1. Load symptom_event
  const { data, error: loadError } = await supabase
    .from('symptom_events')
    .select('*')
    .eq('id', symptomEventId)
    .single()

  if (loadError || !data) {
    throw new Error(`Event not found: ${symptomEventId}`)
  }

  const event = data as SymptomEvent

  const retriableStatuses = [
    'pending',
    'transcribed',
    'extraction_failed',
    'transcription_failed',
  ]
  if (!retriableStatuses.includes(event.status)) {
    return // Bereits verarbeitet oder bestätigt
  }

  try {
    // 2. Voice-Events: Transkription durchführen
    let rawInput = event.raw_input ?? ''

    if (event.event_type === 'voice' && !event.raw_input?.trim()) {
      if (!event.audio_url) {
        throw new Error('Voice-Event ohne audio_url — Upload fehlgeschlagen?')
      }

      try {
        rawInput = await transcribeVoiceEvent(supabase, event, symptomEventId)
      } catch (error) {
        // Transkriptions-Fehler: Status auf transcription_failed setzen
        const { error: statusError } = await supabase
          .from('symptom_events')
          .update({ status: 'transcription_failed' as string })
          .eq('id', symptomEventId)

        if (statusError) {
          console.error(
            '[KI-Pipeline] Failed to set transcription_failed status:',
            statusError.message,
          )
        }

        throw error
      }
    }

    if (!rawInput.trim()) {
      throw new Error('Kein Text für Extraktion vorhanden')
    }

    await withTimeout(async () => {
      // 3. Corrections + Vokabular laden für Prompt-Enrichment
      const [corrections, vocabulary] = await Promise.all([
        getRecentCorrections(supabase, event.account_id, 50),
        getVocabulary(supabase, event.account_id),
      ])
      const correctionContext = buildCorrectionContext(corrections)
      const vocabularyContext = buildVocabularyContext(vocabulary)

      // 4. Claude Extract mit Retry und Enrichment-Context
      const context: ExtractionContext | undefined =
        correctionContext || vocabularyContext
          ? {
              ...(correctionContext ? { corrections: correctionContext } : {}),
              ...(vocabularyContext ? { vocabulary: vocabularyContext } : {}),
            }
          : undefined
      const result = await withRetry(() =>
        extractSymptomData(rawInput, context),
      )

      // 5. Insert extracted_data rows
      const extractedRows = result.fields.map((field) => ({
        symptom_event_id: symptomEventId,
        field_name: field.fieldName,
        value: field.value,
        confidence: field.confidence,
      }))

      if (extractedRows.length > 0) {
        const { error: insertError } = await supabase
          .from('extracted_data')
          .insert(extractedRows)

        if (insertError) {
          throw new Error(
            `Failed to insert extracted data: ${insertError.message}`,
          )
        }
      }

      // 6. Update symptom_event status + event_type
      const { error: updateError } = await supabase
        .from('symptom_events')
        .update({
          status: 'extracted',
          event_type: result.eventType,
        })
        .eq('id', symptomEventId)

      if (updateError) {
        throw new Error(`Failed to update event status: ${updateError.message}`)
      }

      // 7. Push-Notification nach erfolgreicher Extraktion (Fire-and-Forget)
      sendPushNotification(event.account_id, {
        title: 'Symptom verarbeitet',
        body: 'Dein Symptom wurde verarbeitet — tippe zum Überprüfen',
        url: '/',
      }).catch((err) => {
        console.error('[Push] Notification fehlgeschlagen:', err)
      })
    }, PIPELINE_TIMEOUT_MS)
  } catch (error) {
    // 7. Fehler: Status auf extraction_failed setzen (falls nicht bereits transcription_failed)
    // Bei Transkriptions-Fehler ist der Status bereits auf transcription_failed gesetzt
    const { data: currentEvent } = await supabase
      .from('symptom_events')
      .select('status')
      .eq('id', symptomEventId)
      .single()

    if (currentEvent?.status !== 'transcription_failed') {
      const { error: statusError } = await supabase
        .from('symptom_events')
        .update({ status: 'extraction_failed' })
        .eq('id', symptomEventId)

      if (statusError) {
        console.error(
          '[KI-Pipeline] Failed to set extraction_failed status:',
          statusError.message,
        )
      }
    }

    throw error // Re-throw für Logging in API Route
  }
}

async function transcribeVoiceEvent(
  supabase: SupabaseClient<Database>,
  event: SymptomEvent,
  symptomEventId: string,
): Promise<string> {
  // a. Audio aus Supabase Storage herunterladen
  const signedUrl = await getSignedAudioUrl(supabase, event.audio_url!)
  const response = await fetch(signedUrl)
  if (!response.ok) {
    throw new Error(`Audio-Download fehlgeschlagen: ${response.status}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  const audioBuffer = Buffer.from(arrayBuffer)

  // b. MIME-Type aus Storage-Pfad ableiten
  const mimeType = audioMimeFromPath(event.audio_url!)

  // c. Transkription mit Retry und Timeout
  const transcript = await withRetry(() =>
    withTimeout(
      () => transcribeAudio(audioBuffer, mimeType),
      TRANSCRIPTION_TIMEOUT_MS,
    ),
  )

  // d. raw_input in DB speichern
  const { error: updateError } = await supabase
    .from('symptom_events')
    .update({
      raw_input: transcript.text,
      status: 'transcribed' as string,
    })
    .eq('id', symptomEventId)

  if (updateError) {
    throw new Error(`Failed to update raw_input: ${updateError.message}`)
  }

  return transcript.text
}
