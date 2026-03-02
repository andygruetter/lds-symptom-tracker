'use client'

import { useState } from 'react'

import { createBrowserClient } from '@/lib/db/client'

export function AppleSignInButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSignIn = async () => {
    setIsLoading(true)
    setErrorMessage(null)
    const supabase = createBrowserClient()
    const isStandalone = window.matchMedia(
      '(display-mode: standalone)',
    ).matches

    if (isStandalone) {
      // PWA Standalone Mode: window.location.href statt Supabase-Default,
      // damit iOS nicht Safari öffnet sondern in der PWA bleibt
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          skipBrowserRedirect: true,
        },
      })

      if (error) {
        setErrorMessage(
          'Verbindung fehlgeschlagen. Bitte versuche es erneut.',
        )
        setIsLoading(false)
        return
      }

      if (data?.url) {
        window.location.href = data.url
      } else {
        setIsLoading(false)
      }
    } else {
      // Normaler Browser-Flow
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        setErrorMessage(
          'Verbindung fehlgeschlagen. Bitte versuche es erneut.',
        )
        setIsLoading(false)
      }
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleSignIn}
        disabled={isLoading}
        className="flex min-h-11 w-full items-center justify-center gap-3 rounded-xl bg-foreground px-6 py-3 text-base font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        <svg
          className="size-5"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
        </svg>
        {isLoading ? 'Wird verbunden...' : 'Mit Apple ID anmelden'}
      </button>
      {errorMessage && (
        <p className="text-center text-sm text-destructive">{errorMessage}</p>
      )}
    </div>
  )
}
