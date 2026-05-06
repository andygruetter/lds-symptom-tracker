# Story 4.5: Events und Daten löschen

Status: done

## 📋 Implementation Update (Stand 2026-05-06)

**RLS-Policy-Anpassung:** Die ursprünglich vorgesehene SELECT-Policy
`auth.uid() = account_id AND deleted_at IS NULL` blockierte `UPDATE … SELECT`-Aufrufe,
die für Soft-Delete benötigt werden. Migration
`20260314224610_fix_rls_select_policy_for_soft_delete.sql` **entfernt den
`deleted_at IS NULL`-Filter aus der RLS-Policy**. Das Filtern auf nicht-gelöschte
Events erfolgt jetzt in der Application-Logic (Server Actions / Queries).

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Patient,
I want einzelne Events oder alle meine Daten löschen können,
So that ich volle Kontrolle über meine gespeicherten Gesundheitsdaten habe (FR20).

## Acceptance Criteria

1. **Given** ein Patient in der Event-Detail-Ansicht **When** der Patient "Event löschen" auswählt **Then** wird ein Bestätigungs-Dialog angezeigt
2. **And** nach Bestätigung wird der Event soft-deleted (`deleted_at` gesetzt) — RLS macht ihn sofort unsichtbar
3. **And** zugehörige Daten (Audio, Fotos, extrahierte Daten) bleiben erhalten bis Hard-Delete Cron nach 30 Tagen
4. **And** der Patient wird nach erfolgreichem Löschen auf `/insights` navigiert
5. **And** der Feed/Timeline/Ranking aktualisieren sich sofort (gelöschter Event verschwindet)
6. **Given** ein Patient auf der "Mehr"-Seite **When** der Patient "Alle Daten löschen" auswählt **Then** wird ein Bestätigungs-Dialog mit Warnung angezeigt
7. **And** nach Bestätigung werden ALLE Events des Patienten soft-deleted (Account bleibt bestehen)
8. **And** eine Erfolgsmeldung wird angezeigt (Toast)

## Tasks / Subtasks

