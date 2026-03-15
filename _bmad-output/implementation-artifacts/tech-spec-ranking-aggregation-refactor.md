---
title: 'Ranking-Aggregationslogik konsolidieren'
slug: 'ranking-aggregation-refactor'
created: '2026-03-15'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['TypeScript', 'Next.js App Router', 'Supabase', 'Vitest']
files_to_modify: ['src/lib/db/insights.ts', 'src/lib/db/sharing.ts']
code_patterns: ['TimelineRawRow → pivotExtractedData → symptomMap/medicationMap → toSortedMonthlyCounts → sort/map', 'toLocalDateKey für Timezone-safe Datumsvergleiche', 'calculateTrend für Trend-Berechnung aus MonthlyCounts']
test_patterns: ['vi.mock für DB-Client', 'createMockSupabaseRanking-Helper in insights.test.ts', 'createRankingBuilder-Helper in sharing.test.ts', 'Dynamic imports: await import(@/lib/db/...)']
---

# Tech-Spec: Ranking-Aggregationslogik konsolidieren

**Created:** 2026-03-15

## Overview

### Problem Statement

Drei Funktionen duplizieren jeweils ~140 Zeilen nahezu identische Aggregationslogik für das Symptom-/Medikamenten-Ranking:
1. `getSymptomRanking()` in `insights.ts` (Patient-Ranking mit TimeRange)
2. `getSymptomRankingByAccount()` in `insights.ts` (PDF-Export mit dateFrom/dateTo)
3. `getSharedSymptomRanking()` in `sharing.ts` (Arzt-Dashboard mit dateFrom/dateTo)

Jede Kopie enthält: symptomMap/medicationMap Loop, toSortedMonthlyCounts(), identische .sort()/.map() Pipeline. Änderungen an der Aggregationslogik müssen an drei Stellen synchron gepflegt werden — Fehlerquelle und Wartungslast.

### Solution

Eine shared Helper-Funktion `aggregateRankingFromRows()` in `insights.ts` extrahieren, die `TimelineRawRow[]` + Datumsgrenzen als Input nimmt und `{ symptoms, medications, totalSymptomEvents, totalMedicationEvents }` zurückgibt. Alle drei Aufrufstellen refactoren, um den Helper zu nutzen.

### Scope

**In Scope:**
- Shared Aggregations-Helper `aggregateRankingFromRows()` in `insights.ts` extrahieren
- `getSymptomRanking()` refactoren
- `getSymptomRankingByAccount()` refactoren
- `getSharedSymptomRanking()` refactoren
- Bestehende Tests müssen grün bleiben

**Out of Scope:**
- Neue Features oder UI-Änderungen
- Query-Änderungen (jede Funktion behält ihren eigenen DB-Query)
- Fix des `timeRange: '30d'` Hardcode in `getSymptomRankingByAccount()` (pre-existing, separates Issue)

## Context for Development

### Codebase Patterns

