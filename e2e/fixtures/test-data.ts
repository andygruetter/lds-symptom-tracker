import { createClient } from '@supabase/supabase-js'

const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? 'e2e-test@test.com'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

interface SymptomEventInsert {
  raw_input?: string
  status?: string
  event_type?: string
  ended_at?: string | null
  created_at?: string
}

interface ExtractedField {
  field_name: string
  value: string
  confidence: number
  confirmed?: boolean
}

export async function getTestUserId(): Promise<string> {
  const { data } = await supabase.auth.admin.listUsers()
  const user = data.users.find((u) => u.email === TEST_EMAIL)
  if (!user) throw new Error(`Test-User ${TEST_EMAIL} nicht gefunden`)
  return user.id
}

export async function createTestSymptomEvent(
  accountId: string,
  overrides?: SymptomEventInsert,
) {
  const { data, error } = await supabase
    .from('symptom_events')
    .insert({
      account_id: accountId,
      raw_input: overrides?.raw_input ?? 'Testsymptom Kopfschmerzen',
      status: overrides?.status ?? 'pending',
      event_type: overrides?.event_type ?? 'symptom',
      ended_at: overrides?.ended_at ?? null,
      ...(overrides?.created_at ? { created_at: overrides.created_at } : {}),
    })
    .select()
    .single()

  if (error) throw new Error(`Event erstellen fehlgeschlagen: ${error.message}`)
  return data
}

export async function createTestExtractedData(
  symptomEventId: string,
  fields: ExtractedField[],
) {
  const rows = fields.map((f) => ({
    symptom_event_id: symptomEventId,
    field_name: f.field_name,
    value: f.value,
    confidence: f.confidence,
    confirmed: f.confirmed ?? false,
  }))

  const { data, error } = await supabase
    .from('extracted_data')
    .insert(rows)
    .select()

  if (error)
    throw new Error(`Extracted Data erstellen fehlgeschlagen: ${error.message}`)
  return data
}

export async function cleanupTestData(accountId: string) {
  const { data: events } = await supabase
    .from('symptom_events')
    .select('id')
    .eq('account_id', accountId)

  if (events && events.length > 0) {
    const ids = events.map((e) => e.id)
    await supabase.from('corrections').delete().in('symptom_event_id', ids)
    await supabase.from('extracted_data').delete().in('symptom_event_id', ids)
  }
  await supabase.from('symptom_events').delete().eq('account_id', accountId)
}
