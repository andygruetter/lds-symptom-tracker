import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database'
import type { SymptomEvent } from '@/types/symptom'

import { extractSymptomData } from './extract'

const PIPELINE_TIMEOUT_MS = 30_000 // 30 Sekunden für Claude API + Retries

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

  if (event.status !== 'pending') {
    return // Bereits verarbeitet
  }

  try {
    await withTimeout(async () => {
      // 2. Claude Extract mit Retry
      const result = await withRetry(() =>
        extractSymptomData(event.raw_input),
      )

      // 3. Insert extracted_data rows
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

      // 4. Update symptom_event status + event_type
      const { error: updateError } = await supabase
        .from('symptom_events')
        .update({
          status: 'extracted',
          event_type: result.eventType,
        })
        .eq('id', symptomEventId)

      if (updateError) {
        throw new Error(
          `Failed to update event status: ${updateError.message}`,
        )
      }
    }, PIPELINE_TIMEOUT_MS)
  } catch (error) {
    // 5. Fehler: Status auf extraction_failed setzen
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

    throw error // Re-throw für Logging in API Route
  }
}