- Aggregationslogik folgt immer demselben Muster: `TimelineRawRow[]` → `pivotExtractedData()` → `symptomMap`/`medicationMap` → `toSortedMonthlyCounts()` → `.sort()/.map()` Pipeline
- `pivotExtractedData()` und `calculateTrend()` sind bereits shared exportierte Utilities in `insights.ts`
- `toLocalDateKey()` kommt aus `src/lib/utils/date.ts` — wird für Timezone-safe Datumsvergleiche verwendet
- Alle drei Funktionen verwenden `as unknown as TimelineRawRow[]` Type-Assertion auf Supabase-Ergebnisse
- Jede Funktion definiert eine lokale `toSortedMonthlyCounts()` — funktional identisch, in `getSymptomRankingByAccount()` heißt sie `toSortedMonthlyCountsByAccount()`

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/lib/db/insights.ts:324-462` | `getSymptomRanking()` — Aggregation mit `cutoffKey` (nur untere Grenze) |
| `src/lib/db/insights.ts:468-607` | `getSymptomRankingByAccount()` — Aggregation mit `dateFrom`+`dateTo` |
| `src/lib/db/sharing.ts:466-606` | `getSharedSymptomRanking()` — Aggregation mit `dateFrom`+`dateTo` |
| `src/types/analytics.ts` | `SymptomRankingEntry`, `MedicationRankingEntry`, `MonthlyCount`, `SymptomRanking` Typen |
| `src/__tests__/lib/db/insights.test.ts:409-501` | 4 Tests für `getSymptomRanking()` |
| `src/__tests__/lib/db/sharing.test.ts:783-986` | 6 Tests für `getSharedSymptomRanking()` |

### Technical Decisions

- **Helper-Platzierung:** In `insights.ts` (nicht eigenes File) — bestehende Imports aus `sharing.ts` zeigen bereits dorthin
- **`dateTo` optional:** `getSymptomRanking()` hat keine obere Grenze → `dateTo?: string`, wenn undefined wird kein oberer Check gemacht
- **Return-Typ inkl. Totals:** `{ symptoms, medications, totalSymptomEvents, totalMedicationEvents }` — Aufrufstelle fügt nur `timeRange` hinzu
- **`toSortedMonthlyCounts()` wird Teil des Helpers** — nicht separat exportiert, da nur intern benötigt
- **MonthKey-Format vereinheitlichen:** Immer `padStart(2, '0')` verwenden (behebt inkonsistentes Format in `getSymptomRankingByAccount`)

### Differenzen zwischen den drei Funktionen

| Aspekt | `getSymptomRanking` | `getSymptomRankingByAccount` | `getSharedSymptomRanking` |
|--------|---------------------|-------------------------------|--------------------------|
| Datei | insights.ts | insights.ts | sharing.ts |
| Untere Grenze | `cutoffKey` (aus TimeRange) | `dateFrom` | `dateFrom` |
| Obere Grenze | keine | `dateTo` | `dateTo` |
| MonthKey-Format | `padStart(2, '0')` | ohne padStart ⚠️ | `padStart(2, '0')` |

## Implementation Plan

### Tasks

- [x] Task 1: `aggregateRankingFromRows()` Helper in `insights.ts` erstellen
  - File: `src/lib/db/insights.ts`
  - Action: Neue exportierte Funktion direkt vor `getSymptomRanking()` einfügen (~Zeile 323)
  - Signatur:
    ```typescript
    export function aggregateRankingFromRows(
      rows: TimelineRawRow[],
      dateFrom: string,
      dateTo?: string,
    ): {
      symptoms: SymptomRankingEntry[]
      medications: MedicationRankingEntry[]
      totalSymptomEvents: number
      totalMedicationEvents: number
    }
    ```
  - Logik aus `getSymptomRanking()` extrahieren (Zeilen 361-461): symptomMap/medicationMap Loop, `toSortedMonthlyCounts()` (lokal im Helper), Aggregation + Sort Pipeline
  - `dateFrom` → untere Grenze: `if (localKey < dateFrom) continue`
  - `dateTo` → obere Grenze (optional): `if (dateTo && localKey > dateTo) continue`
  - MonthKey-Format: IMMER `${year}-${String(month).padStart(2, '0')}`
  - Notes: Der Helper übernimmt alles NACH der DB-Query und Type-Assertion. Kein DB-Zugriff im Helper.

- [x] Task 2: `getSymptomRanking()` refactoren
  - File: `src/lib/db/insights.ts`
  - Action: Aggregationslogik (Zeilen ~358-461) durch Helper-Aufruf ersetzen
  - Vorher: ~100 Zeilen Aggregation
  - Nachher:
    ```typescript
    const rows = data as unknown as TimelineRawRow[]
    const cutoffKey = toLocalDateKey(startDate)
    const result = aggregateRankingFromRows(rows, cutoffKey)
    return { ...result, timeRange }
    ```
  - Notes: `cutoffKey` wird als `dateFrom` übergeben, kein `dateTo` (offenes Ende)

- [x] Task 3: `getSymptomRankingByAccount()` refactoren
  - File: `src/lib/db/insights.ts`
  - Action: Aggregationslogik (Zeilen ~507-606) durch Helper-Aufruf ersetzen
  - Nachher:
    ```typescript
    const rows = data as unknown as TimelineRawRow[]
    const result = aggregateRankingFromRows(rows, dateFrom, dateTo)
    return { ...result, timeRange: '30d' }
    ```
  - Notes: `toSortedMonthlyCountsByAccount()` entfällt komplett. `timeRange: '30d'` bleibt (pre-existing, out of scope)

- [x] Task 4: `getSharedSymptomRanking()` in `sharing.ts` refactoren
  - File: `src/lib/db/sharing.ts`
  - Action: Aggregationslogik (Zeilen ~504-605) durch Helper-Aufruf ersetzen
  - Import erweitern: `aggregateRankingFromRows` zu bestehenden Imports aus `@/lib/db/insights` hinzufügen
  - Nachher:
    ```typescript
    const rows = data as unknown as TimelineRawRow[]
    const result = aggregateRankingFromRows(rows, dateFrom, dateTo)
    return { ...result, timeRange: 'all' }
    ```
  - Notes: `toSortedMonthlyCounts()` und `toLocalDateKey`-Import in sharing.ts bleiben erhalten (werden von anderen Funktionen genutzt)

- [x] Task 5: Baseline-Tests für `getSymptomRankingByAccount()` hinzufügen
  - File: `src/__tests__/lib/db/insights.test.ts`
  - Action: Neuen `describe('getSymptomRankingByAccount')` Block hinzufügen (nach `getSymptomRanking` Tests, ~Zeile 501)
  - 2 Tests (Pattern aus bestehenden `getSymptomRanking`-Tests kopieren):
    1. Leeres Ergebnis bei keinen Events (analog Zeile 410-421)
    2. Symptome + Medikamente korrekt getrennt mit dateFrom/dateTo Filter (analog Zeile 461-487)
  - Mock-Setup: `createMockSupabaseRanking` wiederverwenden (Builder hat bereits `.lte()`)
  - Notes: Diese Tests VOR dem Refactoring schreiben, damit sie als Baseline-Regression dienen

- [x] Task 6: Prettier + Lint + Tests
  - Action: `npx prettier --write src/lib/db/insights.ts src/lib/db/sharing.ts src/__tests__/lib/db/insights.test.ts`
  - Action: `npm run lint` — keine neuen Fehler
  - Action: `npx vitest run` — alle Tests grün, keine Regressionen
  - Notes: Kein `npm run build` nötig für reine .ts-Refactoring-Änderungen (optional als Sanity-Check)

### Acceptance Criteria

- [x] AC 1: Given die drei Ranking-Funktionen, when der Code verglichen wird, then gibt es KEINE duplizierte Aggregationslogik mehr — jede Funktion ruft `aggregateRankingFromRows()` auf
- [x] AC 2: Given `getSymptomRanking()` mit TimeRange `'3m'`, when aufgerufen, then gibt es dasselbe Ergebnis wie vor dem Refactoring (bestehende 4 Tests grün)
- [x] AC 3: Given `getSharedSymptomRanking()` mit dateFrom/dateTo, when aufgerufen, then gibt es dasselbe Ergebnis wie vor dem Refactoring (bestehende 6 Tests grün)
- [x] AC 4: Given `getSymptomRankingByAccount()` mit dateFrom/dateTo, when aufgerufen, then gibt es dasselbe Ergebnis wie vor dem Refactoring (2 neue Baseline-Tests + bestehende indirekte Coverage grün)
- [x] AC 5: Given `aggregateRankingFromRows()` ohne `dateTo`, when ein Row einen localKey > dateFrom hat, then wird der Row gezählt (kein oberer Filter)
- [x] AC 6: Given `aggregateRankingFromRows()` mit `dateTo`, when ein Row einen localKey > dateTo hat, then wird der Row NICHT gezählt
- [x] AC 7: Given alle Tests, when `npx vitest run` ausgeführt wird, then sind alle Tests grün (keine Regressionen)

## Additional Context

### Dependencies

- Keine neuen Dependencies
- Identifiziert im Code Review von Story 6.3 (Finding M1)

### Testing Strategy

- 2 neue Baseline-Tests für `getSymptomRankingByAccount()` in `insights.test.ts` — VOR dem Refactoring schreiben (Regressionssicherheit)
- Bestehende Tests in `sharing.test.ts` (6 Tests) und `insights.test.ts` (4 + 2 neue = 6 Tests) validieren die korrekte Aggregation
- Tests mocken auf DB-Ebene und prüfen Aggregationsergebnis → Helper-Extraktion ist transparent

### Notes

- Quelle: Code Review Story 6.3, Finding M1 (MEDIUM)
- Party Mode Konsens: Return-Typ inkl. Totals, `dateTo` optional, `timeRange: '30d'` Bug in `getSymptomRankingByAccount()` out of scope
- **Bewusste Korrektur:** MonthKey-Format in `getSymptomRankingByAccount()` wird von `"2026-1"` (ohne padStart) zu `"2026-01"` (mit padStart) vereinheitlicht. Da Keys nur innerhalb einer Aufruf-Session existieren und `localeCompare`-Sortierung für beide Formate korrekt ist, kein Verhaltensunterschied — aber konsistenter mit den anderen beiden Funktionen.
- Party Mode #2: `getSymptomRankingByAccount()` hat keine eigenen Tests → 2 Baseline-Tests vor Refactoring hinzufügen (Task 5)

## Review Notes
- Adversarial review completed
- Findings: 10 total, 7 fixed (F1–F6, F10), 3 skipped (noise: F7–F9)
- Resolution approach: auto-fix
- Zusätzliche Tests durch Fixes: +6 (5 direkte aggregateRankingFromRows-Tests + 1 DB-Fehler-Test)
