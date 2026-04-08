---
title: 'Vorzeichen & Medikamente als Symptom-Attribute'
slug: 'precursor-medication-fields'
created: '2026-04-08'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Next.js 15 (App Router)', 'Supabase (Postgres + Auth + Storage + Realtime)', 'Claude Sonnet 4 (Extraction)', 'OpenAI GPT-4o-transcribe (Whisper)', 'Zod v4', 'React-PDF', 'Tailwind CSS', 'TypeScript']
files_to_modify:
  - 'supabase/migrations/20260408000001_precursor_medication_fields.sql'
  - 'src/types/ai.ts'
  - 'src/types/analytics.ts'
  - 'src/types/report.ts'
  - 'src/types/summary.ts'
  - 'src/types/database.ts'
  - 'src/lib/ai/providers/claude.ts'
  - 'src/lib/ai/providers/mock.ts'
  - 'src/lib/ai/__fixtures__/extractions.ts'
  - 'src/lib/ai/clarification.ts'
  - 'src/lib/ai/pipeline.ts'
  - 'src/lib/ai/rerun.ts'
  - 'src/lib/field-config.ts'
  - 'src/lib/db/insights.ts'
  - 'src/lib/db/sharing.ts'
  - 'src/lib/actions/symptom-actions.ts'
  - 'src/lib/pdf/pdf-data.ts'
  - 'src/lib/pdf/symptom-report.tsx'
  - 'src/components/capture/review-bubble.tsx'
  - 'src/components/capture/chat-feed.tsx'
  - 'src/components/capture/chat-bubble.tsx'
  - 'src/components/event/event-detail-sections.tsx'
  - 'src/components/event/event-detail-utils.ts'
  - 'src/components/event/event-detail-view.tsx'
  - 'src/components/event/event-edit-form.tsx'
  - 'src/components/sharing/doctor-event-card.tsx'
  - 'src/app/share/dashboard/page.tsx'
code_patterns:
  - 'Key-Value extracted_data mit symptom_index Gruppierung'
  - 'Zod-Schema-Validierung für Server Actions und AI-Output'
  - 'Fire-and-forget side effects (vocabulary, push, metrics)'
  - 'Service Client für Pipeline (RLS-Bypass)'
  - 'groupBySymptomIndex() in 4 Dateien'
  - 'isMedication-Branching in ~20 Stellen über 12 Dateien'
test_patterns:
  - 'Vitest + @testing-library/react für Komponenten-Tests'
  - 'Supabase-Mocks via vi.mock für DB-Layer-Tests'
  - 'E2E Mock Provider (E2E_MOCK_EXTRACTION=true)'
  - 'Fixtures in src/lib/ai/__fixtures__/extractions.ts'
---

# Tech-Spec: Vorzeichen & Medikamente als Symptom-Attribute

**Created:** 2026-04-08

## Overview

### Problem Statement

Medikamente werden aktuell als eigener Event-Typ (`event_type='medication'`) extrahiert, obwohl sie in der Praxis immer im Kontext eines Symptoms stehen (z.B. "Hatte Migräne, hab Dafalgan genommen"). Vorzeichen/Vorboten von Symptomen (z.B. Aura vor Migräne, Druckgefühl vor Kopfschmerzen) werden gar nicht erfasst. Beides sind wertvolle klinische Informationen, die zum Symptom-Event gehören.

### Solution

`event_type='medication'` abschaffen — alles wird als Symptom-Event erfasst. Medikamente und Vorzeichen werden als zusätzliche Felder innerhalb von Symptom-Events extrahiert. Ein neues `medication_index`-Feld in der `extracted_data`-Tabelle ermöglicht mehrere Medikamente mit unterschiedlichen Dosierungen pro Symptom-Event.

### Scope

**In Scope:**
- DB-Migration: `medication_index` Spalte in `extracted_data`, CHECK-Constraint + Unique-Index anpassen
- AI-Extraktion: Claude-Prompt, Tool-Definition, Zod-Schemas für neue Felder
- TypeScript-Typen: `eventType` aus ExtractionResult entfernen, `'medication'` aus allen Unions entfernen
- Field Config: Neue Labels (`precursor`, `medication_taken`, `medication_dosage`), Sortierung
- Clarification: Templates für Vorzeichen- und Medikamenten-Felder
- Pipeline: Medikament-Event-Typ-Logik entfernen
- Alle UI-Komponenten: ReviewBubble, ChatBubble, EventDetailSections, EventEditForm, SymptomTag
- Reports: PDF-Export, Insights (Ranking, Timeline, Feed), Sharing, AI-Summary
- Arzt-Dashboard: Shared Event-Detail, Timeline, Ranking, Event-Cards, AI-Summary
- Mock-Provider & Fixtures
- Alle betroffenen Tests (~25 Test-Dateien)

**Out of Scope:**
- Medikamenten-Ranking als separate Auswertung
- Vorzeichen-Korrelationsanalyse

## Context for Development

### Codebase Patterns

- **Key-Value Modell**: Extrahierte Daten in `extracted_data` als field_name/value/confidence Tripel
- **Multi-Symptom**: `symptom_index` (INTEGER, NOT NULL DEFAULT 0) gruppiert Felder pro Symptom
- **Neues Pattern**: `medication_index` (INTEGER, NULLABLE) gruppiert Medikamenten-Felder; NULL = kein Medikament
- **Event-Level-Felder**: `symptom_time` und `duration` gelten Event-weit (definiert in `EVENT_LEVEL_FIELDS` Set)
- **Grouping-Funktionen**: `groupBySymptomIndex()` existiert in 4 Varianten (insights.ts, review-bubble.tsx, event-edit-form.tsx, event-detail-utils.ts) — neues `groupByMedicationIndex()` nötig
- **isMedication-Branching**: ~20 Stellen in 12 Dateien prüfen `event_type === 'medication'` — alle entfernen
- **Server Actions**: Zod-Schema → Auth → Ownership → DB-Op → revalidatePath
- **Pipeline**: after() → runExtractionPipeline → Claude Extract → validateFields → INSERT → Status-Update
- **Correction Flow**: correctExtractedField nutzt `symptom_index` für Feld-Lookup — muss um `medication_index` erweitert werden

