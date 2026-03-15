'use client'

import { useState } from 'react'

import { FileDown } from 'lucide-react'

import { Button } from '@/components/ui/button'

type PdfDownloadButtonProps = {
  dateFrom: string
  dateTo: string
  /** Optional custom variant/label — defaults to doctor theme */
  variant?: 'doctor' | 'patient'
}

export function PdfDownloadButton({
  dateFrom,
  dateTo,
  variant = 'doctor',
}: PdfDownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDownload() {
    setIsGenerating(true)
    setError(null)

    try {
      // For doctor access, no date params needed (taken from cookie session)
      // For patient access, pass the date params
      const url =
        variant === 'doctor'
          ? '/api/report/pdf'
          : `/api/report/pdf?startDate=${dateFrom}&endDate=${dateTo}`

      const response = await fetch(url)

      if (!response.ok) {
        const body = (await response.json()) as {
          error?: { error?: string }
        }
        throw new Error(body.error?.error ?? 'PDF-Generierung fehlgeschlagen')
      }

      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `symptom-report-${dateFrom}-${dateTo}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'PDF-Generierung fehlgeschlagen',
      )
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div>
      <Button
        onClick={handleDownload}
        disabled={isGenerating}
        className={
          variant === 'doctor'
            ? 'bg-primary text-primary-foreground rounded-lg hover:bg-primary/90'
            : undefined
        }
        size="sm"
      >
        <FileDown className="mr-2 h-4 w-4" />
        {isGenerating ? 'Wird erstellt...' : 'PDF-Report'}
      </Button>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  )
}
