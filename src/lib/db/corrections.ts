import type { SupabaseClient } from '@supabase/supabase-js'

import type { Correction } from '@/types/ai'
import type { Database } from '@/types/database'

export async function getRecentCorrections(
  supabase: SupabaseClient<Database>,
  accountId: string,
  limit = 50,
): Promise<Correction[]> {
  const { data, error } = await supabase
    .from('corrections')
    .select('field_name, original_value, corrected_value, created_at')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) {
    return []
  }

  return data.map((row) => ({
    fieldName: row.field_name,
    originalValue: row.original_value,
    correctedValue: row.corrected_value,
  }))
}
