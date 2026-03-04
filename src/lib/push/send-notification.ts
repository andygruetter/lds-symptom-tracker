import webpush from 'web-push'

import { createServiceClient } from '@/lib/db/client'

export interface PushPayload {
  title: string
  body: string
  url?: string
}

let vapidConfigured = false

function ensureVapidConfigured(): boolean {
  if (vapidConfigured) return true

  const publicKey = process.env.NEXT_PUBLIC_VAPID_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY

  if (!publicKey || !privateKey) return false

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? 'mailto:app@example.com',
    publicKey,
    privateKey,
  )
  vapidConfigured = true
  return true
}

export async function sendPushNotification(
  accountId: string,
  payload: PushPayload,
): Promise<void> {
  if (!ensureVapidConfigured()) return

  const supabase = createServiceClient()

  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('account_id', accountId)

  if (error || !subscriptions || subscriptions.length === 0) {
    return // Keine Subscriptions — kein Push
  }

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              auth: sub.keys_auth,
              p256dh: sub.keys_p256dh,
            },
          },
          JSON.stringify(payload),
        )
      } catch (err: unknown) {
        // 410 Gone → Subscription abgelaufen/revoked → aus DB entfernen
        if (err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode: number }).statusCode === 410) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id)
          return
        }
        throw err
      }
    }),
  )

  // Fehler loggen, aber nicht re-thrown (Fire-and-Forget Pattern)
  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('[Push] Notification fehlgeschlagen:', result.reason)
    }
  }
}
