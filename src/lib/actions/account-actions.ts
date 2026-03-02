'use server'

import { redirect } from 'next/navigation'

import { createServerClient } from '@/lib/db/client'
import type { ActionResult } from '@/types/common'

export async function deleteAccount(): Promise<ActionResult<null>> {
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

  // Soft-Delete: deleted_at setzen (RLS macht Account sofort unsichtbar)
  const { error: dbError } = await supabase
    .from('accounts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', user.id)

  if (dbError) {
    return {
      data: null,
      error: { error: 'Löschung fehlgeschlagen', code: 'DELETE_FAILED' },
    }
  }

  // Session beenden
  await supabase.auth.signOut()

  // Redirect zu Login (throws intern — normales Verhalten)
  redirect('/auth/login')
}
