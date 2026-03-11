---
title: 'Aktivitaets- und Bemerkungen-Extraktion fuer Symptome'
slug: 'activity-remarks-extraction'
created: '2026-03-05'
status: 'implementation-complete'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Next.js 16.1.6', 'React 19.2.3', 'TypeScript 5', 'Supabase 2.76.15', 'Anthropic Claude SDK 0.78.0 (claude-sonnet-4-20250514)', 'Zod 4.3.6', 'Vitest 4.0.18', 'Playwright 1.58.2']
files_to_modify: ['src/lib/ai/providers/claude.ts', 'src/lib/ai/providers/mock.ts', 'src/lib/ai/clarification.ts', 'src/lib/ai/__fixtures__/extractions.ts', 'src/components/capture/review-bubble.tsx', 'scripts/re-extract.ts (NEU)', 'src/__tests__/lib/ai/clarification.test.ts', 'src/__tests__/lib/ai/extract.test.ts', 'src/__tests__/lib/ai/pipeline.test.ts', 'src/__tests__/review-bubble.test.tsx', 'e2e/multi-symptom.spec.ts', 'e2e/multi-symptom-flow.spec.ts', 'e2e/review-und-bestaetigung.spec.ts', 'e2e/feld-korrektur.spec.ts']
code_patterns: ['Key-Value extracted_data Tabelle (field_name TEXT ohne Constraints)', 'Tool Use mit generischem fields-Array', 'SymptomTag mit options-Prop fuer Dropdowns', 'Mock-Provider fuer E2E-Tests', 'Clarification-Templates mit Prioritaeten']
test_patterns: ['Vitest mit vi.mock() fuer Provider-Mocking', 'Fixtures in __fixtures__/extractions.ts', 'Playwright E2E mit createTestExtractedData()', 'Clarification-Tests pruefen Prioritaetssortierung']
---

# Tech-Spec: Aktivitaets- und Bemerkungen-Extraktion fuer Symptome

**Created:** 2026-03-05

## Overview

### Problem Statement

Aktuell wird kein Kontext zur Aktivitaet erfasst, bei der ein Symptom auftritt. Zusaetzliche Informationen, die keinem strukturierten Feld zugeordnet werden koennen (z.B. Wetter, spezifische Aktivitaet, Umstaende), gehen verloren. Das erschwert die Mustererkennung und die Dokumentation fuer den Arzt.

### Solution

Drei neue optionale Felder pro Symptom-Extraktion einfuehren: `aktivitaet_kategorie` (feste Enum-Liste), `aktivitaet_zeitbezug` (Enum: waehrend/nach/vor) und `bemerkungen` (Freitext, Bullet Points bei mehreren Eintraegen). Der Claude-Prompt und das Tool-Schema werden entsprechend erweitert. Zusaetzlich wird ein einmaliges Re-Extraktions-Script erstellt, das alle bestehenden Symptom-Events nochmals durch Claude schickt, um die neuen Felder nachtraeglich zu befuellen.

### Scope

**In Scope:**
- Claude-Prompt erweitern um die drei neuen Felder im Tool-Schema (`aktivitaet_kategorie`, `aktivitaet_zeitbezug`, `bemerkungen`)
- Clarification-Templates und Field-Prioritaeten erweitern (`src/lib/ai/clarification.ts`)
- Mock-Provider fuer E2E-Tests erweitern (`src/lib/ai/providers/mock.ts`)
- Review-UI: Dropdowns fuer Kategorie und Zeitbezug, Freitext-Input fuer Bemerkungen
- Nur fuer `eventType: 'symptom'` (nicht Medikamente)
- Test-Fixtures, Unit-Tests und E2E-Tests anpassen
- Einmaliges CLI-Script (`scripts/re-extract.ts`) zur Re-Extraktion aller bestehenden Symptom-Events

**Out of Scope:**
- Medikamenten-Events
- Historische Auswertung / Muster-Erkennung nach Aktivitaet
- Neue DB-Migration (Felder passen in bestehendes Key-Value-Schema der `extracted_data`-Tabelle)

