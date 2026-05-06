---
title: 'Dynamische Anzeige extrahierter Felder'
slug: 'dynamic-extracted-fields'
created: '2026-03-21'
status: 'implemented'
implementedDate: '2026-05-06'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Next.js App Router', 'TypeScript', 'Supabase', '@react-pdf/renderer', 'Vitest', 'React Testing Library']
files_to_modify:
  - 'src/types/analytics.ts'
  - 'src/types/report.ts'
  - 'src/lib/db/insights.ts'
  - 'src/lib/db/sharing.ts'
  - 'src/lib/pdf/pdf-data.ts'
  - 'src/lib/pdf/symptom-report.tsx'
  - 'src/components/event/event-detail-view.tsx'
  - 'src/components/sharing/doctor-event-detail-view.tsx'
  - 'src/app/(event)/event/[id]/edit/page.tsx'
  - 'src/components/event/event-edit-form.tsx'
  - 'src/components/insights/feed-event-card.tsx'
  - 'src/components/sharing/doctor-event-card.tsx'
  - 'src/components/capture/chat-bubble.tsx'
  - 'src/components/capture/review-bubble.tsx'
  - 'src/components/capture/symptom-tag.tsx'
  - 'src/lib/ai/clarification.ts'
code_patterns:
  - 'Formatting-Helpers (formatSymptomTimestamp, formatDurationMinutes, getSeverityInfo) dupliziert in 4 Komponenten'
  - 'pivotExtractedData() ist zentraler Flaschenhals — wird von mapRowToFeedEvent() genutzt (insights.ts + sharing.ts)'
  - 'groupExtractedBySymptomIndex() für Multi-Symptom in Feed + PDF'
  - 'EventDetail hat bereits extractedFields: ExtractedField[] mit ALLEN DB-Feldern'
  - 'review-bubble.tsx hat bereits extraFields-Handling für nicht-STRUCTURED Felder'
  - 'clarification.ts hat bereits getDefaultTemplate() Fallback'
test_patterns:
  - 'Vitest + React Testing Library'
  - 'Mock-Daten mit hardcoded FeedEvent/FeedSymptomGroup Properties'
  - '15 Test-Dateien betroffen'
---

# Tech-Spec: Dynamische Anzeige extrahierter Felder

**Created:** 2026-03-21

> **Status:** Implementiert (Stand 2026-05-06) — alle Tasks abgeschlossen. FeedEvent-Vereinfachung, EventDetail-Schema, FeedSymptomGroup und Dynamic-Field-Rendering sind im Code umgesetzt. Weiterführende Arbeit in [`tech-spec-precursor-medication-fields.md`](./tech-spec-precursor-medication-fields.md).

## Overview

### Problem Statement

Die KI-Extraktion speichert Symptom-Daten dynamisch in der `extracted_data`-Tabelle (Spalten: `field_name`, `value`, `symptom_index`, `confidence`). Neue Felder wie `trigger`, `frequency` und `status` werden korrekt extrahiert und gespeichert, sind aber in **allen UI-Oberflächen unsichtbar**, weil 14+ Stellen im Code hardcoded Feld-Listen verwenden. Jede Erweiterung der Extraktion erfordert manuelle Code-Änderungen an all diesen Stellen.

### Solution

Alle Stellen refactoren, sodass extrahierte Felder dynamisch aus den `extracted_data`-Rows gelesen und angezeigt werden — keine hardcoded Feld-Listen mehr. Bekannte Felder erhalten bevorzugte Labels und Sortierung, unbekannte Felder werden mit ihrem `field_name` als Fallback-Label angezeigt.

### Scope

**In Scope:**
- Detail-Views (Patient + Arzt)
- Edit-Form + Edit-Page
- Feed-Cards (Patient + Arzt)
- PDF-Report (Daten + Rendering)
- Data-Transformation (`pivotExtractedData`, `groupExtractedBySymptomIndex`)
- TypeScript Types (`FeedSymptomGroup`, `FeedEvent`, `PdfEventDetail`)
- Capture-UI (Chat-Bubble, Review-Bubble, Symptom-Tag)
- Clarification-Templates (`clarification.ts`) — dynamischer Fallback für unbekannte Felder

**Out of Scope:**
- KI-Extraktion selbst (`claude.ts` Prompt)
- DB-Schema (`extracted_data` ist bereits dynamisch)

## Context for Development

### Codebase Patterns

