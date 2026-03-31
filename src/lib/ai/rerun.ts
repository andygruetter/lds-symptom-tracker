import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database'

export type RerunMode = 'extract' | 'transcribe'

/**
 * Bereitet einen Re-Run vor: Status-Reset + extracted_data-Cleanup.
 * Wird von der API-Route aufgerufen bevor runExtractionPipeline().
 */
export async function prepareRerun(
  supabase: SupabaseClient<Database>,
  eventId: string,
  mode: RerunMode,
): Promise<void> {
  // 1. Event laden und validieren
  const { data: event, error } = await supabase
    .from('symptom_events')
    .select('id, status, event_type, audio_url')
    .eq('id', eventId)
    .single()

  if (error || !event) {
    throw new Error(`Event nicht gefunden: ${eventId}`)
  }

  if (event.status === 'pending') {
    throw new Error('Event ist bereits in Verarbeitung')
  }

  // 2. Validierung für mode=transcribe
  if (mode === 'transcribe') {
    if (event.event_type !== 'voice') {
      throw new Error('Transkription nur für Voice-Events möglich')
    }
    if (!event.audio_url) {
      throw new Error(
        'Voice-Event ohne audio_url — kein Re-Transcription möglich',
      )
    }
  }

  // 3. extracted_data löschen (Clean Slate)
  const { error: deleteError } = await supabase
    .from('extracted_data')
    .delete()
    .eq('symptom_event_id', eventId)

  if (deleteError) {
    throw new Error(
      `extracted_data-Cleanup fehlgeschlagen: ${deleteError.message}`,
    )
  }

  // 4. Status-Reset
  const update =
    mode === 'transcribe'
      ? { status: 'pending' as string, raw_input: '' }
      : { status: 'transcribed' as string }

  const { error: updateError } = await supabase
    .from('symptom_events')
    .update(update)
    .eq('id', eventId)

  if (updateError) {
    throw new Error(`Status-Reset fehlgeschlagen: ${updateError.message}`)
  }
}
