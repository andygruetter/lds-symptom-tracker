import { getSharingContext } from '@/lib/sharing/context'

/**
 * Arzt-Dashboard Layout — Stufe 2 des Zwei-Stufen-Token-Systems.
 *
 * Validierung via getSharingContext() (React.cache — 1 DB-Call pro Request):
 * 1. Middleware (proxy.ts): Cookie-Existenz (schnell, kein DB-Zugriff)
 * 2. getSharingContext(): Signatur-Validierung + DB-Check (Deep Validation)
 *
 * data-theme="doctor" wird vom Parent-Layout (share/layout.tsx) gesetzt.
 * Kein Tab-Bar, kein Login, kein Patienten-Navigation.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const linkData = await getSharingContext()

  // Zeitraum-Badge formatieren
  const dateFrom = new Date(linkData.dateFrom).toLocaleDateString('de-CH', {
    month: 'short',
    year: 'numeric',
  })
  const dateTo = new Date(linkData.dateTo).toLocaleDateString('de-CH', {
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sticky Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">Patientenauswertung</h1>
            <span className="rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">
              {dateFrom} – {dateTo}
            </span>
          </div>
          {/* PDF-Button Platzhalter für Epic 6 */}
          <button
            disabled
            className="cursor-not-allowed rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground opacity-50"
            title="PDF-Export (kommt in einer zukünftigen Version)"
          >
            PDF exportieren
          </button>
        </div>
      </header>

      {/* Responsive Container */}
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  )
}