### Files to Reference

| File | Purpose | Änderung |
| ---- | ------- | -------- |
| `supabase/migrations/20260315000005_fix_extracted_data_unique_index.sql` | Aktueller Unique-Index: `(symptom_event_id, field_name, symptom_index)` | Muss um `medication_index` erweitert werden |
| `supabase/migrations/00008_audio_support.sql` | Aktueller CHECK: `event_type IN ('symptom', 'medication', 'voice')` | `'medication'` entfernen |
| `src/types/ai.ts` | ExtractionResult, ExtractionField, Zod-Schemas | `eventType` entfernen, `medicationIndex` hinzufügen |
| `src/types/analytics.ts` | FeedEvent, EventDetail, DayEventSummary, Rankings | `'medication'` aus Unions, `medicationCount` + `MedicationRankingEntry` entfernen |
| `src/lib/field-config.ts` | FIELD_LABELS, FIELD_ORDER, TITLE_FIELDS | Neue Felder, alte Medication-Felder entfernen |
| `src/lib/ai/providers/claude.ts` | System-Prompt, Tool-Schema, Taxonomy (595 Zeilen) | Prompt komplett überarbeiten |
| `src/lib/ai/pipeline.ts` | Extraction Pipeline | `event_type: result.eventType` entfernen, `medication_index` in INSERT |
| `src/lib/db/insights.ts` | Feed, Timeline, Ranking Queries | `isMedication`-Branching + `medicationCount` + Medication-Ranking entfernen |
| `src/components/capture/review-bubble.tsx` | Chat Review-Ansicht (501 Zeilen) | Medikamenten-Gruppe + Precursor-Feld |
| `src/components/event/event-edit-form.tsx` | Event Edit Form (555 Zeilen) | Medikamenten-Gruppen editierbar |

### Technical Decisions

- `medication_index` als neue nullable INTEGER Spalte — konsistent mit `symptom_index`-Pattern
- `eventType` komplett aus `ExtractionResult` und Zod-Schemas entfernen
- `event_type='medication'` aus DB CHECK entfernen — nur noch `('symptom', 'voice')`
- **Partial Unique Indexes** statt COALESCE: Separater Index für `medication_index IS NULL` und `medication_index IS NOT NULL` — PostgreSQL-idiomatischer, kein Magic-Value
- Alle `isMedication`-Branches löschen (~20 Stellen)
- Alte Felder `action`, `reason`, `medication_name`, `medication` entfernen
- Neue Felder: `medication_taken` + `medication_dosage` (mit `medication_index`), `precursor` (mit `symptom_index`)
- Medikamente gelten Event-weit, nicht pro Symptom
- `correctExtractedFieldSchema`: Optionales `medicationIndex`-Feld
- Alle `extracted_data(...)` Selects (8+ Stellen): Um `medication_index` erweitern
- `STRUCTURED_FIELDS` in review-bubble: `precursor` hinzufügen; Medikamenten-Felder in separater Gruppe
- Pipeline INSERT: `medication_index: field.medicationIndex ?? null`
- Keine Altdaten-Migration nötig (nie Medication-Events erfasst)
- Tests werden pro Phase mitgezogen — nach jeder Phase müssen alle Tests grün sein

### Bekannte Limitationen

1. **Multi-Symptom Medikamenten-Zuordnung**: Medikamente gelten Event-weit, nicht pro Symptom. Bei Multi-Symptom-Events (z.B. "Kopfschmerzen und Übelkeit, Dafalgan für die Kopfschmerzen") geht die Zuordnung Medikament→Symptom verloren. Pragmatische Entscheidung für V1.
2. **Kein nachträgliches Medikament-Hinzufügen**: Medikamente werden nur bei der Ersterfassung extrahiert. Ein Flow zum nachträglichen Hinzufügen ("hab dann doch noch Ibuprofen genommen") existiert nicht — erfordert neuen Eingabe-Flow, nicht nur Edit.

## Implementation Plan

### Tasks

#### Phase 1: Datenmodell & Typen (Bottom-Up)

- [x] **Task 1: DB-Migration erstellen**
  - File: `supabase/migrations/20260408000001_precursor_medication_fields.sql`
  - Action:
    1. `ALTER TABLE extracted_data ADD COLUMN medication_index INTEGER DEFAULT NULL`
    2. `DROP INDEX idx_extracted_data_event_field` (alter Unique-Index)
    3. **Partial Unique Indexes** (sauberer als COALESCE mit Magic-Value):
       ```sql
       -- Für Nicht-Medikament-Felder (medication_index IS NULL):
       CREATE UNIQUE INDEX idx_extracted_data_non_med
         ON extracted_data (symptom_event_id, field_name, symptom_index)
         WHERE medication_index IS NULL;
       -- Für Medikament-Felder:
       CREATE UNIQUE INDEX idx_extracted_data_med
         ON extracted_data (symptom_event_id, field_name, symptom_index, medication_index)
         WHERE medication_index IS NOT NULL;
       ```
    4. `CREATE INDEX idx_extracted_data_medication_index ON extracted_data(symptom_event_id, medication_index)` — für Medikamenten-Gruppierung
    5. `ALTER TABLE symptom_events DROP CONSTRAINT symptom_events_event_type_check`
    6. `ALTER TABLE symptom_events ADD CONSTRAINT symptom_events_event_type_check CHECK (event_type IN ('symptom', 'voice'))`
    7. `npx supabase gen types typescript` ausführen → aktualisiert `src/types/database.ts` (muss VOR Task 2 passieren)
  - Notes: `supabase db reset` lokal testen, dann `supabase migration up`. Typ-Generierung ist Voraussetzung für alle folgenden Tasks.

