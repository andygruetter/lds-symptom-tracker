'use server'

import { revalidatePath } from 'next/cache'

import { createServerClient } from '@/lib/db/client'
import type { ActionResult } from '@/types/common'

export async function acceptDisclaimer(): Promise<
  ActionResult<{ acceptedAt: string }>
> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      data: null,
      error: { error: 'Nicht authentifiziert', code: 'AUTH_REQUIRED' },
    }
  }

  const now = new Date().toISOString()

  // Source of Truth: accounts Tabelle
  const { error: dbError } = await supabase
    .from('accounts')
    .update({ disclaimer_accepted_at: now })
    .eq('id', user.id)

  if (dbError) {
    return {
      data: null,
      error: { error: 'Speichern fehlgeschlagen', code: 'DB_ERROR' },
    }
  }

  // Fast-Check: user_metadata für Middleware
  const { error: metaError } = await supabase.auth.updateUser({
    data: { disclaimer_accepted: true },
  })

  if (metaError) {
    // DB ist aktualisiert, metadata fehlgeschlagen — loggen aber nicht failen
    console.error('user_metadata update failed:', metaError.message)
  }

  revalidatePath('/', 'layout')

  return { data: { acceptedAt: now }, error: null }
}
