# Story 4.2: Timeline-Ansicht über Monate

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Patient,
I want eine visuelle Timeline-Ansicht meiner Symptome über mehrere Monate,
So that ich Muster und Häufungen zeitlich erkennen kann (FR17).

## Acceptance Criteria

1. **Given** ein Patient auf dem Auswertung-Tab **When** der Patient die Timeline-Ansicht auswählt **Then** wird eine monatliche Übersicht der Events dargestellt
2. **And** jeder Monat zeigt die Anzahl und Verteilung der Events visuell (z.B. Balken oder Punkte pro Tag)
3. **And** der Patient kann zwischen Monaten navigieren (vor/zurück)
4. **And** Tippen auf einen Tag zeigt die Events dieses Tages
5. **And** ein Skeleton-Screen wird während des Ladens angezeigt
6. **And** der aktuelle Monat wird als Standard angezeigt

## Tasks / Subtasks

- [x] Task 0: Shared Utility Extraktion (VORAUSSETZUNG für Task 3, 5, 6)
  - [x] `toLocalDateKey()` aus `src/components/insights/symptom-feed.tsx` nach `src/lib/utils/date.ts` extrahieren und exportieren
  - [x] `symptom-feed.tsx` auf Import von `@/lib/utils/date` umstellen
  - [x] Bestehende Tests verifizieren (`npm run test`) — keine Regression