- [x] **Task 2a: AI- & Action-Typen aktualisieren**
  - File: `src/types/ai.ts`
  - Action:
    1. `ExtractionField`: `medicationIndex?: number` hinzufügen (optional, nullable)
    2. `ExtractionResult`: `eventType`-Feld komplett entfernen — Typ wird zu `{ fields: ExtractionField[] }`
    3. `extractionResultSchema` (Zod): `eventType`-Feld entfernen, `medicationIndex` zu `rawExtractionFieldSchema` und `extractionFieldSchema` hinzufügen (optional integer, default null)
    4. `extractionFieldSchema`: `medicationIndex: z.number().int().min(0).nullable().default(null)`
  - File: `src/types/symptom.ts`
  - Action: `correctExtractedFieldSchema` um `medicationIndex: z.number().int().min(0).nullable().optional().default(null)` erweitern
  - Depends on: Task 1 (database.ts muss regeneriert sein)

- [x] **Task 2b: Analytics-, Report- & Summary-Typen bereinigen**
  - File: `src/types/analytics.ts`
  - Action:
    1. `DayEventSummary`: `medicationCount` Feld entfernen
    2. `FeedEvent`: `eventType` ändern von `'symptom' | 'medication'` zu `'symptom'`
    3. `FeedFilter`: `eventType` Feld entfernen (oder zu `'symptom' | 'all'`)
    4. `MedicationRankingEntry`: Typ komplett löschen
    5. `SymptomRanking`: `medications`, `totalMedicationEvents` Felder entfernen
    6. `EventDetail`: `eventType` ändern von `'symptom' | 'medication'` zu `'symptom'`
    7. `ExtractedField`: `medicationIndex?: number | null` hinzufügen
  - File: `src/types/report.ts`
  - Action: `PdfEventDetail.eventType` ändern zu `'symptom'`
  - File: `src/types/summary.ts`
  - Action: `SummaryEventData.eventType` Feld entfernen oder zu `string` belassen (wird in Claude-Summary-Prompt nicht mehr für Branching genutzt)
  - Depends on: Task 1

- [x] **Task 3: Field Config aktualisieren**
  - File: `src/lib/field-config.ts`
  - Action:
    1. `FIELD_LABELS`: Entfernen: `medication`, `medication_name`, `action`, `reason`. Hinzufügen: `precursor: 'Vorzeichen'`, `medication_taken: 'Medikament'`, `medication_dosage: 'Dosierung'`
    2. `FIELD_ORDER`: Entfernen: `medication`, `medication_name`, `dosage`, `reason`, `action`. Hinzufügen: `precursor` nach `symptom_name`, `medication_taken` und `medication_dosage` am Ende nach `duration`
    3. `TITLE_FIELDS`: Entfernen: `medication`, `medication_name`. `medication_taken` NICHT als Title-Field (wird in Medikamenten-Gruppe gerendert, nicht als Gruppen-Titel)

#### Phase 2: AI-Extraktion & Pipeline

- [x] **Task 4a: Claude System-Prompt überarbeiten**
  - File: `src/lib/ai/providers/claude.ts`
  - Action:
    1. `systemPrompt`: "Schritt 1: Event-Typ bestimmen" komplett entfernen — alles ist Symptom
    2. "Bei Medikamenten extrahiere" Block entfernen
    3. Neue Felder in Symptom-Extraktion ergänzen:
       - `precursor`: Vorzeichen/Vorboten (Aura, Lichtblitze, Übelkeit vor Symptom, Druckgefühl, etc.). `symptomIndex` nutzen. Null wenn nicht erwähnt.
       - `medication_taken`: Name des eingenommenen Medikaments. `medicationIndex` nutzen (0, 1, 2...). Null wenn kein Medikament erwähnt.
       - `medication_dosage`: Dosierung (z.B. "500mg", "2 Tabletten"). Gleicher `medicationIndex` wie zugehöriges `medication_taken`. Null wenn nicht erwähnt.
    4. LDS-Kontext ergänzen: Typische Vorzeichen bei LDS/Marfan (z.B. Aura vor Migräne, Engegefühl vor Brustschmerzen, Sehstörungen als Vorboten)

- [x] **Task 4b: Claude Tool-Schema anpassen**
  - File: `src/lib/ai/providers/claude.ts`
  - Action:
    1. `extractionTool` Tool-Schema: `eventType` Property entfernen
    2. `medicationIndex` Property hinzufügen (analog zu `symptomIndex`): `{ type: 'integer', minimum: 0, description: 'Index des Medikaments bei Multi-Medikament-Eingaben. 0 = erstes Medikament. Nur für medication_taken und medication_dosage Felder.', default: null }`
    3. `fieldName` description aktualisieren: `medication_taken`, `medication_dosage`, `precursor` als gültige Felder auflisten

- [x] **Task 4c: Claude-Beispiele aktualisieren**
  - File: `src/lib/ai/providers/claude.ts`
  - Action:
    1. Bestehende Medikamenten-Beispiele entfernen
    2. Neues Beispiel: Eingabe mit Vorzeichen + Medikament + Dosierung ("Hatte wieder Migräne mit Aura, hab Dafalgan 1g genommen")
    3. Neues Beispiel: Multi-Medikament ("Ibuprofen 400 und Paracetamol 500 gegen Kopfschmerzen")
    4. Neues Beispiel: Nur Symptom ohne Medikament/Vorzeichen (zeigt dass medicationIndex null bleibt)

- [x] **Task 4d: Claude Summary-Prompt anpassen**
  - File: `src/lib/ai/providers/claude.ts`
  - Action:
    1. `summarySystemPrompt`: "Medikamenten-Events" Referenz entfernen
    2. Stattdessen: "Eingenommene Medikamente und deren Dosierung sind als Teil der Symptom-Events erfasst."
    3. Vorzeichen in Summary integrieren: "Vorzeichen/Vorboten (precursor) sollen in der Zusammenfassung erwähnt werden, wenn sie ein Muster zeigen (z.B. wiederkehrende Aura vor Migräne)"
  - Notes: Ersetzt Task 21 — Summary-Prompt-Änderung hier gebündelt

