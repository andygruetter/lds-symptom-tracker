'use client'

import { useCallback, useState } from 'react'

import { Bell } from 'lucide-react'

import { usePushNotifications } from '@/hooks/use-push-notifications'

const DISMISSED_KEY = 'push-opt-in-dismissed'

export function PushOptIn() {
  const { permission, isSubscribed, isSupported, isLoading, subscribe } =
    usePushNotifications()
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false
    return sessionStorage.getItem(DISMISSED_KEY) === 'true'
  })
  const [activating, setActivating] = useState(false)

  const handleDismiss = useCallback(() => {
    setDismissed(true)
    sessionStorage.setItem(DISMISSED_KEY, 'true')
  }, [])

  const handleActivate = useCallback(async () => {
    setActivating(true)
    try {
      await subscribe()
    } finally {
      setActivating(false)
    }
  }, [subscribe])

  // Nicht anzeigen wenn:
  // - Push nicht unterstützt
  // - Noch ladend
  // - Bereits subscribed
  // - Permission denied (Browser hat blockiert)
  // - User hat "Später" gewählt
  if (!isSupported || isLoading || isSubscribed || permission === 'denied' || dismissed) {
    return null
  }

  return (
    <div className="bg-muted/80 border-border flex items-center gap-3 border-b px-4 py-3">
      <Bell className="text-muted-foreground h-5 w-5 shrink-0" />
      <p className="text-muted-foreground flex-1 text-sm">
        Benachrichtigungen aktivieren, um über verarbeitete Symptome informiert
        zu werden?
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleDismiss}
          disabled={activating}
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          Später
        </button>
        <button
          onClick={handleActivate}
          disabled={activating}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-1 text-sm font-medium disabled:opacity-50"
        >
          {activating ? 'Wird aktiviert…' : 'Aktivieren'}
        </button>
      </div>
    </div>
  )
}