## Context for Development

### Datenbank-Architektur (WICHTIG)

Die `extracted_data`-Tabelle (`supabase/migrations/00005_extracted_data.sql`) verwendet ein **generisches Key-Value-Schema**. Jedes extrahierte Feld wird als eigene Row gespeichert — es gibt KEINE festen Spalten pro Feldtyp:

```sql
CREATE TABLE public.extracted_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symptom_event_id UUID NOT NULL REFERENCES public.symptom_events(id),
  field_name TEXT NOT NULL,        -- Beliebiger String, KEINE Constraints
  value TEXT NOT NULL,
  confidence NUMERIC(5,2) NOT NULL,
  confirmed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Die drei neuen Felder werden als **zusaetzliche Rows** gespeichert, nicht als neue Spalten:

```
| field_name             | value              | confidence |
|------------------------|--------------------|------------|
| symptom_name           | Brustschmerzen     | 95         |  (bestehend)
| body_region            | Brust              | 95         |  (bestehend)
| aktivitaet_kategorie   | Sport / Bewegung   | 85         |  ← neue Row
| aktivitaet_zeitbezug   | nach               | 90         |  ← neue Row
| bemerkungen            | - Hiphop tanzen    | 80         |  ← neue Row
```

**Darum ist KEINE neue DB-Migration noetig.** Sobald Claude die neuen Felder extrahiert, fliessen sie automatisch durch die gesamte Pipeline (Extraktion → DB Insert → Realtime → UI), weil alle Schichten generisch mit `field_name`/`value` arbeiten.

### Field-Naming-Konvention (WICHTIG — bestehende Inkonsistenz)

Es gibt eine bestehende Inkonsistenz bei Feldnamen im Codebase:

- **Claude-Prompt** (`claude.ts`): Verwendet englisch snake_case → `body_region`, `side`, `symptom_type`, `intensity`
- **Clarification-Templates** (`clarification.ts`): Verwendet deutsche Display-Namen → `Körperregion`, `Seite`, `Symptomtyp`, `Intensität`
- **Mock-Provider Fallback** (`mock.ts`): Mischt beides → `symptom_name` (englisch) + `Seite`, `Symptomtyp` (deutsch)

**Entscheidung fuer neue Felder:** Die neuen Felder verwenden **englisch snake_case** konsistent mit dem Claude-Prompt: `aktivitaet_kategorie`, `aktivitaet_zeitbezug`, `bemerkungen`. In `clarification.ts` muessen die Keys ebenfalls `aktivitaet_kategorie` etc. sein (NICHT deutsche Display-Namen), weil Claude diese Feldnamen zurueckgibt und die Clarification-Logik auf `field_name` matcht.

**Hinweis:** Die bestehende Inkonsistenz bei `Seite`/`side` etc. ist ein Pre-existing Issue und wird in diesem Feature NICHT gefixt.

### Codebase Patterns

- Claude-Extraktion nutzt Tool Use mit dem Tool `extract_symptom_data`
- Multi-Symptom-Extraktion: Jedes Symptom wird als separates Event erstellt
- Review-UI nutzt `SymptomTag`-Komponente mit drei Zustaenden (confirmed, uncertain, editing)
- `SymptomTag` hat einen `options`-Prop fuer Dropdowns, aber `ReviewBubble` uebergibt diesen Prop aktuell NICHT — muss fuer die neuen Felder erstmals verdrahtet werden
- Confidence-Scoring pro Feld (0-100)
- `clarification.ts` hat FIELD_PRIORITY-Map und clarificationTemplates die erweitert werden muessen
- `value TEXT NOT NULL` Constraint in DB: Claude darf keine leeren Strings zurueckgeben. Der Zod-Schema-Transform filtert bereits `null`-Werte raus. Leere Strings muessen im Prompt explizit als "null zurueckgeben, nicht leerer String" instruiert werden.

### Aktivitaet-Kategorien (feste Liste)

- Sport / Bewegung
- Arbeit
- Essen / Trinken
- Schlaf / Ruhe
- Hausarbeit
- Freizeit
- Sonstiges

### Zeitbezug-Werte

- waehrend
- nach
- vor

### Bemerkungen-Feld — Serialisierungs-Contract

**Speicherformat in DB (`value` Spalte):**
- Ein Eintrag: Plaintext ohne Prefix → `"Hiphop tanzen"`
- Mehrere Eintraege: Bullet Points mit `"- "` Prefix, getrennt durch `"\n"` → `"- Hiphop tanzen\n- Draussen bei Kaelte"`

**Claude-Prompt Instruktion:** Claude soll bei einem einzelnen Eintrag KEINEN Bullet-Prefix verwenden. Nur bei mehreren Eintraegen `"- "` Prefix pro Zeile.

**UI-Anzeige (ReviewBubble):**
- Gespeicherten Wert pruefen: Enthaelt `"\n"` → mehrere Eintraege, als Bullet-Liste rendern
- Kein `"\n"` → einzelner Eintrag, als Plaintext anzeigen (kein Bullet)

**Textarea Edit-Modus:**
- Wert wird als Plaintext im Textarea angezeigt (Bullet-Prefixes sichtbar wenn vorhanden)
- Beim Speichern: Jede nicht-leere Zeile wird ein Eintrag. Bei >1 Zeile werden `"- "` Prefixes hinzugefuegt falls nicht vorhanden. Bei 1 Zeile wird kein Prefix hinzugefuegt.

**Edge Cases:**
- Leerer String → darf nicht gespeichert werden (DB Constraint `NOT NULL` + kein leerer String → Claude soll null zurueckgeben)
- User loescht alle Zeilen → Feld-Row aus `extracted_data` loeschen oder `value` auf den urspruenglichen Wert zuruecksetzen

### Files to Modify

| File | Aenderung | Prioritaet |
| ---- | --------- | ---------- |
| `src/lib/ai/providers/claude.ts` | System-Prompt + Beispiele fuer 3 neue Felder | KRITISCH |
| `src/lib/ai/providers/mock.ts` | Mock-Daten fuer E2E erweitern | KRITISCH |
| `src/lib/ai/clarification.ts` | Field-Prioritaeten + Clarification-Templates | HOCH |
| `src/lib/ai/__fixtures__/extractions.ts` | Test-Fixtures mit neuen Feldern | HOCH |
| `src/components/capture/review-bubble.tsx` | Aktivitaets-Gruppierung + Textarea | HOCH |
| `scripts/re-extract.ts` (NEU) | Einmaliges Re-Extraktions-Script | HOCH |
| `src/__tests__/lib/ai/clarification.test.ts` | Tests fuer neue Prioritaeten/Templates | MITTEL |
| `src/__tests__/lib/ai/extract.test.ts` | Mock-Ergebnisse aktualisieren | MITTEL |
| `src/__tests__/lib/ai/pipeline.test.ts` | Pipeline-Tests aktualisieren | MITTEL |
| `src/__tests__/review-bubble.test.tsx` | UI-Tests fuer Gruppierung | MITTEL |
| `e2e/multi-symptom.spec.ts` | E2E-Fixtures erweitern | MITTEL |
| `e2e/multi-symptom-flow.spec.ts` | E2E-Fixtures erweitern | MITTEL |
| `e2e/review-und-bestaetigung.spec.ts` | E2E-Fixtures erweitern | MITTEL |
| `e2e/feld-korrektur.spec.ts` | E2E-Fixtures erweitern | MITTEL |

### Files NICHT zu aendern (generisches Key-Value-Schema)

| File | Grund |
| ---- | ----- |
| `supabase/migrations/*` | `field_name` ist TEXT ohne Constraints |
| `src/types/ai.ts` | Generisches `fieldName/value/confidence`-Schema (Design-Entscheidung: bewusst kein Discriminated Union fuer Symptom- vs. Medikament-Felder, da alle Schichten generisch arbeiten) |
| `src/lib/ai/pipeline.ts` | Generisches Field-Mapping, neue Felder fliessen automatisch durch |
| `src/lib/actions/symptom-actions.ts` | Generische Korrektur-/Bestaetigungs-Logik |
| `src/hooks/use-symptom-events.ts` | Generisches Laden, kein Feld-Filtering |
| `src/components/capture/symptom-tag.tsx` | Bereits generisch mit `options`-Prop |
| `src/lib/db/corrections.ts` | Generischer `field_name` TEXT |
| `src/lib/db/vocabulary.ts` | Generischer `fieldName` |

### Technical Decisions

- Keine neue DB-Migration noetig — siehe "Datenbank-Architektur" Sektion oben fuer detaillierte Erklaerung
- Neue Felder sind optional mit `confidence`-Scoring — Werte von Claude, keine Sonderbehandlung
- Re-Extraktion laeuft als einmaliges CLI-Script via `npx tsx scripts/re-extract.ts`
- Re-Extraktion schickt originale Texteingabe nochmals durch Claude
- Bereits bestaetigte Felder (`confirmed: true`) bleiben unberuehrt — nur neue Felder werden hinzugefuegt
- Re-Extraktions-Script ist idempotent: Events die bereits neue Felder haben werden uebersprungen
- Re-Extraktions-Script: INSERT-only, kein UPDATE bestehender Felder
- Re-Extraktions-Script verwendet den gleichen Claude-Prompt wie `claude.ts`, filtert aber nur die 3 neuen Felder aus dem Ergebnis (alte Felder ignorieren, keine Duplikate)
- Rate Limiting im Script: 1 Request/Sekunde, Logging pro Event (success/skip/fail)
- Progress-Summary am Ende: total/success/skipped/failed mit Event-IDs bei Fehlern
- Kein Dry-Run noetig (~10 bestehende Events)
- Deutsche Labels fuer Kategorien hardcoded, keine Lokalisierung

### UI-Entscheidungen (Party Mode)

- Aktivitaets-Felder visuell gruppiert in eigener Sektion, getrennt von medizinischen Feldern (Symptom, Region, Seite, Intensitaet)
- `aktivitaet_kategorie` und `aktivitaet_zeitbezug` als Dropdown (gleiches Pattern wie `side`-Feld)
- `bemerkungen` als mehrzeiliges Textarea im Edit-Modus, jede Zeile wird ein Bullet Point
- Bemerkungen-Feld ganz unten in der Review-Karte positioniert

## Implementation Plan

### Tasks

- [x] Task 1: Claude System-Prompt und Beispiele erweitern
  - File: `src/lib/ai/providers/claude.ts`
  - Action: Im `systemPrompt` (Zeile 12-43) den Abschnitt "Bei Symptomen extrahiere:" um die 3 neuen Felder erweitern:
    - `aktivitaet_kategorie`: Eine der festen Kategorien (Sport / Bewegung, Arbeit, Essen / Trinken, Schlaf / Ruhe, Hausarbeit, Freizeit, Sonstiges) oder null
    - `aktivitaet_zeitbezug`: "waehrend", "nach", "vor" oder null
    - `bemerkungen`: Freitext fuer spezifische Aktivitaet und sonstige Infos, bei mehreren als Bullet Points ("- Punkt 1\n- Punkt 2"), oder null
  - Action: Neue Beispiele im Prompt hinzufuegen:
    - "Nach dem Hiphop tanzen Brustschmerzen, war draussen bei Kaelte" → aktivitaet_kategorie: "Sport / Bewegung", aktivitaet_zeitbezug: "nach", bemerkungen: "- Hiphop tanzen\n- Draussen bei Kaelte"
    - "Kopfschmerzen waehrend der Arbeit am Bildschirm" → aktivitaet_kategorie: "Arbeit", aktivitaet_zeitbezug: "waehrend", bemerkungen: "Bildschirmarbeit"
    - "Bauchschmerzen" → alle 3 Felder null (keine Aktivitaet erkennbar)
  - Action: `max_tokens` von 1024 auf 1536 erhoehen (Zeile 122) — zusaetzliche Felder pro Symptom erhoehen Output-Groesse, besonders bei Multi-Symptom mit Aktivitaet
  - Notes: Felder sind NUR fuer eventType 'symptom', NICHT fuer 'medication'. Explizit im Prompt angeben dass alle 3 Felder optional sind. Im Prompt explizit instruieren: "Wenn kein Wert erkennbar, null zurueckgeben — KEINEN leeren String" (wegen `value TEXT NOT NULL` DB-Constraint).

- [x] Task 2: Mock-Provider fuer E2E erweitern
  - File: `src/lib/ai/providers/mock.ts`
  - Action: In `KNOWN_SYMPTOMS` (Zeile 10-54) die fields-Arrays erweitern — mindestens ein Symptom mit Aktivitaet (z.B. kopfschmerzen mit aktivitaet_kategorie: "Arbeit")
  - Action: Im Fallback (Zeile 116-126) die 3 neuen Felder hinzufuegen (z.B. aktivitaet_kategorie: "Sonstiges", confidence: 75)
  - Notes: Nicht alle Mock-Symptome brauchen Aktivitaet — einige ohne (realistisch)

- [x] Task 3: Clarification-Templates und Prioritaeten erweitern
  - File: `src/lib/ai/clarification.ts`
  - Action: In `FIELD_PRIORITY` (Zeile 7-13) hinzufuegen. ACHTUNG: Die Keys muessen exakt den `field_name`-Werten entsprechen die Claude zurueckgibt (siehe "Field-Naming-Konvention" Sektion):
    - `aktivitaet_kategorie: 5`
    - `aktivitaet_zeitbezug: 6`
    - `bemerkungen: 7`
  - Action: In `clarificationTemplates` (Zeile 24-63) hinzufuegen (Keys = Claude field_name, Options = lowercase wie Claude sie zurueckgibt):
    - `aktivitaet_kategorie`: question: "Bei welcher Aktivitaet?", options: ["Sport / Bewegung", "Arbeit", "Essen / Trinken", "Schlaf / Ruhe", "Hausarbeit", "Freizeit", "Sonstiges"]
    - `aktivitaet_zeitbezug`: question: "Wann im Bezug zur Aktivitaet?", options: ["waehrend", "nach", "vor"] (ALLES LOWERCASE — muss mit Claude-Output und Dropdown-Options matchen)
    - Kein Template fuer `bemerkungen` — Freitext, faellt auf getDefaultTemplate() zurueck

- [x] Task 4: Test-Fixtures erweitern
  - File: `src/lib/ai/__fixtures__/extractions.ts`
  - Action: `symptomExtraction` erweitern um aktivitaet_kategorie, aktivitaet_zeitbezug, bemerkungen Felder
  - Action: Neue Fixture `symptomWithActivityExtraction` hinzufuegen:
    ```typescript
    export const symptomWithActivityExtraction: ExtractionResult = {
      eventType: 'symptom',
      fields: [
        { fieldName: 'symptom_name', value: 'Brustschmerzen', confidence: 95 },
        { fieldName: 'body_region', value: 'Brust', confidence: 95 },
        { fieldName: 'aktivitaet_kategorie', value: 'Sport / Bewegung', confidence: 85 },
        { fieldName: 'aktivitaet_zeitbezug', value: 'nach', confidence: 90 },
        { fieldName: 'bemerkungen', value: '- Hiphop tanzen\n- Draussen bei Kaelte', confidence: 80 },
      ],
    }
    ```
  - Action: `multiSymptomExtraction` erweitern — ein Symptom mit, eins ohne Aktivitaet
  - Notes: `lowConfidenceExtraction` und `medicationExtraction` bleiben unveraendert

- [x] Task 5: Review-Bubble UI fuer Aktivitaets-Gruppierung anpassen
  - File: `src/components/capture/review-bubble.tsx`
  - Action: `extractedFields` in zwei Gruppen aufteilen:
    - Medizinische Felder: `symptom_name`, `body_region`, `side`, `symptom_type`, `intensity`
    - Aktivitaets-Felder: `aktivitaet_kategorie`, `aktivitaet_zeitbezug`, `bemerkungen`
  - Action: Aktivitaets-Felder in eigener visueller Sektion rendern (z.B. mit einem Trenner oder Sublabel "Aktivitaet")
  - Action: Fuer `aktivitaet_kategorie` und `aktivitaet_zeitbezug` den `options`-Prop an SymptomTag uebergeben. HINWEIS: `ReviewBubble` uebergibt aktuell NIE `options` an `SymptomTag` — das muss erstmals verdrahtet werden. `SymptomTag` unterstuetzt `options` bereits (rendert `<select>` statt `<input>`), aber die Logik zum Mapping field_name → options muss in ReviewBubble neu implementiert werden:
    - aktivitaet_kategorie options: ["Sport / Bewegung", "Arbeit", "Essen / Trinken", "Schlaf / Ruhe", "Hausarbeit", "Freizeit", "Sonstiges"]
    - aktivitaet_zeitbezug options: ["waehrend", "nach", "vor"]
  - Action: Fuer `bemerkungen` ein mehrzeiliges Textarea direkt in ReviewBubble rendern (NICHT in SymptomTag — SymptomTag bleibt Tag-basiert und generisch). Textarea-Lifecycle:
    - Eigener State `editingRemarks: boolean` (unabhaengig von `editingField` das SymptomTags steuert)
    - Beim Klick auf Bemerkungen-Anzeige → `editingRemarks = true`, Textarea oeffnet sich
    - Beim Speichern (Blur) → `onCorrect(eventId, 'bemerkungen', serializedValue)` aufrufen, `editingRemarks = false`
    - Beim Abbrechen (Escape) → Wert auf Original zuruecksetzen, `editingRemarks = false` (kein `onCorrect` Call)
    - Serialisierung: Siehe "Bemerkungen-Feld — Serialisierungs-Contract" Sektion
    - User kann gleichzeitig einen SymptomTag UND die Bemerkungen editieren (unabhaengige States)
  - Notes: Wenn keine Aktivitaets-Felder vorhanden sind, Sektion nicht anzeigen. Bemerkungen ganz unten positionieren. Bei nur einem Bemerkungspunkt keinen Bullet-Prefix anzeigen.

- [x] Task 6: Unit-Tests aktualisieren
  - File: `src/__tests__/lib/ai/clarification.test.ts`
  - Action: Tests fuer neue Prioritaeten (aktivitaet_kategorie: 5, aktivitaet_zeitbezug: 6, bemerkungen: 7)
  - Action: Tests fuer neue Clarification-Templates (Dropdown-Optionen pruefen)
  - File: `src/__tests__/lib/ai/extract.test.ts`
  - Action: Mock-Ergebnisse um neue Felder erweitern wo noetig
  - File: `src/__tests__/lib/ai/pipeline.test.ts`
  - Action: Verifizieren dass neue Felder korrekt durch Pipeline fliessen und in DB landen
  - File: `src/__tests__/review-bubble.test.tsx`
  - Action: Test fuer Aktivitaets-Gruppierung (medizinische vs. Aktivitaets-Felder getrennt)
  - Action: Test fuer Bemerkungen-Textarea im Edit-Modus
  - Action: Test dass Aktivitaets-Sektion nicht angezeigt wird wenn keine Aktivitaets-Felder vorhanden

- [x] Task 7: E2E-Tests aktualisieren
  - File: `e2e/multi-symptom.spec.ts`
  - Action: Test-Fixtures um neue Felder ergaenzen (mindestens ein Symptom mit Aktivitaet)
  - File: `e2e/multi-symptom-flow.spec.ts`
  - Action: Test-Fixtures um neue Felder ergaenzen
  - File: `e2e/review-und-bestaetigung.spec.ts`
  - Action: Test-Fixtures um neue Felder ergaenzen, Pruefen dass Aktivitaets-Felder sichtbar sind
  - File: `e2e/feld-korrektur.spec.ts`
  - Action: Test-Fixtures um neue Felder ergaenzen, Test fuer Dropdown-Korrektur bei aktivitaet_kategorie

- [x] Task 8: Re-Extraktions-Script erstellen
  - File: `scripts/re-extract.ts` (NEU)
  - Action: CLI-Script das via `npx tsx scripts/re-extract.ts` ausgefuehrt wird
  - Import-Loesung: Relative Imports verwenden statt `@/`-Aliase. Beispiel:
    ```typescript
    import { claudeProvider } from '../src/lib/ai/providers/claude'
    ```
    Alternativ: `tsx --import tsconfig-paths/register scripts/re-extract.ts` (erfordert `npm install -D tsconfig-paths`)
  - Logik:
    1. Supabase Service Client erstellen via `createClient()` mit `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` aus env
    2. Alle symptom_events laden mit `event_type IN ('symptom', 'voice')` und `status IN ('confirmed', 'extracted')`. HINWEIS: `event_type` wird von der Pipeline ueberschrieben (`pipeline.ts` Zeile 164 setzt `event_type: firstResult.eventType`), daher koennen Voice-Events jetzt `event_type = 'symptom'` haben. Es gibt KEINEN `event_type = 'text'` — nur 'symptom', 'medication', 'voice'.
    3. Pro Event: Alle vorhandenen `extracted_data` Rows laden und pruefen welche der 3 neuen Felder BEREITS existieren (Per-Feld-Check, nicht Per-Event-Check — schuetzt gegen partielle Inserts)
    4. Wenn alle 3 neuen Felder bereits existieren → skip (Idempotenz)
    5. Pro Event: `raw_input` durch `claudeProvider.extract()` schicken (gleicher Prompt)
    6. Aus dem Ergebnis (erstes Item mit eventType 'symptom') NUR die fehlenden neuen Felder filtern
    7. Gefilterte Felder als neue Rows in `extracted_data` INSERT (confirmed: false). Alle Inserts fuer ein Event in einer einzigen `.insert([...])` Operation (atomisch — verhindert partielle Inserts)
    8. `await sleep(1000)` zwischen Calls (Rate Limiting)
    9. Am Ende Summary ausgeben: `{ total, success, skipped, failed, failedIds }`
  - Notes: KEINE bestehenden Felder ueberschreiben oder duplizieren. Env-Variablen `ANTHROPIC_API_KEY`, `SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY` muessen gesetzt sein.

### Acceptance Criteria

- [x] AC 1: Given ein gemockter Claude-Response mit aktivitaet_kategorie="Sport / Bewegung", aktivitaet_zeitbezug="nach", bemerkungen="- Hiphop tanzen\n- Draussen bei Kaelte", when der Zod-Parser das Ergebnis verarbeitet, then werden alle 3 neuen Felder korrekt in das ExtractionResult aufgenommen (Unit-Test mit Mock, NICHT gegen echte Claude API)
- [x] AC 2: Given eine Eingabe "Kopfschmerzen" ohne Aktivitaetskontext, when die Extraktion durchgefuehrt wird, then sind aktivitaet_kategorie, aktivitaet_zeitbezug und bemerkungen null/nicht vorhanden
- [x] AC 3: Given ein extrahiertes Symptom mit Aktivitaets-Feldern, when die Review-Bubble angezeigt wird, then sind die medizinischen Felder und Aktivitaets-Felder in getrennten Sektionen gruppiert
- [x] AC 4: Given ein extrahiertes Symptom ohne Aktivitaets-Felder, when die Review-Bubble angezeigt wird, then wird die Aktivitaets-Sektion nicht angezeigt
- [x] AC 5: Given ein aktivitaet_kategorie-Feld im Edit-Modus, when der Nutzer den Dropdown oeffnet, then werden die 7 Kategorien angezeigt (Sport / Bewegung, Arbeit, Essen / Trinken, Schlaf / Ruhe, Hausarbeit, Freizeit, Sonstiges)
- [x] AC 6: Given ein bemerkungen-Feld im Edit-Modus, when der Nutzer editiert, then wird ein mehrzeiliges Textarea angezeigt. Beim Speichern gilt: bei >1 nicht-leerer Zeile wird jede Zeile mit "- " Prefix gespeichert, bei genau 1 Zeile wird der Text ohne Prefix gespeichert (siehe Serialisierungs-Contract)
- [x] AC 7: Given eine Eingabe mit eventType 'medication', when die Extraktion durchgefuehrt wird, then werden KEINE Aktivitaets-Felder extrahiert
- [x] AC 8: Given ~10 bestehende Symptom-Events in der DB, when `npx tsx scripts/re-extract.ts` ausgefuehrt wird, then werden fuer alle Events die 3 neuen Felder nachtraeglich extrahiert und in extracted_data gespeichert
- [x] AC 9: Given bestehende Events die bereits die neuen Felder haben, when das Re-Extraktions-Script erneut ausgefuehrt wird, then werden diese Events uebersprungen (Idempotenz)
- [x] AC 10: Given das Re-Extraktions-Script laeuft, when es abgeschlossen ist, then wird eine Summary mit total/success/skipped/failed ausgegeben
- [x] AC 11: Given ein unsicheres aktivitaet_kategorie-Feld (confidence < 70), when Clarification-Fragen generiert werden, then wird die Frage "Bei welcher Aktivitaet?" mit den 7 Kategorien als Optionen angezeigt
- [x] AC 12: Given ein Symptom mit nur einer Bemerkung (z.B. "Hiphop tanzen"), when die Review-Bubble angezeigt wird, then wird der Text ohne Bullet-Prefix angezeigt
- [x] AC 13: Given alle bestehenden Unit-Tests und E2E-Tests, when die Tests ausgefuehrt werden, then bestehen alle Tests (keine Regressionen)

## Additional Context

### Dependencies

- Keine neuen Dependencies noetig
- Anthropic Claude SDK bereits vorhanden
- Supabase Service Client fuer Re-Extraktions-Script

### Testing Strategy

**Unit-Tests (Vitest):**
- Fixtures erweitern mit neuen Feldern (symptomExtraction, multiSymptomExtraction)
- Neue Fixture: `symptomWithActivityExtraction`
- Clarification-Tests: neue Prioritaeten und Templates pruefen
- Pipeline-Tests: Verifizieren dass neue Felder durch die Pipeline fliessen
- Review-Bubble-Tests: Aktivitaets-Gruppierung und Textarea-Rendering

**E2E-Tests (Playwright):**
- Mock-Provider erweitern mit Aktivitaets-Feldern
- Bestehende E2E-Tests: Fixtures um neue Felder ergaenzen
- Feld-Korrektur-Tests: Dropdown fuer aktivitaet_kategorie testen

**Re-Extraktions-Script:**
- Manueller Test gegen Entwicklungs-DB (~10 Events)

### Notes

- Beispiel-Extraktion: "Nach dem Hiphop tanzen starke Brustschmerzen, war draussen bei Kaelte"
  - aktivitaet_kategorie: "Sport / Bewegung"
  - aktivitaet_zeitbezug: "nach"
  - bemerkungen: "- Hiphop tanzen\n- Draussen bei Kaelte"
- Die Task-Reihenfolge ist nach Abhaengigkeit geordnet: Prompt zuerst (Task 1), dann Mock (Task 2), dann Clarification (Task 3), Fixtures (Task 4), UI (Task 5), Tests (Task 6-7), Script zuletzt (Task 8)
- Das Re-Extraktions-Script (Task 8) haengt von Task 1 ab (erweiterter Claude-Prompt)