- [x] **Task 5: Zod-Schema & Provider-Interface anpassen**
  - File: `src/types/ai.ts` (bereits in Task 2 Typen angepasst — hier Zod-Details)
  - Action:
    1. `rawExtractionFieldSchema`: `medicationIndex: z.number().int().min(0).nullable().optional().default(null)` hinzufügen
    2. `extractionResultSchema`: `eventType` Feld komplett entfernen. Schema wird zu `z.object({ fields: z.array(rawExtractionFieldSchema).min(1).transform(...) })`
    3. `.transform()` Filter anpassen: Nullables für `medicationIndex` korrekt durchreichen
  - File: `src/lib/ai/providers/claude.ts`
  - Action: `normalizeExtractedValue()` — Synonym-Normalisierung bleibt nur für `symptom_name` (kein Change nötig)

- [x] **Task 6: Pipeline anpassen**
  - File: `src/lib/ai/pipeline.ts`
  - Action:
    1. Zeile 162: `extractedRows` Mapping um `medication_index: field.medicationIndex ?? null` erweitern
    2. Zeile 222-226: `event_type: result.eventType` aus dem Status-Update entfernen. Nur noch `status: 'extracted'` setzen. `event_type` bleibt wie beim Insert ('symptom' oder 'voice')
  - Notes: `result.eventType` existiert nicht mehr nach Task 5

- [x] **Task 7: Mock-Provider & Fixtures aktualisieren**
  - File: `src/lib/ai/providers/mock.ts`
  - Action:
    1. `isMedication`-Regex-Branch komplett entfernen
    2. Standard-Rückgabe: Symptom mit optionalen Medikamenten-Feldern wenn Input Medikamenten-Keywords enthält. Kein `eventType` mehr im Return.
    3. Neues Return-Format: `{ fields: [...] }` statt `{ eventType: 'symptom', fields: [...] }`
  - File: `src/lib/ai/__fixtures__/extractions.ts`
  - Action:
    1. `medicationExtraction` Fixture löschen
    2. Alle verbleibenden Fixtures: `eventType` Feld entfernen
    3. Neue Fixtures hinzufügen:
       - `symptomWithPrecursorExtraction`: Symptom mit `precursor`-Feld (z.B. Migräne mit Aura)
       - `symptomWithMedicationExtraction`: Symptom mit `medication_taken` + `medication_dosage` (einzelnes Medikament, `medicationIndex: 0`)
       - `symptomWithMultiMedicationExtraction`: Symptom mit 2 Medikamenten (`medicationIndex: 0` und `1`)
       - `fullSymptomExtraction`: Symptom mit Vorzeichen + 2 Medikamente (Komplett-Fixture für Integration)

- [x] **Task 8: Clarification-Templates erweitern**
  - File: `src/lib/ai/clarification.ts`
  - Action:
    1. `FIELD_PRIORITY`: `precursor: 10`, `medication_taken: 11`, `medication_dosage: 12` hinzufügen (niedrige Priorität — Rückfragen zu Kernfeldern sind wichtiger)
    2. `clarificationTemplates`: Neue Einträge:
       - `precursor`: `{ question: 'Hattest du Vorzeichen bevor das Symptom aufgetreten ist?', options: ['Aura/Sehstörungen', 'Übelkeit', 'Druckgefühl', 'Stimmungsschwankung', 'Müdigkeit', 'Nein, keine Vorzeichen'] }`
       - `medication_taken`: `{ question: 'Hast du ein Medikament eingenommen?', options: ['Ibuprofen', 'Paracetamol/Dafalgan', 'Aspirin', 'Novalgin', 'Triptan', 'Nein'] }`
       - `medication_dosage`: `{ question: (value) => value ? 'Welche Dosierung von ${value}?' : 'Welche Dosierung?', options: ['200mg', '400mg', '500mg', '1g', '1 Tablette', '2 Tabletten'] }`
  - Notes: Clarification für Medikamenten-Felder hat niedrige Priorität — erst nach Kern-Symptom-Feldern

- [x] **Task 9: Validation aktualisieren**
  - File: `src/lib/ai/validation.ts`
  - Action: Kein Change nötig — generische Feld-Validierung. Neue Felder (`precursor`, `medication_taken`, `medication_dosage`) fallen in den `default`-Case und werden durchgereicht.
  - Notes: Bewusst kein Enum-Validation für Medikamenten-Namen (zu viele gültige Werte)

#### Phase 3: DB-Layer & Server Actions

- [x] **Task 10: Insights DB-Layer bereinigen**
  - File: `src/lib/db/insights.ts`
  - Action:
    1. `ExtractedDataRow` (Zeile 23): `medication_index?: number` hinzufügen
    2. `groupExtractedBySymptomIndex()` (Zeile 49): `event_type`-Parameter entfernen. `displayName`-Logik: immer `map.get('symptom_name')` (kein Medication-Branch). Funktion bleibt ansonsten gleich.
    3. `mapRowToFeedEvent()` (Zeile 74): `eventType` hardcoden als `'symptom'` (kein Medication-Check)
    4. `getMonthlyTimeline()` (Zeile 131): `isMedication`-Branch (Zeile 188-192) entfernen. `medicationCount`-Tracking entfernen. Nur noch `symptomCount` und `totalCount` zählen.
    5. `aggregateRankingFromRows()` (Zeile 291): `medicationMap` komplett entfernen. `isMedication`-Branch (Zeile 318-329) entfernen. Return-Objekt: `medications` und `totalMedicationEvents` entfernen.
    6. `getEventDetail()` (Zeile 573): `eventType` hardcoden als `'symptom'`. `extracted_data` Select um `medication_index` erweitern. `ExtractedField` Mapping: `medicationIndex: r.medication_index ?? null`
    7. Alle `extracted_data(...)` Selects: `medication_index` hinzufügen (getChronologicalFeed, getDayEvents, getSymptomEvents, getMonthlyTimeline Selects die symptom_index haben)
    8. `DayEventSummary`-Typisierung: `medicationCount` entfällt — alle Stellen die darauf zugreifen anpassen
    9. `buildEmptyTimeline()`: `medicationCount: 0` entfernen

