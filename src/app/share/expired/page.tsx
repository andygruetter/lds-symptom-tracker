/**
 * Fehlerseite für abgelaufene oder ungültige Sharing-Links.
 *
 * Bewusst minimalistisch: kein Retry, kein Login, kein komplexes UI.
 * Mental Model: "Wie ein abgelaufener Google-Docs-Link"
 * Doctor-Theme via parent layout.
 */
export default function ShareExpiredPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <p className="mb-8 text-sm font-medium tracking-wide text-muted-foreground">
          Symptomchat
        </p>
        <h1 className="mb-3 text-2xl font-semibold">
          Dieser Link ist abgelaufen
        </h1>
        <p className="text-muted-foreground">
          Die Zugriffsdauer für diesen Sharing-Link ist abgelaufen. Bitte wenden
          Sie sich an Ihren Patienten für einen neuen Sharing-Link.
        </p>
      </div>
    </div>
  )
}
