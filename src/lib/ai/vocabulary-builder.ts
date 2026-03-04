import type { SupabaseClient } from '@supabase/supabase-js'

import { upsertVocabularyEntry } from '@/lib/db/vocabulary'
import type { Database } from '@/types/database'

export async function updateVocabularyFromCorrection(
  supabase: SupabaseClient<Database>,
  accountId: string,
  correction: {
    fieldName: string
    originalValue: string
    correctedValue: string
  },
): Promise<void> {
  // Nur wenn tatsächlich korrigiert wurde und beide Werte nicht leer sind
  if (
    correction.originalValue === correction.correctedValue ||
    !correction.originalValue.trim() ||
    !correction.correctedValue.trim()
  ) {
    return
  }

  await upsertVocabularyEntry(
    supabase,
    accountId,
    correction.originalValue,
    correction.correctedValue,
    correction.fieldName,
  )
}
