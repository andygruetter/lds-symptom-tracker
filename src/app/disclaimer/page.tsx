'use client'

import { useState } from 'react'

import { useRouter } from 'next/navigation'

import { DisclaimerContent } from '@/components/disclaimer/disclaimer-content'
import { acceptDisclaimer } from '@/lib/actions/disclaimer-actions'
import { DISCLAIMER_TITLE } from '@/lib/constants/disclaimer'

export default function DisclaimerPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const router = useRouter()

  const handleAccept = async () => {
    setIsSubmitting(true)
    setErrorMessage(null)

    const result = await acceptDisclaimer()

    if (result.error) {
      setErrorMessage(result.error.error)
      setIsSubmitting(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div
      data-theme="patient"
      className="flex min-h-dvh flex-col bg-background px-4 py-8"
    >
      <div className="mx-auto w-full max-w-lg flex-1">
        <h1 className="mb-6 text-2xl font-semibold text-foreground">
          {DISCLAIMER_TITLE}
        </h1>

        <DisclaimerContent headingLevel="h2" />
      </div>

      <div className="mx-auto mt-6 w-full max-w-lg safe-area-bottom">
        {errorMessage && (
          <p className="mb-3 text-center text-sm text-destructive">
            {errorMessage}
          </p>
        )}
        <button
          onClick={handleAccept}
          disabled={isSubmitting}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting
            ? 'Wird gespeichert...'
            : 'Ich habe den Hinweis gelesen und verstanden'}
        </button>
      </div>
    </div>
  )
}