- [x] Task 1: View-Switching auf der Auswertung-Seite (AC: #1)
  - [x] `src/app/(app)/insights/page.tsx` erweitern: Tab/Segmented-Control für "Feed" und "Timeline"
  - [x] Bestehende shadcn `Tabs` Component verwenden (`src/components/ui/tabs.tsx`)
  - [x] Default-View: "Feed" (bestehende Funktionalität bleibt unberührt)
  - [x] Server-seitig: Timeline-Daten für aktuellen Monat immer laden (MVP-Datenmenge klein genug)
  - [x] Mobile-optimiert: Tabs oben unter dem "Auswertung"-Header, volle Breite
  - [x] `src/app/(app)/insights/loading.tsx` aktualisieren: Skeleton-Tabs (2 Tab-Platzhalter) + bestehende Skeleton-Karten, damit kein Layout-Jump beim Laden entsteht

- [x] Task 2: TypeScript-Typen für Timeline (AC: #1, #2)
  - [x] `src/types/analytics.ts` erweitern (NICHT neue Datei)
  - [x] `DayEventSummary` Typ: `{ date: string /** YYYY-MM-DD lokaler Datumsschlüssel */, symptomCount: number, medicationCount: number, totalCount: number, maxIntensity: number | null }`
  - [x] `MonthTimeline` Typ: `{ year: number, month: number, days: DayEventSummary[], totalEvents: number }`
  - [x] `TimelineRawRow` Typ in `src/lib/db/insights.ts` (interner Typ, NICHT exportiert): `{ id: string, event_type: string, occurred_at: string, extracted_data: ExtractedDataRow[] | null }` — leichtere Version von `RawFeedRow` ohne `audio_url`, `event_photos`, `created_at`, `ended_at`, `raw_input`

- [x] Task 3: DB-Abfrage-Layer für Timeline-Daten (AC: #1, #2, #6)
  - [x] `src/lib/db/insights.ts` erweitern (NICHT neue Datei)
  - [x] `getMonthlyTimeline(supabase, accountId, year, month): Promise<MonthTimeline>`
  - [x] Query: Supabase nested select wie `getChronologicalFeed` — `.select('id, event_type, occurred_at, extracted_data(field_name, value)')` mit `.gte('occurred_at', startISO).lt('occurred_at', endISO)`
  - [x] **TIMEZONE-KRITISCH**: Monatsgrenzen mit +1 Tag Puffer berechnen (z.B. 1 Tag vor Monatsanfang bis 1 Tag nach Monatsende), dann in JS via `toLocalDateKey()` dem korrekten Tag zuweisen. NICHT UTC-Mitternacht als harte Grenze verwenden — gleicher Bug-Typ wie H1 in Story 4.1
  - [x] Type Assertion: `const rows = data as unknown as TimelineRawRow[]` (gleicher Pattern wie `getChronologicalFeed`)
  - [x] Aggregation in JS: `pivotExtractedData()` für Intensitäts-Extraktion wiederverwenden. Event-Type-Mapping: `'voice'` und `'symptom'` zählen als Symptom (gleiche Logik wie `mapRowToFeedEvent`). NICHT `mapRowToFeedEvent()` selbst aufrufen (zu schwer für Aggregation)
  - [x] Pro Tag: `symptomCount`, `medicationCount`, `totalCount`, `maxIntensity` berechnen
  - [x] Return: `MonthTimeline` mit allen Tagen des Monats (auch Tage ohne Events als `totalCount: 0`)
  - [x] Performance: Kein Limit nötig — max ~31 Tage, ~100 Events pro Monat realistisch (MVP <1000 Events total)

- [x] Task 4: Server Action für Monatswechsel (AC: #3)
  - [x] `src/lib/actions/insights-actions.ts` erweitern (NICHT neue Datei)
  - [x] `loadMonthTimeline(year: number, month: number): Promise<ActionResult<MonthTimeline>>`
  - [x] Zod-Schema: `z.object({ year: z.number().int().min(2020).max(2030), month: z.number().int().min(1).max(12) })`
  - [x] Auth-Check via `createServerClient()`
  - [x] Return: `ActionResult<MonthTimeline>` (bestehender Pattern)

- [x] Task 5: Kalender-Grid Timeline Component (AC: #1, #2, #3, #6)
  - [x] `src/components/insights/month-timeline.tsx` erstellen (`'use client'`)
  - [x] Props: `initialTimeline: MonthTimeline`
  - [x] **Kalender-Grid Layout**: 7 Spalten (Mo-So), Wochentag-Header, Tage als Zellen
  - [x] **Wochentag-Header**: Mo/Di/Mi/Do/Fr/Sa/So, `text-xs text-muted-foreground font-medium`, zentriert
  - [x] **Event-Indikatoren pro Tag**: Farbige Punkte — Terracotta (`#C06A3C`) für Symptome, Stahlblau (`#4A7FA5`) für Medikamente
  - [x] **Intensitäts-Heatmap**: Hintergrund-Opacity des Tages basierend auf `totalCount` (0 Events = kein Hintergrund, 1-2 = leicht, 3+ = stärker)
  - [x] **Monats-Navigation**: `<` Vorheriger Monat | "März 2026" | Nächster Monat `>` (Buttons)
  - [x] **Heute-Markierung**: Aktueller Tag visuell hervorgehoben (`ring-2 ring-primary`) + `aria-current="date"` für Accessibility
  - [x] Keine Navigation in die Zukunft (nächster Monat Button disabled wenn aktueller Monat)
  - [x] Monatswechsel via Server Action `loadMonthTimeline()` mit `useTransition`
  - [x] **Monats-Header formatiert**: `Intl.DateTimeFormat('de-CH', { month: 'long', year: 'numeric' })` → "März 2026"
  - [x] Leerer Monat: Kalender-Grid normal anzeigen, keine Punkte, kein spezieller Empty State (Anti-Tagebuch: Stille ist ok)
  - [x] Touch-Target: Jede Tages-Zelle min 44x44px
  - [x] **Accessibility**: `aria-label` mit vollem Datum + Event-Zusammenfassung pro Zelle (z.B. "14. März 2026, 2 Symptome, 1 Medikament")

- [x] Task 6: Tages-Drill-Down (AC: #4)
  - [x] `src/components/insights/day-drill-down.tsx` erstellen (`'use client'`)
  - [x] Tap auf Tag im Kalender → Inline-Expansion UNTERHALB des Kalenders mit Events dieses Tages
  - [x] **Toggle-Verhalten**: Tap auf denselben Tag schliesst den Drill-Down. Tap auf anderen Tag wechselt den Drill-Down. Bei Öffnung: `scrollIntoView({ behavior: 'smooth' })` damit Drill-Down-Bereich sichtbar
  - [x] Bestehende `FeedEventCard` Components wiederverwenden für Event-Anzeige
  - [x] Server Action: `loadDayEvents(date: string): Promise<ActionResult<FeedEvent[]>>`
  - [x] `src/lib/actions/insights-actions.ts` erweitern
  - [x] Zod-Schema: `z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })` für Datums-Validierung
  - [x] DB-Query: Neue Funktion `getDayEvents(supabase, accountId, dateKey: string)` in `insights.ts` — filtert nach `occurred_at` Tagesgrenzen mit `toLocalDateKey()` Zuordnung. NICHT `getChronologicalFeed` erweitern (Interface-Änderung riskiert Regression)
  - [x] **Voller Select** wie `getChronologicalFeed`: `'id, event_type, occurred_at, created_at, ended_at, raw_input, audio_url, extracted_data(field_name, value), event_photos(id)'` — nötig weil `FeedEventCard` `photoCount`, `hasAudio`, `endedAt`, `rawInput` etc. braucht
  - [x] `mapRowToFeedEvent()` wiederverwenden für Mapping (liegt im selben File `insights.ts`)
  - [x] Leerer Tag: "Keine Einträge an diesem Tag." (kurz, sachlich)
  - [x] Schliessen-Button (✕) oben rechts im Drill-Down-Header
  - [x] Datum als Header: formatiert mit `Intl.DateTimeFormat('de-CH', { day: 'numeric', month: 'long', year: 'numeric' })` → "14. März 2026"

- [x] Task 7: Skeleton Loading für Timeline (AC: #5)
  - [x] Skeleton-State in `month-timeline.tsx`: Kalender-Grid mit `Skeleton`-Zellen während Monatswechsel
  - [x] Bestehende shadcn `Skeleton` Component nutzen
  - [x] Leichtes Pulse/Shimmer (shadcn default)

- [x] Task 8: Tests (AC: #1-#6)
  - [x] `src/__tests__/lib/db/insights.test.ts` erweitern — getMonthlyTimeline: Aggregation, leerer Monat, Symptom/Medikament-Zählung, maxIntensity (4 Tests)
  - [x] `src/__tests__/components/insights/month-timeline.test.tsx` — Kalender-Grid rendern, Event-Punkte, Monats-Navigation, Heute-Markierung, Tages-Tap (6 Tests)
  - [x] `src/__tests__/components/insights/day-drill-down.test.tsx` — Events anzeigen, leerer Tag, Schliessen (3 Tests)
  - [x] `src/__tests__/actions/insights-actions.test.ts` erweitern — loadMonthTimeline: Validierung, Auth, Ergebnis, loadDayEvents (3 Tests)
  - [x] Bestehende Tests brechen nicht — verifizieren mit `npm run test`

- [x] Task 9: Build-Verifikation
  - [x] `npx prettier --write` auf alle geänderten Dateien
  - [x] `npm run lint` — keine neuen Fehler
  - [x] `npm run build` — erfolgreich

## Dev Notes

### Scope-Abgrenzung (KRITISCH)

Diese Story implementiert:
- Tab-Navigation zwischen "Feed" und "Timeline" auf der Auswertung-Seite
- Kalender-Grid Timeline-Ansicht mit einem Monat pro Ansicht
- Farbige Event-Indikatoren pro Tag (Symptom/Medikament)
- Monats-Navigation (vor/zurück)
- Tages-Drill-Down (Tap auf Tag → Events des Tages)
- Skeleton Loading State für Monatswechsel

**Architektur-Divergenz (bewusste MVP-Entscheidung):** Die Architektur/UX-Spec beschreibt `SymptomTimeline` als Multi-Monat-Balkendiagramm mit farbcodierten Balken pro Symptom, Pinch-to-Zoom und Hover-Tooltips. Für MVP implementieren wir stattdessen ein **Kalender-Grid mit einem Monat pro Ansicht** — einfacher, leichter, keine Chart-Library nötig. Das Multi-Monat-Balkendiagramm ist Post-MVP.

Gehört NICHT in diese Story:
- **Symptom-Häufigkeits-Ranking/Trendlinien** → Story 4.3 (separates Feature)
- **Multi-Symptom-Balkendiagramm über Monate** → Post-MVP (Architektur-Spec Vision, Kalender-Grid ist MVP-Vereinfachung)
- **Pinch-to-Zoom** → Post-MVP (ein Monat pro Ansicht ist für MVP ausreichend)
- **Event-Detail-Ansicht (Audio/Fotos/Galerie)** → Story 4.4
- **Event-Löschen** → Story 4.5
- **Chart-Library (recharts, d3, etc.)** → NICHT installieren, Custom CSS/Tailwind-Kalender reicht
- **Filter im Timeline** → Post-MVP (zeige alle Events)
- **Arzt-Timeline** → Epic 6 (Story 6.2, nutzt dieselbe Datenquelle mit anderem Theme)

### Architektur-Entscheidungen

**View-Switching mit shadcn Tabs:**
```
┌─────────────────────────────────────┐
│ Auswertung                          │  ← Sticky Header
├─────────────┬───────────────────────┤
│    Feed     │      Timeline         │  ← shadcn Tabs (TabsList + TabsTrigger)
├─────────────┴───────────────────────┤
│                                     │
│   [Active Tab Content]              │  ← TabsContent
│                                     │
└─────────────────────────────────────┘
```

- `insights/page.tsx` = Server Component (Auth + Initial Data Load für Feed UND Timeline)
- Feed-Tab: Bestehende `<SymptomFeed>` Component (unverändert)
- Timeline-Tab: Neue `<MonthTimeline>` Component
- Beide Tabs laden initial auf dem Server (kein Lazy-Loading nötig bei MVP-Datenmenge)

**Kalender-Grid Timeline (Kernkomponente):**
```
     ← März 2026 →

Mo  Di  Mi  Do  Fr  Sa  So
                    1   2
 3   4   5   6   7   8   9
10  11  12  13  [14] 15  16    ← [14] = Heute (hervorgehoben)
17  18  19  20  21  22  23
24  25  26  27  28  29  30
31

Legende:
  ● = Symptom(e)  ◆ = Medikament(e)
  Hintergrund-Opacity = Event-Dichte
```

- Tages-Zelle zeigt: Tag-Nummer + farbige Punkte (●/◆) wenn Events vorhanden
- Hintergrund-Opacity proportional zu `totalCount` (dezent, nicht ablenkend)
- Tap auf Tag → Drill-Down zeigt Events dieses Tages
- Keine Zahlen in den Zellen (zu busy) — nur visuelles Signal

**Tages-Drill-Down (Inline Expansion):**
```
┌─────────────────────────────────────┐
│  14. März 2026                   ✕  │  ← Tages-Header + Schliessen
├─────────────────────────────────────┤
│  09:30  [Symptom]            📷 2 → │  ← FeedEventCard (wiederverwendet)
│  ● Rückenschmerzen                  │
│    Unterer Rücken, links            │
│    Intensität: 7/10  |  stechend    │
├─────────────────────────────────────┤
│  20:15  [Medikament]          🎤 → │
│  ◆ Dafalgan 1g                     │
│    Grund: Migräne                   │
└─────────────────────────────────────┘
```

- Inline-Expansion UNTERHALB des Kalenders (kein Bottom-Sheet — einfacher, weniger Code)
- FeedEventCard Components wiederverwenden (DRY)
- Tap auf FeedEventCard → Navigation zu `/event/[id]` (bestehende Detail-Seite)

**Daten-Fetching Pattern:**
```
Server Component (page.tsx)
  → createServerClient() + getUser()
  → getChronologicalFeed(supabase, user.id, { limit: 20 })     // Feed
  → getMonthlyTimeline(supabase, user.id, currentYear, currentMonth)  // Timeline
  → <Tabs>
      <TabsContent "feed">  <SymptomFeed ... />  </TabsContent>
      <TabsContent "timeline">  <MonthTimeline initialTimeline={timeline} />  </TabsContent>
    </Tabs>

Client Component (MonthTimeline)
  → Monat wechseln: loadMonthTimeline(year, month) via Server Action
  → Tag antippen: loadDayEvents(date) via Server Action
```

**DB-Query für Timeline (Supabase Client, NICHT raw SQL):**
```typescript
// TIMEZONE-SAFE: +1 Tag Puffer an Monatsgrenzen
const bufferStart = new Date(year, month - 1, 0) // Tag vor Monatsanfang
const bufferEnd = new Date(year, month, 1)        // Tag nach Monatsende
const startISO = bufferStart.toISOString()
const endISO = bufferEnd.toISOString()

const { data, error } = await supabase
  .from('symptom_events')
  .select('id, event_type, occurred_at, extracted_data(field_name, value)')
  .eq('account_id', accountId)
  .eq('status', 'confirmed')
  .is('deleted_at', null)
  .gte('occurred_at', startISO)
  .lt('occurred_at', endISO)
  .order('occurred_at', { ascending: false })

const rows = data as unknown as TimelineRawRow[] // gleicher Type-Assertion-Pattern
```

**Aggregation in JS (nicht SQL):**
```typescript
// 1. Events via toLocalDateKey() dem korrekten lokalen Tag zuweisen
// 2. Events die ausserhalb des Zielmonats fallen (Puffer) → ignorieren
// 3. Pro Tag: symptomCount, medicationCount, totalCount, maxIntensity berechnen
//    - pivotExtractedData() für Intensität wiederverwenden
//    - event_type !== 'medication' → zählt als Symptom (inkl. 'voice')
// 4. Alle Tage des Monats auffüllen (auch leere Tage mit totalCount: 0)
```

### Kalender-Grid Implementierung (CSS Grid)

```css
/* 7-Spalten Grid für Wochentage */
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;  /* minimaler Gap */
}

/* Tages-Zelle */
.day-cell {
  min-width: 44px;  /* Touch-Target */
  min-height: 44px;
  aspect-ratio: 1;  /* Quadratisch */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
```

- Tailwind-Klassen statt Custom CSS wo möglich
- `grid grid-cols-7 gap-0.5` für das Grid
- Tages-Zellen: `flex flex-col items-center justify-center min-h-[44px] rounded-lg`
- Heute: `ring-2 ring-primary` oder `bg-primary/10`
- Aktiver Tag (Drill-Down): `bg-muted`

### Wochentag-Berechnung

```typescript
// Erster Tag des Monats → Wochentag (Mo=0, Di=1, ..., So=6)
// JavaScript: getDay() returns 0=So, 1=Mo, ..., 6=Sa
// Umrechnung für Mo-So Grid:
const firstDayOfMonth = new Date(year, month - 1, 1)
const startWeekday = (firstDayOfMonth.getDay() + 6) % 7  // Mo=0, So=6
// → startWeekday leere Zellen vor dem 1. Tag
```

### Farb-Referenz (aus Story 4.1)

| Kategorie | Hex | Verwendung |
|-----------|-----|-----------|
| Symptom (Terracotta) | `#C06A3C` | Punkte, Karten-Border |
| Medikament (Stahlblau) | `#4A7FA5` | Punkte, Karten-Border |
| Heute-Ring | `--color-primary` (#C06A3C) | Ring um heutigen Tag |
| Hintergrund-Dichte | `bg-muted` mit Opacity | Event-Dichte pro Tag |

### Anti-Patterns (VERMEIDEN)

- **NICHT** eine Chart-Library installieren (recharts, d3, nivo) — Custom CSS/Tailwind Kalender ist einfacher, leichter, wartbarer für diesen Use-Case
- **NICHT** alle Events aller Monate auf einmal laden — nur aktuellen Monat laden, bei Navigation nachladen
- **NICHT** Multi-Monat-Ansicht bauen — ein Monat pro Screen reicht für MVP
- **NICHT** Bottom-Sheet/Modal für Drill-Down — Inline-Expansion unter dem Kalender ist einfacher
- **NICHT** `useEffect` für initiales Laden — Server Component lädt initial
- **NICHT** `barrel exports` (index.ts) erstellen — direkte Imports
- **NICHT** `createServiceClient()` verwenden — `createServerClient()` mit RLS
- **NICHT** neue Type-Datei (`timeline.ts`) erstellen — `analytics.ts` erweitern
- **NICHT** neue DB-Datei erstellen — `insights.ts` erweitern
- **NICHT** neue Action-Datei erstellen — `insights-actions.ts` erweitern
- **NICHT** Zahlen in die Kalender-Zellen schreiben (wie "3 Events") — visuelle Punkte/Dots reichen
- **NICHT** Gamification oder Motivations-Texte bei leeren Monaten
- **NICHT** URL-Parameter für Tab-Sync implementieren (`?view=timeline`) — Post-MVP, für jetzt reicht Client-State
- **NICHT** `getChronologicalFeed` Interface ändern für Tages-Drill-Down — neue `getDayEvents()` Funktion stattdessen (Regressions-Risiko)

### Bestehende Insights-Seite (Story 4.1)

Die aktuelle `src/app/(app)/insights/page.tsx` zeigt den chronologischen Feed. Diese Story ERWEITERT die Seite um einen Tab-Wechsel, OHNE die bestehende Feed-Funktionalität zu verändern.

Bestehende Dateien die ERWEITERT werden (nicht neu erstellt):
- `src/app/(app)/insights/page.tsx` — Tab-Wrapper hinzufügen
- `src/types/analytics.ts` — Timeline-Typen hinzufügen
- `src/lib/db/insights.ts` — `getMonthlyTimeline()` hinzufügen
- `src/lib/actions/insights-actions.ts` — Timeline Server Actions hinzufügen

Neue Dateien:
- `src/components/insights/month-timeline.tsx` — Kalender-Grid Hauptkomponente
- `src/components/insights/day-drill-down.tsx` — Tages-Drill-Down

### Learnings aus Story 4.1 (KRITISCH)

- **Shared Utility Extraction (VORAUSSETZUNG)**: `toLocalDateKey()` ist aktuell privat in `symptom-feed.tsx` (nicht exportiert). Muss als erstes extrahiert werden — entweder nach `src/lib/utils/date.ts` oder als Export aus `symptom-feed.tsx`. Wird von `month-timeline.tsx`, `day-drill-down.tsx` und `getMonthlyTimeline()` gebraucht. `formatDayHeader()` ebenfalls exportieren für Drill-Down-Header.
- **Supabase nested select**: `extracted_data(field_name, value)` für Key-Value-Pivot. Gleicher Pattern für Timeline-Query verwenden. Type Assertion `as unknown as RawFeedRow[]` nötig weil Supabase-Typinferenz bei nested selects nicht matcht.
- **Event-Type Mapping**: `event_type === 'voice'` wird als `'symptom'` behandelt. Für Timeline-Aggregation gleiche Logik verwenden: `const isSymptom = row.event_type !== 'medication'`.
- **Timezone-Bug (Code Review Finding H1)**: `toLocalDateKey()` nutzt lokale Zeitzone für Tages-Gruppierung. Für Timeline-Kalender DENSELBEN `toLocalDateKey()` Ansatz verwenden — NICHT UTC. DB-Query mit +1 Tag Puffer an Monatsgrenzen, dann in JS korrekt zuweisen.
- **Cursor-based Pagination**: Nicht nötig für Timeline (alle Events eines Monats auf einmal laden).
- **`useTransition` Pattern**: Für Monatswechsel-Loading verwenden (wie "Mehr laden" Button in SymptomFeed).
- **FeedEventCard wiederverwendbar**: Kann direkt im Drill-Down eingesetzt werden — keine Kopie nötig.
- **Test-Count**: Aktuell 416 Tests grün. Neue Tests hinzufügen, nicht brechen.
- **Composite Index**: Migration `00015_feed_composite_index.sql` existiert bereits für `(account_id, status, deleted_at, occurred_at DESC)`. Sollte für Timeline-Queries ausreichen.

### Abhängigkeiten

- **Story 4.1**: Chronologischer Feed (VORAUSSETZUNG ✓ — done)
- **shadcn Tabs**: `src/components/ui/tabs.tsx` existiert bereits (VORAUSSETZUNG ✓)
- **shadcn Skeleton**: `src/components/ui/skeleton.tsx` existiert bereits (VORAUSSETZUNG ✓)
- **FeedEventCard**: `src/components/insights/feed-event-card.tsx` existiert bereits (VORAUSSETZUNG ✓)
- **Composite Index**: Migration 00015 existiert bereits (VORAUSSETZUNG ✓)

### Git Intelligence

Letzte relevante Commits:
- `df941a6` — Add Story 4.1 spec and start Epic 4 (Patienten-Auswertung)
- `638d9b6` — Add symptom time/duration extraction (occurred_at Feld, Basis für Timeline)

Story 4.1 Implementation-Dateien (zum Referenzieren):
- `src/lib/db/insights.ts` — DB-Query Pattern, `pivotExtractedData()`, `mapRowToFeedEvent()`
- `src/components/insights/symptom-feed.tsx` — `groupEventsByDay()`, `toLocalDateKey()`, `formatDayHeader()`
- `src/components/insights/feed-event-card.tsx` — Wiederverwendbar im Drill-Down
- `src/lib/actions/insights-actions.ts` — Server Action Pattern mit Zod
- `src/types/analytics.ts` — Bestehende Typen erweitern

### Project Structure Notes

- Alignment: Folgt dem bestehenden `(app)` Route-Group Pattern
- Neue Dateien unter `src/components/insights/` (architekturkonform, wie Story 4.1)
- DB-Layer erweitert `src/lib/db/insights.ts` (bestehender Pattern)
- Server Actions erweitert `src/lib/actions/insights-actions.ts` (bestehender Pattern)
- Typen erweitert `src/types/analytics.ts` (bestehender Pattern)
- Tests unter `src/__tests__/` mit bestehender Struktur

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 4, Story 4.2]
- [Source: _bmad-output/planning-artifacts/prd.md — FR17: Timeline-Ansicht]
- [Source: _bmad-output/planning-artifacts/architecture.md — SymptomTimeline Component, Server Components, DB Patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Auswertung Tab, Kalender-Patterns, Farben, Anti-Tagebuch]
- [Source: _bmad-output/implementation-artifacts/4-1-chronologischer-feed.md — Feed-Implementation, Patterns, Learnings]
- [Source: src/app/(app)/insights/page.tsx — Bestehende Auswertung-Seite]
- [Source: src/lib/db/insights.ts — DB-Query Pattern, pivotExtractedData, mapRowToFeedEvent]
- [Source: src/components/insights/symptom-feed.tsx — toLocalDateKey, formatDayHeader, groupEventsByDay]
- [Source: src/components/insights/feed-event-card.tsx — Wiederverwendbare Event-Karte]
- [Source: src/types/analytics.ts — Bestehende FeedEvent, PaginatedFeed Typen]
- [Source: src/components/ui/tabs.tsx — shadcn Tabs Component]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Import-Order Lint-Fehler in `month-timeline.tsx` — `@/components/ui/skeleton` musste vor `@/lib/actions/insights-actions` stehen. Behoben.
- Test für Event-Punkte via `[style*="C06A3C"]` scheiterte (jsdom normalisiert Hex zu RGB) → `data-testid="symptom-dot"` und `data-testid="medication-dot"` als Lösung eingeführt.

### Completion Notes List

- Alle 9 Tasks vollständig implementiert und getestet.
- `toLocalDateKey()` aus `symptom-feed.tsx` nach `src/lib/utils/date.ts` extrahiert — jetzt shared utility für Feed, Timeline und Drill-Down.
- `getMonthlyTimeline()` nutzt +1-Tag-Puffer an Monatsgrenzen (Timezone-Safe), aggregiert in JS mit `pivotExtractedData()`.
- `getDayEvents()` filtert ebenfalls timezone-safe via `toLocalDateKey()`.
- `MonthTimeline` Client Component: 7-Spalten-Grid Mo-So, Intensitäts-Heatmap, aria-Accessibility, Skeleton während Monatswechsel via `useTransition`.
- `DayDrillDown` Inline-Expansion unterhalb des Kalenders: Toggle-Verhalten, `FeedEventCard` wiederverwendet.
- 20 neue Tests hinzugefügt + 4 Review-Tests für getDayEvents = 24 neue Tests total (440 grün, 0 Fails).
- Build erfolgreich, 0 neue Lint-Fehler.

### File List

- `src/lib/utils/date.ts` (NEU)
- `src/components/insights/month-timeline.tsx` (NEU)
- `src/components/insights/day-drill-down.tsx` (NEU)
- `src/__tests__/components/insights/month-timeline.test.tsx` (NEU)
- `src/__tests__/components/insights/day-drill-down.test.tsx` (NEU)
- `src/types/analytics.ts` (GEÄNDERT — DayEventSummary, MonthTimeline Typen)
- `src/lib/db/insights.ts` (GEÄNDERT — TimelineRawRow, getMonthlyTimeline, getDayEvents)
- `src/lib/actions/insights-actions.ts` (GEÄNDERT — loadMonthTimeline, loadDayEvents)
- `src/app/(app)/insights/page.tsx` (GEÄNDERT — Tabs, Timeline-Datenladen)
- `src/app/(app)/insights/loading.tsx` (GEÄNDERT — Skeleton-Tabs)
- `src/components/insights/symptom-feed.tsx` (GEÄNDERT — Import toLocalDateKey)
- `src/__tests__/lib/db/insights.test.ts` (GEÄNDERT — getMonthlyTimeline + getDayEvents Tests)
- `src/__tests__/actions/insights-actions.test.ts` (GEÄNDERT — loadMonthTimeline, loadDayEvents Tests)
- `src/__tests__/event-edit.test.tsx` (GEÄNDERT — Review-Fix: Zurück→Schliessen Button-Test)

## Change Log

- 2026-03-14: Story 4.2 implementiert — Timeline-Ansicht über Monate mit Kalender-Grid, Tages-Drill-Down, Skeleton Loading und Tab-Navigation auf der Auswertung-Seite.
- 2026-03-14: Code Review Fixes — Error-Handling in MonthTimeline und DayDrillDown, getDayEvents Unit-Tests, event-edit Test-Fix (C1), redundanten Guard entfernt, React-Imports konsolidiert.
