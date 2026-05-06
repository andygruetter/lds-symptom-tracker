# Story 6.2: Arzt-Timeline mit allen Events

Status: done

## 📋 Implementation Update (Stand 2026-05-06)

**Suspense-Pattern:** Die ursprüngliche Spec sah `<Suspense fallback={<TimelineSkeleton />}>`
für die Timeline vor. Code lädt die Events stattdessen synchron via
`await Promise.all([getSharedFeedEvents(...), getSharedSymptomRanking(...)])` in
`src/app/share/dashboard/page.tsx:36`. Bewusste Designentscheidung (Daten klein,
Auth bereits validiert, kein Streaming-Vorteil). Suspense bleibt nur für die
KI-Summary-Karte (`AISummaryCard` in derselben Page) bestehen, da deren Generierung
deutlich länger dauert.

**Hinweis:** Code-Kommentar (Zeile 71) dokumentiert dies explizit:
„Timeline (Story 6.2) — Daten bereits via await geladen, kein Suspense nötig".

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Arzt,
I want die Timeline mit allen Symptom- und Medikamenten-Events des Patienten einsehen,
So that ich den zeitlichen Verlauf der Beschwerden nachvollziehen kann (FR28).

## Acceptance Criteria

1. **Given** ein Arzt auf dem Dashboard **When** die Timeline-Ansicht angezeigt wird **Then** werden alle Events im gewählten Zeitraum chronologisch dargestellt (neueste zuerst)
2. **Given** Events im Zeitraum existieren **When** die Timeline gerendert wird **Then** sind Symptom-Events und Medikamenten-Events visuell unterscheidbar (Symptom: `#C06A3C`, Medikament: `#4A7FA5`, linke Farbkante + Typ-Badge)
3. **Given** ein Event wird in der Timeline angezeigt **When** der Arzt die Karte betrachtet **Then** zeigt jeder Event: Datum, Symptombezeichnung (oder Medikamentenname), Intensität (wenn vorhanden), Dauer (wenn beendet), Körperregion/Seite
4. **Given** die Timeline wird geladen **When** Daten noch nicht bereit sind **Then** wird ein Skeleton-Screen angezeigt (Suspense-Boundary)
5. **Given** die Arzt-Timeline **When** die Datenquelle betrachtet wird **Then** nutzt sie dieselbe Datenstruktur wie die Patienten-Timeline (`FeedEvent`-Typ, gleiche DB-Query-Logik, anderes Theme)
6. **Given** keine Events im Zeitraum vorhanden **When** die Timeline gerendert wird **Then** wird ein Empty-State mit Hinweismeldung angezeigt
7. **Given** ein Arzt betrachtet die Timeline **When** er auf eine Event-Karte tippt **Then** passiert nichts (read-only, kein Drill-Down bis Story 6.4)

## Tasks / Subtasks

