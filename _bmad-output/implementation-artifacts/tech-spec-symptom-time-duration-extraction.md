---
title: 'Extraktion Symptomzeit und Dauer mit Edit-Screen'
slug: 'symptom-time-duration-extraction'
created: '2026-03-11'
status: 'done'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Next.js App Router', 'TypeScript', 'Supabase (PostgreSQL + Realtime)', 'Claude Sonnet 4 (@anthropic-ai/sdk)', 'Tailwind CSS', 'Vitest + React Testing Library', 'Playwright (E2E)', 'Zod']
files_to_modify: ['src/lib/ai/providers/claude.ts', 'src/lib/ai/pipeline.ts', 'src/lib/ai/clarification.ts', 'src/lib/actions/symptom-actions.ts', 'src/types/database.ts', 'src/types/symptom.ts', 'src/components/capture/chat-feed.tsx', 'src/components/capture/chat-bubble.tsx', 'src/types/ai.ts', 'src/lib/ai/prompt-enrichment.ts', 'src/hooks/use-symptom-events.ts', 'package.json']
files_to_create: ['supabase/migrations/00014_occurred_at_and_nullable_correction.sql', 'src/app/(app)/event/[id]/page.tsx', 'src/components/event/event-edit-form.tsx', 'src/components/event/correction-history.tsx', 'src/__tests__/event-edit.test.tsx', 'e2e/event-edit.spec.ts', 'e2e/page-objects/event-edit.page.ts']
code_patterns: ['ActionResult<T> pattern', 'Zod input validation', 'Fire-and-forget with after()', 'Realtime subscriptions', 'Claude Tool Use with forced tool_choice', 'extracted_data rows per field', 'correctExtractedField UPDATE + corrections INSERT']
test_patterns: ['Vitest + React Testing Library', 'Playwright E2E with Page Objects', 'Mock Claude API calls', 'ActionResult assertion pattern']
---

# Tech-Spec: Extraktion Symptomzeit und Dauer mit Edit-Screen

**Created:** 2026-03-11

## Overview

### Problem Statement

Der Symptomzeitpunkt wird aktuell aus dem Erfassungszeitpunkt (`created_at`) abgeleitet. Bei verzögerten Meldungen (z.B. "Gestern Morgen hatte ich zwei Stunden Kopfschmerzen nach dem Frühstück") ist der tatsächliche Symptomzeitpunkt falsch erfasst. Zudem fehlt die Dauer als extrahiertes Feld. Bestätigte Symptome können aktuell nicht mehr editiert werden — es gibt keinen Weg zurück zur Bearbeitung nach Bestätigung.

### Solution

KI-Extraktion um `symptom_time` und `duration` als neue `extracted_data`-Felder erweitern. Zusätzlich `occurred_at TIMESTAMPTZ` als abgeleitetes Feld direkt auf `symptom_events` für effiziente Queries (Default = `created_at`, synchronisiert bei jeder Änderung von `symptom_time`). Neuer Edit-Screen unter `/event/[id]`, erreichbar via Tap auf jeden Symptom-Eintrag im ChatFeed — unabhängig vom Event-Status. Alle definierten Attribute direkt editierbar und nachträglich erfassbar, mit vollständiger Änderungshistorie über die bestehende `corrections`-Tabelle. Original-Meldung wird im Edit-Screen als Kontext angezeigt.

### Scope

**In Scope:**
- `symptom_time` und `duration` als neue `extracted_data`-Felder
- `occurred_at TIMESTAMPTZ` auf `symptom_events` als abgeleitetes Feld (Default = `created_at`)
- KI extrahiert Zeitpunkt immer; Fallback = `created_at` des Events wenn keine Zeitangabe in der Meldung
- Dauer als Minuten-Zahl gespeichert, UI mit Einheiten-Toggle (Minuten/Stunden/Tage)
- Edit-Screen unter Route `/event/[id]` mit direkt editierbaren Feldern (kein separater View/Edit-Modus)
- Navigation: Tap auf Symptom-Eintrag im ChatFeed → Edit-Screen
- Edit-Screen unabhängig vom Event-Status erreichbar (auch nach Bestätigung)
- Original-Meldung (Freitext) im Edit-Screen anzeigen als Kontext
- Nacherfassung (erstmalige Eingabe) leerer Felder via erweiterte `correctExtractedField()` mit INSERT-Logik
- Vollständige Änderungshistorie über bestehende `corrections`-Tabelle, ausklappbar im Edit-Screen
- Idempotente `occurred_at`-Synchronisation bei jeder Änderung von `symptom_time`

