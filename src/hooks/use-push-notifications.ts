'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { subscribePush, unsubscribePush } from '@/lib/actions/push-actions'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

function getIsSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'PushManager' in window &&
    'serviceWorker' in navigator &&
    'Notification' in window
  )
}

export function usePushNotifications() {
  const isSupported = getIsSupported()
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    isSupported ? Notification.permission : 'default',
  )
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(isSupported)
  const initRef = useRef(false)

  // Init: Prüft bestehende Subscription
  useEffect(() => {
    if (!isSupported || initRef.current) return
    initRef.current = true

    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => {
        setIsSubscribed(subscription !== null)
      })
      .catch(() => {
        // Graceful degradation
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [isSupported])

  const subscribe = useCallback(async () => {
    if (!isSupported) return

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY
    if (!vapidKey) {
      console.error('[Push] NEXT_PUBLIC_VAPID_KEY nicht gesetzt')
      return
    }

    try {
      const result = await Notification.requestPermission()
      setPermission(result)

      if (result !== 'granted') return

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
      })

      const subscriptionJSON = subscription.toJSON()
      const serverResult = await subscribePush({
        endpoint: subscriptionJSON.endpoint,
        keys: {
          auth: subscriptionJSON.keys?.auth,
          p256dh: subscriptionJSON.keys?.p256dh,
        },
      })

      if (serverResult.error) {
        console.error('[Push] Server-Subscription fehlgeschlagen:', serverResult.error.error)
        return
      }

      setIsSubscribed(true)
    } catch (err) {
      console.error('[Push] Subscribe fehlgeschlagen:', err)
    }
  }, [isSupported])

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (!subscription) {
        setIsSubscribed(false)
        return
      }

      await subscription.unsubscribe()

      const serverResult = await unsubscribePush({ endpoint: subscription.endpoint })
      if (serverResult.error) {
        console.error('[Push] Server-Unsubscribe fehlgeschlagen:', serverResult.error.error)
      }

      setIsSubscribed(false)
    } catch (err) {
      console.error('[Push] Unsubscribe fehlgeschlagen:', err)
    }
  }, [isSupported])

  return {
    permission,
    isSubscribed,
    isSupported,
    isLoading,
    subscribe,
    unsubscribe,
  }
}