- [x] **Task 11: Sharing DB-Layer bereinigen**
  - File: `src/lib/db/sharing.ts`
  - Action:
    1. `getSharedSymptomEvents()` (deprecated, Zeile 341): `event_type === 'medication'` Check und `medication`-Feldname entfernen. `eventType`-Feld im Return entfernen oder hardcoden.
    2. `getSharedFeedEvents()` (Zeile 395): Kein Change nötig — delegiert an `mapRowToFeedEvent()` (Task 10)
    3. `getSharedEventsForSummary()` (Zeile 440): `eventType`-Feld im Return-Mapping anpassen (oder entfernen)
    4. `getSharedSymptomRanking()` (Zeile 487): Kein Change nötig — delegiert an `aggregateRankingFromRows()` (Task 10)
    5. `getSharedEventDetail()` (Zeile 536): `eventType` hardcoden als `'symptom'`. `extracted_data` Select um `medication_index` erweitern. `ExtractedField` Mapping um `medicationIndex` ergänzen.
    6. Alle `extracted_data(...)` Selects: `medication_index` hinzufügen wo fehlend

- [x] **Task 12: Server Actions anpassen**
  - File: `src/lib/actions/symptom-actions.ts`
  - Action:
    1. `correctExtractedField()` (Zeile 258): Feld-Lookup (Zeile 306) um `medication_index` erweitern. Wenn `parsed.data.medicationIndex !== null`, als `.eq('medication_index', parsed.data.medicationIndex)` zur Query hinzufügen. Sonst `.is('medication_index', null)`.
    2. INSERT-Pfad (Zeile 313): `medication_index: parsed.data.medicationIndex ?? null` zum Insert hinzufügen.
    3. `answerClarification()` (Zeile 447): `answerClarificationSchema` in `src/types/symptom.ts` um `medicationIndex: z.number().int().min(0).nullable().optional().default(null)` erweitern. In der Funktion: wenn `medicationIndex !== null`, als `.eq('medication_index', parsed.data.medicationIndex)` zur Query hinzufügen, sonst `.is('medication_index', null)`. Ohne das können Clarification-Antworten für `medication_dosage` nicht korrekt zugeordnet werden.
  - File: `src/types/symptom.ts`
  - Action:
    1. `correctExtractedFieldSchema`: `medicationIndex: z.number().int().min(0).nullable().optional().default(null)` hinzufügen
    2. `answerClarificationSchema`: `medicationIndex: z.number().int().min(0).nullable().optional().default(null)` hinzufügen

- [x] **Task 13: PDF-Datenaufbereitung anpassen**
  - File: `src/lib/pdf/pdf-data.ts`
  - Action:
    1. `loadPdfEvents()` (Zeile 52): `eventType` Mapping hardcoden als `'symptom'` (Zeile 110)
    2. `loadSummaryEvents()` (Zeile 126): `eventType` im Return-Mapping anpassen
    3. `buildStatisticalSummary()` (Zeile 181): Medication-Event-Filterung (Zeile 187) entfernen. `medEvents` Variable entfernen. Summary-Text anpassen: keine separate Medikamenten-Zählung.

#### Phase 4: UI-Komponenten

- [x] **Task 14: Event-Detail-Utils erweitern**
  - File: `src/components/event/event-detail-utils.ts`
  - Action:
    1. Neue Funktion `groupByMedicationIndex(fields: ExtractedField[]): Map<number, ExtractedField[]>` — analog zu `groupBySymptomIndex`, aber filtert auf `medicationIndex !== null` und gruppiert nach `medicationIndex`
    2. `EVENT_LEVEL_FIELDS`: Bleibt unverändert (`symptom_time`, `duration`)
    3. Neue Konstante `MEDICATION_FIELDS = new Set(['medication_taken', 'medication_dosage'])` — für Filterung in Symptom-Gruppen

- [x] **Task 15: Review-Bubble anpassen**
  - File: `src/components/capture/review-bubble.tsx`
  - Action:
    1. `STRUCTURED_FIELDS` Set (Zeile 103): `'precursor'` hinzufügen
    2. `SingleSymptomReview`: `precursor`-Feld unter Symptom-Name rendern (nach `symptomName`, vor `locationParts`). Als Text-Zeile mit "Vorzeichen: {value}".
    3. `extraFields` Filterung (Zeile 182): Medikamenten-Felder (`medication_taken`, `medication_dosage`) ausfiltern — werden separat gerendert
    4. Neue Subkomponente `MedicationGroup`: Rendert alle Medikamente pro `medication_index` als editierbare Paare. Visuell als Block mit Trennlinie unter den Symptom-Gruppen. Format pro Medikament: "💊 {medication_taken} · {medication_dosage}" mit Tap-to-Edit.
    5. `ReviewBubble` Haupt-Render: Nach `symptomGroups.map(...)` und vor Action-Buttons: `MedicationGroup` einfügen. Medikamenten-Felder aus `extractedFields` filtern (`field.field_name === 'medication_taken' || field.field_name === 'medication_dosage'`), nach `medication_index` gruppieren.
    6. `isMedication` Variable (Zeile 376) und `hasFrequency` Check entfernen. `hasDuration`-Logik vereinfachen (kein isMedication-Check mehr).
    7. `suppressSlider` Prop in `SingleSymptomReview`: Kein `isMedication`-Check mehr, nur noch `hasFrequency`.

- [x] **Task 16: Chat-Feed & Chat-Bubble bereinigen**
  - File: `src/components/capture/chat-feed.tsx`
  - Action:
    1. Zeile 90: `const isMedication = event.event_type === 'medication'` entfernen
    2. Zeile 105 + 174: `isMedication` Prop von Komponenten-Aufrufen entfernen
    3. Alle Stellen wo `isMedication` als Prop oder Variable verwendet wird → entfernen
  - File: `src/components/capture/chat-bubble.tsx`
  - Action: `isMedication` Prop aus Interface und Rendering entfernen

