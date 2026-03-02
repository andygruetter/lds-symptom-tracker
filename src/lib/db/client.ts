import { createBrowserClient as createBrowser } from '@supabase/ssr'
import { createServerClient as createServer } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database'

/**
 * Browser Client — für Client Components (Realtime Subscriptions, Client-Side-Queries).
 * Nutzt Anon Key + RLS.
 */
export function createBrowserClient() {
  return createBrowser<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

/**
 * Server Client — für Server Components + Server Actions (Cookie-based).
 * Nutzt User Session + RLS. cookies() ist async in Next.js 15+.
 */
export async function createServerClient() {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()

  return createServer<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // setAll aus Server Component aufgerufen — ignorieren,
            // Middleware übernimmt Token-Refresh
          }
        },
      },
    },
  )
}

/**
 * Service Client — für API Routes (KI-Pipeline, Webhooks, Admin-Ops).
 * ACHTUNG: Bypassed RLS! Nur in src/app/api/ verwenden!
 */
export function createServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}