- `extracted_data`-Tabelle speichert Felder als Key-Value-Paare: `field_name` (Text), `value` (Text), `symptom_index` (Integer), `confidence` (Numeric)
- Multi-Symptom-Events gruppieren Felder nach `symptom_index`
- Event-Level-Felder (`symptom_time`, `duration`) gelten für das gesamte Event, nicht pro Symptom
- Bestehende `FIELD_LABELS`-Maps verwenden `Record<string, string>` mit Fallback auf `field_name`
- Formatierer (`formatFieldValue`) behandeln spezielle Felder (intensity → `/10`, symptom_time → Datum, duration → Minuten)
- `pivotExtractedData()` ist der zentrale Flaschenhals — konvertiert dynamische DB-Rows in statisch typisiertes Objekt mit 7 fixen Properties
- `mapRowToFeedEvent()` nutzt `pivotExtractedData()` und wird von `insights.ts` und `sharing.ts` gemeinsam verwendet
- `EventDetail` hat bereits `extractedFields: ExtractedField[]` mit allen DB-Feldern — Detail-Views empfangen die Daten dynamisch, filtern dann aber auf hardcoded Listen
- `review-bubble.tsx` hat bereits `extraFields`-Handling (zeigt nicht-STRUCTURED Felder als Tags) — Ansatz muss nur erweitert werden
- `clarification.ts` hat bereits `getDefaultTemplate()` Fallback für unbekannte Felder und `FIELD_PRIORITY` gibt unbekannten Feldern Priorität 10
- Formatting-Helpers sind über 4 Komponenten dupliziert (chat-bubble, review-bubble, event-detail-view, doctor-event-detail-view)

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/types/analytics.ts` | `FeedSymptomGroup` (5 fixe Props), `FeedEvent` (7 fixe extrahierte Props), `EventDetail`, `ExtractedField` |
| `src/types/report.ts` | `PdfEventDetail` (5 fixe extrahierte Props), nutzt `FeedSymptomGroup` |
| `src/lib/db/insights.ts:49-132` | `pivotExtractedData()`, `groupExtractedBySymptomIndex()`, `mapRowToFeedEvent()` |
| `src/lib/db/insights.ts:608-690` | `getEventDetail()` — liefert `extractedFields[]` dynamisch, mappt dann `symptomName`/`medication` fix |
| `src/lib/db/sharing.ts:395-431` | `getSharedFeedEvents()` — nutzt `mapRowToFeedEvent()` |
| `src/lib/db/sharing.ts:536-635` | `getSharedEventDetail()` — identisch zu `getEventDetail()` mit fixem `symptomName`/`medication` Mapping |
| `src/lib/pdf/pdf-data.ts:110-132` | `loadPdfEvents()` — nutzt `pivotExtractedData()` für `PdfEventDetail` |
| `src/lib/pdf/symptom-report.tsx:188-250` | `SymptomGroupLine`, `EventCard` — hardcoded `group.bodyRegion`, `group.side` etc. |
| `src/components/event/event-detail-view.tsx:17-40` | `FIELD_LABELS`, `PER_SYMPTOM_FIELDS`, `SHARED_FIELDS`, `ALL_SYMPTOM_FIELDS` |
| `src/components/sharing/doctor-event-detail-view.tsx:11-30` | Identische Duplikation der Detail-View-Logik |
| `src/app/(event)/event/[id]/edit/page.tsx:10-18` | `SYMPTOM_FIELD_NAMES` — steuert welche Felder das Edit-Form zeigt |
| `src/components/event/event-edit-form.tsx:20-28,282-449` | `FIELD_LABELS`, `renderField()` mit hardcoded Feld-Aufrufen im JSX |
| `src/components/insights/feed-event-card.tsx:27-53,136-158` | `SymptomGroupRow` nutzt `group.bodyRegion` etc., Single-Symptom nutzt `event.symptomName` etc. |
| `src/components/sharing/doctor-event-card.tsx:23-49,121-143` | Identische Duplikation der Feed-Card-Logik |
| `src/components/capture/chat-bubble.tsx:106-121,123-181` | `KNOWN_SYMPTOM_FIELDS`/`KNOWN_MEDICATION_FIELDS` Whitelist, `SingleSymptomSummary` |
| `src/components/capture/review-bubble.tsx:101-109,139-274` | `STRUCTURED_FIELDS`, `SingleSymptomReview` mit hardcoded Feld-Extraktion |
| `src/components/capture/symptom-tag.tsx:7-15` | `FIELD_LABELS` (kurze Labels für Capture-UI) |
| `src/lib/ai/clarification.ts:8-19,93-181` | `FIELD_PRIORITY`, `clarificationTemplates` — bereits mit Fallback |

### Technical Decisions (Party-Mode-Ergebnisse)

**Type-Design:**

```typescript
type FeedSymptomGroup = {
  displayName: string | null  // Titel der Gruppe: symptom_name (Symptom) oder medication (Medikament)
  fields: Record<string, string>  // alle Felder inkl. symptom_name/medication
}

