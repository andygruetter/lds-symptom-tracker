export function EmptyFeed() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 text-4xl" aria-hidden="true">
        ☀️
      </div>
      <p className="text-base font-medium text-foreground">
        Noch keine Einträge.
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Keine Eingabe = ein guter Tag.
      </p>
      <p className="mt-4 text-sm text-muted-foreground">
        Deine Auswertung wächst mit jedem Eintrag.
      </p>
    </div>
  )
}