- [x] **Task 17: Event-Detail-Sections bereinigen**
  - File: `src/components/event/event-detail-sections.tsx`
  - Action:
    1. `EventTypeBadge`: `isMedication`-Logik entfernen. Badge zeigt immer "Symptom" mit Farbe `#C06A3C`. Oder komplett vereinfachen / entfernen wenn Badge keinen Mehrwert mehr hat.
    2. `ExtractedDataSection`: `isMedication` Variable (Zeile 137) entfernen. `symptomGroups` immer berechnen (kein `null` für Medication). Medikamenten-Felder in eigener Gruppe anzeigen (analog zum Review-Bubble Pattern aus Task 15).
  - File: `src/components/event/event-detail-view.tsx`
  - Action: `const isMedication = detail.eventType === 'medication'` (Zeile 154) entfernen. Alle Stellen die `isMedication` nutzen (z.B. Zeile 281) bereinigen.

- [x] **Task 18: Event-Edit-Form erweitern**
  - File: `src/components/event/event-edit-form.tsx`
  - Action:
    1. `allFieldNames` Prop: Muss Medikamenten-Felder enthalten (`medication_taken`, `medication_dosage`, `precursor`)
    2. Neuer Abschnitt "Medikamente" unter den Symptom-Gruppen: Pro `medication_index` ein Feldpaar (`medication_taken` + `medication_dosage`) rendern. Analog zur Multi-Symptom-Logik aber mit `medication_index` statt `symptom_index`.
    3. `fieldKey()` Funktion erweitern: Medikamenten-Felder brauchen Key-Format `${name}:med${medicationIndex}` um Kollisionen mit Symptom-Feld-Keys zu vermeiden.
    4. `saveField()`: Bei Medikamenten-Feldern `medicationIndex` an `correctExtractedField()` übergeben.
    5. `precursor` wird als normales Text-Feld pro Symptom-Gruppe gerendert (kein Sonder-Handling nötig — läuft über den Default-Text-Input).

- [x] **Task 19: Arzt-Dashboard & Sharing bereinigen**
  - File: `src/components/sharing/doctor-event-card.tsx`
  - Action: `isMedication` Variable (Zeile 68) und alle abhängigen Styling-Variablen (`accentColor`, `badgeBg`, `badgeText`, `badgeLabel`, `symbol`) entfernen. Einheitliches Symptom-Styling.
  - File: `src/app/share/dashboard/page.tsx`
  - Action: Zeilen 106-123: Medication-Event-Type-Branching für Icon/Label/Farbe entfernen. Einheitliche Symptom-Darstellung.

#### Phase 5: Reports & PDF

- [x] **Task 20: PDF-Report anpassen**
  - File: `src/lib/pdf/symptom-report.tsx`
  - Action:
    1. `TimelineSection`: "Medikamente" Spalte (`colMedications`) entfernen. Tabellen-Header und Zeilen-Rendering anpassen: nur noch Monat, Symptome, Total.
    2. `EventCard`: `eventType`-Branching entfernen. Medication-Felder im Event-Detail als "Medikament: X · Dosierung: Y" anzeigen (falls vorhanden).
    3. `SymptomGroupLine`: Medikamenten-Felder (`medication_taken`, `medication_dosage`) besonders formatieren — als "💊 Name · Dosis" Zeile.
  - File: `src/lib/pdf/pdf-data.ts`
  - Action: Bereits in Task 13 behandelt.

- ~~Task 21~~ → **Verschoben nach Task 4d** (Summary-Prompt-Änderung mit restlichem Claude-Prompt gebündelt)

#### Phase 6: Tests (pro Phase mitziehen — bestehende Tests in jeder Phase grün halten)

**Strategie:** Tests werden parallel zu den jeweiligen Phasen geschrieben/aktualisiert. Nach jeder Phase müssen alle bestehenden Tests grün sein, bevor die nächste Phase startet. Neue Tests für neue Funktionalität werden in der gleichen Phase wie der Produktivcode geschrieben.

- [x] **Task 22: AI-Layer Tests aktualisieren** (parallel zu Phase 2)
  - Files: `src/__tests__/lib/ai/providers/claude.test.ts`, `extract.test.ts`, `clarification.test.ts`, `pipeline.test.ts`, `rerun.test.ts`, `claude-summary.test.ts`, `summarize.test.ts`, `prompt-enrichment.test.ts`, `validation.test.ts`
  - Action:
    1. Alle `eventType: 'medication'` oder `eventType: 'symptom'` Referenzen in Fixtures/Mocks entfernen (kein `eventType` mehr)
    2. `medicationExtraction` Fixture-Referenzen durch neue Fixtures ersetzen
    3. Neue Test-Cases für `precursor` und `medication_taken`/`medication_dosage` mit `medicationIndex`
    4. Pipeline-Test: Prüfen dass `medication_index` korrekt in INSERT-Rows enthalten ist
    5. Clarification-Test: Neue Templates testen

- [x] **Task 23: DB-Layer Tests aktualisieren** (parallel zu Phase 3)
  - Files: `src/__tests__/lib/db/insights.test.ts`, `sharing.test.ts`, `sharing-feed.test.ts`
  - Action:
    1. Alle `event_type: 'medication'` in Test-Fixtures entfernen. Events sind immer `'symptom'` oder `'voice'`.
    2. `medicationCount` Assertions entfernen
    3. `MedicationRankingEntry` Assertions entfernen
    4. Neue Test-Cases: Events mit `medication_index`-Feldern in extracted_data prüfen
    5. `groupExtractedBySymptomIndex` Tests: Medication-Event-Type-Branch entfernen
    6. **Neuer Integrationstest für Partial Unique Index**: Edge Cases testen — gleicher `field_name` + gleicher `symptom_index` + verschiedene `medication_index` = OK; gleicher `field_name` + gleicher `symptom_index` + gleicher `medication_index` = Conflict; `medication_index IS NULL` + gleicher Rest = Conflict

- [x] **Task 24: Komponenten-Tests aktualisieren** (parallel zu Phase 4)
  - Files: `src/__tests__/review-bubble.test.tsx`, `chat-bubble.test.tsx`, `chat-feed.test.tsx`, `event-detail-view.test.tsx`, `event-detail-sections.test.tsx`, `event-edit.test.tsx`
  - Action:
    1. `isMedication` Prop-Tests entfernen
    2. `medication_name` Fixture-Felder durch `medication_taken` + `medication_dosage` mit `medication_index` ersetzen
    3. Neue Tests: ReviewBubble mit Medikamenten-Gruppe und Precursor-Feld
    4. Neue Tests: EventEditForm mit Medikamenten-Gruppen-Rendering

