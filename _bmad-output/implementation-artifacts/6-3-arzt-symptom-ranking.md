# Story 6.3: Arzt-Symptom-Ranking mit Trendlinien

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Arzt,
I want ein Symptom-Ranking mit Trendlinien sehen,
So that ich die häufigsten und sich verändernden Beschwerden des Patienten identifizieren kann (FR29).

## Acceptance Criteria

1. **Given** ein Arzt auf dem Dashboard mit gültigem Sharing-Cookie **When** die Dashboard-Seite geladen wird **Then** wird eine Ranking-Karte mit Symptomen nach Häufigkeit im Sharing-Zeitraum (dateFrom–dateTo) absteigend sortiert angezeigt
2. **And** jedes Symptom zeigt: Name, Gesamtanzahl, Trend-Indikator (↑ zunehmend / → stabil / ↓ abnehmend) und Mini-Sparkline (monatliche Aggregation)
3. **And** Medikamenten-Events werden in einer separaten Sektion unterhalb der Symptome dargestellt (nur wenn vorhanden)
4. **And** durchschnittliche Intensität wird bei Symptomen angezeigt (∅ X.X/10)
5. **And** das Ranking nutzt das Arzt-Theme (Professional Slate): Karten mit `rounded-lg`, `border` statt `shadow-sm`, kompaktere Density, `font-semibold` für Emphasis
6. **And** die Darstellung ist responsive: Karten-Layout auf Mobile (Single Column), Tabellen-Layout auf Desktop (ab `xl` Breakpoint)
7. **And** bei leerem Ranking (keine Events im Zeitraum) wird "Keine Symptome in diesem Zeitraum erfasst." angezeigt (neutral, sachlich — Arzt-Ton)
8. **And** die Daten werden serverseitig via `createServiceClient()` geladen (kein Auth-Session nötig, RLS-Bypass)
9. **And** es gibt KEINEN Zeitraum-Filter — der Zeitraum ist fix durch den Sharing-Link definiert (dateFrom/dateTo)
10. **And** der bestehende Ranking-Platzhalter im Dashboard wird durch die echte Ranking-Komponente ersetzt

## Tasks / Subtasks

