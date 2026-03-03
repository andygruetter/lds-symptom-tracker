import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? 'e2e-test@test.com'
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD ?? 'e2e-test-password-123'

export default async function globalSetup() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const testUser = existingUsers.users.find((u) => u.email === TEST_EMAIL)

  if (!testUser) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { disclaimer_accepted: true },
    })
    if (error) throw new Error(`Test-User erstellen fehlgeschlagen: ${error.message}`)

    await supabase.from('accounts').insert({
      id: data.user.id,
      disclaimer_accepted_at: new Date().toISOString(),
    })
  } else {
    await supabase.auth.admin.updateUserById(testUser.id, {
      user_metadata: { disclaimer_accepted: true },
    })
  }
}
