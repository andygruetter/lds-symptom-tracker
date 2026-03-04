import type { SupabaseClient } from '@supabase/supabase-js'

import type { VocabularyEntry } from '@/types/ai'
import type { Database } from '@/types/database'

export async function getVocabulary(
  supabase: SupabaseClient<Database>,
  accountId: string,
): Promise<VocabularyEntry[]> {
  const { data, error } = await supabase
    .from('patient_vocabulary')
    .select('patient_term, mapped_term, field_name, usage_count')
    .eq('account_id', accountId)
    .order('usage_count', { ascending: false })
    .limit(200)

  if (error || !data) {
    if (error) {
      console.error('[Vocabulary] Failed to load vocabulary:', error.message)
    }
    return []
  }

  return data.map((row) => ({
    patientTerm: row.patient_term,
    mappedTerm: row.mapped_term,
    fieldName: row.field_name,
    usageCount: row.usage_count,
  }))
}

export async function upsertVocabularyEntry(
  supabase: SupabaseClient<Database>,
  accountId: string,
  patientTerm: string,
  mappedTerm: string,
  fieldName: string,
): Promise<void> {
  const { error } = await supabase.rpc('upsert_vocabulary_entry', {
    p_account_id: accountId,
    p_patient_term: patientTerm,
    p_mapped_term: mappedTerm,
    p_field_name: fieldName,
  })

  if (error) {
    console.error('[Vocabulary] Failed to upsert vocabulary entry:', error.message)
    throw error
  }
}