- [x] **Task 25: Sharing & Insights Komponenten-Tests aktualisieren** (parallel zu Phase 4/5)
  - Files: `src/__tests__/components/sharing/doctor-event-card.test.tsx`, `doctor-timeline.test.tsx`, `doctor-event-detail-view.test.tsx`, `ai-summary-card.test.tsx`, `src/__tests__/components/insights/feed-event-card.test.tsx`, `insights-summary-card.test.tsx`, `symptom-feed.test.tsx`, `day-drill-down.test.tsx`
  - Action:
    1. Alle `eventType: 'medication'` Fixtures → `'symptom'`
    2. Medication-Badge-Tests entfernen
    3. `medicationCount` Assertions entfernen
    4. PDF-Test: Medication-Spalten-Assertions entfernen

- [x] **Task 26: PDF-Report Test aktualisieren** (parallel zu Phase 5)
  - File: `src/__tests__/lib/pdf/symptom-report.test.tsx`
  - Action:
    1. Medication-Event Fixtures entfernen
    2. Timeline-Tabelle: "Medikamente" Spalte nicht mehr prüfen
    3. Optional: Neuer Test mit Event das Medikamenten-Felder enthält

- [x] **Task 27: E2E-Tests aktualisieren**
  - Files: E2E-Test-Dateien die `E2E_MOCK_EXTRACTION=true` nutzen
  - Action:
    1. Mock-Provider gibt neue Feld-Struktur zurück (kein `eventType`, mit `medicationIndex`)
    2. Neuer E2E-Test: Input mit Medikamenten-Keywords → prüfe dass Medikamenten-Gruppe in Review gerendert wird
    3. Neuer E2E-Test: Input mit Vorzeichen-Keywords → prüfe dass Precursor-Feld angezeigt wird
    4. Neuer E2E-Test: Multi-Medikament-Input → prüfe dass 2 separate Medikamenten-Einträge angezeigt werden
  - Notes: Mock-Provider (Task 7) muss neue Felder korrekt zurückgeben

- [x] **Task 28: isMedication-Cleanup-Verifikation**
  - Action: Nach Abschluss aller Phasen `grep -r "isMedication\|event_type.*medication\|medication_name\|eventType.*medication" src/` ausführen. Muss 0 Treffer ergeben. Falls Treffer: nachbessern.
  - Notes: Verifikationsschritt — kein Code, nur Prüfung. Schützt vor vergessenen Branches in den 12 betroffenen Dateien.

### Acceptance Criteria

#### Datenmodell
- [x] AC 1: Given die Migration ist angewendet, when ein `extracted_data`-Eintrag mit `medication_index=0` und `field_name='medication_taken'` eingefügt wird, then wird er korrekt gespeichert
- [x] AC 2: Given die Migration ist angewendet, when zwei Einträge mit gleichem `symptom_event_id`, `field_name='medication_taken'`, `symptom_index=0` aber verschiedenem `medication_index` (0, 1) eingefügt werden, then werden beide gespeichert (kein Unique-Constraint-Verletzung)
- [x] AC 3: Given die Migration ist angewendet, when ein Event mit `event_type='medication'` eingefügt wird, then schlägt der CHECK-Constraint fehl

#### AI-Extraktion
- [x] AC 4: Given die Eingabe "Hatte wieder Migräne mit Aura, hab Dafalgan 1g und Ibuprofen 400mg genommen", when die Claude-Extraktion läuft, then werden extrahiert: `symptom_name=Migräne`, `precursor=Aura`, `medication_taken=Dafalgan` (medicationIndex=0), `medication_dosage=1g` (medicationIndex=0), `medication_taken=Ibuprofen` (medicationIndex=1), `medication_dosage=400mg` (medicationIndex=1)
- [x] AC 5: Given die Eingabe "Kopfschmerzen seit heute morgen", when die Claude-Extraktion läuft, then werden keine `medication_taken`-Felder extrahiert und `medicationIndex` ist null für alle Felder
- [x] AC 6: Given der Mock-Provider, when ein Input mit Medikamenten-Keywords verarbeitet wird, then gibt der Provider Felder mit `medicationIndex` zurück (kein `eventType`)

#### Pipeline
- [x] AC 7: Given eine erfolgreiche Extraktion, when die Pipeline `extracted_data` einfügt, then enthält jede Zeile das Feld `medication_index` (null für Symptom-Felder, 0/1/2... für Medikamente)
- [x] AC 8: Given eine erfolgreiche Extraktion, when die Pipeline den Event-Status aktualisiert, then wird `event_type` NICHT verändert (bleibt 'symptom' oder 'voice')

#### UI — Chat Review
- [x] AC 9: Given ein extrahiertes Event mit `precursor=Aura`, when die Review-Bubble gerendert wird, then wird "Vorzeichen: Aura" unter dem Symptom-Namen angezeigt
- [x] AC 10: Given ein extrahiertes Event mit 2 Medikamenten (medicationIndex 0 und 1), when die Review-Bubble gerendert wird, then werden beide Medikamente als separate editierbare Einträge in einer Medikamenten-Gruppe angezeigt
- [x] AC 11: Given ein extrahiertes Event ohne Medikamente, when die Review-Bubble gerendert wird, then wird keine Medikamenten-Gruppe angezeigt

#### UI — Event Detail & Edit
- [x] AC 12: Given ein bestätigtes Event mit Medikamenten-Feldern, when die Event-Detail-Ansicht gerendert wird, then werden Medikamente in einer eigenen Gruppe angezeigt
- [x] AC 13: Given ein Event im Edit-Modus, when der User ein Medikamenten-Feld (z.B. `medication_dosage` bei medicationIndex=0) ändert, then wird `correctExtractedField` mit dem korrekten `medicationIndex` aufgerufen und die Änderung gespeichert
- [x] AC 14: Given ein Event im Edit-Modus, when der User das `precursor`-Feld ändert, then wird die Korrektur korrekt gespeichert (mit `symptomIndex`, ohne `medicationIndex`)

