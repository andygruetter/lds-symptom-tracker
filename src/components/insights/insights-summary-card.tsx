import { Sparkles } from 'lucide-react'

import { generateSummary } from '@/lib/ai/summarize'
import { getSharedEventsForSummary } from '@/lib/db/sharing'

interface InsightsSummaryCardProps {
  accountId: string
  dateFrom: string
  dateTo: string
}

/** Rendert Absatztext mit **fett**-Markdown-Unterstützung */
function renderParagraph(text: string) {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part,
  )
}

/**
 * Async Server Component für die KI-generierte Zusammenfassung in der persönlichen Auswertung.
 * Generiert bei jedem Aufruf eine frische Zusammenfassung (kein Caching, da persönliche Ansicht).
 * Verwendet React Streaming (Suspense Boundary) für optimales Loading-Verhalten.
 */
export async function InsightsSummaryCard({
  accountId,
  dateFrom,
  dateTo,
}: InsightsSummaryCardProps) {
  let summaryText: string | null = null
  let eventCount = 0
  let hasError = false

  try {
    const events = await getSharedEventsForSummary(accountId, dateFrom, dateTo)
    eventCount = events.length
    if (eventCount > 0) {
      summaryText = await generateSummary(events)
    }
  } catch (err) {
    console.error('[InsightsSummaryCard] Fehler bei Summary-Generierung:', err)
    hasError = true
  }

  if (hasError) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">KI-Zusammenfassung</h2>
        </div>
        <div className="rounded-md bg-muted/50 p-3">
          <p className="text-sm text-muted-foreground">
            Zusammenfassung konnte nicht generiert werden.
          </p>
        </div>
      </div>
    )
  }

  if (eventCount === 0 || !summaryText) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">KI-Zusammenfassung</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Keine Events im Zeitraum — bitte zuerst Symptome oder Medikamente
          erfassen.
        </p>
      </div>
    )
  }

  const paragraphs = summaryText
    .split('\n\n')
    .map((p) => p.trim())
    .filter(Boolean)

  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">KI-Zusammenfassung</h2>
        <span className="ml-auto text-xs text-muted-foreground">
          {eventCount} Events · 3 Monate
        </span>
      </div>
      <div className="prose prose-sm max-w-none space-y-3 text-card-foreground">
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="text-sm leading-relaxed">
            {renderParagraph(paragraph)}
          </p>
        ))}
      </div>
    </div>
  )
}