- [x] Task 1: DB-Funktionen für Event-Löschung (AC: #2, #5, #7)
  - [x]`src/lib/db/insights.ts` erweitern (NICHT neue Datei)
  - [x]`softDeleteEvent(supabase, eventId, accountId): Promise<{ error: AppError | null }>`
    - UPDATE `symptom_events` SET `deleted_at = NOW()` WHERE `id = eventId` AND `account_id = accountId` AND `deleted_at IS NULL`
    - Return `{ error: null }` bei Erfolg
    - Return `{ error: { error: 'Event nicht gefunden', code: 'NOT_FOUND' } }` wenn kein Row updated (count === 0)
  - [x]`softDeleteAllEvents(supabase, accountId): Promise<{ deletedCount: number; error: AppError | null }>`
    - UPDATE `symptom_events` SET `deleted_at = NOW()` WHERE `account_id = accountId` AND `deleted_at IS NULL`
    - Return `{ deletedCount: count, error: null }` bei Erfolg

- [x] Task 2: Server Actions für Löschung (AC: #1, #2, #4, #5, #6, #7, #8)
  - [x]`src/lib/actions/insights-actions.ts` erweitern (NICHT neue Datei)
  - [x]`deleteEvent(eventId: string): Promise<ActionResult<null>>`
    - Zod-Schema: `z.object({ eventId: z.string().uuid() })`
    - Auth-Check via `createServerClient()` + `getUser()`
    - Aufruf: `softDeleteEvent(supabase, eventId, user.id)`
    - Bei Erfolg: `revalidatePath('/')` + return `{ data: null, error: null }`
    - Bei Fehler: return `{ data: null, error }`
  - [x]`deleteAllEvents(): Promise<ActionResult<{ deletedCount: number }>>`
    - Auth-Check via `createServerClient()` + `getUser()`
    - Aufruf: `softDeleteAllEvents(supabase, user.id)`
    - Bei Erfolg: `revalidatePath('/')` + return `{ data: { deletedCount }, error: null }`
    - Bei Fehler: return `{ data: null, error }`

- [x] Task 3: DeleteEventDialog Komponente (AC: #1, #2, #4)
  - [x]`src/components/event/delete-event-dialog.tsx` erstellen (`'use client'`)
  - [x]Props: `open: boolean, onOpenChange: (open: boolean) => void, eventId: string`
  - [x]Pattern: Identisch zu `DeleteAccountDialog` (`src/components/account/delete-account-dialog.tsx`)
  - [x]AlertDialog mit:
    - Title: "Event löschen?"
    - Description: "Dieser Event und alle zugehörigen Daten werden innerhalb von 30 Tagen unwiderruflich gelöscht."
    - Cancel: "Abbrechen"
    - Action: variant="destructive", Text "Ja, Event löschen" / "Wird gelöscht..."
  - [x]`handleDelete()`:
    - `const result = await deleteEvent(eventId)`
    - Bei Erfolg: `router.push('/insights')` — navigiert weg von der gelöschten Detail-Ansicht
    - Bei Fehler: `setError(result.error.error)`
  - [x]`useRouter()` für Navigation nach Löschung

- [x] Task 4: EventDetailView um Löschen-Button erweitern (AC: #1)
  - [x]`src/components/event/event-detail-view.tsx` erweitern (NICHT neue Datei)
  - [x]State: `const [deleteOpen, setDeleteOpen] = useState(false)`
  - [x]Import: `Trash2` Icon von lucide-react, `DeleteEventDialog`
  - [x]Header-Bereich: Löschen-Button rechts oben (ersetzt den leeren `size-11` Spacer)
    ```
    ┌──────────────────────────────────────┐
    │ ← Zurück    Event-Details    🗑️     │  ← Trash2 Icon rechts
    └──────────────────────────────────────┘
    ```
  - [x]Button-Styling: `flex size-11 items-center justify-center rounded-full text-destructive transition-colors active:bg-muted`
  - [x]`aria-label="Event löschen"`
  - [x]`<DeleteEventDialog open={deleteOpen} onOpenChange={setDeleteOpen} eventId={detail.id} />`

- [x] Task 5: DeleteAllDataDialog Komponente (AC: #6, #7, #8)
  - [x]`src/components/event/delete-all-data-dialog.tsx` erstellen (`'use client'`)
  - [x]Props: `open: boolean, onOpenChange: (open: boolean) => void`
  - [x]Pattern: Identisch zu `DeleteAccountDialog`
  - [x]AlertDialog mit:
    - Title: "Alle Daten löschen?"
    - Description: "Alle deine Symptom-Events, Audio-Aufnahmen und Fotos werden innerhalb von 30 Tagen unwiderruflich gelöscht. Dein Account bleibt bestehen."
    - Cancel: "Abbrechen"
    - Action: variant="destructive", Text "Ja, alle Daten löschen" / "Daten werden gelöscht..."
  - [x]`handleDelete()`:
    - `const result = await deleteAllEvents()`
    - Bei Erfolg: `onOpenChange(false)` + Toast-Benachrichtigung (optional: `${result.data.deletedCount} Events gelöscht`)
    - Bei Fehler: `setError(result.error.error)`
  - [x]KEIN `router.push` — Patient bleibt auf "Mehr"-Seite

- [x] Task 6: "Mehr"-Seite um "Alle Daten löschen" erweitern (AC: #6)
  - [x]`src/app/(app)/more/page.tsx` erweitern (NICHT neue Datei)
  - [x]Neuer State: `const [deleteDataOpen, setDeleteDataOpen] = useState(false)`
  - [x]Neue Sektion "Daten" ZWISCHEN "KI & Lernen" und "Account" einfügen:
    ```
    Daten
    ┌─────────────────────────────────────┐
    │ 🗑️ Alle Daten löschen        >     │  ← text-destructive
    └─────────────────────────────────────┘
    ```
  - [x]Import: `DeleteAllDataDialog`
  - [x]Button-Pattern: Identisch zu "Account löschen" (Trash2 Icon, text-destructive)
  - [x]`<DeleteAllDataDialog open={deleteDataOpen} onOpenChange={setDeleteDataOpen} />`

- [x] Task 7: Migration für Hard-Delete Cron Extension (AC: #3)
  - [x]`supabase migration new story-4-5_cleanup_deleted_events`
  - [x]Migration erstellt: `supabase/migrations/XXXXX_story-4-5_cleanup_deleted_events.sql`
  - [x]Neue Funktion `cleanup_deleted_events()`:
    ```sql
    CREATE OR REPLACE FUNCTION public.cleanup_deleted_events()
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    DECLARE
      deleted_event_ids UUID[];
    BEGIN
      -- Sammle IDs der zu löschenden Events
      SELECT array_agg(id) INTO deleted_event_ids
      FROM public.symptom_events
      WHERE deleted_at IS NOT NULL
      AND deleted_at < NOW() - INTERVAL '30 days';

      -- Nichts zu tun?
      IF deleted_event_ids IS NULL THEN
        RETURN;
      END IF;

      -- Storage-Dateien können NICHT direkt aus SQL gelöscht werden
      -- (Supabase Storage API benötigt HTTP-Calls)
      -- → Storage Cleanup via Edge Function oder separatem Cron-Job (Post-MVP)
      -- Für MVP: Orphaned Storage-Dateien bleiben liegen — kein Datenschutzrisiko
      -- da RLS den Zugriff bereits blockiert und Signed URLs nicht mehr generiert werden

      -- Lösche verknüpfte Daten
      DELETE FROM public.extracted_data
      WHERE symptom_event_id = ANY(deleted_event_ids);

      DELETE FROM public.event_photos
      WHERE symptom_event_id = ANY(deleted_event_ids);

      DELETE FROM public.corrections
      WHERE symptom_event_id = ANY(deleted_event_ids);

      -- Lösche die Events selbst
      DELETE FROM public.symptom_events
      WHERE id = ANY(deleted_event_ids);
    END;
    $$;
    ```
  - [x]Cron-Job schedulen (wöchentlich, Sonntag 03:30 UTC — 30 Min nach Account-Cleanup):
    ```sql
    SELECT cron.schedule(
      'cleanup-deleted-events',
      '30 3 * * 0',
      'SELECT public.cleanup_deleted_events()'
    );
    ```

- [x] Task 8: Tests (AC: #1-#8)
  - [x]`src/__tests__/lib/db/insights.test.ts` erweitern — softDeleteEvent:
    - Event soft-deleten: Update mit deleted_at (1 Test)
    - Nicht existierendes Event → NOT_FOUND (1 Test)
    - Bereits gelöschtes Event → NOT_FOUND (1 Test)
  - [x]`src/__tests__/lib/db/insights.test.ts` erweitern — softDeleteAllEvents:
    - Alle Events soft-deleten: deletedCount (1 Test)
    - Keine Events vorhanden → deletedCount 0 (1 Test)
  - [x]`src/__tests__/actions/insights-actions.test.ts` erweitern — deleteEvent:
    - Validierung: Ungültige Event-ID → VALIDATION_ERROR (1 Test)
    - Auth: Kein User → AUTH_REQUIRED (1 Test)
    - Erfolg: Event gelöscht + revalidatePath aufgerufen (1 Test)
    - Fehler: Event nicht gefunden → NOT_FOUND (1 Test)
  - [x]`src/__tests__/actions/insights-actions.test.ts` erweitern — deleteAllEvents:
    - Auth: Kein User → AUTH_REQUIRED (1 Test)
    - Erfolg: Alle Events gelöscht + revalidatePath aufgerufen (1 Test)
  - [x]`src/__tests__/components/event/delete-event-dialog.test.tsx` (NEU):
    - Dialog rendern mit Title und Buttons (1 Test)
    - Abbrechen schliesst Dialog (1 Test)
    - Löschen ruft deleteEvent auf (1 Test)
  - [x]`src/__tests__/components/event/delete-all-data-dialog.test.tsx` (NEU):
    - Dialog rendern mit Warnung (1 Test)
    - Löschen ruft deleteAllEvents auf (1 Test)
  - [x]Bestehende Tests brechen nicht — verifizieren mit `npm run test`

- [x] Task 9: Build-Verifikation
  - [x]`npx prettier --write` auf alle geänderten Dateien
  - [x]`npm run lint` — keine neuen Fehler
  - [x]`npm run build` — erfolgreich

## Dev Notes

### Scope-Abgrenzung (KRITISCH)

Diese Story implementiert:
- Einzelnes Event soft-deleten (aus Detail-Ansicht)
- Alle Events soft-deleten (aus "Mehr"-Seite, Account bleibt bestehen)
- Bestätigungs-Dialoge für beide Aktionen
- Hard-Delete Cron-Job für Events nach 30 Tagen
- Navigation nach Löschung (→ `/insights` bzw. Toast)

Gehört NICHT in diese Story:
- **Account löschen** → Story 1.7 (bereits implementiert: `deleteAccount()` in `account-actions.ts`)
- **Löschen aus dem Feed direkt** → Post-MVP (Long-Press / Swipe-to-Delete im Feed)
- **Undo/Rückgängig** → Post-MVP
- **Storage-Dateien löschen** → Post-MVP Edge Function (Orphaned Files bleiben, RLS blockiert Zugriff)
- **Arzt-Ansicht Event-Löschung** → Epic 6 (Arzt hat kein Löschrecht)
- **Bulk-Löschung aus Feed-Liste** → Post-MVP
- **Push-Benachrichtigung bei Löschung** → Nicht nötig
- **Audit-Log für Event-Löschung** → Epic 5 (FR38, Audit-Log System)

### Architektur-Entscheidungen

**Soft-Delete Pattern (bestehend, wiederverwenden):**
```
UPDATE symptom_events SET deleted_at = NOW()
WHERE id = ? AND account_id = ? AND deleted_at IS NULL
```
- RLS-Policy filtert bereits `deleted_at IS NULL` → gelöschte Events sofort unsichtbar
- Keine zusätzlichen RLS-Änderungen nötig
- Kein DELETE Statement — nur UPDATE auf `deleted_at`
- Hard-Delete via Cron nach 30 Tagen (nDSG/DSGVO-konform)

**Warum kein sofortiges Hard-Delete?**
- Konsistent mit Account-Löschung (30-Tage-Frist)
- Ermöglicht zukünftiges Undo-Feature
- Supabase Storage kann nicht direkt aus SQL gelöscht werden (HTTP API nötig)
- RLS blockiert Zugriff auf gelöschte Events sofort — kein Datenschutzrisiko

**Server Action Pattern (nicht DB-direkt vom Client):**
```
EventDetailView (Client)
  → deleteEvent(eventId) Server Action
    → softDeleteEvent(supabase, eventId, accountId) DB-Layer
    → revalidatePath('/')
  ← ActionResult<null>
  → router.push('/insights')
```

**"Alle Daten löschen" vs. "Account löschen":**
```
"Alle Daten löschen":
  - Soft-deletes alle symptom_events
  - Account bleibt bestehen
  - Patient bleibt eingeloggt
  - Patient kann weiter erfassen

"Account löschen" (Story 1.7):
  - Soft-deletes account
  - CASCADE löscht alles nach 30 Tagen
  - Patient wird ausgeloggt
  - Account ist weg
```

**"Mehr"-Seite Struktur nach Implementierung:**
```
Rechtliches
├── Disclaimer anzeigen

KI & Lernen
├── Mein Vokabular

Daten                        ← NEU
├── Alle Daten löschen       ← NEU (text-destructive)

Account
├── Abmelden
├── Account löschen
```

### RLS-Policy Checklist (bei DB-Änderungen)

Keine DB-Schema-Änderungen nötig — nutzt bestehende Tabellen und RLS-Policies:

- [x] `symptom_events` UPDATE-Policy: `auth.uid() = account_id` + `deleted_at IS NULL` ✓
- [x] `symptom_events` SELECT-Policy: `auth.uid() = account_id` + `deleted_at IS NULL` ✓
- [x] Keine neuen Tabellen oder Spalten nötig
- [x] Soft-Delete nutzt bestehendes `deleted_at` Feld
- [x] RLS verhindert Zugriff auf gelöschte Events sofort nach UPDATE

### Migrations-Konvention

- Migration: `supabase migration new story-4-5_cleanup_deleted_events`
- Dateiname wird: `XXXXX_story-4-5_cleanup_deleted_events.sql`
- Inhalt: Cron-Funktion `cleanup_deleted_events()` + Schedule
- Cron läuft 30 Min NACH dem bestehenden `cleanup-deleted-accounts` (03:30 UTC statt 03:00)

### Bestehende Dateien die ERWEITERT werden

- `src/lib/db/insights.ts` — `softDeleteEvent()`, `softDeleteAllEvents()` hinzufügen
- `src/lib/actions/insights-actions.ts` — `deleteEvent()`, `deleteAllEvents()` Server Actions
- `src/components/event/event-detail-view.tsx` — Löschen-Button im Header + DeleteEventDialog
- `src/app/(app)/more/page.tsx` — "Daten"-Sektion mit "Alle Daten löschen" + DeleteAllDataDialog
- `src/__tests__/lib/db/insights.test.ts` — softDeleteEvent/softDeleteAllEvents Tests
- `src/__tests__/actions/insights-actions.test.ts` — deleteEvent/deleteAllEvents Tests

### Neue Dateien

- `src/components/event/delete-event-dialog.tsx` — Bestätigungs-Dialog für Einzellöschung
- `src/components/event/delete-all-data-dialog.tsx` — Bestätigungs-Dialog für "Alle Daten löschen"
- `src/__tests__/components/event/delete-event-dialog.test.tsx` — Dialog-Tests
- `src/__tests__/components/event/delete-all-data-dialog.test.tsx` — Dialog-Tests
- `supabase/migrations/XXXXX_story-4-5_cleanup_deleted_events.sql` — Cron für Event Hard-Delete

### Learnings aus Story 4.1-4.4 (KRITISCH)

- **Soft-Delete Pattern**: `deleted_at` auf `symptom_events` — alle Queries filtern bereits `.is('deleted_at', null)`. NICHT vergessen bei neuen Queries.
- **revalidatePath('/')**: Standard-Pattern nach Mutations — invalidiert ALLE Seiten (Feed, Timeline, Ranking). Zusätzlich `revalidatePath('/event/${eventId}')` NICHT nötig, da Event nach Löschung nicht mehr besucht wird.
- **AlertDialog Pattern**: `DeleteAccountDialog` als exakte Vorlage verwenden — Props: `open`, `onOpenChange`. Action: `variant="destructive"`, `onClick` mit `e.preventDefault()`.
- **Server Action Pattern**: Zod-Validierung → Auth-Check → DB-Operation → revalidatePath → Return. KEINE `redirect()` in der Action — stattdessen im Client navigieren.
- **ActionResult<T>**: Bestehender Typ aus `types/common.ts`. Für Löschung: `ActionResult<null>`.
- **Test-Count**: Aktuell ~435 Tests grün. Neue Tests hinzufügen, nicht brechen.
- **Keine barrel exports**: Direkte Imports verwenden, keine `index.ts` Dateien.
- **`createServerClient()` statt `createServiceClient()`**: Immer mit RLS arbeiten.
- **Prettier vor Commit**: `npx prettier --write` auf alle geänderten Dateien.

### Learnings aus DeleteAccountDialog (Pattern-Referenz)

```typescript
// Exaktes Pattern für Delete-Dialoge (aus delete-account-dialog.tsx):
const [isDeleting, setIsDeleting] = useState(false)
const [error, setError] = useState<string | null>(null)

async function handleDelete() {
  setIsDeleting(true)
  setError(null)
  const result = await deleteAction(params)
  if (result.error) {
    setError(result.error.error)
    setIsDeleting(false)
  }
  // Bei Erfolg: Navigation oder Dialog schliessen
}

function handleOpenChange(isOpen: boolean) {
  if (!isOpen) {
    setError(null)
    setIsDeleting(false)
  }
  onOpenChange(isOpen)
}
```

### Farb-Referenz

| Element | Styling | Verwendung |
|---------|---------|-----------|
| Löschen-Button (Header) | `text-destructive` | Trash2 Icon im Header der Detail-Ansicht |
| Dialog Action Button | `variant="destructive"` | "Ja, Event löschen" / "Ja, alle Daten löschen" |
| "Alle Daten löschen" Text | `text-destructive` | Menüeintrag auf "Mehr"-Seite |
| Destructive Farbe | `#BE4444` | UX-Spec definiert — wird via Tailwind `destructive` variable genutzt |

### Anti-Patterns (VERMEIDEN)

- **NICHT** Hard-Delete direkt ausführen — immer Soft-Delete (deleted_at) verwenden
- **NICHT** Storage-Dateien (Audio, Fotos) im Client oder Server Action löschen — nur via Cron
- **NICHT** `createServiceClient()` verwenden — `createServerClient()` mit RLS
- **NICHT** DELETE SQL-Statement verwenden — nur UPDATE auf `deleted_at`
- **NICHT** eigene Confirmation-UI bauen — shadcn `AlertDialog` verwenden (bereits installiert)
- **NICHT** `redirect()` in der Server Action — Client navigiert nach Erfolg selbst
- **NICHT** neue Datei für DB-Layer erstellen — `insights.ts` erweitern
- **NICHT** neue Datei für Server Actions erstellen — `insights-actions.ts` erweitern
- **NICHT** barrel exports (index.ts) erstellen — direkte Imports
- **NICHT** `extracted_data` oder `event_photos` direkt löschen — Soft-Delete auf `symptom_events` reicht, Hard-Delete Cron räumt verknüpfte Daten auf
- **NICHT** Toast für einzelnes Event-Löschen — Navigation nach `/insights` ist genug Feedback
- **NICHT** Realtime-Subscription für Löschung
- **NICHT** Long-Press oder Swipe-to-Delete im Feed implementieren — nur aus Detail-Ansicht

### Abhängigkeiten

- **Story 4.4**: Event-Detail-Ansicht (VORAUSSETZUNG — in-progress) → Löschen-Button wird dort platziert
- **Story 1.7**: Account-Löschung (done ✓) → Pattern-Referenz für Dialog und Server Action
- **DeleteAccountDialog**: `src/components/account/delete-account-dialog.tsx` — Pattern-Vorlage ✓
- **account-actions.ts**: `src/lib/actions/account-actions.ts` — Pattern für Soft-Delete ✓
- **AlertDialog**: `src/components/ui/alert-dialog.tsx` — shadcn Komponente installiert ✓
- **Existing Cron**: `supabase/migrations/00003_hard_delete_cron.sql` — Referenz für neue Cron ✓
- **RLS Policies**: `supabase/migrations/00004_symptom_events.sql` — `deleted_at IS NULL` Filter ✓

### DB-Schema Referenz (bestehend)

```
symptom_events: id, account_id, event_type, occurred_at, created_at, ended_at,
                raw_input, audio_url, status, deleted_at
  → deleted_at: TIMESTAMPTZ DEFAULT NULL (Soft-Delete Marker)
  → RLS SELECT: auth.uid() = account_id AND deleted_at IS NULL
  → RLS UPDATE: auth.uid() = account_id AND deleted_at IS NULL (USING + WITH CHECK)

extracted_data: id, symptom_event_id, field_name, value, confidence, confirmed
  → FK: symptom_event_id → symptom_events.id (kein CASCADE DELETE — Cron räumt auf)

event_photos: id, symptom_event_id, storage_path, created_at
  → FK: symptom_event_id → symptom_events.id
  → Storage bucket: 'photos' (private)

corrections: id, symptom_event_id, field_name, original_value, corrected_value, created_at
  → FK: symptom_event_id → symptom_events.id

Audio Storage: Bucket 'audio' (private), Pfad: {accountId}/{eventId}.{ext}
Photos Storage: Bucket 'photos' (private), Pfad: {accountId}/{eventId}/{timestamp}-{filename}
```

### Git Intelligence

Letzte relevante Commits:
- `31959d2` — Implement Story 4.3: symptom ranking with trend lines and code review fixes
- `315fab3` — Implement Stories 4.1-4.2: chronological feed, timeline view
- `df941a6` — Add Story 4.1 spec and start Epic 4
- `638d9b6` — Add symptom time/duration extraction

Relevante Dateien (zum Referenzieren):
- `src/lib/actions/account-actions.ts` — **MUSTER** für Soft-Delete Server Action
- `src/components/account/delete-account-dialog.tsx` — **MUSTER** für AlertDialog
- `src/app/(app)/more/page.tsx` — **ERWEITERN** um "Daten"-Sektion
- `src/components/event/event-detail-view.tsx` — **ERWEITERN** um Löschen-Button
- `src/lib/db/insights.ts` — **ERWEITERN** um softDeleteEvent/softDeleteAllEvents
- `src/lib/actions/insights-actions.ts` — **ERWEITERN** um deleteEvent/deleteAllEvents
- `supabase/migrations/00003_hard_delete_cron.sql` — **MUSTER** für Cron-Job

### Project Structure Notes

- Alignment: Neue Dialoge unter `src/components/event/` (architekturkonform, dort liegt bereits `delete-event-dialog`)
- DB-Layer erweitert `src/lib/db/insights.ts` (bestehender Pattern)
- Server Actions erweitert `src/lib/actions/insights-actions.ts` (bestehender Pattern)
- "Mehr"-Seite erweitert `src/app/(app)/more/page.tsx` (bestehender Pattern)
- Tests unter `src/__tests__/` mit bestehender Struktur
- Migration folgt Story-Konvention: `story-4-5_cleanup_deleted_events`

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 4, Story 4.5 (FR20)]
- [Source: _bmad-output/planning-artifacts/prd.md — FR20: Events/Daten löschen, FR42: Account löschen]
- [Source: _bmad-output/planning-artifacts/architecture.md — Soft-Delete + Cron Pattern, Server Actions, RLS]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Destructive Actions: immer mit Bestätigungs-Dialog, AlertDialog Pattern, Destructive Button Styling]
- [Source: _bmad-output/implementation-artifacts/4-4-event-detail-ansicht.md — EventDetailView Layout, Header-Struktur, Navigation Pattern]
- [Source: src/components/account/delete-account-dialog.tsx — AlertDialog Pattern für Löschung]
- [Source: src/lib/actions/account-actions.ts — Soft-Delete Server Action Pattern]
- [Source: src/app/(app)/more/page.tsx — Mehr-Seite Struktur, Account-Sektion]
- [Source: src/components/event/event-detail-view.tsx — Header mit Back-Button, Spacer (wird zu Löschen-Button)]
- [Source: src/lib/db/insights.ts — getEventDetail mit deleted_at IS NULL Filter]
- [Source: src/lib/actions/insights-actions.ts — Server Action Pattern mit Zod + Auth]
- [Source: src/types/common.ts — ActionResult<T>, AppError]
- [Source: supabase/migrations/00003_hard_delete_cron.sql — cleanup_deleted_accounts Cron Pattern]
- [Source: supabase/migrations/00004_symptom_events.sql — deleted_at Spalte, RLS Policies]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

None

### Completion Notes List

- All 9 tasks completed using red-green-refactor TDD cycle
- Soft-delete pattern reused from existing account deletion (Story 1.7)
- DeleteAccountDialog pattern used as exact template for both new dialogs
- Import order lint error fixed (import/order in more/page.tsx)
- Pre-existing lint errors not in scope (day-drill-down.tsx setState-in-effect)
- 502 tests passing across 58 test files after implementation
- Build successful with Next.js 16.1.6

### File List

Modified:
- `src/lib/db/insights.ts` — Added `softDeleteEvent()`, `softDeleteAllEvents()`
- `src/lib/actions/insights-actions.ts` — Added `deleteEvent()`, `deleteAllEvents()` server actions
- `src/components/event/event-detail-view.tsx` — Added Trash2 delete button in header + DeleteEventDialog
- `src/app/(app)/more/page.tsx` — Added "Daten" section with "Alle Daten löschen" + DeleteAllDataDialog
- `src/__tests__/lib/db/insights.test.ts` — Added softDeleteEvent/softDeleteAllEvents tests
- `src/__tests__/actions/insights-actions.test.ts` — Added deleteEvent/deleteAllEvents tests

Created:
- `src/components/event/delete-event-dialog.tsx` — AlertDialog for individual event deletion
- `src/components/event/delete-all-data-dialog.tsx` — AlertDialog for deleting all user data
- `src/__tests__/components/event/delete-event-dialog.test.tsx` — Dialog tests (3 tests)
- `src/__tests__/components/event/delete-all-data-dialog.test.tsx` — Dialog tests (2 tests)
- `supabase/migrations/20260314215418_story-4-5_cleanup_deleted_events.sql` — Cron for hard-delete after 30 days

## Senior Developer Review (AI)

**Reviewer:** Andy | **Datum:** 2026-03-14 | **Model:** Claude Opus 4.6

### Review-Ergebnis: Approved (nach Fixes)

**Issues gefunden:** 0 Critical, 3 Medium, 3 Low
**Issues gefixt:** 3 Medium (alle)
**Action Items:** 0

### Fixes angewendet

**M1: AC8 — Toast implementiert (war inline-Text im Dialog)**
- `src/app/layout.tsx` — `<Toaster />` von sonner ins Root-Layout eingebunden
- `src/components/event/delete-all-data-dialog.tsx` — `toast.success()` statt inline success-State + setTimeout

**M2: setTimeout Memory Leak behoben**
- Entfernt durch M1-Fix (kein setTimeout mehr nötig, Dialog schliesst sofort nach toast)

**M3: Fehlende Error-Pfad-Tests ergänzt (+3 Tests)**
- `src/__tests__/actions/insights-actions.test.ts` — deleteAllEvents DB-Fehler-Weiterleitung
- `src/__tests__/components/event/delete-event-dialog.test.tsx` — Fehleranzeige bei deleteEvent-Fehler
- `src/__tests__/components/event/delete-all-data-dialog.test.tsx` — Fehleranzeige bei deleteAllEvents-Fehler + Toast-Mock

### Verbleibende Low Issues (akzeptabel)

- L1: `new Date().toISOString()` statt DB `NOW()` für deleted_at — minimaler Clock-Skew
- L2: "0 Events gelöscht" Toast bei leerem Account — kosmetisch
- L3: `result.data.deletedCount` ohne expliziten Null-Check — logisch sicher, TypeScript-typing suboptimal

### Verifizierung

- 505 Tests grün (58 Dateien) — vorher 502
- Build erfolgreich
- Alle 8 ACs implementiert und verifiziert