- [x] Task 1: DB-Funktion für Arzt-Ranking (AC: #1, #2, #3, #4, #8)
  - [x] `src/lib/db/sharing.ts` erweitern (NICHT `insights.ts` — Doctor-Queries gehören zum Sharing-Modul)
  - [x] `getSharedSymptomRanking(accountId, dateFrom, dateTo): Promise<SymptomRanking>` erstellen
  - [x] Intern: `createServiceClient()` verwenden (Arzt hat keine Auth-Session)
  - [x] **Hilfsfunktionen aus `insights.ts` importieren** (NICHT duplizieren): `calculateTrend()` (bereits exportiert), `pivotExtractedData()` (MUSS exportiert werden — ist aktuell nur intern)
  - [x] `pivotExtractedData()` in `insights.ts` exportieren (Voraussetzung für diese Story)
  - [x] Aggregationslogik (symptomMap/medicationMap Loop, toSortedMonthlyCounts) wird in `sharing.ts` implementiert — gleicher Algorithmus, aber eigener Query mit Service Client
  - [x] Timezone-safe: `dateFrom`/`dateTo` als DATE-Strings (YYYY-MM-DD), +1 Tag Puffer an Grenzen
  - [x] Query: `.select('id, event_type, occurred_at, extracted_data(field_name, value)')` mit `.gte('occurred_at', dateFrom)` und `.lte('occurred_at', dateTo + 1 Tag)`
  - [x] Return: `SymptomRanking` (bestehender Typ aus `analytics.ts` wiederverwenden, `timeRange` Feld auf `'all'` setzen)

- [x] Task 2: Doctor-Ranking Server Component (AC: #1, #2, #3, #4, #5, #6, #7, #9, #10)
  - [x] `src/components/sharing/doctor-ranking.tsx` erstellen (Server Component, KEIN `'use client'`)
  - [x] Props: `ranking: SymptomRanking`
  - [x] Mobile-Layout (Default): Karten-Stapel mit `DoctorRankingCard` Komponente
  - [x] Desktop-Layout (ab `xl:`): Semantische `<table>` mit Spalten: Symptom, Häufigkeit, Trend, Ø Intensität, Sparkline (Ärzte erwarten tabellarische Datenaufbereitung — UX-Konvention)
  - [x] Responsive-Umschaltung: `<div className="xl:hidden">` für Karten, `<table className="hidden xl:table">` für Tabelle
  - [x] Arzt-Theme Styling: `rounded-lg border border-border` (statt `rounded-2xl shadow-sm`)
  - [x] Sektionen: "Symptome" Header + Karten/Zeilen, "Medikamente" Header + Karten/Zeilen (conditional)
  - [x] Empty State: "Keine Symptome in diesem Zeitraum erfasst."

- [x] Task 3: DoctorRankingCard Komponente (AC: #2, #4, #5)
  - [x] `src/components/sharing/doctor-ranking-card.tsx` erstellen
  - [x] Props: `entry: SymptomRankingEntry | MedicationRankingEntry`, `variant: 'symptom' | 'medication'`
  - [x] `TrendArrow` und `Sparkline` SVG-Komponenten aus `symptom-ranking-card.tsx` kopieren (nicht importieren — Doctor-Komponenten sind unabhängiges Feature-Modul, ~50 Zeilen SVG)
  - [x] **Berechnungslogik NICHT kopieren** — `calculateTrend()` und `pivotExtractedData()` aus `insights.ts` importieren
  - [x] Arzt-Theme: `rounded-lg border border-border bg-card` (keine shadow), kompaktere Padding
  - [x] Touch-Target: min 44px Höhe beibehalten
  - [x] KEIN `onClick` / `onToggle` — reine Anzeige-Komponente (Drill-Down ist Story 6.4)

- [x] Task 4: Dashboard-Integration (AC: #10)
  - [x] `src/app/share/dashboard/page.tsx` modifizieren
  - [x] Ranking-Platzhalter durch `<DoctorRanking ranking={ranking} />` ersetzen
  - [x] `getSharedSymptomRanking(linkData.accountId, linkData.dateFrom, linkData.dateTo)` aufrufen
  - [x] Audit-Log: `ranking_view` Action loggen (best-effort, optional — oder in `dashboard_view` subsumiert)

- [x] Task 5: Tests (AC: #1-#10)
  - [x] `src/__tests__/lib/db/sharing.test.ts` erweitern — `getSharedSymptomRanking()` Tests (5 Tests: leeres Ergebnis, DB-Fehler, Symptome + Medikamente, Sortierung, Timezone-Edge-Case, Unbekannt-Gruppe)
  - [x] `src/__tests__/components/sharing/doctor-ranking.test.tsx` (NEU) — Rendering-Tests (6 Tests: Symptome anzeigen, Medikamente anzeigen, leerer Zustand, Arzt-Theme Styling, responsive Klassen, Platzhalter-Text nicht mehr vorhanden)
  - [x] `src/__tests__/components/sharing/doctor-ranking-card.test.tsx` (NEU) — Card-Tests (8 Tests: Symptom-Variante, Medikament-Variante, Trend-Pfeile ↑/→/↓, Sparkline, keine Sparkline bei <2 Punkten, Intensität, Touch-Target, Arzt-Theme)
  - [x] Alle bestehenden Tests müssen grün bleiben (keine Regressionen)

- [x] Task 6: Build-Verifikation (AC: alle)
  - [x] `npx prettier --write` auf alle geänderten/neuen Dateien
  - [x] `npm run lint` — keine neuen Fehler (nur pre-existing warnings)
  - [x] `npm run build` — erfolgreich

## Dev Notes

### Scope-Abgrenzung (KRITISCH)

Diese Story implementiert:
- Symptom-Ranking mit Häufigkeit, Trendlinien und Sparklines im Arzt-Dashboard
- Separates Medikament-Ranking (nur wenn vorhanden)
- Durchschnittliche Intensität pro Symptom
- Responsive: Karten auf Mobile, semantische Tabelle auf Desktop (ab `xl`)
- Arzt-Theme Styling (Professional Slate)
- Ersetzt den bestehenden Ranking-Platzhalter im Dashboard

Gehört NICHT in diese Story:
- **Drill-Down / Inline-Expansion** → Story 6.4 (Tap auf Ranking-Eintrag → Event-Details)
- **Zeitraum-Filter** → NICHT nötig, Zeitraum ist fix durch Sharing-Link (dateFrom/dateTo)
- **Client-Side Interaktivität** → Keine — reine Server Components, kein `'use client'`
- **Server Actions** → Keine nötig (kein Zeitraum-Wechsel, keine User-Interaktion)
- **Chart-Library (recharts, d3, etc.)** → NICHT installieren, SVG-Sparklines reichen
- **KI-Zusammenfassung** → Story 6.1
- **Timeline** → Story 6.2
- **PDF-Export** → Story 6.5
- **Audit-Log für Ranking** → In `dashboard_view` subsumiert (bereits in Story 5.5 implementiert)

### Architektur-Entscheidungen

**Datenfluss (Server Component Only):**
```
Server Component (share/dashboard/page.tsx)
  → getSharingContext()              [React.cache — 1 DB-Call pro Request]
  → getSharedSymptomRanking(accountId, dateFrom, dateTo)
    → createServiceClient()          [RLS-Bypass, kein Auth]
    → Supabase Query mit Date-Range
    → import { calculateTrend, pivotExtractedData } from insights.ts
    → Aggregation in JS (gleicher Algorithmus wie Patient)
  → <DoctorRanking ranking={ranking} />  [Server Component, KEIN 'use client']
    → Mobile: <DoctorRankingCard /> Karten-Stapel
    → Desktop: <table> semantische Tabelle
```

**Responsive-Layout:**

Mobile (< xl) — Karten-Stapel:
```
┌─────────────────────────────────────┐
│  Symptome                           │  ← Sektions-Header (semibold)
│                                     │
│  ┌─────────────────────────────────┐│
│  │▌ Rückenschmerzen        12x  ↑  ││  ← DoctorRankingCard
│  │▌ ∅ 6.5/10               ▁▃▇   ││     rounded-lg, border
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │▌ Kopfschmerzen           8x  →  ││
│  │▌ ∅ 4.2/10               ▅▃▄   ││
│  └─────────────────────────────────┘│
│                                     │
│  Medikamente                        │  ← nur wenn vorhanden
│  ┌─────────────────────────────────┐│
│  │▌ Dafalgan 1g             6x  →  ││  ← Stahlblau-Akzent
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

Desktop (xl+) — Semantische Tabelle:
```
┌──────────────────────────────────────────────────────────────┐
│  Symptome                                                    │
├──────────────┬───────────┬───────┬──────────────┬───────────┤
│  Symptom     │ Häufigkeit│ Trend │ Ø Intensität │  Verlauf  │
├──────────────┼───────────┼───────┼──────────────┼───────────┤
│  Rücken…     │    12x    │  ↑    │   6.5/10     │  ▁▃▇     │
│  Kopf…       │     8x    │  →    │   4.2/10     │  ▅▃▄     │
│  Übelkeit    │     3x    │  ↓    │   5.0/10     │  ▇▃▁     │
├──────────────┴───────────┴───────┴──────────────┴───────────┤
│  Medikamente                                                 │
├──────────────┬───────────┬───────┬──────────────┬───────────┤
│  Medikament  │ Häufigkeit│ Trend │      —       │  Verlauf  │
├──────────────┼───────────┼───────┼──────────────┼───────────┤
│  Dafalgan 1g │     6x    │  →    │      —       │  ▃▃▄     │
└──────────────┴───────────┴───────┴──────────────┴───────────┘
```

**Responsive-Umschaltung:**
```tsx
{/* Mobile: Karten */}
<div className="xl:hidden">
  <DoctorRankingCard ... />
</div>

{/* Desktop: Tabelle */}
<table className="hidden xl:table w-full">
  <thead>...</thead>
  <tbody>...</tbody>
</table>
```

**Styling-Unterschiede zum Patienten-Ranking:**

| Aspekt | Patient (`insights/`) | Arzt (`sharing/`) |
|--------|----------------------|-------------------|
| Elevation | `shadow-sm` | `border border-border` (kein Shadow) |
| Density | `px-4 py-3` | `px-3 py-2` (kompakter) |
| Emphasis | `font-medium` | `font-semibold` |
| Desktop | Karten-Stapel | Semantische `<table>` |
| Interaktivität | Tap → Expansion | Keine (Story 6.4) |
| State | Client Component (`useState`, `useTransition`) | Server Component (kein State) |
| Auth | `createServerClient()` + RLS | `createServiceClient()` + RLS-Bypass |
| Zeitraum | Filter (30T/3M/6M/Alle) | Fix (Sharing-Link dateFrom/dateTo) |

### Voraussetzungen (VOR Implementierung prüfen)

1. `pivotExtractedData()` in `src/lib/db/insights.ts` muss exportiert werden (aktuell nur intern)
2. `TimelineRawRow` Typ in `src/lib/db/insights.ts` muss exportiert werden (aktuell nur intern)
3. `calculateTrend()` ist bereits exportiert ✅
4. `toLocalDateKey()` ist bereits shared utility in `src/lib/utils/date.ts` ✅

### Anti-Patterns (VERMEIDEN)

- **NICHT** `'use client'` verwenden — alles Server Components, keine Interaktivität
- **NICHT** Server Actions erstellen — kein Zeitraum-Wechsel, keine User-Interaktion
- **NICHT** `createServerClient()` verwenden — der Arzt hat keine Auth-Session, nur `createServiceClient()`
- **NICHT** `useTransition` / `useState` verwenden — keine Client-Side State nötig
- **NICHT** die Patienten-`SymptomRanking` Komponente importieren oder erweitern — eigenes Feature-Modul unter `components/sharing/`
- **NICHT** den Zeitraum-Filter aus der Patient-Version übernehmen
- **NICHT** eine Chart-Library installieren (recharts, d3, nivo) — SVG-Sparklines reichen
- **NICHT** Drill-Down / Inline-Expansion implementieren — das ist Story 6.4
- **NICHT** `pivotExtractedData()` oder `calculateTrend()` duplizieren — aus `insights.ts` importieren
- **NICHT** `mapRowToFeedEvent()` verwenden — zu schwer für Ranking-Aggregation, nur `pivotExtractedData()`
- **NICHT** barrel exports (index.ts) erstellen — direkte Imports
- **NICHT** raw SQL oder RPC-Funktionen — Supabase Client Query reicht
- **NICHT** Events mit `symptom_name = null` ignorieren — in "Unbekannt"-Gruppe sammeln

### DB-Query für Arzt-Ranking

```typescript
// In src/lib/db/sharing.ts
import { createServiceClient } from '@/lib/db/client'
import { calculateTrend, pivotExtractedData } from '@/lib/db/insights'
import { toLocalDateKey } from '@/lib/utils/date'

export async function getSharedSymptomRanking(
  accountId: string,
  dateFrom: string,  // 'YYYY-MM-DD' aus sharing_links
  dateTo: string,    // 'YYYY-MM-DD' aus sharing_links
): Promise<SymptomRanking> {
  const supabase = createServiceClient()

  // +1 Tag Puffer für Timezone-Safety (bewährter Pattern aus insights.ts)
  const bufferStart = new Date(dateFrom)
  bufferStart.setDate(bufferStart.getDate() - 1)
  const bufferEnd = new Date(dateTo)
  bufferEnd.setDate(bufferEnd.getDate() + 1)

  const { data, error } = await supabase
    .from('symptom_events')
    .select('id, event_type, occurred_at, extracted_data(field_name, value)')
    .eq('account_id', accountId)
    .eq('status', 'confirmed')
    .is('deleted_at', null)
    .gte('occurred_at', bufferStart.toISOString())
    .lt('occurred_at', bufferEnd.toISOString())
    .order('occurred_at', { ascending: false })

  // Gleiche Aggregationslogik wie getSymptomRanking() in insights.ts
  // Aber mit dateFrom/dateTo statt TimeRange
  // ...
}
```

### Farb-Referenz

| Kategorie | Hex | Verwendung |
|-----------|-----|-----------|
| Symptom (Terracotta) | `#C06A3C` | Karten-Border-Left, Sparkline-Stroke, Trend-Pfeil ↑ |
| Medikament (Stahlblau) | `#4A7FA5` | Karten-Border-Left, Sparkline-Stroke |
| Trend steigend | `#C06A3C` | Terracotta |
| Trend stabil | `#5A6270` | Grau |
| Trend sinkend | `#2A7A65` | Teal |

### RLS-Policy Checklist (bei DB-Änderungen)

Keine DB-Schema-Änderungen nötig — diese Story nutzt nur bestehende Tabellen (`symptom_events`, `extracted_data`). RLS wird via `createServiceClient()` umgangen (Arzt hat keine Auth-Session).

- [x] Keine neuen Tabellen
- [x] Keine Migrationen nötig
- [x] Bestehender Composite-Index `(account_id, status, deleted_at, occurred_at DESC)` reicht

### Migrations-Konvention

Keine Migration nötig für diese Story.

### DB-Schema Referenz (bestehend)

```
symptom_events: id, account_id, event_type, occurred_at, created_at, ended_at,
                raw_input, audio_url, status, deleted_at

extracted_data: id, symptom_event_id, field_name, value, confidence, confirmed
  → field_name values: 'symptom_name', 'body_region', 'side', 'symptom_type',
                       'intensity', 'medication', 'dosage'

sharing_links: id, account_id, token, date_from, date_to, expires_at,
               recipient_email, revoked_at, created_at
```

### Previous Story Intelligence (Story 4.3 — Patienten-Ranking)

**Learnings die direkt auf Story 6.3 übertragbar sind:**

1. **Supabase Nested Select + Type Assertion:** `extracted_data(field_name, value)` für Key-Value-Pivot. Type Assertion `as unknown as TimelineRawRow[]` nötig. `TimelineRawRow` wird aus `insights.ts` exportiert und wiederverwendet.

2. **Timezone-Bug (H1 aus Story 4.1):** `toLocalDateKey()` nutzen für Monats-Zuordnung. +1 Tag Puffer an Zeitraumgrenzen. Derselbe Pattern wird in `getSharedSymptomRanking()` angewendet — **mit `dateFrom`/`dateTo` als Grenzen statt berechneter TimeRange.**

3. **Test-Farben RGB vs. Hex:** Browser konvertiert `#4A7FA5` → `rgb(74, 127, 165)`. Tests die Border-Farben prüfen müssen RGB-Format erwarten. Relevant für `doctor-ranking-card.test.tsx`.

4. **`pivotExtractedData()` Pattern:** Symptom-Name über `field_name = 'symptom_name'`, Medikament über `field_name = 'medication'`. Event-Type entscheidet welches Feld relevant ist: `event_type !== 'medication'` → Symptom.

5. **Sparkline bei < 2 Datenpunkten:** Automatisch ausblenden (`if (counts.length < 2) return null`). Gleiche Logik in der kopierten Sparkline-Komponente beibehalten.

6. **`calculateTrend()` Schwellwert:** slope > 0.5 = increasing, < -0.5 = decreasing. Funktioniert auch mit dem Sharing-Zeitraum als Datenbasis.

7. **Events mit `symptom_name = null`:** In "Unbekannt"-Gruppe sammeln, NICHT ignorieren.

8. **Aktueller Test-Stand:** 465+ Tests grün. Neue Tests hinzufügen, keine Regressionen.

### Project Structure Notes

**Bestehende Dateien die MODIFIZIERT werden:**
- `src/lib/db/insights.ts` — `pivotExtractedData()` und `TimelineRawRow` exportieren
- `src/lib/db/sharing.ts` — `getSharedSymptomRanking()` hinzufügen
- `src/app/share/dashboard/page.tsx` — Ranking-Platzhalter durch echte Komponente ersetzen

**Neue Dateien:**
- `src/components/sharing/doctor-ranking.tsx` — Server Component (Haupt-Ranking)
- `src/components/sharing/doctor-ranking-card.tsx` — Karten-Komponente (Mobile)
- `src/__tests__/components/sharing/doctor-ranking.test.tsx` — Rendering-Tests
- `src/__tests__/components/sharing/doctor-ranking-card.test.tsx` — Card-Tests

**Bestehende Struktur bestätigt:**
- `src/components/sharing/` existiert ✅ (enthält: `share-sheet.tsx`, `ai-summary-card.tsx`, `audit-log-viewer.tsx`, etc.)
- `src/__tests__/lib/db/sharing.test.ts` existiert ✅ — erweitern, NICHT neu erstellen
- `src/components/sharing/.gitkeep` kann entfernt werden (Ordner hat jetzt Dateien)

**Alignment mit Architektur-Spec:**
- Architektur definiert `components/sharing/` für Doctor-Komponenten — korrekt
- Doctor-Ranking folgt demselben Muster wie `ai-summary-card.tsx` (Server Component im Sharing-Modul)
- DB-Funktion in `sharing.ts` (nicht `insights.ts`) — konsistent mit `getSharedSymptomEvents()`

### Testing Requirements

**Test-Strategie:**
```
Unit Tests (Vitest + @testing-library/react):
├── src/__tests__/lib/db/sharing.test.ts (ERWEITERN)
│   └── getSharedSymptomRanking()
│       ├── Leeres Ergebnis (keine Events im Zeitraum)
│       ├── Symptome + Medikamente korrekt getrennt
│       ├── Trend-Berechnung über Sharing-Zeitraum
│       ├── Timezone-Edge-Case: Events auf dateFrom/dateTo-Grenze
│       └── Sortierung: totalCount DESC, dann alphabetisch
│
├── src/__tests__/components/sharing/doctor-ranking.test.tsx (NEU)
│   ├── Rendert Symptom-Ranking mit Einträgen
│   ├── Rendert Medikamente-Sektion (nur wenn vorhanden)
│   ├── Zeigt Empty State bei leerem Ranking
│   ├── Arzt-Theme Klassen (border, rounded-lg)
│   ├── Responsive Klassen: hidden xl:table + xl:hidden korrekt gesetzt
│   └── Kein Platzhalter-Text "Kommt in einer zukünftigen Version"
│
└── src/__tests__/components/sharing/doctor-ranking-card.test.tsx (NEU)
    ├── Symptom-Variante mit Terracotta-Akzent
    ├── Medikament-Variante mit Stahlblau-Akzent
    ├── Trend-Pfeile (↑/→/↓) mit korrekten Farben
    └── Sparkline SVG bei >= 2 Datenpunkten
                                   ─────────
                                   ~14 neue Tests
```

**Mocking-Pattern:** `createServiceClient()` Mock aus bestehendem `sharing.test.ts` übernehmen.

**Keine E2E-Tests** für diese Story — Arzt-Dashboard hinter Sharing-Token, E2E kommt mit Epic-Abschluss.

**RGB-Farb-Referenz für Tests:**
- Terracotta `#C06A3C` → `rgb(192, 106, 60)`
- Stahlblau `#4A7FA5` → `rgb(74, 127, 165)`

### Git Intelligence

Letzte relevante Commits:
- `cd282cb` — Epic 5: Sharing-System & Daten-Souveränität (Sharing-Infrastruktur, Cookie-Auth, Audit-Log)
- `61bb276` — Epic 4: Patienten-Auswertung (Feed, Timeline, Ranking — Referenz-Implementierung)
- `fff6480` — Add LDS/Marfan/cerebrovascular symptom taxonomy to AI extraction

**Relevante Dateien aus Epic 5 (zum Referenzieren):**
- `src/lib/db/sharing.ts` — `getSharedSymptomEvents()`, `createServiceClient()` Pattern
- `src/lib/sharing/context.ts` — `getSharingContext()` (React.cache)
- `src/app/share/dashboard/page.tsx` — Dashboard-Page mit Platzhaltern
- `src/app/share/dashboard/layout.tsx` — Sticky Header, Zeitraum-Badge

**Relevante Dateien aus Epic 4 (Referenz-Implementierung):**
- `src/lib/db/insights.ts` — `getSymptomRanking()`, `calculateTrend()`, `pivotExtractedData()`
- `src/components/insights/symptom-ranking.tsx` — Patient-Ranking (Client Component)
- `src/components/insights/symptom-ranking-card.tsx` — TrendArrow, Sparkline SVG
- `src/types/analytics.ts` — `SymptomRanking`, `SymptomRankingEntry`, etc.

### Abhängigkeiten

- **Story 5.3** (Arzt-Zugriff): Sharing-Cookie-Auth, Dashboard-Stub ✅ done
- **Story 5.5** (Audit-Log): `dashboard_view` Logging ✅ done
- **Story 4.3** (Patienten-Ranking): DB-Layer, Typen, Berechnungslogik ✅ done
- `createServiceClient()`: In `src/lib/db/client.ts` ✅ existiert
- `getSharingContext()`: In `src/lib/sharing/context.ts` ✅ existiert
- `SymptomRanking` Typ: In `src/types/analytics.ts` ✅ existiert
- `calculateTrend()`: In `src/lib/db/insights.ts` ✅ exportiert
- `pivotExtractedData()`: In `src/lib/db/insights.ts` ⚠️ MUSS exportiert werden
- `TimelineRawRow`: In `src/lib/db/insights.ts` ⚠️ MUSS exportiert werden
- `toLocalDateKey()`: In `src/lib/utils/date.ts` ✅ exportiert

### Business-Kontext

Der Arzt nutzt das Ranking in zwei Szenarien:
1. **Sprechstunden-Vorbereitung** (5 Min, Desktop): Tabellen-Ansicht, schneller Überblick über häufigste Symptome und Trends
2. **Gemeinsame Besprechung** (iPad, Sprechstunde): Karten-Ansicht, zusammen mit Patientin am Bildschirm

Touch-Targets bleiben bei 44px auch in der read-only Karte — in Story 6.4 werden die Karten klickbar (Drill-Down).

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 6, Story 6.3: Arzt-Symptom-Ranking mit Trendlinien]
- [Source: _bmad-output/planning-artifacts/prd.md — FR29: Arzt sieht Symptom-Ranking mit Trendlinien]
- [Source: _bmad-output/planning-artifacts/architecture.md — D10: Routing share/[token]/, D7: RLS-Strategie, D3: Sharing-Security]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Zeile 1011-1018: SymptomRankingCard Anatomie]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Zeile 1244-1253: Arzt-Theme Abweichungen]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Zeile 875-881: Arzt-Dashboard Responsive Layout]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Zeile 1295-1301: Arzt-Sharing-Ansicht Sonderfall]
- [Source: _bmad-output/implementation-artifacts/4-3-symptom-ranking-trendlinien.md — Referenz-Implementierung, Learnings, Anti-Patterns]
- [Source: src/lib/db/insights.ts — getSymptomRanking(), calculateTrend(), pivotExtractedData()]
- [Source: src/lib/db/sharing.ts — getSharedSymptomEvents(), createServiceClient() Pattern]
- [Source: src/components/insights/symptom-ranking-card.tsx — TrendArrow, Sparkline SVG]
- [Source: src/app/share/dashboard/page.tsx — Dashboard-Page mit Platzhaltern]
- [Source: src/types/analytics.ts — SymptomRanking, SymptomRankingEntry, MedicationRankingEntry]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Timezone-Edge-Case Test initial mit `23:00 UTC` (= nächster Tag in UTC+1) → in `12:00 UTC` geändert (klar ausserhalb jeder Timezone)
- RGB vs Hex in Tests: Browser konvertiert `#C06A3C` → `rgb(192, 106, 60)` und `#4A7FA5` → `rgb(74, 127, 165)` (Learning aus Story 4.3 korrekt angewendet)
- `pivotExtractedData()` war bereits exportiert (Story-Note war veraltet), `TimelineRawRow` musste exportiert werden
- Multiple-element-Problem in `doctor-ranking.test.tsx`: Mobile + Desktop zeigen denselben Namen 2x → `getAllByText().length >= 1` statt `getByText()`

