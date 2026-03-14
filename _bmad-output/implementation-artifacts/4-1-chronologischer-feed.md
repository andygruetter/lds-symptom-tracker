# Story 4.1: Chronologischer Symptom-Feed

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Patient,
I want meine erfassten Symptom-Events in einem chronologischen Feed ansehen,
So that ich einen schnellen Überblick über meine Gesundheitshistorie bekomme (FR16).

## Acceptance Criteria

1. **Given** ein authentifizierter Patient wechselt zum "Auswertung"-Tab **When** der Feed geladen wird **Then** werden alle bestätigten Events chronologisch sortiert angezeigt (neueste zuerst)
2. **And** jeder Eintrag zeigt: Datum/Uhrzeit, Symptombezeichnung, Event-Typ (Symptom/Medikament), Intensität
3. **And** Symptom- und Medikamenten-Events sind visuell unterscheidbar
4. **And** ein Skeleton-Screen wird während des Ladens angezeigt
5. **And** bei leerem Zustand wird eine freundliche Nachricht angezeigt ("Kein Eintrag — ein guter Tag!", Anti-Tagebuch UX)
6. **And** der Feed lädt mit 6 Monaten Daten in < 2 Sekunden (NFR3)
7. **And** Infinite Scroll oder Pagination für ältere Einträge

## Tasks / Subtasks

