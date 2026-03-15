import { Suspense } from 'react'

import { AISummaryCard } from '@/components/sharing/ai-summary-card'
import { AISummarySkeleton } from '@/components/sharing/ai-summary-skeleton'
import { DoctorRanking } from '@/components/sharing/doctor-ranking'
import { DoctorTimeline } from '@/components/sharing/doctor-timeline'
import { TimelineSkeleton } from '@/components/sharing/timeline-skeleton'
import { trackSharingAccessFromPage } from '@/lib/db/audit'
import { getSharedFeedEvents, getSharedSymptomRanking } from '@/lib/db/sharing'
import { getSharingContext } from '@/lib/sharing/context'

/**
 * Arzt-Dashboard Page mit KI-Zusammenfassung (6.1), Timeline (6.2) und Symptom-Ranking (6.3).
 *
 * Nutzt React Streaming (Suspense) für optimales Loading.
 */
export default async function DashboardPage() {
  const linkData = await getSharingContext()

  // Audit-Log: dashboard_view loggen (best-effort, blockiert Zugriff nicht)
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
      {/* KI-Zusammenfassung — volle Breite, Suspense für Loading */}
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

      {/* Timeline — volle Breite (Story 6.2) */}
      <div className="md:col-span-2 xl:col-span-3">
        <Suspense fallback={<TimelineSkeleton />}>
          <DoctorTimeline
            events={events}
            dateFrom={linkData.dateFrom}
            dateTo={linkData.dateTo}
          />
        </Suspense>
      </div>

      {/* Symptom-Ranking (Story 6.3) */}
      <DoctorRanking ranking={ranking} />
    </div>
  )
}
