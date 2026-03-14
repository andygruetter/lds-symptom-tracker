import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? 'e2e-test@test.com'
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD ?? 'e2e-test-password-123'

export default async function globalSetup() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  // Service role key (HS256) works for REST/DB API (not auth.admin.*)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  // Auth client (anon key) for sign-in/sign-up
  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // DB client (service role) for bypassing RLS on accounts table
  const dbClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Try to sign in first to check if user already exists
  const { data: signInData, error: signInError } =
    await authClient.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    })

  let userId: string

  if (signInError) {
    // User doesn't exist → create via signUp
    // enable_confirmations = false in config.toml, so email is auto-confirmed locally
    const { data, error } = await authClient.auth.signUp({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      options: { data: { disclaimer_accepted: true } },
    })
    if (error)
      throw new Error(`Test-User erstellen fehlgeschlagen: ${error.message}`)
    userId = data.user!.id
  } else {
    userId = signInData.user.id
  }

  // Ensure accounts row exists (upsert to be idempotent)
  await dbClient.from('accounts').upsert(
    {
      id: userId,
      disclaimer_accepted_at: new Date().toISOString(),
    },
    { onConflict: 'id', ignoreDuplicates: true },
  )
}
