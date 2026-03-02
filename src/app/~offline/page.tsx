'use client'

import { WifiOff } from 'lucide-react'

export default function OfflinePage() {
  return (
    <div
      data-theme="patient"
      className="flex min-h-screen flex-col items-center justify-center bg-background px-6"
    >
      <div className="w-full max-w-sm space-y-6 text-center">
        <WifiOff className="mx-auto size-12 text-muted-foreground" />
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-foreground">
            Keine Internetverbindung
          </h1>
          <p className="text-sm text-muted-foreground">
            Bitte überprüfe deine Verbindung und versuche es erneut.
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Erneut versuchen
        </button>
      </div>
    </div>
  )
}
