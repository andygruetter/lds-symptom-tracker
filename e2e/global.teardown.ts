import { createClient } from '@supabase/supabase-js'

const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? 'e2e-test@test.com'

export default async function globalTeardown() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const { data } = await supabase.auth.admin.listUsers()
  const testUser = data.users.find((u) => u.email === TEST_EMAIL)

  if (testUser) {
    const { data: events } = await supabase
      .from('symptom_events')
      .select('id')
      .eq('account_id', testUser.id)

    if (events && events.length > 0) {
      const ids = events.map((e) => e.id)
      await supabase.from('corrections').delete().in('symptom_event_id', ids)
      await supabase.from('extracted_data').delete().in('symptom_event_id', ids)
    }
    await supabase.from('symptom_events').delete().eq('account_id', testUser.id)
  }
}
