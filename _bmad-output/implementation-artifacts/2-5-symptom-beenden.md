# Story 2.5: Symptom beenden und Dauer berechnen

Status: done

## Story

As a Patient,
I want ein aktives Symptom als beendet markieren können,
So that die Dauer meiner Symptome automatisch berechnet und dokumentiert wird (FR5).

## Acceptance Criteria

1. **Given** ein bestätigter Symptom-Event existiert ohne `ended_at` **When** der Patient das Symptom als beendet markiert **Then** wird `ended_at` auf dem Event gesetzt
2. **And** die Dauer wird berechnet (`ended_at - created_at`) und angezeigt
3. **And** eine Bestätigungs-Bubble zeigt "Symptom beendet — Dauer: X Stunden/Minuten"
4. **And** beendete Symptome sind im ChatFeed als abgeschlossen erkennbar (visueller Indikator)
5. **And** aktive Symptome zeigen im ChatFeed einen "Aktiv seit X" Badge

## Tasks / Subtasks

- [x] Task 1: Server Action — `endSymptomEvent()` (AC: #1, #2)
  - [x] `endSymptomEvent(eventId: string): Promise<ActionResult<SymptomEvent>>` in `symptom-actions.ts`
  - [x] Auth-Check: nur eigene Events beenden
  - [x] Validierung: Event muss `status: 'confirmed'` haben und `ended_at IS NULL`
  - [x] Update: `ended_at = new Date().toISOString()`
  - [x] Dauer berechnen und im Response zurückgeben
  - [x] `revalidatePath('/')`
- [x] Task 2: Dauer-Berechnung Utility (AC: #2)
  - [x] `src/lib/utils/duration.ts` erstellen
  - [x] `formatDuration(startDate: Date, endDate: Date): string`
  - [x] Ausgabe: "X Minuten", "X Stunden", "X Stunden Y Minuten", "X Tage"
  - [x] Deutsch formatiert
- [x] Task 3: Aktive-Symptome-Anzeige im ChatFeed (AC: #4, #5)
  - [x] ChatBubble erweitern: Bei `status: 'confirmed'` und `ended_at IS NULL` → "Aktiv seit X" Badge
  - [x] Badge-Styling: `bg-success/10 text-success rounded-full px-3 py-1 text-xs`
  - [x] Dynamische Aktualisierung: Badge-Text aktualisiert sich (z.B. "Aktiv seit 2h")
  - [x] Long-Press auf aktive Bubble → Context-Menu mit "Symptom beendet"
  - [x] Alternativ: Expliziter "Beenden"-Button in der Bubble
- [x] Task 4: Beendet-Bestätigung (AC: #3)
  - [x] System-Bubble nach Beenden: "✓ Symptom beendet — Dauer: 3 Stunden 20 Minuten"
  - [x] Bubble-Styling: `bg-muted text-foreground rounded-xl` (System-Variante)
  - [x] Beendete Symptome: Badge wechselt von "Aktiv seit X" zu "Dauer: X" (ausgegraut)
- [x] Task 5: Aktive-Symptome-Schnellzugriff (AC: #5)
  - [x] Optional: Aktive Symptome am Anfang des ChatFeeds hervorheben
  - [x] Oder: "Beenden"-Button direkt in der InputBar-Area wenn aktive Symptome existieren
  - [x] Minimaler Ansatz: Nur Long-Press/Button in der Bubble selbst
- [x] Task 6: Tests (AC: #1-#5)
  - [x] `src/__tests__/symptom-actions.test.ts` — Erweitert: endSymptomEvent(), Validierung, Auth
  - [x] `src/__tests__/lib/utils/duration.test.ts` — Dauer-Formatierung (Minuten, Stunden, Tage)
  - [x] `src/__tests__/chat-bubble.test.tsx` — Erweitert: Aktiv-Badge, Beendet-State
  - [x] `npm run test` verifizieren
- [x] Task 7: Build-Verifikation
  - [x] `npm run lint` fehlerfrei
  - [x] `npm run build` erfolgreich

## Dev Notes

### Scope-Abgrenzung (KRITISCH)

Diese Story implementiert:
- Symptom beenden (ended_at setzen)
- Dauer berechnen und anzeigen
- Aktiv-Badge im ChatFeed
- Beendet-Bestätigung als System-Bubble

Gehört NICHT in diese Story:
- **Automatisches Beenden nach Zeitlimit** → Post-MVP
- **Erinnerung "Symptom noch aktiv?"** → Post-MVP (Push Notification Enhancement)
- **Batch-Beenden (mehrere gleichzeitig)** → Post-MVP
- **Rückgängig machen (Beenden widerrufen)** → Post-MVP
- **Beenden per Spracheingabe** → Epic 3

### Abhängigkeit: Story 2.1 + 2.3 (VORAUSSETZUNG)

Story 2.1 liefert: symptom_events mit ended_at-Feld, ChatBubble, ChatFeed
Story 2.3 liefert: status 'confirmed' als Voraussetzung zum Beenden

### Interaktion: Symptom beenden

```
ChatFeed:
┌─────────────────────────────┐
│ Sent-Bubble                 │
│ "Rückenschmerzen links"     │
│ ┌─────────────────┐        │
│ │ 🟢 Aktiv seit 2h │        │  ← Aktiv-Badge
│ └─────────────────┘        │
│       [Symptom beendet]     │  ← Button in Bubble
├─────────────────────────────┤
│ System-Bubble               │
│ ✓ Symptom beendet           │
│ Dauer: 3 Stunden 20 Minuten│
└─────────────────────────────┘
```

### Dauer-Formatierung

```typescript
// src/lib/utils/duration.ts
export function formatDuration(start: Date, end: Date): string {
  const diffMs = end.getTime() - start.getTime()
  const minutes = Math.floor(diffMs / (1000 * 60))
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days} Tag${days > 1 ? 'e' : ''}`
  if (hours > 0) {
    const remainMinutes = minutes % 60
    if (remainMinutes === 0) return `${hours} Stunde${hours > 1 ? 'n' : ''}`
    return `${hours} Std. ${remainMinutes} Min.`
  }
  return `${minutes} Minute${minutes !== 1 ? 'n' : ''}`
}

export function formatActiveSince(start: Date): string {
  return `Aktiv seit ${formatDuration(start, new Date())}`
}
```

### Server Action

```typescript
export async function endSymptomEvent(
  eventId: string
): Promise<ActionResult<SymptomEvent>> {
  // 1. Auth
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: { error: 'Nicht authentifiziert', code: 'AUTH_REQUIRED' } }

  // 2. Validate: confirmed + ended_at IS NULL
  const { data: event } = await supabase
    .from('symptom_events')
    .select('*')
    .eq('id', eventId)
    .eq('account_id', user.id)
    .is('ended_at', null)
    .single()

  if (!event) return { data: null, error: { error: 'Event nicht gefunden oder bereits beendet', code: 'NOT_FOUND' } }

  // 3. Update
  const { data, error } = await supabase
    .from('symptom_events')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', eventId)
    .select()
    .single()

  if (error) return { data: null, error: { error: 'Beenden fehlgeschlagen', code: 'UPDATE_FAILED' } }

  revalidatePath('/')
  return { data, error: null }
}
```

### Anti-Patterns (VERMEIDEN)

- **NICHT** automatisches Beenden implementieren — Patient entscheidet aktiv
- **NICHT** Beenden für Events mit status != 'confirmed' erlauben — Extraktion muss abgeschlossen sein
- **NICHT** Dauer clientseitig berechnen und in DB speichern — immer aus created_at/ended_at ableiten
- **NICHT** modale Bestätigung für Beenden — direkte Aktion (nicht destruktiv, kann in Zukunft rückgängig gemacht werden)
- **NICHT** Medikamenten-Events "beenden" — nur Symptom-Events haben Dauer

### Neue Dateien

- `src/lib/utils/duration.ts`
- `src/__tests__/lib/utils/duration.test.ts`

### Modifizierte Dateien

- `src/lib/actions/symptom-actions.ts` — endSymptomEvent() hinzufügen
- `src/components/capture/chat-bubble.tsx` — Aktiv-Badge, Beenden-Button, Beendet-State
- `src/components/capture/chat-feed.tsx` — System-Bubble nach Beenden
- `src/__tests__/symptom-actions.test.ts` — Erweitert
- `src/__tests__/chat-bubble.test.tsx` — Erweitert

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 2, Story 2.5]
- [Source: _bmad-output/planning-artifacts/architecture.md — symptom_events.ended_at Feld]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Aktiv-Badge, Dauer-Badge]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Long-Press Context-Menu]
- [Source: _bmad-output/planning-artifacts/prd.md — FR5: Symptom als beendet markieren]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
Keine Debug-Probleme aufgetreten.

### Completion Notes List
- Task 1: `endSymptomEvent()` Server Action implementiert mit Auth-Check, Validierung (confirmed + ended_at IS NULL), Update und revalidatePath
- Task 2: `formatDuration()` und `formatActiveSince()` in `src/lib/utils/duration.ts` — deutsch formatiert (Minuten, Stunden, Tage)
- Task 3: ChatBubble erweitert mit `activeSinceLabel`, `durationLabel`, `onEndSymptom` Props; ChatFeed berechnet Active/Ended-State pro Event; 60-Sekunden-Intervall für Badge-Aktualisierung
- Task 4: System-Bubble "✓ Symptom beendet — Dauer: X" wird im ChatFeed nach beendeten Events angezeigt; Dauer-Badge ersetzt Aktiv-Badge bei beendeten Events
- Task 5: Minimaler Ansatz gewählt — "Beenden"-Button direkt in der bestätigten Bubble neben dem Aktiv-Badge
- Task 6: 10 Duration-Tests + 6 endSymptomEvent-Tests + 6 neue ChatBubble-Tests = 22 neue Tests; 182/182 Tests gesamt bestanden
- Task 7: `npm run lint` und `npm run build` erfolgreich

### File List
**Neue Dateien:**
- `src/lib/utils/duration.ts`
- `src/__tests__/lib/utils/duration.test.ts`

**Modifizierte Dateien:**
- `src/lib/actions/symptom-actions.ts` — endSymptomEvent() hinzugefügt
- `src/components/capture/chat-bubble.tsx` — activeSinceLabel, durationLabel, onEndSymptom Props
- `src/components/capture/chat-feed.tsx` — Active/Ended-Badge-Logik, System-Bubble, onEndSymptom Handler, Timer für Badge-Updates
- `src/app/(app)/page.tsx` — handleEndSymptom Handler, endSymptomEvent Import
- `src/__tests__/symptom-actions.test.ts` — endSymptomEvent describe-Block mit 6 Tests
- `src/__tests__/chat-bubble.test.tsx` — 6 neue Tests für Aktiv-Badge, Beenden-Button, Dauer-Badge

## Change Log
- 2026-03-02: Story 2.5 implementiert — endSymptomEvent Server Action, Dauer-Utility, Aktiv-/Dauer-Badges im ChatFeed, System-Bubble bei Beendigung, 22 neue Tests (182/182 gesamt)
- 2026-03-03: Code Review — 4 Issues gefixed: (1) `.eq('status', 'confirmed')` Filter in endSymptomEvent Query hinzugefügt, (2) Zod-Schema `endSymptomEventSchema` + UUID-Validierung analog zu anderen Actions, (3) Error-Handling in handleEndSymptom (page.tsx), (4) Task 7 Build-Subtask Checkbox korrigiert. Tests aktualisiert (186/186 gesamt).
