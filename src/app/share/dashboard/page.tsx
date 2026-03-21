import { Suspense } from 'react'

import Link from 'next/link'

import { AISummaryCard } from '@/components/sharing/ai-summary-card'
import { AISummarySkeleton } from '@/components/sharing/ai-summary-skeleton'
import { DoctorRanking } from '@/components/sharing/doctor-ranking'
import { DoctorTimeline } from '@/components/sharing/doctor-timeline'
import { PdfDownloadButton } from '@/components/sharing/pdf-download-button'
import { trackSharingAccessFromPage } from '@/lib/db/audit'
import { getSharedFeedEvents, getSharedSymptomRanking } from '@/lib/db/sharing'
import { getSharingContext } from '@/lib/sharing/context'

function formatEventDate(isoString: string): string {
  return new Intl.DateTimeFormat('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoString))
}

/**
 * Arzt-Dashboard Page mit KI-Zusammenfassung (6.1), Timeline (6.2), Symptom-Ranking (6.3),
 * Event-Liste als Drill-Down Entry-Point (6.4) und PDF-Export (6.5).
 */
export default async function DashboardPage() {
  const linkData = await getSharingContext()

  void trackSharingAccessFromPage(
    { id: linkData.id, accountId: linkData.accountId },
    'dashboard_view',
  )

  const [events, ranking] = await Promise.all([
    getSharedFeedEvents(linkData.accountId, linkData.dateFrom, linkData.dateTo),
    getSharedSymptomRanking(
      linkData.accountId,
      linkData.dateFrom,
      linkData.dateTo,
    ),
  ])

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {/* Header mit PDF-Download (Story 6.5) */}
      <div className="md:col-span-2 xl:col-span-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">
          Symptom-Report
        </h1>
        <PdfDownloadButton
          dateFrom={linkData.dateFrom}
          dateTo={linkData.dateTo}
          variant="doctor"
        />
      </div>

      {/* KI-Zusammenfassung */}
      <div className="md:col-span-2 xl:col-span-3">
        <Suspense fallback={<AISummarySkeleton />}>
          <AISummaryCard
            sharingLinkId={linkData.id}
            accountId={linkData.accountId}
            dateFrom={linkData.dateFrom}
            dateTo={linkData.dateTo}
          />
        </Suspense>
      </div>

      {/* Timeline (Story 6.2) — Daten bereits via await geladen, kein Suspense nötig */}
      <div className="md:col-span-2 xl:col-span-3">
        <DoctorTimeline
          events={events}
          dateFrom={linkData.dateFrom}
          dateTo={linkData.dateTo}
        />
      </div>

      {/* Symptom-Ranking (Story 6.3) */}
      <DoctorRanking ranking={ranking} />

      {/* Event-Liste — Drill-Down Entry-Point (Story 6.4) */}
      <div className="md:col-span-2 xl:col-span-2">
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-1 text-lg font-semibold">Events</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            {events.length} Event{events.length !== 1 ? 's' : ''} im gewählten
            Zeitraum — für Details tippen
          </p>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Keine Events im Zeitraum.
            </p>
          ) : (
            <div className="space-y-2">
              {events.map((event) => (
                <Link
                  key={event.id}
                  href={`/share/dashboard/event/${event.id}`}
                  className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50 active:bg-muted"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-foreground">
                      {event.symptoms[0]?.displayName ??
                        (event.eventType === 'medication'
                          ? 'Unbekannt'
                          : 'Symptom')}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatEventDate(event.occurredAt)}
                    </span>
                  </div>
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                    style={{
                      backgroundColor:
                        event.eventType === 'medication'
                          ? '#4A7FA5'
                          : '#C06A3C',
                    }}
                  >
                    {event.eventType === 'medication'
                      ? 'Medikament'
                      : 'Symptom'}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
