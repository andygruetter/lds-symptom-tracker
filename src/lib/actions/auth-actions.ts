'use server'

import { redirect } from 'next/navigation'

import { createServerClient } from '@/lib/db/client'
import type { AppError } from '@/types/common'

export async function signOut(): Promise<{ data: null; error: AppError }> {
  const supabase = await createServerClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    return {
      data: null,
      error: { error: 'Abmeldung fehlgeschlagen', code: 'SIGN_OUT_ERROR' },
    }
  }

  redirect('/auth/login')
  // redirect() wirft intern — dieser Code ist unerreichbar,
  // aber TypeScript benötigt einen Return-Wert
}