**Out of Scope:**
- Timeline-/Kalender-Ansicht basierend auf extrahierten Zeiten
- Muster-Erkennung (z.B. "Symptome treten immer morgens auf")
- Änderungen am bestehenden Review-Bubble / Clarification-Flow
- Medikamenten-Edit (nur Symptom-Events in dieser Iteration)

## Context for Development

### Codebase Patterns

- **Server Actions:** Alle folgen `ActionResult<T>` Pattern mit Zod-Validierung → Auth-Check → DB-Operation
- **KI-Extraktion:** Claude Sonnet 4 mit Tool Use (`tool_choice: forced`), Zod-Validierung des Tool-Outputs
- **Datenmodell:** `extracted_data`-Rows pro Feld (nicht ein Blob), mit individueller Konfidenz und `confirmed`-Flag
- **Corrections:** `correctExtractedField()` macht UPDATE auf `extracted_data` + INSERT in `corrections`-Tabelle — aktuell nur UPDATE, kein INSERT für neue Felder
- **Realtime:** Supabase Realtime-Subscriptions für live Updates im ChatFeed
- **Routing:** Next.js App Router mit `(app)/` Layout-Gruppe (enthält BottomTabBar)
- **UI-Sprache:** Komplett Deutsch (de-CH), inkl. Fehlermeldungen und Zod-Messages
- **Background Tasks:** `after()` für fire-and-forget nach Server Action Response

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/lib/ai/providers/claude.ts` | Claude Tool-Definition + System-Prompt — hier `symptom_time` und `duration` hinzufügen |
| `src/lib/ai/pipeline.ts` | 7-Step Extraction Pipeline — hier `occurred_at`-Sync nach Extraktion |
| `src/lib/ai/clarification.ts` | Clarification-Fragen-Generierung — Priority-Map für neue Felder erweitern |
| `src/lib/actions/symptom-actions.ts` | `correctExtractedField()` — INSERT-Logik für Nacherfassung + `occurred_at`-Sync |
| `src/types/database.ts` | Auto-generierte DB-Typen — `occurred_at` zu `symptom_events` hinzufügen |
| `src/types/ai.ts` | ExtractionField, ExtractionResult — `Correction.originalValue` auf `string | null` geändert (F1: nullable original_value Support) |
| `src/components/capture/chat-feed.tsx` | ChatFeed — Click-Handler für Navigation zum Edit-Screen |
| `src/components/capture/chat-bubble.tsx` | ChatBubble — Klickbar machen für Navigation |
| `src/types/symptom.ts` | Zod-Schemas — `correctExtractedFieldSchema` ggf. um ISO-8601-Validierung für `symptom_time` erweitern |
| `supabase/migrations/00004_symptom_events.sql` | Bestehende symptom_events-Tabelle (Referenz) |
| `supabase/migrations/00005_extracted_data.sql` | Bestehende extracted_data-Tabelle (Referenz) |
| `supabase/migrations/00006_corrections.sql` | Bestehende corrections-Tabelle (Referenz) |
| `src/app/(app)/page.tsx` | Hauptseite mit ChatFeed — Handler für Navigation erweitern |

### Technical Decisions

- `symptom_time` in `extracted_data` (Konfidenz + Audit) PLUS `occurred_at` auf `symptom_events` (effiziente Queries)
- Einzelne Route `/event/[id]` mit direkt editierbaren Feldern statt separatem View/Edit-Modus
- `correctExtractedField()` erweitern um INSERT-Logik für Nacherfassung (neues Feld wo vorher NULL)
- Dauer intern immer als Minuten speichern, UI konvertiert mit Einheiten-Toggle
- `occurred_at`-Sync idempotent: egal ob KI setzt oder User editiert
- **WICHTIG:** `correctExtractedField()` prüft aktuell ob die `extracted_data`-Row existiert und macht nur UPDATE. Für Nacherfassung muss ein INSERT-Pfad hinzugefügt werden (neue Row mit `confirmed: true` + Correction-Eintrag mit `original_value: null`). Dafür: `corrections.original_value` muss nullable gemacht werden (Migration) UND ein INSERT RLS-Policy auf `extracted_data` muss existieren.
- **KORREKTUR:** PostgreSQL erlaubt nicht `DEFAULT other_column`. Migration nutzt `DEFAULT now()` + Backfill: `UPDATE symptom_events SET occurred_at = created_at` + `NOT NULL` Constraint
- **(F5-Fix) SICHERHEIT:** `correctExtractedField()` hat aktuell KEINEN Ownership-Check — muss vor jeder DB-Operation prüfen ob Event dem User gehört
- **(F6-Fix):** `occurred_at`-Sync IMMER über Supabase Client `.update()` — NIEMALS String-Interpolation in SQL
- **(F13-Fix):** `symptom_time`-Werte VOR Sync in `occurred_at` mit `new Date()` + `isNaN()` auf Gültigkeit prüfen
- Edit-Screen als Next.js Server Component (Daten laden) + Client Component (Formular-Interaktion) — konsistent mit `page.tsx` Pattern
- `symptom_time` wird als ISO-8601 String gespeichert (z.B. `"2026-03-10T08:00:00+01:00"`) im `value`-Feld der `extracted_data`
- `created_at` des Events wird als Referenz im Claude-Prompt übergeben, damit relative Zeitangaben ("gestern morgen", "vor 2 Stunden") korrekt aufgelöst werden
- Navigation: Ganzer Bubble-Bereich klickbar (Chevron-Icon rechts), `e.stopPropagation()` auf interaktive Buttons (Symptom beenden, Retry)
- Edit-Screen: ← Zurück-Button oben links mit Fallback auf `/` bei fehlendem Browser-History (Deep-Links)
- Dauer intern immer als Minuten, UI bietet Min/Std/Tage Toggle. Max 30 Tage (43200 Min) als obere Grenze
- Speichern nur bei tatsächlicher Änderung (Dirty-Check gegen `initialValues`)

## Implementation Plan

### Tasks

#### Task 1: DB-Migration — `occurred_at` + `corrections.original_value` nullable + INSERT RLS
- [x] Task 1: Supabase-Migration für Schema-Änderungen
  - File: `supabase/migrations/00014_occurred_at_and_nullable_correction.sql`
  - Action:
    - **1a) `occurred_at` auf `symptom_events`:**
      - `ALTER TABLE symptom_events ADD COLUMN occurred_at TIMESTAMPTZ DEFAULT now();`
      - `UPDATE symptom_events SET occurred_at = created_at;`
      - `ALTER TABLE symptom_events ALTER COLUMN occurred_at SET NOT NULL;`
      - `CREATE INDEX idx_symptom_events_occurred_at ON symptom_events(occurred_at);`
      - RLS: Bestehende SELECT/UPDATE Policies decken `occurred_at` automatisch ab
    - **1b) `corrections.original_value` nullable machen (F1-Fix):**
      - `ALTER TABLE corrections ALTER COLUMN original_value DROP NOT NULL;`
      - Begründung: Nacherfassung (neues Feld erstmals befüllen) hat keinen Original-Wert → `NULL` ist der korrekte Wert
    - **1c) INSERT RLS-Policy auf `extracted_data` für Patient (F2-Fix):**
      - `CREATE POLICY "Patient kann eigene extracted_data erstellen" ON extracted_data FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM symptom_events WHERE id = symptom_event_id AND account_id = auth.uid()));`
      - Begründung: `correctExtractedField()` nutzt `createServerClient()` (mit RLS). Aktuell gibt es nur SELECT/UPDATE Policies. INSERT für Nacherfassung braucht eigenen Policy.

#### Task 2: TypeScript-Typen aktualisieren
- [x] Task 2: `occurred_at` in DB-Typen ergänzen
  - File: `src/types/database.ts`
  - Action: `occurred_at: string` zu `symptom_events` Row/Insert/Update Typen hinzufügen
  - Notes: Insert/Update als optional (`occurred_at?: string`) da DB-Default greift

#### Task 3: Claude Tool-Definition + System-Prompt erweitern
- [x] Task 3: `symptom_time` und `duration` zur KI-Extraktion hinzufügen
  - File: `src/lib/ai/providers/claude.ts`
  - Action:
    - **System-Prompt erweitern:**
      - Neuen Abschnitt hinzufügen: "Bei allen Events extrahiere zusätzlich:"
      - `symptom_time`: ISO-8601 Zeitpunkt wann das Symptom aufgetreten ist. Referenzzeitpunkt der Meldung wird als Kontext mitgeliefert. Bei relativen Angaben ("gestern morgen") entsprechend umrechnen. Wenn keine Zeitangabe → `null` (Fallback auf Erfassungszeit)
      - `duration`: Dauer des Symptoms in Minuten als Zahl. Nur wenn explizit oder ableitbar erwähnt. Sonst `null`.
      - Konfidenz-Regeln: "Gestern um 14 Uhr" → 90+, "Gestern Morgen" → 75 (Schätzung ~08:00), "Nach dem Frühstück" → 65 (vage)
    - **Tool-Definition (F16-Fix):** Tool-`description` erweitern um Zeitpunkt und Dauer explizit zu erwähnen. Optional: `fieldName` in der Tool-Schema-Description um `symptom_time` und `duration` als empfohlene Werte ergänzen — stärkt LLM-Guardrails gegen willkürliche Feldnamen
  - Notes: `created_at` des Events muss als Kontext im User-Message mitgegeben werden (nicht im System-Prompt, da pro Event unterschiedlich)

#### Task 4: Pipeline — `created_at` an Claude übergeben + `occurred_at`-Sync
- [x] Task 4: Extraction Pipeline erweitern
  - File: `src/lib/ai/pipeline.ts`
  - Action:
    - **Step 4 (Claude Extraction):** `created_at` des Events als Kontext-Prefix im `rawInput` übergeben: `Referenzzeitpunkt der Meldung: {event.created_at}\n\n{rawInput}`
    - **Neuer Step nach Insert extracted_data:** `occurred_at`-Sync:
      - Prüfe ob `symptom_time`-Feld in den extrahierten Daten vorhanden ist
      - **(F6-Fix):** Sync IMMER über Supabase Client: `supabase.from('symptom_events').update({ occurred_at: symptomTimeValue }).eq('id', eventId)` — KEINE String-Interpolation
      - **(F13-Fix):** Vor Sync: `new Date(symptomTimeValue)` Validierung — bei ungültigem Datum Fallback auf `created_at`
      - Wenn kein `symptom_time`: `supabase.from('symptom_events').update({ occurred_at: event.created_at }).eq('id', eventId)` (expliziter Fallback)
  - File: `src/lib/ai/extract.ts`
  - Action: `extractSymptomData()` Signatur erweitern — neuen optionalen Parameter `referenceTime?: string` durchreichen an Provider

#### Task 5: Clarification-Fragen für neue Felder + Naming-Fix
- [x] Task 5: Priority-Map und Templates für `symptom_time` und `duration` erweitern
  - File: `src/lib/ai/clarification.ts`
  - Action:
    - **(F3-Fix) KRITISCH — Naming-Konvention prüfen:** Die bestehende `FIELD_PRIORITY`-Map nutzt teilweise deutsche Keys (`Körperregion`, `Seite` etc.) während Claude englische `fieldName`-Werte liefert (`body_region`, `side`). Die neuen Felder `symptom_time` und `duration` MÜSSEN dieselbe Konvention nutzen wie die existierenden Claude-Outputs. **Vor dem Hinzufügen:** Prüfen welche Konvention `FIELD_PRIORITY` nutzt und ggf. auf einheitliche englische Keys (matching Claude output) umstellen, ODER die Lookup-Logik anpassen um beide Formate zu matchen.
    - Priority-Map: `symptom_time: 0` (höchste Priorität, vor body_region), `duration: 6` (niedrigste)
    - Template `symptom_time`: "Wann genau ist das Symptom aufgetreten?" — Optionen: "Gerade eben", "Vor 1 Stunde", "Heute Morgen", "Gestern" + Freitext erlaubt
    - Template `duration`: "Wie lange hat das Symptom angedauert?" — Optionen: "Wenige Minuten", "30 Minuten", "1 Stunde", "Mehrere Stunden", "Mehrere Tage" + Freitext erlaubt

#### Task 6: Server Action — `correctExtractedField()` erweitern
- [x] Task 6a: Ownership-Check hinzufügen (F5-Fix)
  - File: `src/lib/actions/symptom-actions.ts`
  - Action:
    - **(F5-Fix) SICHERHEITSLÜCKE:** `correctExtractedField()` hat aktuell keinen Ownership-Check (anders als `answerClarification()`). **VOR jeder DB-Operation:** Laden des `symptom_events`-Records und prüfen ob `account_id === auth.uid()`. Bei Mismatch → `{ error: { error: 'Nicht autorisiert', code: 'UNAUTHORIZED' } }` zurückgeben.

- [x] Task 6b: INSERT-Logik für Nacherfassung hinzufügen
  - File: `src/lib/actions/symptom-actions.ts`
  - Action:
    - In `correctExtractedField()`: Wenn `extracted_data`-Row für `(eventId, fieldName)` nicht existiert:
      - INSERT neue `extracted_data`-Row mit `value: newValue`, `confidence: 100`, `confirmed: true`
      - INSERT `corrections`-Row mit `original_value: null`, `corrected_value: newValue` (nullable dank F1-Migration)
    - Bestehender UPDATE-Pfad bleibt unverändert
  - Notes: UNIQUE-Index `(symptom_event_id, field_name)` auf `extracted_data` verhindert Duplikate. INSERT RLS-Policy aus Task 1c ermöglicht INSERT via `createServerClient()`.

- [x] Task 6c: `occurred_at`-Sync bei `symptom_time`-Änderung
  - File: `src/lib/actions/symptom-actions.ts`
  - Action:
    - In `correctExtractedField()`: Nach UPDATE/INSERT prüfen ob `fieldName === 'symptom_time'`
    - **(F13-Fix):** Vor dem Sync: Validierung ob `newValue` ein gültiger ISO-8601 String ist. Nutze `new Date(newValue)` + `isNaN()` Check. Bei ungültigem Datum: Wert NICHT in `occurred_at` übernehmen, stattdessen Warnung loggen und `occurred_at` unverändert lassen.
    - **(F6-Fix):** `occurred_at`-Sync IMMER über Supabase Client `.update({ occurred_at: newValue }).eq('id', eventId)` — NIEMALS String-Interpolation in SQL. Gilt auch für Pipeline (Task 4).
    - Gleiche Logik auch in `answerClarification()` hinzufügen
  - Notes: Idempotent — egal ob KI oder User den Wert setzt

- [x] Task 6d: `revalidatePath` erweitern (F14-Fix)
  - File: `src/lib/actions/symptom-actions.ts`
  - Action:
    - In `correctExtractedField()`: Zusätzlich zu `revalidatePath('/')` auch `revalidatePath(\`/event/${eventId}\`)` aufrufen, damit der Edit-Screen nach Korrekturen nicht stale Daten zeigt
    - Gleiche Logik für `answerClarification()` und `confirmSymptomEvent()`

#### Task 7: ChatBubble klickbar machen
- [x] Task 7: Navigation zum Edit-Screen aus ChatBubble
  - File: `src/components/capture/chat-bubble.tsx`
  - Action:
    - Neuer optionaler Prop: `onNavigate?: (eventId: string) => void`
    - Wrapper-`div` mit `onClick={() => onNavigate?.(eventId)}` und `cursor-pointer`
    - Chevron-Icon (›) am rechten Rand bei confirmed/extracted Events anzeigen
    - `e.stopPropagation()` auf bestehende interaktive Elemente: "Symptom beenden"-Button, Retry-Button, Foto-Thumbnails
  - Notes: Nur für Events mit `status !== 'pending'` klickbar (pending hat noch nichts zum Editieren)

#### Task 8: ChatFeed — Navigation-Handler durchreichen
- [x] Task 8: `onNavigate` Prop und Handler im ChatFeed
  - File: `src/components/capture/chat-feed.tsx`
  - Action:
    - Neuer Prop: `onNavigateToEvent?: (eventId: string) => void`
    - An alle ChatBubble-Instanzen als `onNavigate` durchreichen
    - Auch an confirmed-State Bubbles durchreichen (besonders wichtig — aktuell read-only)
  - File: `src/app/(app)/page.tsx`
  - Action:
    - `const router = useRouter()` importieren
    - Handler: `const handleNavigateToEvent = (eventId: string) => router.push(\`/event/${eventId}\`)`
    - An ChatFeed als `onNavigateToEvent` übergeben

#### Task 9: Edit-Screen Route + Server Component
- [x] Task 9: Neue Route `/event/[id]` erstellen
  - File: `src/app/(app)/event/[id]/page.tsx`
  - Action:
    - Server Component: Lädt Event + `extracted_data` + `corrections` via `createServerClient()`
    - Auth-Check: Verifiziert dass Event dem eingeloggten User gehört
    - 404 wenn Event nicht existiert oder nicht dem User gehört
    - Rendert `EventEditForm` Client Component mit geladenen Daten
    - Props an EventEditForm: `event`, `extractedFields`, `corrections`, `allFieldNames` (definierte Felder für Nacherfassung)
  - **(F10-Fix) Layout:** Der Edit-Screen liegt unter `(app)/` und erbt dadurch das Layout mit `BottomTabBar`. Zwei Optionen:
    - **Option A (empfohlen):** Route in eine eigene Layout-Gruppe verschieben: `src/app/(event)/event/[id]/page.tsx` mit eigenem `layout.tsx` ohne BottomTabBar
    - **Option B:** `BottomTabBar` Component bedingt ausblenden via `usePathname()` Check (z.B. wenn Pfad mit `/event/` beginnt)
    - Entscheidung dem Entwickler überlassen, aber BottomTabBar MUSS auf dem Edit-Screen ausgeblendet sein.
  - Notes: `allFieldNames` für Symptome: `['symptom_name', 'body_region', 'side', 'symptom_type', 'intensity', 'symptom_time', 'duration']` (F11-Fix: KEINE `activity`/`remarks` — existieren nicht im Codebase)

#### Task 10: EventEditForm Client Component
- [x] Task 10: Edit-Formular mit allen Attributen
  - File: `src/components/event/event-edit-form.tsx`
  - Action:
    - **Header (F7-Fix):** ← Zurück-Button mit Fallback-Logik: Prüfe `window.history.length > 1` → `router.back()`, sonst `router.push('/')`. Damit funktioniert Navigation auch bei Deep-Links, Bookmarks oder Page-Refresh.
    - **Original-Meldung:** `raw_input` als read-only Textblock mit Label "Ursprüngliche Meldung"
    - **Felder-Sektion — gruppiert:**
      - **Zeitpunkt & Dauer** (oben):
        - `symptom_time`: Datum+Uhrzeit-Picker, vorbelegt mit extrahiertem Wert oder `occurred_at`
        - `duration`: Numerisches Input + Einheiten-Toggle **(F9-Fix):** Min/Std/**Tage** (3 Optionen). Intern immer Minuten. UI konvertiert: Tage = `value / 1440`, Std = `value / 60`. Validierung: Max 30 Tage (43200 Min) als obere Grenze.
      - **Symptom-Details** (mitte):
        - `symptom_name`: Text-Input
        - `body_region`: Text-Input
        - `side`: Select (Links/Rechts/Beidseits)
        - `symptom_type`: Text-Input
        - `intensity`: Number-Input (1-10) oder Slider
    - **(F11-Fix):** Keine `activity`- und `remarks`-Felder im Edit-Screen — diese Felder existieren nicht in der aktuellen Extraktionslogik und werden von Claude nicht produziert. Falls sie in Zukunft hinzugefügt werden, können sie hier ergänzt werden.
    - **Leere Felder:** Sichtbar mit Placeholder "Nicht erfasst" und "Hinzufügen"-Affordance
    - **Konfidenz-Indikator:** Farbiger Dot pro Feld (wie in SymptomTag)
    - **(F8-Fix) Speichern:** Pro Feld einzeln via `correctExtractedField()` Action — aber NUR bei tatsächlicher Änderung (Dirty-Check). Logik: `initialValues`-Map beim Laden befüllen, bei Blur/Save prüfen ob `currentValue !== initialValues[fieldName]`. Nur bei Differenz die Action aufrufen. Verhindert unnötige `corrections`-Einträge und Server-Calls.
    - **Änderungshistorie:** Ausklappbarer Bereich unten via `CorrectionHistory` Component
  - Notes: State-Management mit `useState` pro Feld. `initialValues`-Ref für Dirty-Tracking. Optimistic Updates. Fehler-Handling pro Feld.

#### Task 11: CorrectionHistory Component
- [x] Task 11: Änderungshistorie-Anzeige
  - File: `src/components/event/correction-history.tsx`
  - Action:
    - Props: `corrections: Correction[]` (gefiltert auf dieses Event)
    - Ausklappbar mit "N Änderungen" Label
    - Timeline-Darstellung: Datum + Feldname + "Original → Neu"
    - Bei `original_value: null`: "Nachträglich erfasst" statt Original anzeigen
    - Sortiert nach `created_at` DESC (neueste zuerst)
  - Notes: Bestehende `corrections`-Tabelle liefert alle Daten. Kein neues DB-Query nötig — Server Component in Task 9 lädt sie bereits.

#### ~~Task 12: ENTFERNT (F12-Fix)~~
_Corrections werden im Edit-Screen Server Component geladen (Task 9) — kein Client-Side Hook nötig. Task war widersprüchlich und dead weight._

#### Task 12: Unit Tests
- [x] Task 12: Tests für neue Funktionalität
  - File: `src/__tests__/event-edit.test.tsx`
  - Action:
    - EventEditForm: Rendering aller Felder, leere Felder sichtbar, Speichern einzelner Felder, Einheiten-Toggle
    - CorrectionHistory: Ausklappen, Timeline-Darstellung, "Nachträglich erfasst" Label
  - File: `src/__tests__/symptom-actions.test.ts` (erweitern)
  - Action:
    - `correctExtractedField()` INSERT-Pfad testen (neues Feld wo vorher keines war)
    - `occurred_at`-Sync testen bei `symptom_time`-Änderung
  - File: `src/__tests__/lib/ai/extract.test.ts` (erweitern)
  - Action:
    - Claude Tool Response mit `symptom_time` und `duration` Feldern testen
    - Relative Zeitangaben-Extraktion testen (Fixtures)
  - File: `src/__tests__/chat-bubble.test.tsx` (erweitern)
  - Action:
    - Klickbarkeit testen, `onNavigate` Callback, `e.stopPropagation` auf Buttons

#### Task 13: E2E Tests
- [x] Task 13: Playwright E2E Tests für Edit-Screen
  - File: `e2e/event-edit.spec.ts`
  - Action:
    - Test: Tap auf bestätigten Eintrag → Edit-Screen öffnet sich
    - Test: Alle Felder sichtbar inkl. leere Felder
    - Test: Feld editieren → Speichern → Wert aktualisiert
    - Test: Nacherfassung eines leeren Feldes
    - Test: Änderungshistorie ausklappen → Einträge sichtbar
    - Test: Zurück-Button → ChatFeed
  - File: `e2e/page-objects/event-edit.page.ts` (neu)
  - Action: Page Object für Edit-Screen (goto, editField, saveField, openHistory, goBack)

#### Task 14: Build-Verifikation
- [x] Task 14: Lint, Tests, Build
  - Action:
    - `npm run lint` fehlerfrei
    - `npm run test` alle Tests bestanden
    - `npm run build` erfolgreich
    - `npx prettier --write` auf alle geänderten Dateien

### Acceptance Criteria

- [x] AC 1: **Given** ein User gibt "Gestern Morgen hatte ich zwei Stunden Kopfschmerzen" ein, **when** die KI-Extraktion läuft, **then** werden `symptom_time` (ISO-8601, ~gestern 08:00) und `duration` (120 Minuten) als `extracted_data`-Rows mit Konfidenz-Scores gespeichert
- [x] AC 2: **Given** ein User gibt "Kopfschmerzen" ein (ohne Zeitangabe), **when** die KI-Extraktion läuft, **then** wird `symptom_time` NICHT extrahiert und `occurred_at` auf `symptom_events` wird auf `created_at` gesetzt (Fallback)
- [x] AC 3: **Given** ein Symptom-Event im ChatFeed (egal ob `extracted`, `confirmed` oder `extraction_failed`), **when** der User auf den Eintrag tappt, **then** wird der Edit-Screen `/event/[id]` geöffnet
- [x] AC 4: **Given** der Edit-Screen ist geöffnet, **when** der User das Formular sieht, **then** sind alle definierten Attribute sichtbar (auch leere mit "Nicht erfasst"-Placeholder), die Original-Meldung wird als Kontext angezeigt, und ein ← Zurück-Button ist vorhanden
- [x] AC 5: **Given** ein extrahiertes Feld im Edit-Screen, **when** der User den Wert ändert und speichert, **then** wird `extracted_data.value` aktualisiert, `extracted_data.confirmed = true` gesetzt, und ein `corrections`-Eintrag mit `original_value` und `corrected_value` erstellt
- [x] AC 6: **Given** ein leeres Feld (nicht von KI extrahiert) im Edit-Screen, **when** der User einen Wert eingibt und speichert, **then** wird eine neue `extracted_data`-Row mit `confirmed: true` und `confidence: 100` erstellt, und ein `corrections`-Eintrag mit `original_value: NULL` erstellt (DB erlaubt NULL dank Migration)
- [x] AC 7: **Given** der User ändert das `symptom_time`-Feld im Edit-Screen, **when** der Wert gespeichert wird, **then** wird `occurred_at` auf `symptom_events` idempotent synchronisiert
- [x] AC 8: **Given** mehrere Änderungen an verschiedenen Feldern eines Events, **when** der User die Änderungshistorie öffnet, **then** werden alle Änderungen chronologisch angezeigt mit Datum, Feldname, Original-Wert und neuem Wert
- [x] AC 9: **Given** der Edit-Screen für ein bestätigtes Symptom (`status: 'confirmed'`), **when** der User ein Feld editiert, **then** funktioniert das Edit identisch wie bei nicht-bestätigten Events (kein read-only Zustand)
- [x] AC 10: **Given** die Dauer wird im Edit-Screen angezeigt, **when** der User den Einheiten-Toggle wechselt (Min/Std/Tage), **then** konvertiert die Anzeige korrekt (z.B. 120 Min ↔ 2 Std, 4320 Min ↔ 3 Tage), und der gespeicherte Wert bleibt immer in Minuten
- [x] AC 11: **Given** der User navigiert direkt zu `/event/[id]` (Deep-Link, Bookmark, Refresh), **when** er den Zurück-Button drückt, **then** wird er zur Hauptseite (`/`) navigiert (nicht zu einer externen URL oder leerer Seite)
- [x] AC 12: **Given** der User ändert ein Feld im Edit-Screen NICHT (tippt rein und verlässt es mit gleichem Wert), **when** das Blur-Event feuert, **then** wird KEINE Server-Action aufgerufen und KEIN `corrections`-Eintrag erstellt

## Additional Context

### Dependencies

- Keine neuen externen Libraries nötig
- Abhängig von bestehender `corrections`-Tabelle (Migration 00006)
- Abhängig von bestehendem UNIQUE-Index `(symptom_event_id, field_name)` auf `extracted_data` (Migration 00007)
- Supabase CLI muss laufen für Migration-Testing (`supabase db reset`)

### Testing Strategy

**Unit Tests (Vitest + React Testing Library):**
- EventEditForm: Rendering, Feld-Interaktionen, Speichern, Einheiten-Toggle
- CorrectionHistory: Rendering, Ausklappen, Nacherfassung-Label
- correctExtractedField: INSERT-Pfad, occurred_at-Sync
- Claude Extraction: symptom_time + duration in Tool Response

**E2E Tests (Playwright):**
- Navigation: ChatFeed → Edit-Screen → Zurück
- Feld editieren und speichern
- Nacherfassung eines leeren Feldes
- Änderungshistorie anzeigen

**Manuelles Testing:**
- Verschiedene Zeitangaben testen ("gestern morgen", "vor 2 Stunden", "letzte Woche Dienstag")
- Schweizerdeutsch-Zeitangaben ("geschter am Morge")
- Mitternachts-Übergang bei relativen Zeitangaben
- Mobile Touch-Interaktion (Bubble-Tap, Formular-Usability)

### Notes

**Risiken:**
- KI-Zeitextraktion mit vagen Angaben ("nach dem Frühstück") kann ungenau sein — deshalb Edit-Screen als Korrektur-Möglichkeit kritisch
- Relative Zeitberechnungen über Tagesgrenzen (Mitternacht, Zeitzonen) erfordern sorgfältige Prompt-Formulierung
- `occurred_at`-Sync muss robust sein gegen ungültige ISO-8601 Strings aus User-Input

**Bekannte Einschränkungen:**
- Medikamenten-Events werden in dieser Iteration nicht im Edit-Screen unterstützt
- Keine Batch-Edits — jedes Feld wird einzeln gespeichert
- Änderungshistorie zeigt keine KI-Extraktions-Einträge (nur manuelle Korrekturen via `corrections`-Tabelle)
- `activity` und `remarks` Felder sind NICHT im Edit-Screen enthalten — sie existieren nicht in der aktuellen Extraktionslogik

**Zusätzlich geänderte Dateien (nicht im ursprünglichen Spec-Scope):**
- `src/types/ai.ts`: `Correction.originalValue: string | null` (nötig für nullable `corrections.original_value` aus F1)
- `src/lib/ai/prompt-enrichment.ts`: `CorrectionGroup.originalValue: string | null` (konsistent mit F1)
- `src/hooks/use-symptom-events.ts`: `occurred_at: now` im optimistischen Event-Objekt (TS-Compliance nach `occurred_at NOT NULL`)
- `package.json` + `.husky/`: Husky + lint-staged für pre-commit hooks (Scope-Erweiterung)

**Adversarial Review Fixes (eingearbeitet):**
- F1: `corrections.original_value` → nullable (Migration)
- F2: INSERT RLS-Policy auf `extracted_data` für Patient (Migration)
- F3: Naming-Konvention in `clarification.ts` prüfen und vereinheitlichen (Task 5)
- F4: Migration 00014 statt 00015
- F5: Ownership-Check in `correctExtractedField()` (Task 6a)
- F6: Supabase `.update()` statt SQL-String-Interpolation (Task 4, 6c)
- F7: `router.back()` mit Fallback auf `/` (Task 10)
- F8: Dirty-Check vor Speichern — nur bei tatsächlicher Änderung (Task 10)
- F9: Dauer-Toggle um "Tage" erweitert + Max 30 Tage (Task 10)
- F10: BottomTabBar auf Edit-Screen ausblenden (Task 9)
- F11: `activity`/`remarks` Phantom-Felder entfernt (Task 10)
- F12: Task 12 (Hook-Change) entfernt — Corrections server-side in Task 9
- F13: ISO-8601 Validierung vor `occurred_at`-Sync (Task 4, 6c)
- F14: `revalidatePath` für `/event/[id]` (Task 6d)
- F15: Page Object in `files_to_create` ergänzt
- F16: Tool-Description um Zeit/Dauer erweitert (Task 3)

**Zukunfts-Überlegungen (Out of Scope):**
- Timeline-View basierend auf `occurred_at` (vorbereitender Index wird bereits angelegt)
- Muster-Erkennung ("Kopfschmerzen immer morgens")
- Medikamenten-Edit-Screen (gleiche Architektur, andere Felder)
- Batch-Confirm/Edit über mehrere Events
