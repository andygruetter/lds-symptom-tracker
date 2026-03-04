'use server'

import { z } from 'zod'

import { createServerClient } from '@/lib/db/client'
import type { ActionResult } from '@/types/common'

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    auth: z.string().min(1),
    p256dh: z.string().min(1),
  }),
})

const unsubscribeSchema = z.object({
  endpoint: z.string().url(),
})

export async function subscribePush(
  input: unknown,
): Promise<ActionResult<void>> {
  const parsed = subscribeSchema.safeParse(input)
  if (!parsed.success) {
    return {
      data: null,
      error: { error: 'Ungültige Subscription-Daten', code: 'VALIDATION_ERROR' },
    }
  }

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

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        account_id: user.id,
        endpoint: parsed.data.endpoint,
        keys_auth: parsed.data.keys.auth,
        keys_p256dh: parsed.data.keys.p256dh,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'account_id,endpoint' },
    )

  if (error) {
    return {
      data: null,
      error: { error: 'Subscription speichern fehlgeschlagen', code: 'DB_ERROR' },
    }
  }

  return { data: undefined, error: null }
}

export async function unsubscribePush(
  input: unknown,
): Promise<ActionResult<void>> {
  const parsed = unsubscribeSchema.safeParse(input)
  if (!parsed.success) {
    return {
      data: null,
      error: { error: 'Ungültiger Endpoint', code: 'VALIDATION_ERROR' },
    }
  }

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

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('account_id', user.id)
    .eq('endpoint', parsed.data.endpoint)

  if (error) {
    return {
      data: null,
      error: { error: 'Subscription löschen fehlgeschlagen', code: 'DB_ERROR' },
    }
  }

  return { data: undefined, error: null }
}