- [x] Task 1: DB-Funktion `getSharedFeedEvents()` erstellen (AC: #1, #3, #5)
  - [x] 1.1 Neue Funktion `getSharedFeedEvents(accountId, dateFrom, dateTo)` in `src/lib/db/sharing.ts`
  - [x] 1.2 Query analog `getChronologicalFeed()` aus `insights.ts` — SELECT mit JOIN auf `extracted_data(field_name, value)` und `event_photos(id)`
  - [x] 1.3 Verwende `createServiceClient()` (Arzt hat keine Auth-Session, RLS würde Query blocken)
  - [x] 1.4 Filter: `account_id`, `occurred_at` BETWEEN `dateFrom` und `dateTo`, `deleted_at IS NULL`, `status = 'confirmed'`
  - [x] 1.5 Mapping via `mapRowToFeedEvent()` (importiert aus `insights.ts` — NICHT duplizieren, ggf. exportieren)
  - [x] 1.6 Return-Typ: `FeedEvent[]` (aus `@/types/analytics`)

- [x] Task 2: `mapRowToFeedEvent()` und Hilfs-Funktionen exportieren (AC: #5)
  - [x] 2.1 In `src/lib/db/insights.ts`: `mapRowToFeedEvent`, `pivotExtractedData`, `RawFeedRow`, `ExtractedDataRow` und `PhotoRow` Typen exportieren (alle werden für den Import in `sharing.ts` benötigt)
  - [x] 2.2 Bestehende interne Nutzung bleibt unverändert

- [x] Task 3: `DoctorEventCard`-Komponente erstellen (AC: #2, #3, #7)
  - [x] 3.1 Neue Datei `src/components/sharing/doctor-event-card.tsx`
  - [x] 3.2 Layout analog `FeedEventCard`: linke Farbkante, Uhrzeit, Typ-Badge, Symptomname/Medikament, Intensität, Dauer, Körperregion
  - [x] 3.3 KEIN `useRouter` oder `onClick`-Navigation (read-only, kein Drill-Down)
  - [x] 3.4 KEIN `ChevronRight`-Icon (kein klickbares Element)
  - [x] 3.5 Props: `event: FeedEvent` — gleicher Typ wie Patient-Card
  - [x] 3.6 Media-Indikatoren (Audio/Foto-Icons) anzeigen als Hinweis

- [x] Task 4: `DoctorTimeline`-Komponente erstellen (AC: #1, #4, #6)
  - [x] 4.1 Neue Datei `src/components/sharing/doctor-timeline.tsx`
  - [x] 4.2 Server Component (kein 'use client' — Daten werden serverseitig übergeben)
  - [x] 4.3 Props: `events: FeedEvent[]`, `dateFrom: string`, `dateTo: string`
  - [x] 4.4 Events nach Tag gruppieren via `groupEventsByDay()` (importiert aus `symptom-feed.tsx` — direkter Import funktioniert trotz `'use client'`, da die Funktion reine JS-Logik ohne Hooks ist)
  - [x] 4.5 Tages-Header formatieren mit `Intl.DateTimeFormat('de-CH', { day: 'numeric', month: 'long', year: 'numeric' })`
  - [x] 4.6 Monats-Separatoren einfügen: bei Monatswechsel zwischen Tagesgruppen einen dezenten Separator mit Monatsname rendern (z.B. `<div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Februar 2026</div>`) — verbessert Orientierung bei längeren Zeiträumen
  - [x] 4.7 Jede Tagesgruppe rendert `DoctorEventCard` pro Event
  - [x] 4.8 Empty-State: "Keine erfassten Symptome oder Medikamente im Zeitraum {dateFrom} – {dateTo}." (formatiert mit `Intl.DateTimeFormat('de-CH')`) bei leerer Liste

- [x] Task 5: `groupEventsByDay()` nutzen (AC: #5)
  - [x] 5.1 `groupEventsByDay()` ist bereits als `export function` in `src/components/insights/symptom-feed.tsx` definiert — direkter Import in `doctor-timeline.tsx` funktioniert (reine JS-Logik, keine Client-Hooks)

- [x] Task 6: Dashboard-Page aktualisieren (AC: #1, #4)
  - [x] 6.1 In `src/app/share/dashboard/page.tsx`: Timeline-Platzhalter durch `<DoctorTimeline>` ersetzen
  - [x] 6.2 `getSharedSymptomEvents()` durch `getSharedFeedEvents()` ersetzen — liefert `FeedEvent[]` mit allen Details; `events.length` für Event-Count in KI-Zusammenfassung-Card nutzen (kein zweiter DB-Call nötig)
  - [x] 6.3 `dateFrom`/`dateTo` aus `linkData` an `<DoctorTimeline>` Props durchreichen (für Empty-State-Anzeige)
  - [x] 6.4 Skeleton-Loading via `<Suspense fallback={<TimelineSkeleton />}>` (Next.js Server Component Pattern)

- [x] Task 7: `TimelineSkeleton`-Komponente (AC: #4)
  - [x] 7.1 Skeleton-Platzhalter für Tagesgruppen mit Event-Cards
  - [x] 7.2 Nutze `@/components/ui/skeleton` (shadcn/ui)
  - [x] 7.3 3-4 Skeleton-Cards als Platzhalter

- [x] Task 8: Unit-Tests (AC: #1-#7)
  - [x] 8.1 `src/__tests__/lib/db/sharing-feed.test.ts`: Tests für `getSharedFeedEvents()` — Mock Supabase, prüfe Query-Logik, Mapping
  - [x] 8.2 `src/__tests__/components/sharing/doctor-event-card.test.tsx`: Render-Tests (Symptom vs. Medikament, Farbkante, kein Chevron, kein onClick)
  - [x] 8.3 `src/__tests__/components/sharing/doctor-timeline.test.tsx`: Tagesgruppierung, Empty-State, Event-Count
  - [x] 8.4 Sicherstellen: keine Regression in bestehenden Tests (`npm test`)

- [x] Task 9: Prettier + Lint + Type-Check (AC: alle)
  - [x] 9.1 `npx prettier --write` auf alle geänderten/neuen Dateien
  - [x] 9.2 `npm run lint` ohne Fehler
  - [x] 9.3 `npx tsc --noEmit` ohne Fehler (bestehende Fehler in anderen Test-Dateien, keine neuen)

## Dev Notes

### Architektur-Kontext

Diese Story implementiert die **Arzt-Timeline-Ansicht** als Teil des Arzt-Dashboards (Epic 6). Das Dashboard wird über den Zwei-Stufen-Token-Zugang erreicht (`/share/[token]` → Cookie → `/share/dashboard`). Die Timeline zeigt alle bestätigten Events im Sharing-Zeitraum chronologisch an.

**Kernprinzip:** Maximale Wiederverwendung der Patienten-Insights-Logik. Die Arzt-Timeline nutzt denselben `FeedEvent`-Typ und dieselben DB-Query-Patterns, aber:
- Read-only (kein Edit, Delete, Navigation)
- Service Client statt User-Session (Arzt hat kein Supabase Auth)
- Gefilterter Zeitraum (sharing_links.date_from/date_to statt unbegrenzt)
- Doctor Theme (`data-theme="doctor"`, Professional Slate)

### Kritische Wiederverwendung (NICHT duplizieren!)

| Was | Quelle | Wie nutzen |
|-----|--------|------------|
| `FeedEvent`-Typ | `src/types/analytics.ts` | Direkt importieren |
| `mapRowToFeedEvent()` | `src/lib/db/insights.ts` | Exportieren + importieren |
| `pivotExtractedData()` | `src/lib/db/insights.ts` | Exportieren + importieren |
| `groupEventsByDay()` | `src/components/insights/symptom-feed.tsx` | Direkter Import (reine JS-Logik, kein Extrahieren nötig) |
| `Skeleton` | `src/components/ui/skeleton` | Direkt importieren |
| `formatDuration()` | Pattern aus `feed-event-card.tsx` | Analog implementieren in DoctorEventCard |
| `getSharingContext()` | `src/lib/sharing/context.ts` | Bereits in Dashboard-Page genutzt |
| `createServiceClient()` | `src/lib/db/client.ts` | Für DB-Zugriff ohne Auth |

### Bestehende Datenfluss-Analyse

**Aktueller Zustand von `getSharedSymptomEvents()`:**
```typescript
// src/lib/db/sharing.ts — Zeile 322-350
// SELECT: id, event_type, occurred_at, ended_at, raw_input, audio_url, status
// PROBLEM: Kein JOIN auf extracted_data → keine Symptombezeichnung, Intensität, etc.
// LÖSUNG: Neue Funktion getSharedFeedEvents() mit vollem JOIN
```

**Benötigte Query für Arzt-Timeline:**
```typescript
supabase
  .from('symptom_events')
  .select('id, event_type, occurred_at, created_at, ended_at, raw_input, audio_url, extracted_data(field_name, value), event_photos(id)')
  .eq('account_id', accountId)
  .eq('status', 'confirmed')
  .is('deleted_at', null)
  .gte('occurred_at', dateFrom)
  .lte('occurred_at', dateTo)
  .order('occurred_at', { ascending: false })
```

Dies ist identisch zur `getChronologicalFeed()`-Query, aber:
- `createServiceClient()` statt User-Supabase-Client
- Zeitraum-Filter via `dateFrom`/`dateTo` statt unbegrenzt + Cursor
- Kein Pagination (alle Events im Zeitraum laden — Sharing-Zeiträume max. 12 Monate)

### Zwei-Stufen-Token-System (D3)

Arzt-Zugriff läuft über HttpOnly-Cookie (`sharing_session`):
1. Middleware (`src/proxy.ts`): Cookie-Existenz-Check (schnell, kein DB)
2. `getSharingContext()`: HMAC-Signatur + DB-Validierung (React.cache — 1 Call pro Request)
3. Ergebnis: `SharingLinkData { id, accountId, dateFrom, dateTo, expiresAt }`

Die Dashboard-Page nutzt `getSharingContext()` bereits — kein neuer Auth-Code nötig.

### Datenfilter-Checklist

- [x] `account_id`: via `linkData.accountId` aus validiertem Sharing-Kontext
- [x] Zeitraum: `linkData.dateFrom` bis `linkData.dateTo`
- [x] `status = 'confirmed'`: nur bestätigte Events
- [x] `deleted_at IS NULL`: Soft-Delete berücksichtigen
- [x] Service Client: `createServiceClient()` — RLS wird bypassed, Ownership via App-Level-Filter

### RLS-Policy Checklist (bei DB-Änderungen)

Keine DB-Änderungen in dieser Story. Bestehende RLS-Policies genügen:
- `symptom_events`: Patient CRUD via `auth.uid() = account_id`
- Arzt-Zugriff: Service Client bypasses RLS, App-Level-Filter sichert Ownership

### Migrations-Konvention

Keine Migration nötig — alle benötigten Tabellen/Spalten existieren bereits.

### Project Structure Notes

**Neue Dateien:**
| Datei | Zweck |
|-------|-------|
| `src/components/sharing/doctor-event-card.tsx` | Read-only Event-Karte für Arzt |
| `src/components/sharing/doctor-timeline.tsx` | Chronologische Tagesgruppen-Liste |
| `src/__tests__/lib/db/sharing-feed.test.ts` | Tests für `getSharedFeedEvents()` |
| `src/__tests__/components/sharing/doctor-event-card.test.tsx` | Render-Tests DoctorEventCard |
| `src/__tests__/components/sharing/doctor-timeline.test.tsx` | Render-Tests DoctorTimeline |

**Geänderte Dateien:**
| Datei | Änderung |
|-------|----------|
| `src/lib/db/sharing.ts` | + `getSharedFeedEvents()` |
| `src/lib/db/insights.ts` | Export von `mapRowToFeedEvent`, `pivotExtractedData`, `RawFeedRow` |
| `src/app/share/dashboard/page.tsx` | Timeline-Platzhalter → `<DoctorTimeline>` |

### Established Code Patterns

| Pattern | Quelle | Verwendung |
|---------|--------|------------|
| `ActionResult<T>` | `src/types/common.ts` | Return-Typ für Server Actions |
| `createServiceClient()` | `src/lib/db/client.ts` | DB-Zugriff ohne Auth-Session |
| `FeedEvent` | `src/types/analytics.ts` | Einheitlicher Event-Typ |
| Server Components | `src/app/share/dashboard/page.tsx` | Async Data Fetching |
| `Skeleton` | `src/components/ui/skeleton` | Loading-State |
| `toLocalDateKey()` | `src/lib/utils/date.ts` | Timezone-safe Datumsschlüssel |
| Farbcodes | `feed-event-card.tsx` | Symptom: `#C06A3C`, Medikament: `#4A7FA5` |
| `Intl.DateTimeFormat('de-CH')` | `symptom-feed.tsx`, `month-timeline.tsx` | Datumsformatierung |
| `lucide-react` Icons | `feed-event-card.tsx` | `Camera`, `Mic` für Media-Indikatoren |

### Technische Stack-Details

| Tool | Version | Verwendung |
|------|---------|------------|
| Next.js | 16 | App Router, Server Components |
| React | 19 | Server + Client Components |
| TypeScript | 5 | Strikte Typisierung |
| Supabase | @supabase/supabase-js ^2.98.0 | DB + Auth + Storage |
| shadcn/ui | (lokal) | Skeleton-Komponente |
| Tailwind CSS | 4 | Styling, Theme-System |
| Vitest | ^4.0.18 | Unit/Integration-Tests |
| React Testing Library | | Komponenten-Tests |

### Abgrenzung (Out of Scope)

- **KEIN** Drill-Down bei Klick auf Event (→ Story 6.4)
- **KEIN** Audio-Player oder Foto-Viewer (→ Story 6.4)
- **KEINE** KI-Zusammenfassung (→ Story 6.1)
- **KEIN** Symptom-Ranking (→ Story 6.3)
- **KEIN** PDF-Export (→ Story 6.5)
- **KEINE** Pagination — alle Events im Zeitraum werden geladen (Sharing max. 12 Monate, Event-Menge überschaubar)
- **KEINE** Filter (event_type, Zeitraum-Auswahl) — einfache chronologische Liste
- **KEINE** Signed URLs für Audio/Fotos (nur Indikatoren anzeigen)

### Fallstricke und Anti-Patterns

1. **NICHT** `FeedEventCard` direkt nutzen — sie enthält `useRouter` + `onClick` → Navigation zur Patienten-Edit-Seite. Stattdessen: `DoctorEventCard` als read-only Variante.
2. **NICHT** `getChronologicalFeed()` direkt nutzen — sie erwartet einen User-authentifizierten Supabase-Client (RLS). Stattdessen: `getSharedFeedEvents()` mit Service Client.
3. **NICHT** `loadMoreFeedEvents` Server Action nutzen — sie ist an den Patient-Auth-Flow gebunden.
4. **NICHT** `formatDayHeader()` mit "Heute"/"Gestern" Labels — im Arzt-Kontext Volldate nutzen (Arzt sieht historische Daten).
5. **NICHT** `RawFeedRow` Typ duplizieren — aus insights.ts exportieren.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 6, Story 6.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#Arzt-Dashboard, Sharing-System, API-Patterns]
- [Source: src/lib/db/insights.ts — getChronologicalFeed(), mapRowToFeedEvent(), pivotExtractedData()]
- [Source: src/lib/db/sharing.ts — getSharedSymptomEvents(), createServiceClient()]
- [Source: src/components/insights/feed-event-card.tsx — FeedEventCard Layout-Pattern]
- [Source: src/components/insights/symptom-feed.tsx — groupEventsByDay()]
- [Source: src/app/share/dashboard/page.tsx — Dashboard-Page mit Platzhaltern]
- [Source: src/app/share/dashboard/layout.tsx — Dashboard-Layout mit Header]
- [Source: src/lib/sharing/context.ts — getSharingContext()]
- [Source: src/types/analytics.ts — FeedEvent, ExtractedField Types]
- [Source: src/types/sharing.ts — SharedSymptomEvent, SharingLinkData]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- JSDOM konvertiert Hex-Farbcodes zu RGB in style-Attributen — Tests auf `rgb(192, 106, 60)` statt `#C06A3C` angepasst
- Dashboard-Page hat parallele Änderungen von Story 6.1 (AISummaryCard) und 6.3 (DoctorRanking) — Timeline ergänzend integriert, beide DB-Calls via `Promise.all` parallelisiert

### Completion Notes List

- ✅ `getSharedFeedEvents()` erstellt mit vollem JOIN auf `extracted_data` + `event_photos`, nutzt `mapRowToFeedEvent()` aus insights.ts (kein Code dupliziert)
- ✅ `mapRowToFeedEvent`, `pivotExtractedData`, `RawFeedRow`, `ExtractedDataRow`, `PhotoRow` aus insights.ts exportiert — bestehende interne Nutzung unverändert
- ✅ `DoctorEventCard` als read-only Variante von `FeedEventCard` — kein `useRouter`, kein `onClick`, kein `ChevronRight`
- ✅ `DoctorTimeline` als Server Component — gruppiert Events nach Tag, Monats-Separatoren bei Monatswechsel, Empty-State mit Zeitraum-Anzeige
- ✅ `groupEventsByDay()` aus `symptom-feed.tsx` direkt importiert (reine JS-Logik, kein Client-Hook)
- ✅ Dashboard-Page: Timeline-Platzhalter durch `<DoctorTimeline>` ersetzt, `getSharedFeedEvents()` statt `getSharedSymptomEvents()`
- ✅ `TimelineSkeleton` mit shadcn/ui Skeleton-Komponente (3 Tagesgruppen)
- ✅ 24 neue Tests: 5 DB-Tests, 13 DoctorEventCard-Tests, 6 DoctorTimeline-Tests — alle bestehen
- ✅ Prettier, Lint (0 Fehler), TypeScript type-check (keine neuen Fehler)

### Change Log

- 2026-03-15: Story 6.2 implementiert — Arzt-Timeline mit chronologischen Events, Tagesgruppierung, Monats-Separatoren, Empty-State, Skeleton-Loading
- 2026-03-15: Code Review Fixes — Wirkungslose Suspense um DoctorTimeline entfernt (Daten bereits awaited), Duplikat-Test korrigiert (prüft jetzt Datum-Formatierung), File List korrigiert (sharing.ts → Geänderte Dateien)

### File List

**Neue Dateien:**
- `src/components/sharing/doctor-event-card.tsx` — Read-only Event-Karte
- `src/components/sharing/doctor-timeline.tsx` — Chronologische Tagesgruppen-Liste
- `src/components/sharing/timeline-skeleton.tsx` — Skeleton für Timeline-Loading
- `src/__tests__/lib/db/sharing-feed.test.ts` — 5 Tests für getSharedFeedEvents
- `src/__tests__/components/sharing/doctor-event-card.test.tsx` — 13 Tests für DoctorEventCard
- `src/__tests__/components/sharing/doctor-timeline.test.tsx` — 6 Tests für DoctorTimeline

**Geänderte Dateien:**
- `src/lib/db/sharing.ts` — `getSharedFeedEvents()` hinzugefügt
- `src/lib/db/insights.ts` — Export von `mapRowToFeedEvent`, `pivotExtractedData`, `RawFeedRow`, `ExtractedDataRow`, `PhotoRow`
- `src/app/share/dashboard/page.tsx` — Timeline integriert, `getSharedFeedEvents()` statt `getSharedSymptomEvents()`
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — Status: ready-for-dev → in-progress → review