#### Reports & Sharing
- [x] AC 15: Given bestätigte Events (einige mit Medikamenten-Feldern), when der PDF-Report generiert wird, then enthält die Timeline-Tabelle keine "Medikamente"-Spalte und die Event-Cards zeigen Medikamente als Teil des Symptom-Details
- [x] AC 16: Given ein Arzt-Sharing-Link, when das Dashboard geladen wird, then werden alle Events als "Symptom" angezeigt (kein "Medikament"-Badge) und Medikamente erscheinen in den Event-Details
- [x] AC 17: Given bestätigte Events, when das Symptom-Ranking geladen wird, then gibt es kein separates Medikamenten-Ranking mehr

#### Korrektur-Flow
- [x] AC 18: Given ein extrahiertes Event mit medication_taken bei medicationIndex=1, when der User den Wert korrigiert, then wird genau das Feld bei medicationIndex=1 aktualisiert (nicht medicationIndex=0)

#### Clarification-Flow
- [x] AC 19: Given eine Clarification-Frage für `medication_dosage` bei medicationIndex=0, when der User antwortet, then wird die Antwort korrekt dem Feld mit medicationIndex=0 zugeordnet (nicht medicationIndex=1 oder NULL)

#### AI-Summary & Vorzeichen
- [x] AC 20: Given mehrere Events mit `precursor`-Feldern (z.B. 3x "Aura" vor Migräne), when die AI-Summary generiert wird, then erwähnt die Zusammenfassung das Vorzeichen-Muster (z.B. "wiederkehrende Aura als Vorbote der Migräne")

#### Datenintegrität
- [x] AC 21: Given die Partial Unique Indexes, when zwei `medication_taken`-Felder mit gleichem `symptom_event_id`, `symptom_index=0`, aber `medication_index=0` und `medication_index=1` eingefügt werden, then werden beide gespeichert
- [x] AC 22: Given die Partial Unique Indexes, when ein zweites `medication_taken`-Feld mit gleichem `symptom_event_id`, `symptom_index=0`, `medication_index=0` eingefügt wird, then schlägt der Unique-Constraint fehl

#### Cleanup-Verifikation
- [x] AC 23: Given alle Phasen sind abgeschlossen, when `grep -r "isMedication\|event_type.*medication\|medication_name\|eventType.*medication" src/` ausgeführt wird, then gibt es 0 Treffer

## Additional Context

### Dependencies

- Keine neuen externen Dependencies nötig
- Supabase CLI für Migration: `supabase db reset` (lokal), dann `supabase migration up`
- `npx supabase gen types typescript` nach Migration für aktualisierte `database.ts`
- Claude Sonnet 4 API: Prompt-Änderung erfordert kein Modell-Update

### Testing Strategy

**Unit-Tests (Vitest):**
- AI-Provider: Claude-Output-Format ohne `eventType`, mit `medicationIndex`
- Extraction Fixtures: Neue Fixtures für precursor + medication + multi-medication
- Validation: Bestehende Tests laufen weiter (generische Validierung)
- Pipeline: `medication_index` in INSERT-Rows, kein `event_type`-Update
- Insights: Kein Medication-Branching, kein `medicationCount`, kein Medication-Ranking
- Sharing: Analog zu Insights
- Clarification: Neue Templates für precursor/medication_taken/medication_dosage

**Komponenten-Tests (Vitest + Testing Library):**
- ReviewBubble: Precursor-Anzeige, Medikamenten-Gruppe, Editierbarkeit
- ChatBubble/ChatFeed: Kein `isMedication`-Prop
- EventDetailSections: Kein Medication-Badge, Medikamenten-Gruppe
- EventEditForm: Medikamenten-Gruppen-Rendering + Korrektur mit `medicationIndex`
- Arzt-Komponenten: Einheitliches Styling ohne Medication-Branching

**Manuelles Testing:**
- Voice-Input: "Hatte Migräne mit Aura, hab Dafalgan genommen" — prüfe Extraktion + Review
- Multi-Medikament: "Ibuprofen 400 und Paracetamol 500 gegen Kopfschmerzen" — prüfe 2 Medikamente
- Nur Symptom: "Rückenschmerzen seit gestern" — prüfe dass keine Medikamenten-Gruppe erscheint
- Edit-Flow: Medikament korrigieren, Vorzeichen hinzufügen
- PDF-Report: Timeline ohne Medikamenten-Spalte, Events mit Medikamenten-Details
- Arzt-Dashboard: Sharing-Link öffnen, Events ohne Medication-Badge prüfen

### Notes

**Hohe Risiko-Bereiche:**
- Claude-Prompt-Änderung: Neues Extraktions-Verhalten muss in Produktion getestet werden. Empfehlung: Erste Tage nach Deploy monitoren (extraction_metrics Tabelle)
- Partial Unique Indexes: Sicherstellen dass beide Indexes korrekt greifen — dedizierter DB-Integrationstest in Task 23
- Review-Bubble Komplexität: Bereits 501 Zeilen — MedicationGroup sollte als separate Komponenten-Datei extrahiert werden um die Datei nicht weiter aufzublähen
- 20 isMedication-Löschungen über 12 Dateien: Vergessene Branches = Runtime-Fehler → Grep-Verifikation in Task 28

**Implementierungs-Reihenfolge:**
- Strikt Bottom-Up: Migration → Typen → AI → Pipeline → DB-Layer → Actions → UI → Reports
- Jede Phase sollte für sich kompilierbar sein (keine zirkulären Abhängigkeiten)
- **Tests pro Phase mitziehen** — nicht erst am Ende. Bestehende Tests müssen nach jeder Phase grün sein, neue Tests werden parallel zum Produktivcode geschrieben
- Task 1 generiert `database.ts` → Voraussetzung für alle TypeScript-Änderungen
