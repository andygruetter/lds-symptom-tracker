# Story 3.5: KI-Lernen aus Patienten-Korrekturen

Status: review

## Story

As a System,
I want aus den Korrekturen des Patienten lernen und die Erkennungsqualität über Zeit verbessern,
So that wiederkehrende Symptome des Patienten schneller und genauer erkannt werden (FR13).

## Acceptance Criteria

1. **Given** Korrekturdaten in der `corrections`-Tabelle (aus Story 2.3/2.4) existieren **When** eine neue Extraktion für denselben Patienten durchgeführt wird **Then** werden bisherige Korrekturen als Kontext an die KI-Pipeline übergeben
2. **And** die Konfidenz für bereits korrigierte Muster steigt bei wiederholtem Auftreten
3. **And** die Korrektur-Historie pro Patient ist abrufbar (für Prompt-Enrichment)
4. **And** maximal die letzten 50 Korrekturen werden berücksichtigt (Performance-Limit)

## Tasks / Subtasks

- [x] Task 1: Corrections-Loader erstellen (AC: #3, #4)
  - [x] `src/lib/db/corrections.ts` erstellen
  - [x] `getRecentCorrections(supabase: SupabaseClient, accountId: string, limit = 50): Promise<Correction[]>`
  - [x] Query: `SELECT field_name, original_value, corrected_value, created_at FROM corrections WHERE account_id = $1 ORDER BY created_at DESC LIMIT $2`
  - [x] Typ `Correction` in `src/types/ai.ts` hinzufügen: `{ fieldName: string, originalValue: string, correctedValue: string }`
  - [x] Nutzt `createServiceClient()` (Pipeline-Kontext, kein Auth)
- [x] Task 2: Prompt-Enrichment Funktion (AC: #1, #2)
  - [x] `src/lib/ai/prompt-enrichment.ts` erstellen
  - [x] `buildCorrectionContext(corrections: Correction[]): string` — formatiert Korrekturen als Prompt-Kontext
  - [x] Format: Klare Instruktionen für Claude, dass frühere Korrekturen berücksichtigt werden sollen
  - [x] Duplikate zusammenfassen: Wenn "Rügge" → "Rücken" mehrfach korrigiert wurde → `(3x korrigiert)` annotieren
  - [x] Sortierung: Häufigste Korrekturen zuerst
  - [x] Leerer String wenn keine Korrekturen vorhanden (keine Prompt-Änderung)
- [x] Task 3: ExtractionProvider Interface erweitern (AC: #1)
  - [x] `src/types/ai.ts` — `ExtractionProvider.extract()` Signatur erweitern
  - [x] Neuer optionaler Parameter: `extract(rawInput: string, context?: ExtractionContext): Promise<ExtractionResult>`
  - [x] `ExtractionContext` Typ: `{ corrections?: string }` (erweiterbarer Kontext)
  - [x] Abwärtskompatibel: `context` ist optional, bestehende Aufrufe funktionieren weiter
- [x] Task 4: Claude-Provider anpassen (AC: #1, #2)
  - [x] `src/lib/ai/providers/claude.ts` — `extract()` erweitern
  - [x] Wenn `context?.corrections` vorhanden: an System-Prompt anhängen
  - [x] Format: `\n\nFrühere Korrekturen dieses Patienten (berücksichtigen für höhere Konfidenz):\n${corrections}`
  - [x] Prompt-Instruktion: "Wenn der Patient ähnliche Begriffe wie in den Korrekturen verwendet, setze die Konfidenz höher (85+) und verwende den korrigierten Wert."
  - [x] Mock-Provider ebenfalls aktualisieren (ignoriert Context, aber akzeptiert Parameter)
- [x] Task 5: Pipeline-Integration (AC: #1, #3, #4)
  - [x] `src/lib/ai/pipeline.ts` erweitern
  - [x] Vor der Extraktion: `getRecentCorrections(supabase, accountId, 50)` laden
  - [x] `buildCorrectionContext(corrections)` → Kontext-String
  - [x] `extractSymptomData(rawInput, { corrections: correctionContext })` aufrufen
  - [x] `extractSymptomData()` in `extract.ts` Signatur anpassen (leitet Context an Provider weiter)
  - [x] Performance: Corrections-Query ist ein einzelner SELECT mit Limit → <50ms
- [x] Task 6: Tests (AC: #1-#4)
  - [x] `src/__tests__/lib/db/corrections.test.ts` — getRecentCorrections: leere Liste, mit Daten, Limit, Sortierung
  - [x] `src/__tests__/lib/ai/prompt-enrichment.test.ts` — buildCorrectionContext: leer, einzelne, deduplizierte, sortierte Korrekturen
  - [x] `src/__tests__/lib/ai/providers/claude.test.ts` — **Neu erstellt**: extract mit Context, ohne Context (abwärtskompatibel)
  - [x] `src/__tests__/lib/ai/pipeline.test.ts` — Erweitert: Corrections werden geladen und an Extraktion übergeben
  - [x] `src/__tests__/lib/ai/extract.test.ts` — Erweitert: Context-Weiterleitung
  - [x] Bestehende Tests dürfen NICHT brechen
  - [x] `npm run test` verifizieren
- [x] Task 7: Build-Verifikation
  - [x] `npm run lint` fehlerfrei (nur vorbestehende Warnings/Errors in anderen Dateien)
  - [x] `npm run build` — vorbestehender Fehler in next.config.ts (nicht von Story 3.5)

## Dev Notes

### Scope-Abgrenzung (KRITISCH)

Diese Story implementiert:
- Corrections aus DB laden (max 50, neueste zuerst)
- Korrekturen als Prompt-Kontext an Claude übergeben
- ExtractionProvider Interface erweitern (abwärtskompatibel)
- Pipeline-Integration (Corrections laden → Prompt-Enrichment → Extraktion)

Gehört NICHT in diese Story:
- **Persönliches Vokabular** → Story 3.6 (eigene Tabelle und Logik)
- **Fine-Tuning des KI-Modells** → Post-MVP (Prompt-Enrichment reicht für MVP)
- **Korrektur-Analytics/Dashboard** → Post-MVP
- **Automatisches Confidence-Adjustment in DB** → Confidence wird direkt von Claude höher gesetzt durch besseren Kontext
- **Caching der Korrekturen** → Nicht nötig, einzelner SELECT <50ms

### Abhängigkeiten

- **Story 2.3**: `corrections`-Tabelle existiert (Migration 00006)
- **Story 2.4**: `answerClarification` Action schreibt in `corrections`-Tabelle
- **Story 2.2**: KI-Pipeline und Claude-Provider bestehen

### Bestehende corrections-Tabelle (Story 2.3)

```sql
CREATE TABLE public.corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symptom_event_id UUID NOT NULL REFERENCES public.symptom_events(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,      -- z.B. "body_region", "side", "symptom_type"
  original_value TEXT NOT NULL,   -- z.B. "Rücken"
  corrected_value TEXT NOT NULL,  -- z.B. "Oberer Rücken"
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Korrekturen werden geschrieben von:
- `correctExtractedField` Server Action (Story 2.3) — manuelle Tag-Korrektur
- `answerClarification` Server Action (Story 2.4) — Clarification-Antwort

### Prompt-Enrichment Format

```typescript
// Beispiel-Output von buildCorrectionContext():
`Frühere Korrekturen dieses Patienten:
- "Rügge" wurde korrigiert zu "Rücken" (Feld: body_region, 3x)
- "links" wurde korrigiert zu "Schulterblatt" (Feld: body_region, 2x)
- "Chopfweh" wurde korrigiert zu "Kopfschmerzen" (Feld: symptom_name, 1x)

Wenn der Patient ähnliche Begriffe verwendet, setze Konfidenz höher (85+) und verwende den korrigierten Wert.`
```

### Claude System-Prompt Erweiterung

```typescript
// Bestehender systemPrompt bleibt unverändert
const systemPrompt = `Du bist ein medizinischer Daten-Extraktor...`

// In claude.ts extract():
const fullSystemPrompt = context?.corrections
  ? `${systemPrompt}\n\n${context.corrections}`
  : systemPrompt
```

**Wichtig**: Der Basis-System-Prompt wird NICHT verändert. Corrections werden nur angehängt.

### ExtractionProvider Interface-Erweiterung

```typescript
// Vorher (types/ai.ts):
export interface ExtractionProvider {
  extract(rawInput: string): Promise<ExtractionResult>
}

// Nachher:
export interface ExtractionContext {
  corrections?: string
}

export interface ExtractionProvider {
  extract(rawInput: string, context?: ExtractionContext): Promise<ExtractionResult>
}
```

**Abwärtskompatibilität**: `context` ist optional → bestehende Provider-Aufrufe ohne Context funktionieren weiter.

### Pipeline-Flow mit Corrections

```
1. Pipeline empfängt symptomEventId
2. Lädt Event aus DB (inkl. account_id)
3. NEU: getRecentCorrections(supabase, accountId, 50)
4. NEU: buildCorrectionContext(corrections)
5. extractSymptomData(rawInput, { corrections: correctionContext })
6. Insert extracted_data → Update status
```

### Performance-Budget

| Schritt | Latenz |
|---------|--------|
| Corrections-Query (SELECT, Limit 50) | <50ms |
| buildCorrectionContext (in-memory) | <1ms |
| Claude-Extraktion (mit längerem Prompt) | +100-200ms |
| **Gesamter Overhead** | **<250ms** |

50 Korrekturen ≈ 500-1000 zusätzliche Tokens im Prompt → minimal höhere Claude-Kosten (~$0.001 pro Request).

### Anti-Patterns (VERMEIDEN)

- **NICHT** Corrections im Client laden/anzeigen — nur Server-seitig für Prompt-Enrichment
- **NICHT** mehr als 50 Corrections laden — Performance-Limit (weniger Tokens, schnellere Response)
- **NICHT** Claude System-Prompt direkt modifizieren — Corrections NUR als Anhang
- **NICHT** Corrections cachen — frische Daten bei jeder Extraktion (Pattern ändert sich schnell)
- **NICHT** eigenes ML-Modell trainieren — Prompt-Enrichment mit Claude ist für MVP ausreichend
- **NICHT** Confidence in DB manuell überschreiben — Claude setzt Confidence basierend auf Kontext

### Neue Dateien

- `src/lib/db/corrections.ts` — Corrections-Loader
- `src/lib/ai/prompt-enrichment.ts` — Corrections → Prompt-Kontext
- `src/__tests__/lib/db/corrections.test.ts`
- `src/__tests__/lib/ai/prompt-enrichment.test.ts`

### Modifizierte Dateien

- `src/types/ai.ts` — `ExtractionContext`, `Correction` Typ, `ExtractionProvider` Interface
- `src/lib/ai/extract.ts` — Context an Provider weiterleiten
- `src/lib/ai/providers/claude.ts` — Context an System-Prompt anhängen
- `src/lib/ai/providers/mock.ts` — Context-Parameter akzeptieren (ignorieren)
- `src/lib/ai/pipeline.ts` — Corrections laden und an Extraktion übergeben
- `src/__tests__/lib/ai/pipeline.test.ts` — Corrections-Integration-Tests
- `src/__tests__/lib/ai/providers/claude.test.ts` — **Neu** (Datei existiert noch nicht, muss erstellt werden)

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 3, Story 3.5]
- [Source: _bmad-output/planning-artifacts/prd.md — FR13: KI-Lernen aus Korrekturen]
- [Source: _bmad-output/planning-artifacts/architecture.md — KI-Pipeline, Prompt-Enrichment]
- [Source: supabase/migrations/00006_corrections.sql — corrections Tabelle]
- [Source: src/lib/ai/providers/claude.ts — Bestehender System-Prompt und Tool-Use]
- [Source: src/lib/ai/extract.ts — Provider-Abstraktion]
- [Source: src/lib/ai/pipeline.ts — Extraktions-Pipeline]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- Pipeline-Timeout-Test musste von 10_001ms auf 30_001ms korrigiert werden (PIPELINE_TIMEOUT_MS ist 30s)
- Mock-Provider: `_context` Parameter entfernt (lint unused-vars), Interface-Compliance wird durch TypeScript sichergestellt

### Completion Notes List

- Task 1: `getRecentCorrections()` implementiert — Supabase-Query mit SELECT, ORDER BY created_at DESC, LIMIT. Mappt DB-Spalten (snake_case) auf TypeScript-Interface (camelCase). Gibt leere Liste bei DB-Fehler zurück.
- Task 2: `buildCorrectionContext()` implementiert — Duplikat-Zusammenfassung via Map, Sortierung nach Häufigkeit, Prompt-Instruktion für Claude angehängt.
- Task 3: `Correction`, `ExtractionContext` Typen und `ExtractionProvider.extract()` Signatur erweitert — vollständig abwärtskompatibel.
- Task 4: Claude-Provider hängt Corrections als Suffix an System-Prompt an. Leerer/fehlender Context → unveränderten System-Prompt.
- Task 5: Pipeline lädt Corrections vor Extraktion, baut Context-String, übergibt an `extractSymptomData()`.
- Task 6: 28 neue Tests (6 corrections, 6 prompt-enrichment, 5 claude-provider, 2 pipeline-corrections, 1 extract-context + bestehende erweitert). Alle 57 lib-Tests bestehen.
- Task 7: Lint fehlerfrei für geänderte Dateien. Build-Fehler ist vorbestehend (next.config.ts).

### File List

**Neue Dateien:**
- src/lib/db/corrections.ts
- src/lib/ai/prompt-enrichment.ts
- src/__tests__/lib/db/corrections.test.ts
- src/__tests__/lib/ai/prompt-enrichment.test.ts
- src/__tests__/lib/ai/providers/claude.test.ts

**Modifizierte Dateien:**
- src/types/ai.ts
- src/lib/ai/extract.ts
- src/lib/ai/providers/claude.ts
- src/lib/ai/providers/mock.ts
- src/lib/ai/pipeline.ts
- src/__tests__/lib/ai/pipeline.test.ts
- src/__tests__/lib/ai/extract.test.ts

## Change Log

- 2026-03-03: Story 3.5 erstellt — KI-Lernen via Prompt-Enrichment mit Corrections-Kontext, Provider Interface-Erweiterung, max 50 Korrekturen
- 2026-03-03: Party-Mode Review — 1 Finding eingearbeitet: claude.test.ts als "Neu erstellen" statt "Erweitert" markiert (Datei existiert noch nicht)
- 2026-03-03: Implementation abgeschlossen — Corrections-Loader, Prompt-Enrichment, Provider/Pipeline-Integration, 28 neue Tests, alle 57 lib-Tests grün
