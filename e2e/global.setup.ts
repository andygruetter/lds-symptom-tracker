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

  // Versuche Login — wenn erfolgreich, existiert der User bereits
  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    })

  if (signInData?.user) {
    // User existiert — disclaimer_accepted sicherstellen
    await supabase.auth.updateUser({
      data: { disclaimer_accepted: true },
    })
    return
  }

  // User existiert nicht — neu anlegen via signUp
  if (signInError) {
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp(
      {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        options: { data: { disclaimer_accepted: true } },
      },
    )

    if (signUpError) {
      throw new Error(
        `Test-User erstellen fehlgeschlagen: ${signUpError.message}`,
      )
    }

    if (signUpData.user) {
      // accounts-Zeile anlegen (falls kein DB-Trigger vorhanden)
      await supabase.from('accounts').upsert({
        id: signUpData.user.id,
        disclaimer_accepted_at: new Date().toISOString(),
      })
    }
  }
}
