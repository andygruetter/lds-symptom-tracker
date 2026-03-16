import { Sparkles } from 'lucide-react'

import { generateSummary } from '@/lib/ai/summarize'
import { getSharedEventsForSummary } from '@/lib/db/sharing'
import {
  checkSummaryFreshness,
  getCachedSummary,
  saveSummary,
} from '@/lib/db/summaries'

interface AISummaryCardProps {
  sharingLinkId: string
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

/** Generiert eine neue Summary, cached sie, und gibt Text + Event-Count zurück */
async function generateAndCache(
  sharingLinkId: string,
  accountId: string,
  dateFrom: string,
  dateTo: string,
): Promise<{ summaryText: string; eventCount: number }> {
  const events = await getSharedEventsForSummary(accountId, dateFrom, dateTo)
  const summaryText = await generateSummary(events)
  await saveSummary(sharingLinkId, summaryText, events.length)
  return { summaryText, eventCount: events.length }
}

/**
 * Async Server Component für die KI-generierte Arzt-Zusammenfassung.
 * Verwendet React Streaming (Suspense Boundary) für optimales Loading-Verhalten.
 *
 * Caching-Logik:
 * 1. Gecachte Summary vorhanden + frisch → direkt anzeigen
 * 2. Gecachte Summary vorhanden aber stale (neue Events) → neu generieren
 * 3. Keine Summary → Events laden, generieren, cachen
 *
 * Bei Fehler: Fallback mit Event-Count anzeigen, Rest des Dashboards bleibt funktionsfähig.
 */
export async function AISummaryCard({
  sharingLinkId,
  accountId,
  dateFrom,
  dateTo,
}: AISummaryCardProps) {
  let summaryText: string
  let eventCount: number

  try {
    const cached = await getCachedSummary(sharingLinkId)

    if (cached) {
      const isFresh = await checkSummaryFreshness(
        sharingLinkId,
        accountId,
        dateFrom,
        dateTo,
      )

      if (isFresh) {
        summaryText = cached.summaryText
        eventCount = cached.eventCount
      } else {
        const result = await generateAndCache(
          sharingLinkId,
          accountId,
          dateFrom,
          dateTo,
        )
        summaryText = result.summaryText
        eventCount = result.eventCount
      }
    } else {
      const result = await generateAndCache(
        sharingLinkId,
        accountId,
        dateFrom,
        dateTo,
      )
      summaryText = result.summaryText
      eventCount = result.eventCount
    }
  } catch (err) {
    console.error('[AISummaryCard] Fehler bei Summary-Generierung:', err)

    // Fallback: Event-Count + Fehlermeldung
    const events = await getSharedEventsForSummary(
      accountId,
      dateFrom,
      dateTo,
    ).catch(() => [])

    return (
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">KI-Zusammenfassung</h2>
        </div>
        <div className="rounded-md bg-muted/50 p-3">
          <p className="text-sm font-medium">
            {events.length} Events im Zeitraum
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Zusammenfassung konnte nicht generiert werden.
          </p>
        </div>
      </div>
    )
  }

  // Summary als Absätze rendern (mit **fett**-Markdown-Support)
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
          {eventCount} Events
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