type FeedEvent = {
  id: string
  eventType: 'symptom' | 'medication'
  occurredAt: string
  createdAt: string
  endedAt: string | null
  rawInput: string | null
  photoCount: number
  hasAudio: boolean
  symptoms: FeedSymptomGroup[]  // auch für Medikamente!
}
// Flache extrahierte Properties (symptomName, bodyRegion, side, symptomType,
// intensity, medication, dosage) werden entfernt.
// Medikament-Events: symptoms[0].fields['medication'], symptoms[0].fields['dosage']
```

**Weitere Entscheidungen:**

- **`displayName` als Convenience-Property** in `FeedSymptomGroup` — wird überall als Gruppen-Titel verwendet. Explizit an `eventType` gekoppelt in `groupExtractedBySymptomIndex()`: für Symptom-Events → `fields['symptom_name']`, für Medikament-Events → `fields['medication']`. Kein fragiler `??`-Fallback zwischen den beiden.
- **Medikamente über `symptoms[]`** — Medikament-Events nutzen dieselbe Struktur: `symptoms[0].fields['medication']` statt separater `FeedEvent.medication`/`dosage`
- **`PdfEventDetail`**: Analog — flache extrahierte Properties raus, nur `symptoms: FeedSymptomGroup[]`
- **`EventDetail`**: Behält `extractedFields: ExtractedField[]` (bereits dynamisch). Die flachen `symptomName`/`medication` Properties werden entfernt
- **Formatierung in Display-Schicht**: `intensity → /10`, `duration → Min.` etc. werden in Komponenten formatiert, nicht im Pivot. Der Pivot liefert nur rohe Strings.
- **FIELD_LABELS als geteilte Konstante**: `FIELD_LABELS` wird in `symptom-tag.tsx` definiert und exportiert. Alle anderen Komponenten importieren es von dort. Jede Komponente kann lokale Erweiterungen hinzufügen (z.B. Edit-Form hat `intensity: 'Intensität (1–10)'` statt nur `'Intensität'`). **FIELD_ORDER** analog — eine geteilte Sortierreihenfolge.
- **FIELD_LABELS und FIELD_ORDER als Hint-System**: Dienen Sortierung und Label-Übersetzung, sind aber kein Filter. Felder ohne Eintrag werden mit `field_name` als Label am Ende angezeigt (alphabetisch).
- **Feed-Cards**: Alle Felder dynamisch mit `·` getrennt anzeigen, in `FIELD_ORDER`-Reihenfolge
- **Edit-Form**: Spezial-Widgets (Slider, datetime-local, side-Buttons, Duration) bleiben für bekannte Felder; unbekannte Felder erhalten generische Text-Inputs. **FIELD_ORDER gilt auch für die Edit-Form** — Spezial-Widgets werden in definierter Reihenfolge gerendert (z.B. Intensity-Slider vor generischen Text-Inputs).
- **Capture-UI**: Bekannte Felder behalten Spezial-Rendering (Icons, Severity-Dots, strukturiertes Layout). Unbekannte Felder als generische SymptomTag-Chips — **Sichtbarkeit nie gefiltert**, nur Darstellungsformat variiert
- **Clarification**: `FIELD_PRIORITY` nur für Sortierung, generischer Fallback für unbekannte Felder
- **Tests pro Phase fixen** (nicht gesammelt am Ende): Nach jedem Phase-Commit die betroffenen Test-Dateien sofort aktualisieren, damit das Test-Harness nie länger als eine Phase kaputt ist.
- **Task-Reihenfolge Bottom-Up**: Types → Pivot → Queries → Consumers (jeweils mit Tests)

## Implementation Plan

### Tasks

#### Phase 1: Types (Fundament)

- [ ] Task 1: `FeedSymptomGroup` und `FeedEvent` umbauen
  - File: `src/types/analytics.ts`
  - Action: `FeedSymptomGroup` ändern zu `{ displayName: string | null, fields: Record<string, string> }`. `displayName` ersetzt das alte `symptomName` — es ist der Titel der Gruppe (Symptom-Name oder Medikament-Name, je nach `eventType`). Von `FeedEvent` die flachen Properties `symptomName`, `bodyRegion`, `side`, `symptomType`, `intensity`, `medication`, `dosage` entfernen. `symptoms: FeedSymptomGroup[]` bleibt — wird jetzt auch für Medikamente genutzt.
  - Action: Von `EventDetail` die Properties `symptomName` und `medication` entfernen. `extractedFields: ExtractedField[]` bleibt unverändert.

- [ ] Task 2: `PdfEventDetail` umbauen
  - File: `src/types/report.ts`
  - Action: Flache Properties `symptomName`, `medication`, `bodyRegion`, `side`, `intensity` entfernen. `symptoms: FeedSymptomGroup[]` bleibt und wird jetzt auch für Medikamente befüllt. `rawInput`, `photoBase64`, `occurredAt`, `endedAt`, `eventType`, `id` bleiben.

#### Phase 2: Data-Transformation (Pivot)

- [ ] Task 3: `pivotExtractedData()` entfernen, `groupExtractedBySymptomIndex()` refactoren
  - File: `src/lib/db/insights.ts`
  - Action: `pivotExtractedData()` löschen (wird nicht mehr gebraucht).
  - Action: `groupExtractedBySymptomIndex()` ändern: Statt hardcoded Properties (`symptomName`, `bodyRegion`, ...) → `{ displayName, fields: Object.fromEntries(map) }` zurückgeben. Die Map enthält alle Felder dynamisch. **`displayName`-Logik:** Die Funktion erhält den `eventType` als Parameter. Für Symptom-Events: `displayName = map.get('symptom_name') ?? null`. Für Medikament-Events: `displayName = map.get('medication') ?? null`. Kein `??`-Fallback zwischen den beiden.
  - Action: `groupExtractedBySymptomIndex(null)` muss `[]` zurückgeben (Edge-Case: kein extracted_data).
  - Action: `mapRowToFeedEvent()` refactoren: Statt `pivotExtractedData()` + Spread nutzt es jetzt `groupExtractedBySymptomIndex(rows, eventType)` für alle Event-Typen (inkl. Medikamente). Flache Properties entfernen, nur noch `symptoms` setzen.
  - Notes: `mapRowToFeedEvent()` wird von `sharing.ts` importiert — der Vertrag ändert sich mit dem neuen `FeedEvent` Type.
  - **Tests (sofort):** `insights.test.ts` — Mock-Daten für `groupExtractedBySymptomIndex()` und `mapRowToFeedEvent()` aktualisieren. Neues Szenario: Event mit unbekanntem Feld (`{ field_name: 'custom_field', value: 'test' }`) → muss in `fields` erscheinen. Neues Szenario: `groupExtractedBySymptomIndex(null, 'symptom')` → `[]`. Neues Szenario: Event ohne `extracted_data` → `symptoms: []`, kein Crash.

- [ ] Task 4: `getEventDetail()` anpassen
  - File: `src/lib/db/insights.ts:608-690`
  - Action: Die Zeilen 672-675 (`fieldMap`, `symptomName`, `medication`) und deren Zuweisungen im Return-Objekt (677-689) entfernen. `extractedFields` bleibt als einzige Quelle für extrahierte Daten.

- [ ] Task 5: `getSharedEventDetail()` anpassen
  - File: `src/lib/db/sharing.ts:536-635`
  - Action: Analog zu Task 4 — Zeilen 618-620 (`symptomName`, `medication` Mapping) und deren Zuweisungen im Return (631-633) entfernen.
  - **Tests (sofort):** `sharing-feed.test.ts` und `sharing.test.ts` — Mock-Daten aktualisieren (neue `FeedEvent`/`EventDetail` Struktur ohne flat Props).

#### Phase 3: PDF-Pipeline

- [ ] Task 6: `loadPdfEvents()` anpassen
  - File: `src/lib/pdf/pdf-data.ts:110-132`
  - Action: Statt `pivotExtractedData()` → `groupExtractedBySymptomIndex()` verwenden. Flache Properties (`symptomName`, `medication`, `bodyRegion`, `side`, `intensity`) aus dem Return-Objekt entfernen. Nur noch `symptoms` setzen. Medikament-Events erhalten ebenfalls `symptoms` mit `fields['medication']` etc.

- [ ] Task 7: `SymptomGroupLine` und `EventCard` dynamisch machen
  - File: `src/lib/pdf/symptom-report.tsx:188-250`
  - Action: `SymptomGroupLine` — statt `group.bodyRegion`, `group.side`, `group.intensity`, `group.symptomType` → über `group.fields` iterieren. Titel kommt aus `group.displayName`. Bekannte Felder formatieren (intensity → `/10`), unbekannte als `key: value`. Reihenfolge via FIELD_ORDER.
  - Action: `EventCard` — statt `event.symptomName`, `event.medication`, `event.bodyRegion` etc. → `event.symptoms[0]` nutzen. Titel via `event.symptoms[0]?.displayName` (enthält je nach `eventType` Symptom-Name oder Medikament-Name).
  - **Tests (sofort):** `symptom-report.test.tsx` — `PdfReportData` Mock-Daten auf neue Struktur umstellen.

#### Phase 4: Detail-Views

- [ ] Task 8: Patient Event-Detail-View dynamisch machen
  - File: `src/components/event/event-detail-view.tsx`
  - Action: Lokale `FIELD_LABELS` entfernen. Stattdessen `FIELD_LABELS` aus `symptom-tag.tsx` importieren (siehe Task 15). Fallback auf `field_name` bleibt via `getFieldLabel()`.
  - Action: `PER_SYMPTOM_FIELDS`, `SHARED_FIELDS`, `ALL_SYMPTOM_FIELDS`, `MEDICATION_FIELDS` Konstanten entfernen.
  - Action: Event-Level-Felder (`symptom_time`, `duration`) als `Set` definieren (nur für Multi-Symptom-Trennung relevant).
  - Action: Single-Symptom-Modus — alle `extractedFields` mit `value` anzeigen, sortiert nach FIELD_ORDER. Keine Filterung auf hardcoded Liste mehr.
  - Action: Multi-Symptom-Modus — pro Gruppe: alle Felder ausser Event-Level anzeigen. Event-Level-Felder einmal separat anzeigen. Dynamisch iterieren statt hardcoded `PER_SYMPTOM_FIELDS`.
  - Action: Medikament-Modus — gleiche dynamische Logik, alle vorhandenen Felder anzeigen.

- [ ] Task 9: Doctor Event-Detail-View dynamisch machen
  - File: `src/components/sharing/doctor-event-detail-view.tsx`
  - Action: Identisch zu Task 8. `FIELD_LABELS` aus `symptom-tag.tsx` importieren, hardcoded Listen entfernen, dynamisch über `extractedFields` iterieren.
  - **Tests (sofort):** `event-detail-view.test.tsx` und `doctor-event-detail-view.test.tsx` — `EventDetail` Mock-Daten aktualisieren (ohne `symptomName`/`medication` flat Props).

#### Phase 5: Edit-Form

- [ ] Task 10: Edit-Page — dynamische `allFieldNames`
  - File: `src/app/(event)/event/[id]/edit/page.tsx`
  - Action: `SYMPTOM_FIELD_NAMES` Konstante entfernen. `allFieldNames` dynamisch aus den tatsächlichen `extractedFields` ableiten: `[...new Set(extractedFields.map(f => f.field_name))]`, sortiert nach FIELD_ORDER.

- [ ] Task 11: Edit-Form — dynamisches Rendering
  - File: `src/components/event/event-edit-form.tsx`
  - Action: Lokale `FIELD_LABELS` entfernen. `FIELD_LABELS` und `FIELD_ORDER` aus `symptom-tag.tsx` importieren. Lokale Erweiterung: `{ ...FIELD_LABELS, intensity: 'Intensität (1–10)' }` für Edit-spezifisches Label.
  - Action: Hardcoded `renderField()`-Aufrufe im JSX (Zeilen 517-522, 535-551) durch dynamische Iteration über `allFieldNames` ersetzen, sortiert nach `FIELD_ORDER`. Event-Level-Felder (symptom_time, duration) einmal rendern, per-Symptom-Felder pro Gruppe.
  - Action: `renderField()` bleibt — es hat bereits generischen Text-Input als Default-Case (Zeile 432-446). Spezial-Widgets (intensity Slider, symptom_time datetime-local, side Buttons, duration Widget) werden via `fieldName`-Check beibehalten.
  - **Tests (sofort):** `event-edit.test.tsx` — Mock-Daten aktualisieren.

#### Phase 6: Feed-Cards

- [ ] Task 12: Patient Feed-Event-Card dynamisch machen
  - File: `src/components/insights/feed-event-card.tsx`
  - Action: `SymptomGroupRow` — statt `group.bodyRegion`, `group.side`, `group.intensity`, `group.symptomType` → dynamisch über `group.fields` iterieren. Titel aus `group.displayName`. Felder in FIELD_ORDER sortieren, `symptom_name`/`medication` überspringen (ist Titel). Bekannte Felder formatieren (intensity → `/10`). **Edge-Case:** Wenn `fields` leer ist → keine Detail-Zeile rendern (kein leerer `·`-String).
  - Action: Single-Symptom-Fallback (Zeilen 136-158) — statt `event.symptomName`, `event.bodyRegion` etc. → `event.symptoms[0]` nutzen und dynamisch rendern wie `SymptomGroupRow`.
  - Action: Medikament-Ansicht (Zeilen 117-124) — statt `event.medication`, `event.dosage` → `event.symptoms[0]?.displayName`, dynamisch alle Felder anzeigen.

- [ ] Task 13: Doctor Feed-Event-Card dynamisch machen
  - File: `src/components/sharing/doctor-event-card.tsx`
  - Action: Identisch zu Task 12 — gleiche Änderungen anwenden.
  - **Tests (sofort):** `feed-event-card.test.tsx`, `doctor-event-card.test.tsx`, `symptom-feed.test.tsx`, `day-drill-down.test.tsx`, `doctor-timeline.test.tsx` — `FeedEvent` Mock-Daten aktualisieren. Neues Szenario: `trigger`-Feld in der Card → wird angezeigt. Neues Szenario: Event mit leeren `fields: {}` → kein Crash, keine leere Detailzeile.

#### Phase 7: Capture-UI

- [ ] Task 14: Chat-Bubble dynamisch machen
  - File: `src/components/capture/chat-bubble.tsx`
  - Action: `KNOWN_SYMPTOM_FIELDS` und `KNOWN_MEDICATION_FIELDS` Sets entfernen.
  - Action: `SingleSymptomSummary` — statt hardcoded `get('symptom_name')`, `get('body_region')` etc. → dynamisch über alle Felder iterieren. `symptom_name` als Titel (fett). Bekannte Felder (`body_region`, `side`, `symptom_type`) zusammen in einer Zeile mit `·`. `intensity` mit Severity-Dot. `symptom_time`/`duration` mit Zeitformat. Alle übrigen Felder als zusätzliche Zeilen.
  - Action: `ConfirmedFieldsSummary` Medikament-Teil — statt hardcoded `get('medication_name')` etc. → dynamisch über alle Felder. `medication_name` als Titel, Rest als Detail-Zeilen.
  - Notes: Die `unknownFields`-Filterung (Zeile 143-145, 196-198) entfällt komplett — es gibt keine "unknown" Felder mehr, alle werden angezeigt.

- [ ] Task 15: Symptom-Tag als zentrale FIELD_LABELS/FIELD_ORDER Quelle
  - File: `src/components/capture/symptom-tag.tsx`
  - Action: `FIELD_LABELS` um neue Felder erweitern: `trigger: 'Auslöser'`, `frequency: 'Häufigkeit'`, `status: 'Verlauf'`, `medication: 'Medikament'`, `medication_name: 'Medikament'`, `dosage: 'Dosierung'`, `action: 'Aktion'`, `reason: 'Grund'`. Fallback auf `field_name` existiert bereits in `getFieldLabel()`.
  - Action: `FIELD_LABELS` und `getFieldLabel()` exportieren, damit alle anderen Komponenten sie importieren können (Detail-Views, Edit-Form, Feed-Cards, PDF, Chat-Bubble).
  - Action: `FIELD_ORDER: string[]` exportieren — definiert die Sortierreihenfolge für dynamisches Rendering. Bekannte Felder zuerst (in sinnvoller Reihenfolge), unbekannte Felder danach alphabetisch. Beispiel: `['symptom_name', 'body_region', 'side', 'symptom_type', 'intensity', 'trigger', 'frequency', 'status', 'symptom_time', 'duration', 'medication', 'medication_name', 'dosage', 'reason', 'action']`.
  - Notes: **Dieser Task sollte VOR den Consumer-Tasks (Phase 4-7) erledigt werden**, da diese die Exports brauchen. Am besten zusammen mit Phase 1-2 in den Fundament-Commit.

- [ ] Task 16: Review-Bubble dynamisch machen
  - File: `src/components/capture/review-bubble.tsx`
  - Action: `STRUCTURED_FIELDS` Set erweitern oder entfernen. Aktuell trennt es Felder in "strukturiertes Layout" vs. "generische Tags". Neuer Ansatz: Bekannte Felder (`symptom_name`, `body_region`, `side`, `symptom_type`, `intensity`, `symptom_time`, `duration`) behalten Spezial-Rendering. Alle anderen Felder (inkl. `trigger`, `frequency`, `status` und unbekannte) als SymptomTag-Chips in der `extraFields`-Sektion.
  - Action: `SingleSymptomReview` — die hardcoded Extraktion (Zeilen 154-161: `symptomName`, `bodyRegion`, `side`, `symptomType`, `intensity`, `symptomTime`, `duration`) bleibt für das Spezial-Layout bestehen. `STRUCTURED_FIELDS` bleibt als Rendering-Hint, aber neue Felder wie `trigger`/`frequency` landen automatisch in `extraFields` (Zeile 168-170) und werden als bearbeitbare Tags gezeigt.
  - Notes: Diese Komponente ist bereits fast dynamisch — `extraFields` zeigt alle nicht-strukturierten Felder als Tags. Kein Filter auf Sichtbarkeit, nur auf Darstellungsformat.
  - **Tests (sofort):** `review-bubble.test.tsx`, `chat-bubble.test.tsx` — Mock-Daten aktualisieren. Neues Szenario: unbekanntes Feld in Extraktion → als SymptomTag-Chip angezeigt.

#### Phase 8: Clarification

- [ ] Task 17: Clarification dynamisch absichern
  - File: `src/lib/ai/clarification.ts`
  - Action: Sicherstellen dass `FIELD_PRIORITY` kein Filter ist — unbekannte Felder erhalten Priorität 10 (ist bereits so via `getFieldPriority()` Zeile 21-23). Kein Code-Change nötig falls der aktuelle Fallback korrekt funktioniert.
  - Action: `getDefaultTemplate()` (Zeile 183-188) prüfen — generiert `"Kannst du '{fieldName}' genauer beschreiben?"`. Erweitern: Deutschen Label aus FIELD_LABELS verwenden falls vorhanden, sonst `field_name`.
  - Notes: Minimal-Change — die Clarification-Logik ist bereits nahezu dynamisch.

#### Phase 9: Integrations-Check

- [ ] Task 18: Verbleibende Tests + Full-Suite-Check
  - Files: `insights-actions.test.ts` + alle verbleibenden Test-Dateien die nicht in Phase 2-7 aktualisiert wurden
  - Action: Verbleibende Mock-Daten auf neue `{ displayName, fields }` Struktur umstellen.
  - Action: `npm test` — gesamte Test-Suite muss grün sein.
  - Action: `npm run build` — TypeScript-Kompilierung ohne Fehler.
  - Notes: Die meisten Test-Fixes sind bereits in den Phasen 2-7 erledigt. Dieser Task fängt nur Restfälle auf und führt den finalen Integrations-Check durch.

### Acceptance Criteria

- [ ] AC 1: Given ein Symptom-Event mit extrahiertem `trigger: 'nach dem Sport'`, when der Patient die Event-Detail-Ansicht öffnet, then wird "Auslöser: nach dem Sport" angezeigt.
- [ ] AC 2: Given ein Symptom-Event mit extrahiertem `trigger`, when der Patient die Edit-Ansicht öffnet, then ist das `trigger`-Feld als Text-Input bearbeitbar mit Label "Auslöser".
- [ ] AC 3: Given ein Symptom-Event mit extrahiertem `trigger`, when der Arzt die Event-Detail-Ansicht öffnet, then wird "Auslöser: nach dem Sport" angezeigt.
- [ ] AC 4: Given ein Symptom-Event mit einem komplett unbekannten Feld `foo_bar: 'test'`, when die Detail-Ansicht geöffnet wird, then wird "foo_bar: test" am Ende der Feldliste angezeigt (Fallback auf field_name als Label).
- [ ] AC 5: Given ein Multi-Symptom-Event mit `trigger` in Gruppe 1, when die Detail-Ansicht geöffnet wird, then erscheint `trigger` innerhalb der Symptom-Gruppe (nicht als Event-Level-Feld).
- [ ] AC 6: Given ein Medikament-Event, when die Feed-Card angezeigt wird, then werden Medikament-Name und alle extrahierten Felder (dosage, reason, etc.) dynamisch angezeigt.
- [ ] AC 7: Given ein Symptom-Event mit `trigger` im Feed, when die Feed-Card gerendert wird, then erscheint der Trigger-Wert in der Detailzeile (z.B. `Kopf · links · 7/10 · stechend · nach dem Sport`).
- [ ] AC 8: Given ein PDF-Report mit Events die `trigger`-Felder haben, when das PDF generiert wird, then sind die Trigger-Werte im PDF sichtbar.
- [ ] AC 9: Given ein neues extrahiertes Feld in der Capture-UI (Review-Bubble), when der User die Extraktion reviewed, then erscheint das Feld als bearbeitbarer SymptomTag-Chip.
- [ ] AC 10: Given ein extrahiertes Feld mit niedriger Confidence in der Clarification, when `generateClarificationQuestions()` aufgerufen wird, then wird eine generische Rückfrage generiert (auch für unbekannte Felder).
- [ ] AC 11: Given bestehende Events mit nur den "alten" Feldern (symptom_name, body_region, etc.), when die Detail-Ansicht geöffnet wird, then werden diese weiterhin korrekt angezeigt und formatiert (intensity als X/10, symptom_time als Datum, duration als Minuten).
- [ ] AC 12: Given `npm run build`, when alle Änderungen vorgenommen sind, then kompiliert das Projekt ohne TypeScript-Fehler.
- [ ] AC 13: Given `npm test`, when alle Test-Fixtures aktualisiert sind, then sind alle Tests grün.
- [ ] AC 14: Given ein Event ohne `extracted_data` (null oder leer), when die Feed-Card oder Detail-Ansicht geöffnet wird, then kein Crash und keine leere Detailzeile (kein alleinstehender `·`-Separator).

## Additional Context

### Dependencies

- Keine neuen externen Dependencies nötig.
- Interne Abhängigkeit: `mapRowToFeedEvent()` wird von `sharing.ts` importiert — muss zusammen mit `insights.ts` geändert werden.
- `FeedSymptomGroup` wird von `report.ts` importiert — muss vor PDF-Pipeline geändert werden.

### Testing Strategy

**Betroffene Test-Dateien:**
- `src/__tests__/lib/db/insights.test.ts` — Pivot-Funktionen, mapRowToFeedEvent
- `src/__tests__/lib/db/sharing-feed.test.ts` — getSharedFeedEvents
- `src/__tests__/lib/db/sharing.test.ts` — getSharedEventDetail
- `src/__tests__/components/insights/feed-event-card.test.tsx` — FeedEvent Mock-Daten
- `src/__tests__/components/insights/symptom-feed.test.tsx` — FeedEvent Mock-Daten
- `src/__tests__/components/insights/day-drill-down.test.tsx` — FeedEvent Mock-Daten
- `src/__tests__/components/sharing/doctor-event-card.test.tsx` — FeedEvent Mock-Daten
- `src/__tests__/components/sharing/doctor-timeline.test.tsx` — FeedEvent Mock-Daten
- `src/__tests__/components/sharing/doctor-event-detail-view.test.tsx` — EventDetail Mock-Daten
- `src/__tests__/components/event/event-detail-view.test.tsx` — EventDetail Mock-Daten
- `src/__tests__/event-edit.test.tsx` — Edit-Form Mock-Daten
- `src/__tests__/review-bubble.test.tsx` — ExtractedData Mock-Daten
- `src/__tests__/chat-bubble.test.tsx` — ExtractedData Mock-Daten
- `src/__tests__/lib/pdf/symptom-report.test.tsx` — PdfReportData Mock-Daten
- `src/__tests__/actions/insights-actions.test.ts` — FeedEvent Mock-Daten

**Strategie:**
1. Nach jeder Phase `npx tsc --noEmit` laufen lassen um Type-Fehler zu finden
2. **Tests pro Phase fixen** — nicht gesammelt am Ende. Jede Phase hat einen "Tests (sofort)"-Block der die betroffenen Test-Dateien benennt.
3. Am Ende (Phase 9): `npm test` + `npm run build` als finaler Integrations-Check

**Neue Test-Szenarien (verteilt auf die Phasen):**
- Phase 2: `groupExtractedBySymptomIndex(null)` → `[]`
- Phase 2: Unbekanntes Feld `custom_field` → erscheint in `fields`
- Phase 2: Event ohne `extracted_data` → `symptoms: []`, kein Crash
- Phase 6: Feed-Card mit `trigger`-Feld → wird angezeigt
- Phase 6: Event mit leeren `fields: {}` → keine leere Detailzeile
- Phase 7: Unbekanntes Feld in Capture-UI → als SymptomTag-Chip

### Notes

- **Risiko: Big-Bang-Refactor** — Der `FeedSymptomGroup`/`FeedEvent` Type-Umbau bricht alle Consumers gleichzeitig. Empfehlung: Phase 1-3 + Task 15 (FIELD_LABELS/FIELD_ORDER Export) in einem Commit (Types + Pivot + Queries + Shared Constants), dann Phase 4-8 schrittweise mit laufendem `tsc --noEmit`. **Tests pro Phase fixen** — nie mehr als eine Phase ohne funktionierendes Test-Harness.
- **`displayName` statt `symptomName`** — Party-Mode-Entscheidung: Explizites `displayName`-Property statt `symptomName` mit fragiler `??`-Fallback-Kette. `displayName` wird in `groupExtractedBySymptomIndex()` basierend auf `eventType` gesetzt (nicht via stille Fallback-Logik).
- **`FIELD_LABELS` als geteilte Konstante** — Definiert und exportiert in `symptom-tag.tsx`. Alle Consumers importieren von dort. Keine zentrale Metadaten-Datei, nur eine geteilte Konstante. Jede Komponente kann lokale Erweiterungen hinzufügen.
- **`symptoms`-Naming** — `symptoms` heisst jetzt auch bei Medikament-Events so. Ein Rename zu `groups` oder `entries` wäre klarer, ist aber ein separater Refactor und ausser Scope.
- **Formatting-Duplizierung** — `formatSymptomTimestamp()`, `formatDurationMinutes()`, `getSeverityInfo()` sind über 4 Komponenten dupliziert. Das Refactoring berührt diese Funktionen — eine Konsolidierung in einen gemeinsamen Util wäre sinnvoll, ist aber optional und ausser Scope.
- **`review-bubble.tsx` ist bereits fast dynamisch** — `extraFields` zeigt alle nicht-strukturierten Felder. Der Hauptaufwand liegt in den Feed-Cards und im Pivot-Layer.
