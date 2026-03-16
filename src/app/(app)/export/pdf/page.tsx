'use client'

import { useState } from 'react'

import { FileDown, Printer } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'

type DateRangeOption = {
  value: string
  label: string
  months: number
}

const DATE_RANGE_OPTIONS: DateRangeOption[] = [
  { value: '1m', label: '1 Monat', months: 1 },
  { value: '3m', label: '3 Monate', months: 3 },
  { value: '6m', label: '6 Monate', months: 6 },
  { value: '12m', label: '12 Monate', months: 12 },
]

function computeDateParams(months: number): {
  startDate: string
  endDate: string
} {
  const today = new Date()
  const endDate = today.toISOString().slice(0, 10)
  const start = new Date(today)
  start.setMonth(start.getMonth() - months)
  const startDate = start.toISOString().slice(0, 10)
  return { startDate, endDate }
}

export default function PdfExportPage() {
  const [selectedRange, setSelectedRange] = useState('3m')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate(openForPrint = false) {
    setIsGenerating(true)
    setError(null)

    const option = DATE_RANGE_OPTIONS.find((o) => o.value === selectedRange)
    if (!option) {
      setIsGenerating(false)
      return
    }

    const { startDate, endDate } = computeDateParams(option.months)
    const url = `/api/report/pdf?startDate=${startDate}&endDate=${endDate}`

    try {
      const response = await fetch(url)

      if (!response.ok) {
        const body = (await response.json()) as {
          error?: { error?: string; code?: string }
        }
        throw new Error(body.error?.error ?? 'PDF-Generierung fehlgeschlagen')
      }

      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)

      if (openForPrint) {
        const win = window.open(blobUrl)
        if (win) {
          win.addEventListener('load', () => win.print())
        }
      } else {
        const a = document.createElement('a')
        a.href = blobUrl
        a.download = `symptom-report-${startDate}-${endDate}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }

      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unbekannter Fehler bei der PDF-Generierung',
      )
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-10 border-b border-border bg-background px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <h1 className="text-xl font-semibold">PDF-Export</h1>
      </div>

      <div className="mx-auto max-w-md px-4 py-8">
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold">
            Symptom-Report erstellen
          </h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Erstelle einen PDF-Report deiner Symptom-Daten für den Arztbesuch.
          </p>

          <div className="mb-6 space-y-2">
            <label className="text-sm font-medium" htmlFor="date-range">
              Zeitraum
            </label>
            <Select
              id="date-range"
              value={selectedRange}
              onChange={(e) => setSelectedRange(e.target.value)}
            >
              {DATE_RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          {error && (
            <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              className="flex-1"
              disabled={isGenerating}
              onClick={() => handleGenerate(false)}
            >
              <FileDown className="mr-2 h-4 w-4" />
              {isGenerating ? 'PDF wird erstellt...' : 'PDF herunterladen'}
            </Button>
            <Button
              variant="outline"
              disabled={isGenerating}
              onClick={() => handleGenerate(true)}
              title="PDF drucken"
            >
              <Printer className="h-4 w-4" />
            </Button>
          </div>

          {isGenerating && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Report wird generiert, bitte warten... (max. 20 Sekunden)
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
