'use client'

/**
 * DEV-ONLY: Email/Password Login für lokales Testen.
 * Nur sichtbar wenn BYPASS_AUTH=true (Middleware lässt durch).
 *
 * URL: /auth/dev-login
 * TODO: Vor Deployment entfernen!
 */

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { createBrowserClient } from '@/lib/db/client'

export default function DevLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('test@test.com')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    const supabase = createBrowserClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setIsLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-xl font-semibold text-foreground">
            Dev Login
          </h1>
          <p className="text-xs text-muted-foreground">
            Nur für lokales Testen — vor Deployment entfernen!
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-lg border bg-card px-4 py-3 text-sm"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Passwort"
            className="w-full rounded-lg border bg-card px-4 py-3 text-sm"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {isLoading ? 'Anmelden...' : 'Anmelden'}
          </button>
        </form>

        {error && (
          <p className="text-center text-sm text-destructive">{error}</p>
        )}
      </div>
    </div>
  )
}