- [ ] Task 1: DB-Abfrage-Layer für chronologischen Feed (AC: #1, #6, #7)
  - [ ] `src/lib/db/insights.ts` erstellen
  - [ ] `getChronologicalFeed(supabase: SupabaseClient, accountId: string, options?: { cursor?: string, limit?: number }): Promise<PaginatedFeed>`
  - [ ] Query: `symptom_events` LEFT JOIN `extracted_data` LEFT JOIN `event_photos` (GROUP BY für photo_count) WHERE `status = 'confirmed'` AND `deleted_at IS NULL` ORDER BY `occurred_at DESC`
  - [ ] **Cursor-based Pagination** via `occurred_at`: `WHERE occurred_at < :cursor` (kein OFFSET/LIMIT — performanter bei grossen Datasets, konsistent bei neuen Einträgen)
  - [ ] Bei erstem Load: kein Cursor → neueste Events zuerst
  - [ ] Return: `PaginatedFeed` mit `nextCursor` (= `occurred_at` des letzten Events) und `hasMore`
  - [ ] Photo-Count via `LEFT JOIN event_photos` + `COUNT(ep.id)` + `GROUP BY` (KEIN Subquery-per-Row — vermeidet N+1-ähnliches Anti-Pattern)
  - [ ] Performance: Index auf `(account_id, status, deleted_at, occurred_at DESC)` falls nötig — prüfen ob bestehende Indizes ausreichen

- [ ] Task 2: TypeScript-Typen für Analytics (AC: #1, #2)
  - [ ] `src/types/analytics.ts` erstellen
  - [ ] `FeedEvent` Typ: `{ id: string, eventType: 'symptom' | 'medication', occurredAt: string, createdAt: string, endedAt: string | null, rawInput: string, symptomName: string | null, bodyRegion: string | null, side: string | null, symptomType: string | null, intensity: number | null, medication?: string | null, dosage?: string | null, photoCount: number, hasAudio: boolean }`
  - [ ] `FeedFilter` Typ: `{ eventType?: 'symptom' | 'medication' | 'all', timeRange?: '30d' | '3m' | '6m' | 'all' }`
  - [ ] `PaginatedFeed` Typ: `{ events: FeedEvent[], nextCursor: string | null, hasMore: boolean }`

- [ ] Task 3: Auswertung-Seite (Server Component) (AC: #1, #4, #5)
  - [ ] `src/app/(app)/insights/page.tsx` umschreiben (aktuell Platzhalter)
  - [ ] Server Component: Auth-Check via `createServerClient()` + `getUser()`
  - [ ] Initial-Load: Erste 20 Events via `getChronologicalFeed()`
  - [ ] Daten an Client Component `<SymptomFeed>` weitergeben
  - [ ] `src/app/(app)/insights/loading.tsx` erstellen mit Skeleton-Screens

- [ ] Task 4: SymptomFeed Client Component (AC: #1, #2, #3, #7)
  - [ ] `src/components/insights/symptom-feed.tsx` erstellen (`'use client'`)
  - [ ] Props: `initialEvents: FeedEvent[]`, `initialCursor: string | null`, `hasMore: boolean`
  - [ ] **Datum-Gruppierung**: Events nach Tagen gruppieren mit Tages-Headern ("Heute", "Gestern", "14. März 2026")
  - [ ] `groupEventsByDay(events: FeedEvent[]): Map<string, FeedEvent[]>` Hilfsfunktion
  - [ ] Tages-Header: `text-sm font-medium text-muted-foreground` mit Sticky-Verhalten optional
  - [ ] Feed-Karten rendern mit `<FeedEventCard>` pro Event innerhalb der Tagesgruppen
  - [ ] "Mehr laden"-Button am Ende: zentriert, `text-muted-foreground`, mit Lade-Animation beim Klick
  - [ ] Server Action `loadMoreFeedEvents(cursor)` für weitere Events (cursor-basiert)
  - [ ] Neue Events an lokalen State appenden, Cursor aktualisieren

- [ ] Task 5: FeedEventCard Component (AC: #2, #3)
  - [ ] `src/components/insights/feed-event-card.tsx` erstellen
  - [ ] Symptom-Events: Terracotta-Akzent (linke Borderlinie `#C06A3C`), Symptomname, Körperregion, Intensität (1-10 Skala)
  - [ ] Medikamenten-Events: Stahlblau-Akzent (linke Borderlinie `#4A7FA5`), Medikamentname, Dosis
  - [ ] **Typ-Badge** oben rechts: "Symptom" in Terracotta-Muted-Hintergrund, "Medikament" in Stahlblau-Muted-Hintergrund (zusätzlich zur Borderlinie für schnelles Scannen)
  - [ ] Uhrzeit formatiert (deutsch: "09:30") — Datum kommt vom Tages-Header (Task 4)
  - [ ] Dauer anzeigen wenn `endedAt` vorhanden
  - [ ] Foto-Indikator (Kamera-Icon + Anzahl) wenn Fotos vorhanden
  - [ ] Audio-Indikator (Mikrofon-Icon) wenn Audio vorhanden
  - [ ] **Chevron-Right** (→) am rechten Rand als Tap-Affordance (erlerntes iOS-Pattern)
  - [ ] Tap → Navigation zu `/event/[id]` (bestehende Detail-Seite)
  - [ ] Touch-Target: Gesamte Karte tippbar (min 44px Höhe)

- [ ] Task 6: Empty State (AC: #5)
  - [ ] `src/components/insights/empty-feed.tsx` erstellen
  - [ ] Anti-Tagebuch UX: "Noch keine Einträge. Keine Eingabe = ein guter Tag."
  - [ ] Subtiles Icon (z.B. Sun oder Smile), keine traurigen Illustrationen
  - [ ] Keine Gamification ("Erstelle deinen ersten Eintrag!" — VERBOTEN)
  - [ ] Ton: Einladend, kein Druck

- [ ] Task 7: Server Action für Pagination (AC: #7)
  - [ ] `src/lib/actions/insights-actions.ts` erstellen
  - [ ] `loadMoreFeedEvents(cursor: string, limit?: number): Promise<ActionResult<PaginatedFeed>>`
  - [ ] Zod-Schema: `z.object({ cursor: z.string().datetime(), limit: z.number().int().min(1).max(50).default(20) })`
  - [ ] Auth-Check via `createServerClient()`
  - [ ] Return: `ActionResult<PaginatedFeed>` mit `nextCursor` (bestehender Pattern)

- [ ] Task 8: Tests (AC: #1-#7)
  - [ ] `src/__tests__/lib/db/insights.test.ts` — getChronologicalFeed: Sortierung, Cursor-Pagination, Leer-Ergebnis, nur confirmed Events, nextCursor-Berechnung (7 Tests)
  - [ ] `src/__tests__/components/insights/symptom-feed.test.tsx` — Feed rendern, leerer Zustand, Tages-Gruppierung, "Mehr laden"-Button, Cursor-Update (6 Tests)
  - [ ] `src/__tests__/components/insights/feed-event-card.test.tsx` — Symptom-Karte, Medikament-Karte, Typ-Badge, Chevron-Right, Uhrzeit-Formatierung, Foto/Audio-Indikatoren (8 Tests)
  - [ ] `src/__tests__/components/insights/empty-feed.test.tsx` — Anti-Tagebuch-Text, kein Gamification (2 Tests)
  - [ ] `src/__tests__/actions/insights-actions.test.ts` — loadMoreFeedEvents: Validierung, Auth, Ergebnis (4 Tests)
  - [ ] Bestehende Tests dürfen NICHT brechen
  - [ ] `npm run test` verifizieren

- [ ] Task 9: Build-Verifikation
  - [ ] `npx prettier --write` auf alle geänderten Dateien
  - [ ] `npm run lint` — keine neuen Fehler
  - [ ] `npm run build` — erfolgreich

## Dev Notes

### Scope-Abgrenzung (KRITISCH)

Diese Story implementiert:
- Chronologischer Feed mit Pagination auf der Auswertung-Seite
- Unterscheidung Symptom- vs. Medikamenten-Events
- Skeleton Loading State
- Anti-Tagebuch Empty State
- Tap-Navigation zur bestehenden Event-Detail-Seite (`/event/[id]`)

Gehört NICHT in diese Story:
- **Timeline-Ansicht über Monate** → Story 4.2
- **Symptom-Häufigkeits-Ranking** → Story 4.3
- **Event-Detail-Ansicht (Audio/Fotos/Galerie)** → Story 4.4 (bestehende `/event/[id]` Seite reicht vorerst)
- **Event-Löschen** → Story 4.5
- **Realtime-Updates im Feed** → Post-MVP (Feed ist read-only, kein Realtime nötig)
- **Filter/Suche im Feed** → Post-MVP (einfacher chronologischer Feed zuerst)
- **Arzt-Dashboard** → Epic 6

### Architektur-Entscheidungen

**Server Component + Client Boundary:**
- `insights/page.tsx` = Server Component (Auth + Initial Data Load)
- `<SymptomFeed>` = Client Component (Interaktivität, Pagination)
- `<FeedEventCard>` = Client Component (Tap-Handler)
- Kein Realtime-Subscription nötig — Feed ist read-only Auswertung

**Daten-Fetching Pattern:**
```
Server Component (page.tsx)
  → createServerClient() + getUser()
  → getChronologicalFeed(supabase, user.id, { limit: 20 })
  → <SymptomFeed initialEvents={events} initialCursor={cursor} hasMore={hasMore} />
```

**Cursor-based Pagination Pattern (Finding #1, #6):**
```
Client Component (SymptomFeed)
  → "Mehr laden" Button am Ende (zentriert, muted-foreground, Lade-Animation)
  → Server Action: loadMoreFeedEvents(cursor)   // cursor = occurred_at des letzten Events
  → WHERE occurred_at < :cursor ORDER BY occurred_at DESC LIMIT 20
  → Append zu lokalem State, neuen Cursor speichern
  → Kein OFFSET/LIMIT — Cursor ist performanter und konsistent bei neuen Einträgen
```

**Datum-Gruppierung (Finding #3):**
```
Events werden nach Tagen gruppiert:
  "Heute"          → [Event, Event]
  "Gestern"        → [Event]
  "14. März 2026"  → [Event, Event, Event]

Tages-Header: text-sm font-medium text-muted-foreground, visuell abgesetzt
```

**Query-Optimierung (NFR3: <2 Sekunden für 6 Monate):**
- `LIMIT 20` pro Seite — nur sichtbare Events laden
- LEFT JOIN mit `extracted_data` für Symptomname etc.
- LEFT JOIN mit `event_photos` + `COUNT(ep.id)` + `GROUP BY` für Photo-Count (Finding #2: kein Subquery-per-Row)
- `audio_url IS NOT NULL` für Audio-Indikator
- Cursor-based Pagination via `occurred_at` (Finding #1: kein OFFSET)
- Index: `symptom_events(account_id, status, deleted_at, occurred_at DESC)` — prüfen ob bestehend

### DB-Query (Referenz)

```sql
-- Cursor-based Pagination (Finding #1) + JOIN statt Subquery (Finding #2)
SELECT
  e.id,
  e.event_type,
  e.occurred_at,
  e.created_at,
  e.ended_at,
  e.raw_input,
  e.audio_url,
  ed.symptom_name,
  ed.body_region,
  ed.side,
  ed.symptom_type,
  ed.intensity,
  ed.medication,
  ed.dosage,
  COUNT(ep.id) AS photo_count
FROM symptom_events e
LEFT JOIN extracted_data ed ON ed.event_id = e.id
LEFT JOIN event_photos ep ON ep.event_id = e.id
WHERE e.account_id = $1
  AND e.status = 'confirmed'
  AND e.deleted_at IS NULL
  AND ($2::timestamptz IS NULL OR e.occurred_at < $2)  -- Cursor: NULL = erster Load
GROUP BY e.id, ed.id
ORDER BY e.occurred_at DESC
LIMIT $3;
```

### Bestehende Insights-Seite

Die aktuelle `src/app/(app)/insights/page.tsx` ist ein Platzhalter mit nur einem `<h1>Auswertung</h1>`. Diese Datei wird komplett überschrieben.

### UX-Spezifikation: FeedEventCard

```
── Heute ──────────────────────────   ← Tages-Header (Finding #3)

┌──────────────────────────────────┐
│ 09:30  [Symptom]          📷 2 → │  ← Typ-Badge (Finding #4) + Chevron (Finding #5)
│                                  │
│ ● Rückenschmerzen                │
│   Unterer Rücken, links         │
│   Intensität: 7/10  |  stechend │
│   Dauer: 3h 20min              │
└──────────────────────────────────┘

Symptom-Event: Terracotta-Akzent (links Borderlinie #C06A3C)
Typ-Badge: "Symptom" in bg-[#C06A3C]/10 text-[#C06A3C] (muted)

── Gestern ────────────────────────   ← Tages-Header

┌──────────────────────────────────┐
│ 20:15  [Medikament]        🎤 → │  ← Typ-Badge + Chevron
│                                  │
│ ◆ Dafalgan 1g                   │
│   Grund: Migräne                │
└──────────────────────────────────┘

Medikament-Event: Stahlblau-Akzent (links Borderlinie #4A7FA5)
Typ-Badge: "Medikament" in bg-[#4A7FA5]/10 text-[#4A7FA5] (muted)
```

- Card-basiertes Layout (shadcn `Card` nutzen)
- **Datum-Gruppierung** nach Tagen mit Headern: "Heute", "Gestern", oder "14. März 2026" (Finding #3)
- Linke Borderlinie zur visuellen Unterscheidung Symptom/Medikament
- **Typ-Badge** oben rechts: "Symptom" oder "Medikament" in farblich abgestimmtem Muted-Hintergrund (Finding #4)
- **Chevron-Right** (→) am rechten Rand als Tap-Affordance (Finding #5)
- ● für Symptom, ◆ für Medikament
- Touch-Target: Gesamte Karte tippbar (min 44px Höhe)
- Uhrzeit in Karte (Datum kommt vom Tages-Header)
- Uhrzeit formatiert mit `Intl.DateTimeFormat('de-CH', { hour: '2-digit', minute: '2-digit' })`
- Tages-Header formatiert: Heute/Gestern relativ, sonst `Intl.DateTimeFormat('de-CH', { day: 'numeric', month: 'long', year: 'numeric' })`

### Anti-Tagebuch Empty State

```
┌──────────────────────────────────┐
│                                  │
│         ☀️ (subtiles Icon)       │
│                                  │
│   Noch keine Einträge.          │
│   Keine Eingabe = ein guter Tag.│
│                                  │
│   Deine Auswertung wächst       │
│   mit jedem Eintrag.            │
│                                  │
└──────────────────────────────────┘
```

- Kein trauriges Illustration
- Keine Gamification
- Ton: Warmherzig, ermutigend

### Skeleton Loading State

```
┌──────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓  ▓▓▓▓▓▓           │
│                                  │
│ ▓▓ ▓▓▓▓▓▓▓▓▓▓▓▓▓               │
│    ▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ▓▓▓▓▓       │
│    ▓▓▓▓▓▓▓▓  ▓▓▓▓▓▓            │
└──────────────────────────────────┘
(wiederholt 3x)
```

- `loading.tsx` in `insights/` Ordner → automatische Next.js Suspense Boundary
- shadcn `Skeleton` Component nutzen
- 3 Skeleton-Karten als Platzhalter

### Abhängigkeiten

- **Story 2.2/2.3**: `extracted_data` Tabelle mit Symptom-Daten (VORAUSSETZUNG ✓)
- **Story 3.3**: `event_photos` Tabelle (VORAUSSETZUNG ✓)
- **Migration 00014**: `occurred_at` Feld in `symptom_events` (VORAUSSETZUNG ✓)
- **Bestehende `/event/[id]` Seite**: Wird als Detail-Ansicht genutzt (VORAUSSETZUNG ✓)

### Learnings aus Story 3.6

- **RPC-Funktionen**: Für komplexe DB-Operationen, hier nicht nötig (einfacher SELECT)
- **Server Component Pattern**: Async `createServerClient()` + `getUser()` funktioniert zuverlässig
- **Fire-and-Forget**: Nicht relevant hier (kein Background-Processing)
- **Route-Konvention**: `/more/` statt `/mehr/` — analog `/insights/` nicht `/auswertung/` (bereits korrekt)
- **Mehr-Seite Pattern**: Card-basiertes Layout mit `divide-y divide-border rounded-xl bg-card`

### Farb-Referenz (Data Visualization)

| Kategorie | Hex | CSS Variable |
|-----------|-----|-------------|
| Symptom (Terracotta) | `#C06A3C` | `--color-primary` |
| Medikament (Stahlblau) | `#4A7FA5` | custom |
| Trend steigend | `#C06A3C` | — |
| Trend stabil | `#5A6270` | — |
| Trend sinkend | `#2A7A65` | — |
| Konfidenz hoch | `#3A856F` | `--color-success` |
| Konfidenz mittel | `#B8913A` | `--color-warning` |
| Konfidenz niedrig | `#C06A3C` | `--color-primary` |

### Git Intelligence

Letzte relevante Commits:
- `1aef9f5` — Redesign confirmed symptom bubble (UI-Pattern-Referenz)
- `3306023` — Symptom time & duration extraction (occurred_at Feld, relevant für Sortierung)
- `e558821` — Fix build: type errors in vocabulary (TypeScript Patterns)

### Party-Mode Review Findings (eingearbeitet)

| # | Agent | Finding | Schwere | Änderung |
|---|-------|---------|---------|----------|
| 1 | Winston | Cursor-based Pagination statt OFFSET/LIMIT | MEDIUM | Task 1, 4, 7, DB-Query, Pagination Pattern |
| 2 | Winston | Photo-Count via JOIN+GROUP BY statt Subquery | LOW | Task 1, DB-Query |
| 3 | Sally | Datum-Gruppierung nach Tagen im Feed | MEDIUM | Task 4, UX-Spec, Tests |
| 4 | Sally | Typ-Badge zusätzlich zur Borderlinie | LOW | Task 5, UX-Spec, Tests |
| 5 | Sally | Chevron-Right für Tap-Affordance | LOW | Task 5, UX-Spec, Tests |
| 6 | Amelia | Server Action cursor statt offset | MEDIUM | Task 7 (abgedeckt durch Finding #1) |

### Anti-Patterns (VERMEIDEN)

- **NICHT** Realtime-Subscription für den Feed nutzen — read-only Seite, unnötige Komplexität
- **NICHT** alle Events auf einmal laden — Pagination verwenden (NFR3)
- **NICHT** OFFSET/LIMIT Pagination — Cursor-based via `occurred_at` (Finding #1: konsistent bei neuen Einträgen)
- **NICHT** Subquery-per-Row für Aggregation — JOIN + GROUP BY verwenden (Finding #2: N+1-ähnlich)
- **NICHT** flachen Feed ohne Datum-Gruppierung — Tages-Header geben Struktur (Finding #3)
- **NICHT** `useEffect` für initiales Laden — Server Component nutzt `async/await`
- **NICHT** `barrel exports` (index.ts) erstellen — direkte Imports
- **NICHT** Gamification oder "Streaks" im Empty State — Anti-Tagebuch-Prinzip
- **NICHT** generisches `isLoading` State — Named States oder `loading.tsx`
- **NICHT** `createServiceClient()` verwenden — `createServerClient()` mit RLS
- **NICHT** Event-Detail neu bauen — bestehende `/event/[id]` Seite nutzen (Story 4.4 für Erweiterung)

### Project Structure Notes

- Alignment: Folgt dem bestehenden `(app)` Route-Group Pattern
- Neue Dateien unter `src/components/insights/` (architekturkonform)
- DB-Layer unter `src/lib/db/insights.ts` (bestehender Pattern)
- Server Actions unter `src/lib/actions/insights-actions.ts` (bestehender Pattern)
- Tests unter `src/__tests__/` mit bestehender Struktur

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 4, Story 4.1]
- [Source: _bmad-output/planning-artifacts/prd.md — FR16: Chronologischer Feed]
- [Source: _bmad-output/planning-artifacts/architecture.md — Server Components, DB Patterns, Performance NFR3]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Auswertung Tab, Anti-Tagebuch, Farben, Typography]
- [Source: _bmad-output/implementation-artifacts/3-6-persoenliches-vokabular.md — Server Component Pattern, Mehr-Seite Pattern]
- [Source: src/app/(app)/insights/page.tsx — Bestehender Platzhalter]
- [Source: src/app/(event)/event/[id]/page.tsx — Event-Detail-Seite Pattern]
- [Source: src/lib/db/client.ts — Supabase Client Factories]
- [Source: src/components/layout/bottom-tab-bar.tsx — Tab Navigation]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
