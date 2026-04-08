import type { SupabaseClient } from '@supabase/supabase-js'

import { getRecentCorrections } from '@/lib/db/corrections'
import { getSignedAudioUrl } from '@/lib/db/media'
import { getVocabulary } from '@/lib/db/vocabulary'
import { sendPushNotification } from '@/lib/push/send-notification'
import { audioMimeFromPath } from '@/lib/utils/mime'
import type { ExtractionContext, VocabularyEntry } from '@/types/ai'
import type { Database } from '@/types/database'
import type { SymptomEvent } from '@/types/symptom'

import { extractSymptomData } from './extract'
import {
  buildCorrectionContext,
  buildVocabularyContext,
} from './prompt-enrichment'
import { transcribeAudio } from './transcribe'
import { validateExtractionFields } from './validation'

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
    'extracted', // NEU: Re-Run nach erfolgreicher Extraktion
    'confirmed', // NEU: Re-Run nach Bestätigung
  ]
  if (!retriableStatuses.includes(event.status)) {
    return // Bereits verarbeitet oder bestätigt
  }

  try {
    // 2. Vokabular vorladen (wird für Whisper UND Claude gebraucht)
    const vocabulary = await getVocabulary(supabase, event.account_id)

    // 3. Voice-Events: Transkription mit dynamischem Vokabular-Prompt
    let rawInput = event.raw_input ?? ''

    if (event.event_type === 'voice' && !event.raw_input?.trim()) {
      if (!event.audio_url) {
        throw new Error('Voice-Event ohne audio_url — Upload fehlgeschlagen?')
      }

      try {
        rawInput = await transcribeVoiceEvent(
          supabase,
          event,
          symptomEventId,
          vocabulary,
        )
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
      // 4. Corrections laden für Prompt-Enrichment
      const corrections = await getRecentCorrections(
        supabase,
        event.account_id,
        50,
      )
      const correctionContext = buildCorrectionContext(corrections)
      const vocabularyContext = buildVocabularyContext(vocabulary)

      // 5. Claude Extract mit Retry und Enrichment-Context
      // Referenzzeitpunkt als Kontext-Prefix für relative Zeitangaben ("gestern morgen")
      const rawInputWithContext = `Referenzzeitpunkt der Meldung: ${event.created_at}\n\n${rawInput}`

      const context: ExtractionContext | undefined =
        correctionContext || vocabularyContext
          ? {
              ...(correctionContext ? { corrections: correctionContext } : {}),
              ...(vocabularyContext ? { vocabulary: vocabularyContext } : {}),
            }
          : undefined
      const result = await withRetry(() =>
        extractSymptomData(rawInputWithContext, context),
      )

      // 6. Post-Extraction-Validation
      const validatedFields = validateExtractionFields(result.fields)

      // 7. Alte extracted_data löschen bei Re-Extraction (Duplikat-Vermeidung)
      await supabase
        .from('extracted_data')
        .delete()
        .eq('symptom_event_id', symptomEventId)

      // 8. Insert validated extracted_data rows
      const extractedRows = validatedFields.map((field) => ({
        symptom_event_id: symptomEventId,
        field_name: field.fieldName,
        value: field.value,
        confidence: field.confidence,
        symptom_index: field.symptomIndex,
        medication_index: field.medicationIndex ?? null,
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

      // 9. occurred_at-Sync: Entweder aus extrahiertem symptom_time oder Fallback auf created_at
      // Bei Multi-Symptom: symptom_time vom Hauptsymptom (symptomIndex 0) verwenden
      const symptomTimeField = validatedFields.find(
        (f) => f.fieldName === 'symptom_time' && f.symptomIndex === 0,
      )
      if (symptomTimeField?.value) {
        // F13-Fix: ISO-8601 Validierung vor Sync
        const parsedDate = new Date(symptomTimeField.value)
        const isValidDate = !isNaN(parsedDate.getTime())

        if (isValidDate) {
          // F6-Fix: Immer über Supabase Client .update() — keine String-Interpolation
          const { error: occurredAtError } = await supabase
            .from('symptom_events')
            .update({ occurred_at: symptomTimeField.value })
            .eq('id', symptomEventId)

          if (occurredAtError) {
            console.error(
              '[Pipeline] occurred_at-Sync fehlgeschlagen:',
              occurredAtError.message,
            )
          }
        } else {
          console.warn(
            `[Pipeline] Ungültiger symptom_time Wert: ${symptomTimeField.value} — Fallback auf created_at`,
          )
          await supabase
            .from('symptom_events')
            .update({ occurred_at: event.created_at })
            .eq('id', symptomEventId)
        }
      } else {
        // Kein symptom_time extrahiert → expliziter Fallback auf created_at
        await supabase
          .from('symptom_events')
          .update({ occurred_at: event.created_at })
          .eq('id', symptomEventId)
      }

      // 10. Update symptom_event status (event_type bleibt unverändert — 'symptom' oder 'voice')
      const { error: updateError } = await supabase
        .from('symptom_events')
        .update({ status: 'extracted' })
        .eq('id', symptomEventId)

      if (updateError) {
        throw new Error(`Failed to update event status: ${updateError.message}`)
      }

      // 11. Metriken loggen (Fire-and-Forget)
      logExtractionMetrics(
        supabase,
        symptomEventId,
        event.account_id,
        result.fields.length,
        validatedFields.length,
        validatedFields,
      ).catch((err) => {
        console.error('[Metrics] Logging fehlgeschlagen:', err)
      })

      // 12. Push-Notification nach erfolgreicher Extraktion (Fire-and-Forget)
      sendPushNotification(event.account_id, {
        title: 'Symptom verarbeitet',
        body: 'Dein Symptom wurde verarbeitet — tippe zum Überprüfen',
        url: '/',
      }).catch((err) => {
        console.error('[Push] Notification fehlgeschlagen:', err)
      })
    }, PIPELINE_TIMEOUT_MS)
  } catch (error) {
    // Fehler: Status auf extraction_failed setzen (falls nicht bereits transcription_failed)
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
  vocabulary: VocabularyEntry[],
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

  // c. Dynamischer Transkriptions-Kontext aus Patientenvokabular
  const vocabularyTerms = vocabulary.map((v) => v.mappedTerm)

  // d. Transkription mit Retry, Timeout und Vokabular-Context
  const transcript = await withRetry(() =>
    withTimeout(
      () => transcribeAudio(audioBuffer, mimeType, { vocabularyTerms }),
      TRANSCRIPTION_TIMEOUT_MS,
    ),
  )

  // e. raw_input in DB speichern
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

/**
 * Loggt Extraktions-Metriken für Quality-Tracking.
 * Fire-and-forget — Fehler verhindern nicht die Extraktion.
 */
async function logExtractionMetrics(
  supabase: SupabaseClient<Database>,
  symptomEventId: string,
  accountId: string,
  totalFieldsRaw: number,
  totalFieldsValidated: number,
  fields: { fieldName: string; confidence: number }[],
): Promise<void> {
  const avgConfidence =
    fields.length > 0
      ? fields.reduce((sum, f) => sum + f.confidence, 0) / fields.length
      : 0

  const lowConfidenceCount = fields.filter((f) => f.confidence < 70).length

  const { error } = await supabase.from('extraction_metrics').insert({
    symptom_event_id: symptomEventId,
    account_id: accountId,
    fields_extracted: totalFieldsValidated,
    fields_dropped: totalFieldsRaw - totalFieldsValidated,
    avg_confidence: Math.round(avgConfidence * 100) / 100,
    low_confidence_count: lowConfidenceCount,
  })

  if (error) {
    // Nicht-kritisch: nur loggen
    console.error('[Metrics] Insert fehlgeschlagen:', error.message)
  }
}
