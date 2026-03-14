# Story 4.3: Symptom-Häufigkeits-Ranking mit Trendlinien

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Patient,
I want ein Ranking meiner häufigsten Symptome mit Trendlinien sehen,
So that ich verstehe welche Symptome zunehmen oder abnehmen (FR18).

## Acceptance Criteria

1. **Given** ein Patient auf dem Auswertung-Tab **When** der Patient die Ranking-Ansicht auswählt **Then** werden Symptome nach Häufigkeit absteigend sortiert angezeigt
2. **And** jedes Symptom zeigt die Gesamtanzahl und eine Trendlinie (monatliche Aggregation, 3 Datenpunkte)
3. **And** Trendlinien zeigen ob ein Symptom zunimmt (↑), abnimmt (↓) oder stabil bleibt (→) basierend auf linearer Regression über die 3 Monatswerte
4. **And** der Zeitraum ist filterbar (letzte 30 Tage, 3 Monate, 6 Monate, alle)
5. **And** Medikamenten-Events sind separat vom Symptom-Ranking darstellbar
6. **And** ein Skeleton-Screen wird während des Ladens angezeigt

## Tasks / Subtasks

- [ ] Task 1: TypeScript-Typen für Ranking (AC: #1, #2, #3, #4, #5)
  - [ ] `src/types/analytics.ts` erweitern (NICHT neue Datei)
  - [ ] `MonthlyCount` Typ: `{ year: number, month: number, count: number }`
  - [ ] `SymptomRankingEntry` Typ: `{ name: string, totalCount: number, monthlyCounts: MonthlyCount[], trend: 'increasing' | 'stable' | 'decreasing', avgIntensity: number | null }`
  - [ ] `MedicationRankingEntry` Typ: `{ name: string, totalCount: number, monthlyCounts: MonthlyCount[], trend: 'increasing' | 'stable' | 'decreasing' }`
  - [ ] `SymptomRanking` Typ: `{ symptoms: SymptomRankingEntry[], medications: MedicationRankingEntry[], timeRange: TimeRange, totalSymptomEvents: number, totalMedicationEvents: number }`
  - [ ] `TimeRange` Typ: `'30d' | '3m' | '6m' | 'all'` (wiederverwende bestehenden `FeedFilter.timeRange`)

- [ ] Task 2: DB-Abfrage-Layer für Ranking-Daten (AC: #1, #2, #3, #4, #5)
  - [ ] `src/lib/db/insights.ts` erweitern (NICHT neue Datei)
  - [ ] `getSymptomRanking(supabase, accountId, timeRange): Promise<SymptomRanking>`
  - [ ] Query: Supabase nested select `.select('id, event_type, occurred_at, extracted_data(field_name, value)')` mit Zeitraum-Filter
  - [ ] **TIMEZONE-SAFE**: Zeitraum-Berechnung mit +1 Tag Puffer wie in `getMonthlyTimeline()`, Zuordnung via `toLocalDateKey()`
  - [ ] Zeitraum-Berechnung vom aktuellen Datum:
    - `30d`: 30 Tage zurück
    - `3m`: 3 Monate zurück (Monatsanfang)
    - `6m`: 6 Monate zurück (Monatsanfang)
    - `all`: kein Zeitfilter (nur `.gte('occurred_at', '2020-01-01')` als Sicherheit)
  - [ ] **Aggregation in JS** (gleicher Pattern wie `getMonthlyTimeline`):
    - `pivotExtractedData()` für `symptom_name`, `intensity`, `medication` Extraktion wiederverwenden
    - Event-Type-Mapping: `event_type !== 'medication'` → Symptom (inkl. `'voice'`)
    - Symptom-Events: Gruppierung nach `symptom_name` (aus extracted_data)
    - Medikament-Events: Gruppierung nach `medication` (aus extracted_data)
    - Events ohne `symptom_name` bzw. `medication` → in Gruppe "Unbekannt" sammeln
    - Pro Gruppe: `totalCount` + `monthlyCounts[]` (pro Kalendermonat im Zeitraum)
    - `avgIntensity` für Symptome: Durchschnitt aller Intensitätswerte (nur Nicht-Null)
  - [ ] **Trendberechnung**: `calculateTrend(monthlyCounts: MonthlyCount[]): 'increasing' | 'stable' | 'decreasing'`
    - Lineare Regression über die letzten 3 Monatswerte (oder weniger wenn nicht genug Daten)
    - Slope > 0.5 Events/Monat → `'increasing'`
    - Slope < -0.5 Events/Monat → `'decreasing'`
    - Sonst → `'stable'`
    - Bei weniger als 2 Datenpunkten → `'stable'` (nicht genug Daten für Trend)
  - [ ] Sortierung: Symptome nach `totalCount DESC`, dann alphabetisch
  - [ ] Type Assertion: `const rows = data as unknown as TimelineRawRow[]` (gleicher Pattern — `TimelineRawRow` reicht, selbe Felder)
  - [ ] Performance: Alle Events im Zeitraum laden (MVP <1000 Events, kein Limit nötig)

- [ ] Task 3: Server Action für Ranking mit Zeitraum-Filter (AC: #4)
  - [ ] `src/lib/actions/insights-actions.ts` erweitern (NICHT neue Datei)
  - [ ] `loadSymptomRanking(timeRange: string): Promise<ActionResult<SymptomRanking>>`
  - [ ] Zod-Schema: `z.object({ timeRange: z.enum(['30d', '3m', '6m', 'all']) })`
  - [ ] Auth-Check via `createServerClient()`
  - [ ] Return: `ActionResult<SymptomRanking>` (bestehender Pattern)

- [ ] Task 4: SymptomRanking Client Component (AC: #1, #2, #3, #4, #5, #6)
  - [ ] `src/components/insights/symptom-ranking.tsx` erstellen (`'use client'`)
  - [ ] Props: `initialRanking: SymptomRanking`
  - [ ] **Zeitraum-Filter**: Segmented Control / Button-Gruppe oben: "30 T", "3 M", "6 M", "Alle"
    - Default: `'3m'` (beste Balance für Trendlinien mit 3 Monatswerten)
    - Filter-Wechsel via Server Action `loadSymptomRanking(timeRange)` mit `useTransition`
  - [ ] **Symptom-Ranking-Sektion**: Header "Symptome" + Karten-Liste
    - Jede Karte: `<SymptomRankingCard>` (Task 5)
    - Sortiert nach Häufigkeit absteigend
    - Bei leerem Ranking: "Keine Symptome im gewählten Zeitraum." (sachlich, kein Gamification)
  - [ ] **Medikament-Ranking-Sektion**: Header "Medikamente" + Karten-Liste
    - Gleiche Karten-Struktur wie Symptome, aber Stahlblau-Akzent
    - Nur anzeigen wenn Medikamenten-Events vorhanden (`medications.length > 0`)
  - [ ] **Skeleton Loading**: Während Zeitraum-Wechsel (via `isPending` aus `useTransition`)
    - 3 Skeleton-Karten als Platzhalter (shadcn `Skeleton`)

- [ ] Task 5: SymptomRankingCard Component (AC: #1, #2, #3)
  - [ ] `src/components/insights/symptom-ranking-card.tsx` erstellen
  - [ ] Props: `entry: SymptomRankingEntry | MedicationRankingEntry`, `variant: 'symptom' | 'medication'`
  - [ ] **Layout** (basierend auf UX-Spec SymptomRankingCard):
    ```
    ┌──────────────────────────────────┐
    │ Rückenschmerzen           12x  ↑ │  ← Name, Count, Trend-Pfeil
    │ ∅ 6.5/10                  ▁▃▇   │  ← Durchschnittl. Intensität, Mini-Sparkline
    └──────────────────────────────────┘
    ```
  - [ ] **Symptomname**: Links, `font-medium`, abgekürzt bei Überlänge (`truncate`)
  - [ ] **Gesamtanzahl**: Rechts neben Name, grosse Zahl + "x" Suffix, `font-bold`
  - [ ] **Trend-Pfeil**: Rechts neben Anzahl, farbcodiert:
    - `↑` (increasing): `text-[#C06A3C]` (Terracotta — Aufmerksamkeit, nicht alarmierend)
    - `→` (stable): `text-[#5A6270]` (Grau)
    - `↓` (decreasing): `text-[#2A7A65]` (Teal — positiv)
  - [ ] **Durchschnittliche Intensität** (nur Symptome): `∅ 6.5/10` in `text-sm text-muted-foreground`
  - [ ] **Mini-Sparkline**: SVG-basiert, 3 Datenpunkte (monthlyCounts), ca. 60x20px
    - Linie + Fläche darunter (fill mit Opacity)
    - Farbe: Terracotta für Symptome, Stahlblau für Medikamente
    - Kein Achsen-Label (zu klein), nur relative Höhe
    - Wenn weniger als 2 Datenpunkte → Sparkline ausblenden
  - [ ] **Varianten-Akzent**: Linke Borderlinie wie FeedEventCard
    - Symptom: `border-l-4 border-l-[#C06A3C]`
    - Medikament: `border-l-4 border-l-[#4A7FA5]`
  - [ ] **Interaktion**: Tap expandiert Inline-Details (Task 6)
  - [ ] Touch-Target: Gesamte Karte tippbar (min 44px Höhe)

- [ ] Task 6: Inline-Expansion für Symptom-Detail (AC: #1)
  - [ ] Expansion INNERHALB `symptom-ranking.tsx` (kein separater Route)
  - [ ] Tap auf Karte → Toggle: zeigt die letzten 5 Events dieses Symptoms unterhalb der Karte
  - [ ] Bestehende `FeedEventCard` Components wiederverwenden (DRY, wie in Day-Drill-Down)
  - [ ] Server Action: `loadSymptomEvents(symptomName: string, timeRange: string): Promise<ActionResult<FeedEvent[]>>`
    - `src/lib/actions/insights-actions.ts` erweitern
    - Zod-Schema: `z.object({ symptomName: z.string().min(1).max(200), timeRange: z.enum(['30d', '3m', '6m', 'all']) })`
  - [ ] DB-Funktion: `getSymptomEvents(supabase, accountId, symptomName, timeRange, limit): Promise<FeedEvent[]>`
    - `src/lib/db/insights.ts` erweitern
    - Voller Select wie `getChronologicalFeed` (FeedEventCard braucht alle Felder)
    - Filter: `extracted_data` WHERE `field_name = 'symptom_name'` AND `value = symptomName`
    - **Ansatz**: Da Supabase nested select keinen Filter auf nested rows erlaubt, alle Events im Zeitraum laden und in JS nach `symptom_name` filtern (gleicher Approach wie Ranking-Aggregation). Limitiert auf `limit` (default 5) nach Filterung.
    - Für Medikamente: analog mit `field_name = 'medication'`
    - `mapRowToFeedEvent()` wiederverwenden
  - [ ] Lade-Animation: `useTransition` während Events geladen werden
  - [ ] Toggle-Verhalten: Tap auf gleiche Karte schliesst, Tap auf andere wechselt
  - [ ] "Alle anzeigen →" Link am Ende wenn mehr als 5 Events (navigiert zu Feed mit Filter — Post-MVP, für jetzt nur die 5 neuesten)

- [ ] Task 7: Tab-Integration auf Auswertung-Seite (AC: #1, #6)
  - [ ] `src/app/(app)/insights/page.tsx` erweitern: Dritten Tab "Ranking" hinzufügen
  - [ ] Server-seitig: Ranking-Daten mit Default-Zeitraum `'3m'` laden
  - [ ] `Promise.all` erweitern: `[feed, timeline, ranking]`
  - [ ] TabsTrigger: "Ranking" neben "Feed" und "Timeline"
  - [ ] TabsContent: `<SymptomRanking initialRanking={ranking} />`
  - [ ] `src/app/(app)/insights/loading.tsx` aktualisieren: Skeleton-Tabs (3 Tab-Platzhalter statt 2)

- [ ] Task 8: Tests (AC: #1-#6)
  - [ ] `src/__tests__/lib/db/insights.test.ts` erweitern — getSymptomRanking:
    - Symptom-Aggregation nach Name (2 Tests)
    - Medikament-Aggregation separat (1 Test)
    - Trendberechnung: increasing, stable, decreasing (3 Tests)
    - Leerer Zeitraum (1 Test)
    - Zeitraum-Filter (1 Test)
  - [ ] `src/__tests__/components/insights/symptom-ranking.test.tsx` (NEU):
    - Ranking rendern mit Symptomen und Medikamenten (1 Test)
    - Zeitraum-Filter Buttons (1 Test)
    - Leeres Ranking (1 Test)
    - Skeleton Loading State (1 Test)
  - [ ] `src/__tests__/components/insights/symptom-ranking-card.test.tsx` (NEU):
    - Symptom-Karte mit Name, Count, Trend-Pfeil (1 Test)
    - Medikament-Karte mit Stahlblau-Akzent (1 Test)
    - Trend-Pfeil Farbkodierung: increasing/stable/decreasing (3 Tests)
    - Sparkline Rendering (1 Test)
    - Durchschnittliche Intensität Anzeige (1 Test)
  - [ ] `src/__tests__/actions/insights-actions.test.ts` erweitern:
    - loadSymptomRanking: Validierung, Auth, Ergebnis (2 Tests)
    - loadSymptomEvents: Validierung, Auth, Ergebnis (2 Tests)
  - [ ] Bestehende Tests brechen nicht — verifizieren mit `npm run test`

- [ ] Task 9: Build-Verifikation
  - [ ] `npx prettier --write` auf alle geänderten Dateien
  - [ ] `npm run lint` — keine neuen Fehler
  - [ ] `npm run build` — erfolgreich

## Dev Notes

### Scope-Abgrenzung (KRITISCH)

Diese Story implementiert:
- Dritter Tab "Ranking" auf der Auswertung-Seite
- Symptom-Häufigkeits-Ranking mit Gesamtanzahl, sortiert absteigend
- Mini-Sparkline (SVG, 3 monatliche Datenpunkte) pro Symptom
- Trend-Indikator (↑/→/↓) basierend auf linearer Regression
- Zeitraum-Filter (30 Tage, 3 Monate, 6 Monate, alle)
- Separates Medikament-Ranking
- Inline-Expansion: Tap auf Symptom zeigt letzte 5 Events
- Skeleton Loading State für Zeitraum-Wechsel

Gehört NICHT in diese Story:
- **Dedizierte `/insights/[symptom]/` Route** → Post-MVP (Architektur-Spec Vision, Inline-Expansion ist MVP-Vereinfachung)
- **Arzt-Symptom-Ranking** → Epic 6 (Story 6.3, nutzt dieselbe Datenquelle mit Arzt-Theme)
- **Event-Detail-Ansicht (Audio/Fotos/Galerie)** → Story 4.4
- **Event-Löschen** → Story 4.5
- **Chart-Library (recharts, d3, etc.)** → NICHT installieren, SVG-Sparkline ist minimal und ausreichend
- **Realtime-Updates** → Post-MVP
- **Filter-Kombination (Symptom + Zeitraum + Medikament)** → Post-MVP
- **Responsive Multi-Spalten-Layout** → Post-MVP (Single Column für MVP, iPad/Desktop Layout in Epic 6)
- **"Alle anzeigen"-Navigation zu gefiltertem Feed** → Post-MVP

### Architektur-Entscheidungen

**Tab-Integration (3 Tabs):**
```
┌─────────────────────────────────────┐
│ Auswertung                          │  ← Sticky Header
├──────────┬──────────┬───────────────┤
│   Feed   │ Timeline │   Ranking     │  ← shadcn Tabs (3 TabsTrigger)
├──────────┴──────────┴───────────────┤
│                                     │
│   [Active Tab Content]              │  ← TabsContent
│                                     │
└─────────────────────────────────────┘
```

**Ranking-Layout:**
```
┌─────────────────────────────────────┐
│  [30 T]  [3 M]  [6 M]  [Alle]      │  ← Zeitraum-Filter (Segmented)
├─────────────────────────────────────┤
│                                     │
│  Symptome                           │  ← Sektions-Header
│                                     │
│  ┌─────────────────────────────────┐│
│  │ Rückenschmerzen        12x  ↑  ││  ← SymptomRankingCard
│  │ ∅ 6.5/10               ▁▃▇    ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ Kopfschmerzen           8x  →  ││
│  │ ∅ 4.2/10               ▅▃▄    ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ Übelkeit                3x  ↓  ││
│  │ ∅ 5.0/10               ▇▃▁    ││
│  └─────────────────────────────────┘│
│                                     │
│  Medikamente                        │  ← Sektions-Header (nur wenn vorhanden)
│                                     │
│  ┌─────────────────────────────────┐│
│  │ Dafalgan 1g             6x  →  ││  ← Stahlblau-Akzent
│  │                         ▃▃▄    ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

**Inline-Expansion bei Tap:**
```
┌─────────────────────────────────────┐
│ Rückenschmerzen           12x  ↑   │  ← Karte (expanded)
│ ∅ 6.5/10                  ▁▃▇     │
├─────────────────────────────────────┤
│  Letzte Einträge:                   │  ← Expansion
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 09:30 14.03. [Symptom]    → │  │  ← FeedEventCard (wiederverwendet)
│  │ ● Rückenschmerzen            │  │
│  │   Unterer Rücken, links      │  │
│  │   Intensität: 7/10           │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │ 16:00 12.03. [Symptom]    → │  │
│  │ ● Rückenschmerzen            │  │
│  │   Oberer Rücken              │  │
│  └───────────────────────────────┘  │
│                                     │
│  (max. 5 neueste Events)           │
└─────────────────────────────────────┘
```

**Daten-Fetching Pattern:**
```
Server Component (page.tsx)
  → createServerClient() + getUser()
  → getChronologicalFeed(...)     // Feed (bestehend)
  → getMonthlyTimeline(...)       // Timeline (bestehend)
  → getSymptomRanking(supabase, user.id, '3m')   // Ranking (NEU)
  → <Tabs>
      <TabsContent "feed">      <SymptomFeed ... />         </TabsContent>
      <TabsContent "timeline">  <MonthTimeline ... />       </TabsContent>
      <TabsContent "ranking">   <SymptomRanking ... />      </TabsContent>
    </Tabs>

Client Component (SymptomRanking)
  → Zeitraum wechseln: loadSymptomRanking(timeRange) via Server Action
  → Karte antippen: loadSymptomEvents(name, timeRange) via Server Action
```

**DB-Query für Ranking (Supabase Client):**
```typescript
// Zeitraum berechnen (Beispiel: 3m)
const startDate = new Date()
startDate.setMonth(startDate.getMonth() - 3)
startDate.setDate(1)  // Monatsanfang für saubere Monatsbuckets
// +1 Tag Puffer für Timezone-Safety
const bufferStart = new Date(startDate)
bufferStart.setDate(bufferStart.getDate() - 1)

const { data, error } = await supabase
  .from('symptom_events')
  .select('id, event_type, occurred_at, extracted_data(field_name, value)')
  .eq('account_id', accountId)
  .eq('status', 'confirmed')
  .is('deleted_at', null)
  .gte('occurred_at', bufferStart.toISOString())
  .order('occurred_at', { ascending: false })

const rows = data as unknown as TimelineRawRow[]  // Gleicher Typ reicht!
```

**Aggregation in JS:**
```typescript
// 1. Events pivotieren und nach Typ trennen
// 2. Symptome nach symptom_name gruppieren, Medikamente nach medication
// 3. Pro Gruppe: totalCount + monthlyCounts (Key: YYYY-MM)
// 4. Trend berechnen via calculateTrend()
// 5. Sortieren: totalCount DESC, dann alphabetisch
```

**Trendberechnung (Lineare Regression):**
```typescript
function calculateTrend(monthlyCounts: MonthlyCount[]): 'increasing' | 'stable' | 'decreasing' {
  if (monthlyCounts.length < 2) return 'stable'

  // Einfache lineare Regression: y = mx + b
  // x = Index (0, 1, 2), y = count
  const n = monthlyCounts.length
  const xs = monthlyCounts.map((_, i) => i)
  const ys = monthlyCounts.map(m => m.count)

  const sumX = xs.reduce((a, b) => a + b, 0)
  const sumY = ys.reduce((a, b) => a + b, 0)
  const sumXY = xs.reduce((acc, x, i) => acc + x * ys[i], 0)
  const sumXX = xs.reduce((acc, x) => acc + x * x, 0)

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)

  if (slope > 0.5) return 'increasing'
  if (slope < -0.5) return 'decreasing'
  return 'stable'
}
```

**Mini-Sparkline (SVG):**
```typescript
// Einfache SVG-Polyline mit 3 Datenpunkten
// viewBox="0 0 60 20"
// Punkte: x = index * 30, y = 20 - (count/maxCount * 18)
// Linie: stroke + fill-Polygon für Flächeneffekt
// Farbe: Terracotta (#C06A3C) für Symptome, Stahlblau (#4A7FA5) für Medikamente
```

### RLS-Policy Checklist (bei DB-Änderungen)

Keine DB-Schema-Änderungen nötig — diese Story nutzt nur bestehende Tabellen (`symptom_events`, `extracted_data`). Bestehende RLS-Policies greifen.

- [x] Keine neuen Tabellen
- [x] Keine Migrationen nötig
- [x] Bestehender Composite-Index `(account_id, status, deleted_at, occurred_at DESC)` aus Migration 00015 sollte ausreichen

### Migrations-Konvention

Keine Migration nötig für diese Story. Die bestehenden Indizes und Tabellen sind ausreichend.

### Bestehende Insights-Seite (Story 4.1 + 4.2)

Die aktuelle `src/app/(app)/insights/page.tsx` zeigt zwei Tabs: "Feed" und "Timeline". Diese Story ERWEITERT die Seite um einen dritten Tab "Ranking", OHNE die bestehende Feed- und Timeline-Funktionalität zu verändern.

Bestehende Dateien die ERWEITERT werden (nicht neu erstellt):
- `src/app/(app)/insights/page.tsx` — Dritten Tab hinzufügen
- `src/app/(app)/insights/loading.tsx` — Skeleton auf 3 Tabs erweitern
- `src/types/analytics.ts` — Ranking-Typen hinzufügen
- `src/lib/db/insights.ts` — `getSymptomRanking()`, `getSymptomEvents()`, `calculateTrend()` hinzufügen
- `src/lib/actions/insights-actions.ts` — Ranking Server Actions hinzufügen

Neue Dateien:
- `src/components/insights/symptom-ranking.tsx` — Ranking Hauptkomponente mit Zeitraum-Filter
- `src/components/insights/symptom-ranking-card.tsx` — Einzelne Ranking-Karte mit Sparkline

### Learnings aus Story 4.1 & 4.2 (KRITISCH)

- **Supabase nested select**: `extracted_data(field_name, value)` für Key-Value-Pivot. Gleicher Pattern für Ranking-Query verwenden. Type Assertion `as unknown as TimelineRawRow[]` nötig. `TimelineRawRow` kann wiederverwendet werden — hat genau die benötigten Felder (`id, event_type, occurred_at, extracted_data`).
- **Event-Type Mapping**: `event_type !== 'medication'` → Symptom (inkl. `'voice'`). Für Ranking-Aggregation gleiche Logik verwenden.
- **Timezone-Bug (Code Review Finding H1 aus Story 4.1)**: `toLocalDateKey()` nutzen für Monats-Zuordnung der Events. Puffer-Tage an den Zeitraumgrenzen einberechnen.
- **`pivotExtractedData()`**: Aus `insights.ts` exportiert, kann direkt wiederverwendet werden für `symptom_name` und `medication` Extraktion.
- **`useTransition` Pattern**: Für Zeitraum-Wechsel und Inline-Expansion verwenden (bewährter Pattern aus SymptomFeed "Mehr laden" und MonthTimeline Monatswechsel).
- **FeedEventCard wiederverwendbar**: Kann direkt in der Inline-Expansion eingesetzt werden — keine Kopie nötig (bewährt in Day-Drill-Down).
- **Test-Count**: Aktuell 435 Tests grün (1 pre-existing fail in event-edit.test.tsx). Neue Tests hinzufügen, nicht brechen.
- **Composite Index**: Migration `00015_feed_composite_index.sql` existiert für `(account_id, status, deleted_at, occurred_at DESC)`. Sollte für Ranking-Queries ausreichen — gleicher Zugriffspfad.
- **`toLocalDateKey()` Shared Utility**: Bereits in `src/lib/utils/date.ts` extrahiert (Story 4.2). Direkt importieren.
- **Keine barrel exports**: Direkte Imports verwenden, keine `index.ts` Dateien.
- **`createServerClient()` statt `createServiceClient()`**: Immer mit RLS arbeiten.

### Learnings aus Story 4.2 (Drill-Down Pattern)

- **Inline-Expansion Pattern**: Tap auf Element → Inline-Expansion unterhalb, Toggle-Verhalten. Bewährt in Day-Drill-Down. Gleicher Pattern für Symptom-Detail-Expansion.
- **Keine dedizierte Route nötig**: Inline-Expansion ist einfacher als eine `/insights/[symptom]/` Route für MVP.
- **Server Action Pattern**: `loadDayEvents()` zeigt den Pattern — Zod-Schema, Auth-Check, Return `ActionResult<T>`.
- **Loading mit `useTransition`**: `isPending` für Loading-Indikator. Kein `useEffect`, kein `useState` für Loading.

### Farb-Referenz (aus UX-Spec & Story 4.1)

| Kategorie | Hex | Verwendung |
|-----------|-----|-----------|
| Symptom (Terracotta) | `#C06A3C` | Karten-Border, Sparkline, Trend-Pfeil (↑) |
| Medikament (Stahlblau) | `#4A7FA5` | Karten-Border, Sparkline |
| Trend steigend | `#C06A3C` | Terracotta (Aufmerksamkeit, nicht alarmierend) |
| Trend stabil | `#5A6270` | Grau |
| Trend sinkend | `#2A7A65` | Teal (positiv) |

### Anti-Patterns (VERMEIDEN)

- **NICHT** eine Chart-Library installieren (recharts, d3, nivo) — SVG-Sparkline mit 3 Datenpunkten ist trivial, keine Library nötig
- **NICHT** alle Events aller Zeiträume gleichzeitig laden — nur den gewählten Zeitraum
- **NICHT** eine dedizierte `/insights/[symptom]/` Route bauen — Inline-Expansion reicht für MVP
- **NICHT** Trend berechnen wenn weniger als 2 Datenpunkte — dann `'stable'` setzen
- **NICHT** `useEffect` für initiales Laden — Server Component lädt initial
- **NICHT** `barrel exports` (index.ts) erstellen — direkte Imports
- **NICHT** `createServiceClient()` verwenden — `createServerClient()` mit RLS
- **NICHT** neue Type-Datei erstellen — `analytics.ts` erweitern
- **NICHT** neue DB-Datei erstellen — `insights.ts` erweitern
- **NICHT** neue Action-Datei erstellen — `insights-actions.ts` erweitern
- **NICHT** Gamification oder Motivations-Texte bei leerem Ranking
- **NICHT** Realtime-Subscription für Ranking — read-only Ansicht, zu aufwändig
- **NICHT** URL-Parameter für Zeitraum (`?range=3m`) — Post-MVP, Client-State reicht
- **NICHT** `mapRowToFeedEvent()` für die Ranking-Aggregation verwenden — zu schwer, nur `pivotExtractedData()` für Name/Intensität
- **NICHT** raw SQL oder RPC-Funktionen — Supabase Client Query reicht
- **NICHT** Events mit `symptom_name = null` ignorieren — in "Unbekannt"-Gruppe sammeln

### Abhängigkeiten

- **Story 4.1**: Chronologischer Feed (VORAUSSETZUNG ✓ — done)
- **Story 4.2**: Timeline-Ansicht + Tab-Navigation (VORAUSSETZUNG ✓ — review, Tabs existieren)
- **shadcn Tabs**: `src/components/ui/tabs.tsx` existiert bereits (VORAUSSETZUNG ✓)
- **shadcn Skeleton**: `src/components/ui/skeleton.tsx` existiert bereits (VORAUSSETZUNG ✓)
- **FeedEventCard**: `src/components/insights/feed-event-card.tsx` existiert bereits (VORAUSSETZUNG ✓)
- **`pivotExtractedData()`**: In `insights.ts` — wiederverwendbar (VORAUSSETZUNG ✓)
- **`toLocalDateKey()`**: In `src/lib/utils/date.ts` — shared utility (VORAUSSETZUNG ✓)
- **`TimelineRawRow` Typ**: In `insights.ts` — wiederverwendbar (VORAUSSETZUNG ✓)
- **Composite Index**: Migration 00015 existiert bereits (VORAUSSETZUNG ✓)

### DB-Schema Referenz (bestehend)

```
symptom_events: id, account_id, event_type, occurred_at, created_at, ended_at,
                raw_input, audio_url, status, deleted_at

extracted_data: id, symptom_event_id, field_name, value, confidence, confirmed
  → field_name values: 'symptom_name', 'body_region', 'side', 'symptom_type',
                       'intensity', 'medication', 'dosage'
  → Verknüpfung über symptom_event_id
```

### Git Intelligence

Letzte relevante Commits:
- `df941a6` — Add Story 4.1 spec and start Epic 4 (Patienten-Auswertung)
- `638d9b6` — Add symptom time/duration extraction (occurred_at Feld, Basis für Ranking)

Story 4.1 + 4.2 Implementation-Dateien (zum Referenzieren):
- `src/lib/db/insights.ts` — DB-Query Pattern, `pivotExtractedData()`, `mapRowToFeedEvent()`, `getMonthlyTimeline()`, `getDayEvents()`, `TimelineRawRow`
- `src/components/insights/symptom-feed.tsx` — Tab-Content Pattern
- `src/components/insights/feed-event-card.tsx` — Wiederverwendbar in Inline-Expansion
- `src/components/insights/month-timeline.tsx` — `useTransition` Pattern, Inline-Expansion Pattern (Day-Drill-Down)
- `src/components/insights/day-drill-down.tsx` — Toggle-Verhalten Pattern
- `src/lib/actions/insights-actions.ts` — Server Action Pattern mit Zod
- `src/types/analytics.ts` — Bestehende Typen erweitern
- `src/lib/utils/date.ts` — `toLocalDateKey()` Shared Utility

### Project Structure Notes

- Alignment: Folgt dem bestehenden `(app)` Route-Group Pattern
- Neue Dateien unter `src/components/insights/` (architekturkonform, wie Story 4.1/4.2)
- DB-Layer erweitert `src/lib/db/insights.ts` (bestehender Pattern)
- Server Actions erweitert `src/lib/actions/insights-actions.ts` (bestehender Pattern)
- Typen erweitert `src/types/analytics.ts` (bestehender Pattern)
- Tests unter `src/__tests__/` mit bestehender Struktur
- Architektur nennt `components/insights/symptom-ranking.tsx` als geplanten Pfad — genau das wird erstellt

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 4, Story 4.3]
- [Source: _bmad-output/planning-artifacts/prd.md — FR18: Symptom-Häufigkeits-Ranking mit Trendlinien]
- [Source: _bmad-output/planning-artifacts/architecture.md — SymptomRanking Component, insights/[symptom]/ Route, Server Components, DB Patterns, Performance NFR3]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — SymptomRankingCard (Anatomie, Interaktion, Varianten), Trend-Indikator Farben, Data Visualization Palette, Auswertung-Tab]
- [Source: _bmad-output/implementation-artifacts/4-1-chronologischer-feed.md — Feed-Implementation, DB-Patterns, Learnings, Anti-Patterns]
- [Source: _bmad-output/implementation-artifacts/4-2-timeline-ansicht.md — Timeline-Implementation, Tab-Integration, Drill-Down-Pattern, useTransition, toLocalDateKey]
- [Source: src/app/(app)/insights/page.tsx — Bestehende Auswertung-Seite mit 2 Tabs]
- [Source: src/lib/db/insights.ts — DB-Query Pattern, pivotExtractedData, mapRowToFeedEvent, TimelineRawRow, getMonthlyTimeline]
- [Source: src/components/insights/feed-event-card.tsx — Wiederverwendbare Event-Karte]
- [Source: src/components/insights/day-drill-down.tsx — Inline-Expansion Pattern]
- [Source: src/types/analytics.ts — Bestehende FeedEvent, PaginatedFeed, MonthTimeline Typen]
- [Source: src/types/common.ts — ActionResult<T> Pattern]
- [Source: src/lib/utils/date.ts — toLocalDateKey() Shared Utility]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
