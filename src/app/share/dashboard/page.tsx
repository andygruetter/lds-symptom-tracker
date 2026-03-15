import { trackSharingAccessFromPage } from '@/lib/db/audit'
import { getSharedSymptomEvents } from '@/lib/db/sharing'
import { getSharingContext } from '@/lib/sharing/context'

/**
 * Arzt-Dashboard Page — Shell mit Platzhalter-Cards.
 *
 * Echte Inhalte kommen in Epic 6:
 * - 6.1 KI-generierte Zusammenfassung
 * - 6.2 Timeline mit Events
 * - 6.3 Symptom-Ranking
 * - 6.4 Drill-Down mit Audio/Fotos
 *
 * Nutzt getSharingContext() (React.cache — kein doppelter DB-Call mit Layout).
 * Loggt dashboard_view ins Audit-Log (Story 5.5, AC#1).
 */
export default async function DashboardPage() {
  const linkData = await getSharingContext()

  // Audit-Log: dashboard_view loggen (best-effort, blockiert Zugriff nicht)
  void trackSharingAccessFromPage(
    { id: linkData.id, accountId: linkData.accountId },
    'dashboard_view',
  )

  const events = await getSharedSymptomEvents(
    linkData.accountId,
    linkData.dateFrom,
    linkData.dateTo,
  )

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {/* KI-Zusammenfassung Platzhalter */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">KI-Zusammenfassung</h2>
        <p className="text-sm text-muted-foreground">
          Kommt in einer zukünftigen Version.
        </p>
        <div className="mt-4 rounded-md bg-muted/50 p-3">
          <p className="text-sm font-medium">
            {events.length} Events im Zeitraum
          </p>
        </div>
      </div>

      {/* Timeline Platzhalter */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Timeline</h2>
        <p className="text-sm text-muted-foreground">
          Kommt in einer zukünftigen Version.
        </p>
      </div>

      {/* Symptom-Ranking Platzhalter */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Symptom-Ranking</h2>
        <p className="text-sm text-muted-foreground">
          Kommt in einer zukünftigen Version.
        </p>
      </div>
    </div>
  )
}