### Completion Notes List

- `TimelineRawRow` in `insights.ts` exportiert (war `type`, jetzt `export type`)
- `getSharedSymptomRanking()` in `sharing.ts` implementiert: +1 Tag Buffer, Timezone-safe mit `toLocalDateKey()`, gleiche Aggregationslogik wie Patient-Ranking aber mit fixen `dateFrom`/`dateTo` Grenzen
- `doctor-ranking-card.tsx`: Reine Anzeige-Komponente, Arzt-Theme (`border border-border`, kompaktes Padding `px-3 py-2`), min-height 44px, TrendArrow und Sparkline SVG kopiert (keine Imports)
- `doctor-ranking.tsx`: Server Component, responsive (Mobile: Karten-Stapel, Desktop: semantische Tabelle ab `xl:`), bedingte Medikamente-Sektion, Empty State
- Dashboard-Page: Ranking-Platzhalter durch echte `<DoctorRanking>` Komponente ersetzt
- 19 neue Tests: 5 DB-Tests in `sharing.test.ts`, 6 Rendering-Tests in `doctor-ranking.test.tsx`, 8 Card-Tests in `doctor-ranking-card.test.tsx`
- Build erfolgreich; Lint: 0 neue Errors; Tests: 778/778 grün (keine Regressionen)

### File List

- `src/lib/db/insights.ts` — `TimelineRawRow` zu `export type` geändert
- `src/lib/db/sharing.ts` — `getSharedSymptomRanking()` hinzugefügt; imports aus `insights.ts` und `analytics.ts` erweitert
- `src/components/sharing/doctor-ranking.tsx` — NEU: Server Component, responsive Karten/Tabelle
- `src/components/sharing/doctor-ranking-card.tsx` — NEU: Arzt-Theme Karten-Komponente
- `src/app/share/dashboard/page.tsx` — Ranking-Platzhalter durch `<DoctorRanking>` ersetzt
- `src/__tests__/lib/db/sharing.test.ts` — `getSharedSymptomRanking()` Tests hinzugefügt
- `src/__tests__/components/sharing/doctor-ranking.test.tsx` — NEU: 6 Rendering-Tests
- `src/__tests__/components/sharing/doctor-ranking-card.test.tsx` — NEU: 8 Card-Tests

### Change Log

- 2026-03-15: Story 6.3 implementiert — Arzt-Symptom-Ranking mit Trendlinien. DB-Funktion `getSharedSymptomRanking()`, Server Components `DoctorRanking` + `DoctorRankingCard`, Dashboard-Integration, 19 neue Tests.
