# Story 6.3: Arzt-Symptom-Ranking mit Trendlinien

Status: ready-for-dev

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

- [ ] Task 1: DB-Funktion für Arzt-Ranking (AC: #1, #2, #3, #4, #8)
  - [ ] `src/lib/db/sharing.ts` erweitern (NICHT `insights.ts` — Doctor-Queries gehören zum Sharing-Modul)
  - [ ] `getSharedSymptomRanking(accountId, dateFrom, dateTo): Promise<SymptomRanking>` erstellen
  - [ ] Intern: `createServiceClient()` verwenden (Arzt hat keine Auth-Session)
  - [ ] **Hilfsfunktionen aus `insights.ts` importieren** (NICHT duplizieren): `calculateTrend()` (bereits exportiert), `pivotExtractedData()` (MUSS exportiert werden — ist aktuell nur intern)
  - [ ] `pivotExtractedData()` in `insights.ts` exportieren (Voraussetzung für diese Story)
  - [ ] Aggregationslogik (symptomMap/medicationMap Loop, toSortedMonthlyCounts) wird in `sharing.ts` implementiert — gleicher Algorithmus, aber eigener Query mit Service Client
  - [ ] Timezone-safe: `dateFrom`/`dateTo` als DATE-Strings (YYYY-MM-DD), +1 Tag Puffer an Grenzen
  - [ ] Query: `.select('id, event_type, occurred_at, extracted_data(field_name, value)')` mit `.gte('occurred_at', dateFrom)` und `.lte('occurred_at', dateTo + 1 Tag)`
  - [ ] Return: `SymptomRanking` (bestehender Typ aus `analytics.ts` wiederverwenden, `timeRange` Feld auf `'all'` setzen)

- [ ] Task 2: Doctor-Ranking Server Component (AC: #1, #2, #3, #4, #5, #6, #7, #9, #10)
  - [ ] `src/components/sharing/doctor-ranking.tsx` erstellen (Server Component, KEIN `'use client'`)
  - [ ] Props: `ranking: SymptomRanking`
  - [ ] Mobile-Layout (Default): Karten-Stapel mit `DoctorRankingCard` Komponente
  - [ ] Desktop-Layout (ab `xl:`): Semantische `<table>` mit Spalten: Symptom, Häufigkeit, Trend, Ø Intensität, Sparkline (Ärzte erwarten tabellarische Datenaufbereitung — UX-Konvention)
  - [ ] Responsive-Umschaltung: `<div className="xl:hidden">` für Karten, `<table className="hidden xl:table">` für Tabelle
  - [ ] Arzt-Theme Styling: `rounded-lg border border-border` (statt `rounded-2xl shadow-sm`)
  - [ ] Sektionen: "Symptome" Header + Karten/Zeilen, "Medikamente" Header + Karten/Zeilen (conditional)
  - [ ] Empty State: "Keine Symptome in diesem Zeitraum erfasst."

- [ ] Task 3: DoctorRankingCard Komponente (AC: #2, #4, #5)
  - [ ] `src/components/sharing/doctor-ranking-card.tsx` erstellen
  - [ ] Props: `entry: SymptomRankingEntry | MedicationRankingEntry`, `variant: 'symptom' | 'medication'`
  - [ ] Wiederverwendung der `TrendArrow` und `Sparkline` Logik aus `symptom-ranking-card.tsx` (kopieren, nicht importieren — Doctor-Komponenten sind unabhängig)
  - [ ] Arzt-Theme: `rounded-lg border border-border bg-card` (keine shadow), kompaktere Padding
  - [ ] Touch-Target: min 44px Höhe beibehalten
  - [ ] KEIN `onClick` / `onToggle` — reine Anzeige-Komponente (Drill-Down ist Story 6.4)

- [ ] Task 4: Dashboard-Integration (AC: #10)
  - [ ] `src/app/share/dashboard/page.tsx` modifizieren
  - [ ] Ranking-Platzhalter durch `<DoctorRanking ranking={ranking} />` ersetzen
  - [ ] `getSharedSymptomRanking(linkData.accountId, linkData.dateFrom, linkData.dateTo)` aufrufen
  - [ ] Audit-Log: `ranking_view` Action loggen (best-effort, optional — oder in `dashboard_view` subsumiert)

- [ ] Task 5: Tests (AC: #1-#10)
  - [ ] `src/__tests__/lib/db/sharing.test.ts` erweitern — `getSharedSymptomRanking()` Tests (3-4 Tests: leeres Ergebnis, Symptome + Medikamente, Trend-Berechnung, Zeitraum-Filterung)
  - [ ] `src/__tests__/components/sharing/doctor-ranking.test.tsx` (NEU) — Rendering-Tests (4-5 Tests: Symptome anzeigen, Medikamente anzeigen, leerer Zustand, Arzt-Theme Styling, responsive Layout-Klassen)
  - [ ] `src/__tests__/components/sharing/doctor-ranking-card.test.tsx` (NEU) — Card-Tests (3-4 Tests: Symptom-Variante, Medikament-Variante, Trend-Pfeile, Sparkline)
  - [ ] Alle bestehenden Tests müssen grün bleiben (keine Regressionen)

- [ ] Task 6: Build-Verifikation (AC: alle)
  - [ ] `npx prettier --write` auf alle geänderten/neuen Dateien
  - [ ] `npm run lint` — keine neuen Fehler
  - [ ] `npm run build` — erfolgreich
