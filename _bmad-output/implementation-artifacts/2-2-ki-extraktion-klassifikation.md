# Story 2.2: KI-Extraktion und Klassifikation mit Provider-Abstraktion

Status: done

## Story

As a System,
I want strukturierte Daten aus Freitext-Eingaben extrahieren und automatisch zwischen Symptom- und Medikamenten-Events unterscheiden,
So that die unstrukturierte Eingabe in medizinisch verwertbare, korrekt klassifizierte Daten umgewandelt wird (FR7, FR8).

## Acceptance Criteria

1. **Given** ein `symptom_event` mit `status: 'pending'` existiert **When** die KI-Extraktion ausgelöst wird **Then** wird die Provider-Abstraktion in `src/lib/ai/` genutzt (Claude Sonnet als Standard-Provider)
2. **And** die `extracted_data`-Tabelle wird erstellt mit `symptom_event_id`, `field_name`, `value`, `confidence`, `confirmed`
3. **And** das `event_type`-Feld wird im selben KI-Call korrekt auf `'symptom'` oder `'medication'` gesetzt (FR8)
4. **And** bei Symptom-Events: extrahierte Felder umfassen Symptombezeichnung, Körperregion, Seite (links/rechts/beidseits), Art, Intensität (1-10)
5. **And** bei Medikamenten-Events: extrahierte Felder umfassen Medikamentenname, Einnahme/vergessen, Dosis, Grund (FR4)
6. **And** jedes extrahierte Feld hat einen Konfidenz-Score (0-100%)
7. **And** der `symptom_event`-Status wird auf `'extracted'` gesetzt
8. **And** die Extraktion ist innerhalb von < 10 Sekunden abgeschlossen (NFR2)
9. **And** bei API-Ausfall wird der Event-Status auf `'extraction_failed'` gesetzt und kann nachgeholt werden (NFR19)
10. **And** Server Action / API Route folgt dem Zod→Auth→DB Pattern mit `ActionResult<T>`
11. **And** die ChatBubble zeigt visuell unterschiedliche Styles für Symptom- vs. Medikamenten-Events

## Tasks / Subtasks

- [x] Task 1: Supabase-Migration — `extracted_data`-Tabelle (AC: #2)
  - [x] `supabase/migrations/00005_extracted_data.sql` erstellen
  - [x] Schema: `id UUID PK`, `symptom_event_id UUID FK symptom_events NOT NULL`, `field_name TEXT NOT NULL`, `value TEXT NOT NULL`, `confidence NUMERIC(5,2) NOT NULL` (0-100), `confirmed BOOLEAN DEFAULT false`, `created_at TIMESTAMPTZ DEFAULT now()`
  - [x] RLS: Patient SELECT (`auth.uid() = (SELECT account_id FROM symptom_events WHERE id = symptom_event_id)`)
  - [x] RLS: Service INSERT (für KI-Pipeline, via createServiceClient)
  - [x] RLS: Patient UPDATE (für Korrekturen in Story 2.3)
  - [x] Index: `idx_extracted_data_symptom_event_id`
  - [x] Realtime aktivieren: `ALTER PUBLICATION supabase_realtime ADD TABLE public.extracted_data;`
- [x] Task 2: KI Provider-Abstraktion (AC: #1)
  - [x] `src/lib/ai/extract.ts` — Interface: `extractSymptomData(transcript: string): Promise<ExtractionResult>`
  - [x] `src/lib/ai/providers/claude.ts` — Anthropic Claude Sonnet Implementation mit Tool Use
  - [x] `src/lib/ai/pipeline.ts` — Orchestration: extract → save to DB
  - [x] `src/types/ai.ts` — `ExtractionResult`, `ExtractionField`, Provider-Interfaces
  - [x] Provider-Swap: Import-Änderung in `pipeline.ts` genügt, kein anderer Code betroffen
- [x] Task 3: Claude Tool Use für garantiertes JSON (AC: #3, #4, #5, #6)
  - [x] Tool-Definition mit Schema für Symptom- und Medikamenten-Extraktion
  - [x] System-Prompt: Medizinischer Kontext, Deutsch, Schweizerdeutsch-Awareness
  - [x] Output-Schema: `{ eventType, symptomName, bodyRegion, side, symptomType, intensity, confidenceScore }` für Symptome
  - [x] Output-Schema: `{ eventType, medicationName, action, dosage, reason, confidenceScore }` für Medikamente
  - [x] Konfidenz-Berechnung pro Feld (nicht nur gesamt)
  - [x] `ANTHROPIC_API_KEY` aus Environment lesen
- [x] Task 4: API Route für KI-Pipeline (AC: #7, #8, #9)
  - [x] `src/app/api/ai/extract/route.ts` erstellen (POST)
  - [x] Input: `{ symptomEventId: string }`
  - [x] `createServiceClient()` verwenden (System-Write, kein User-Context)
  - [x] Pipeline: Load symptom_event → Claude Extract → Insert extracted_data → Update symptom_event status
  - [x] Status-Updates: `'pending'` → `'extracted'` (Erfolg) oder `'extraction_failed'` (Fehler)
  - [x] Retry-Logik: Max 3 Versuche, Exponential Backoff (1s → 2s → 4s)
  - [x] Timeout: 10 Sekunden gesamt (NFR2)
  - [x] Error-Handling: Graceful Degradation — Event bleibt erfassbar auch wenn Extraktion fehlschlägt
- [x] Task 5: Extraktion automatisch triggern nach Erfassung (AC: #1)
  - [x] `createSymptomEvent()` in `src/lib/actions/symptom-actions.ts` erweitern
  - [x] Nach erfolgreichem Insert: API Route `/api/ai/extract` asynchron aufrufen (fire-and-forget)
  - [x] Kein `await` — Patient wird nicht blockiert
  - [x] Alternativ: Supabase Database Webhook oder Edge Function (evaluieren, was einfacher ist)
- [x] Task 6: Realtime-Update im ChatFeed (AC: #7, #11)
  - [x] `useSymptomEvents` Hook erweitern: bei UPDATE von `status: 'extracted'` die extracted_data mitlesen
  - [x] Neuen Hook `useExtractedData(eventId)` erstellen oder in bestehenden Hook integrieren
  - [x] ChatBubble: Received-Bubble mit extrahierten Daten anzeigen statt Processing-Dots
  - [x] Symptom-Events: Blaue/Standard Tags mit extrahierten Feldern
  - [x] Medikamenten-Events: Visuell unterscheidbare Tags (z.B. anderer Icon oder Label)
  - [x] Status `'extraction_failed'`: Error-Bubble mit "Erneut versuchen"-Option
- [x] Task 7: TypeScript-Typen für KI-Pipeline (AC: #3-#6)
  - [x] `src/types/ai.ts` erstellen mit allen Interfaces
  - [x] `ExtractionResult`: { eventType, fields: ExtractionField[] }
  - [x] `ExtractionField`: { fieldName, value, confidence }
  - [x] Zod-Schemas für API Route Input-Validierung
- [x] Task 8: Tests (AC: #1-#11)
  - [x] `src/__tests__/lib/ai/extract.test.ts` — Provider-Abstraktion, Claude Tool Use Response Parsing
  - [x] `src/__tests__/lib/ai/pipeline.test.ts` — Pipeline Orchestration, Error-Handling, Retry
  - [x] `src/__tests__/api/ai/extract.test.ts` — API Route, Status-Updates, Auth
  - [x] `src/__tests__/symptom-actions.test.ts` — Erweitert: Extraction-Trigger nach Insert
  - [x] Fixtures: `src/lib/ai/__fixtures__/` mit Beispiel-Extraktionen
  - [x] Claude API mocken — keine echten API-Calls in Tests
  - [x] `npm run test` verifizieren
- [x] Task 9: Build-Verifikation
  - [x] `npm run lint` fehlerfrei
  - [x] `npm run build` erfolgreich

## Dev Notes

### Scope-Abgrenzung (KRITISCH)

Diese Story implementiert:
- KI-Extraktion mit Claude Sonnet (Provider-Abstraktion)
- `extracted_data`-Tabelle
- API Route für Pipeline-Trigger
- Automatischer Trigger nach Text-Erfassung
- Visuelle Unterscheidung Symptom vs. Medikament im ChatFeed

Gehört NICHT in diese Story:
- **Review-UI mit Konfidenz-Indikatoren** → Story 2.3
- **Conversational Correction** → Story 2.4
- **Patient-Korrekturen und Lern-Loop** → Story 2.3 + Epic 3
- **Spracheingabe (Whisper STT)** → Epic 3, Story 3.2
- **Push-Benachrichtigung nach Extraktion** → Epic 3, Story 3.4
- **Persönliches Vokabular** → Epic 3, Story 3.6

### Abhängigkeit: Story 2.1 (VORAUSSETZUNG)

Story 2.1 liefert:
- `symptom_events`-Tabelle mit `status`-Feld
- `createSymptomEvent()` Server Action
- ChatBubble, ChatFeed Komponenten
- `useSymptomEvents` Hook mit Realtime

### KI-Pipeline Architektur

```
Text-Eingabe (Story 2.1)
  → createSymptomEvent() — Insert mit status: 'pending'
  → Fire-and-forget: POST /api/ai/extract { symptomEventId }
  → pipeline.ts:
      1. Load symptom_event (createServiceClient)
      2. Claude Extract (Tool Use → guaranteed JSON)
      3. Insert extracted_data rows
      4. Update symptom_event.status = 'extracted'
      5. (Update symptom_event.event_type if medication)
  → Supabase Realtime → useSymptomEvents → ChatFeed Update
  → Received-Bubble zeigt extrahierte Daten
```

### Claude Tool Use Contract

```typescript
// Tool-Definition für Claude
const extractionTool = {
  name: 'extract_symptom_data',
  description: 'Extrahiert strukturierte medizinische Daten aus Freitext',
  input_schema: {
    type: 'object',
    properties: {
      eventType: { type: 'string', enum: ['symptom', 'medication'] },
      fields: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            fieldName: { type: 'string' },
            value: { type: 'string' },
            confidence: { type: 'number', minimum: 0, maximum: 100 }
          },
          required: ['fieldName', 'value', 'confidence']
        }
      }
    },
    required: ['eventType', 'fields']
  }
}
```

### System-Prompt (Deutsch, medizinischer Kontext)

```
Du bist ein medizinischer Daten-Extraktor. Analysiere die Patienteneingabe und extrahiere strukturierte Daten.

Bei Symptomen extrahiere:
- symptom_name: Bezeichnung des Symptoms (z.B. "Rückenschmerzen")
- body_region: Körperregion (z.B. "Rücken", "Kopf", "Schulter")
- side: "links", "rechts", "beidseits" oder null
- symptom_type: Art des Symptoms (z.B. "stechend", "ziehend", "dumpf")
- intensity: Intensität 1-10 (falls erwähnt, sonst null)

Bei Medikamenten extrahiere:
- medication_name: Name des Medikaments
- action: "eingenommen" oder "vergessen"
- dosage: Dosis (falls erwähnt)
- reason: Grund der Einnahme (falls erwähnt)

Setze confidence pro Feld:
- 85-100: Explizit genannt
- 70-84: Aus Kontext ableitbar
- <70: Geschätzt/unsicher

Sprache: Der Patient schreibt auf Deutsch (möglicherweise Schweizerdeutsch).
Übersetze Dialekt-Ausdrücke ins Hochdeutsche.
```

### Retry-Pattern (Exponential Backoff)

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (attempt === maxAttempts) throw error
      await new Promise(resolve =>
        setTimeout(resolve, baseDelay * Math.pow(2, attempt - 1))
      )
    }
  }
  throw new Error('Unreachable')
}
```

### Anthropic SDK Usage

```typescript
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  tools: [extractionTool],
  tool_choice: { type: 'tool', name: 'extract_symptom_data' },
  messages: [{ role: 'user', content: transcript }],
  system: systemPrompt,
})

// Tool Use Response auswerten
const toolUse = response.content.find(c => c.type === 'tool_use')
const extractedData = toolUse?.input as ExtractionResult
```

### API Route Pattern (createServiceClient)

```typescript
// src/app/api/ai/extract/route.ts
import { NextResponse } from 'next/server'

import { createServiceClient } from '@/lib/db/client'

export async function POST(request: Request) {
  const body = await request.json()
  // Validierung...

  const supabase = createServiceClient() // RLS bypassed für System-Write

  // Load event, extract, save...

  return NextResponse.json({ data: result })
}
```

**KRITISCH:** API Route nutzt `createServiceClient()` — das ist die EINZIGE Stelle wo Service Client erlaubt ist. Der KI-Pipeline-Prozess hat keinen User-Context (fire-and-forget), daher muss RLS umgangen werden.

### Anti-Patterns (VERMEIDEN)

- **NICHT** Claude direkt in Server Action aufrufen — immer über API Route (System-Context)
- **NICHT** `await` beim Extraction-Trigger in createSymptomEvent() — fire-and-forget, Patient nicht blockieren
- **NICHT** `createServerClient()` in API Route für KI-Pipeline — `createServiceClient()` verwenden
- **NICHT** ganzes Extraction-Result in einer Zeile speichern — pro Feld eine `extracted_data` Row (für individuelle Konfidenz)
- **NICHT** hardcoded Model-ID — aus Environment oder Konstante lesen
- **NICHT** echte Claude API-Calls in Tests — mocken
- **NICHT** Fehler verschlucken — immer `extraction_failed` Status setzen und loggen

### Neue Dateien

- `supabase/migrations/00005_extracted_data.sql`
- `src/lib/ai/extract.ts` — Provider Interface
- `src/lib/ai/providers/claude.ts` — Claude Sonnet Implementation
- `src/lib/ai/pipeline.ts` — Pipeline Orchestration
- `src/types/ai.ts` — KI-Pipeline Typen
- `src/app/api/ai/extract/route.ts` — API Route
- `src/lib/ai/__fixtures__/extractions/` — Test-Fixtures
- `src/__tests__/lib/ai/extract.test.ts`
- `src/__tests__/lib/ai/pipeline.test.ts`
- `src/__tests__/api/ai/extract.test.ts`

### Modifizierte Dateien

- `src/lib/actions/symptom-actions.ts` — Extraction-Trigger nach Insert
- `src/components/capture/chat-bubble.tsx` — Extracted-Data-Anzeige, Medikamenten-Unterscheidung
- `src/hooks/use-symptom-events.ts` — Extracted-Data mit laden
- `src/__tests__/symptom-actions.test.ts` — Erweitert

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 2, Story 2.2]
- [Source: _bmad-output/planning-artifacts/architecture.md — KI-Pipeline: Claude Sonnet, Tool Use, Provider-Abstraktion]
- [Source: _bmad-output/planning-artifacts/architecture.md — API Route Pattern, createServiceClient]
- [Source: _bmad-output/planning-artifacts/architecture.md — Retry Pattern: 3x Exponential Backoff]
- [Source: _bmad-output/planning-artifacts/architecture.md — Graceful Degradation NFR19]
- [Source: _bmad-output/planning-artifacts/prd.md — FR4, FR7, FR8, FR9, NFR2, NFR19]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — ChatBubble Received-Variant, Processing-States]
- [Source: Anthropic Docs — Claude Tool Use API, tool_choice forced]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- `throw` ohne Expression in `pipeline.ts` Zeile 85 — Syntax-Fehler behoben (`throw` → `throw error`)
- `event.status` TS-Fehler: Supabase `select('*')` gibt `{}` zurück — behoben mit `as SymptomEvent` Cast
- `react-hooks/set-state-in-effect` Lint-Fehler in `use-symptom-events.ts` — zweiten `useEffect` entfernt, extracted-data-Loading in `loadEvents` integriert

### Completion Notes List

- 126 Tests bestanden (21 Test-Dateien), inkl. 13 neue Tests für Story 2.2
- `npm run build` erfolgreich
- `npm run lint` keine neuen Fehler (9 pre-existing Errors in Sentry/sw.js-Dateien)
- Extracted-Data-Loading direkt in `loadEvents` integriert statt separatem `useEffect` — vermeidet cascading renders
- `@anthropic-ai/sdk` als Dependency hinzugefügt

### Code Review Fixes (Adversarial Review)

- **H1 Fix:** 10-Sekunden Total-Timeout via `withTimeout()` + `Promise.race` in `pipeline.ts` (AC #8 / NFR2)
- **H2 Fix:** API Route Auth via `INTERNAL_API_SECRET` Header in `route.ts`, Server Action sendet Header mit
- **M1 Fix:** `handleRetryExtraction` in `page.tsx` — try/catch + Response-Status-Check
- **M2 Fix:** `pipeline.ts` catch-Block loggt jetzt Fehler beim Status-Update auf `extraction_failed`
- **M3 Fix:** Client-Side Retry nutzt relative URL `/api/ai/extract` statt absolute `NEXT_PUBLIC_APP_URL`
- **L1 Fix:** Deduplizierte extracted_data-Gruppierungslogik — `loadEvents` delegiert an `loadExtractedData`

### Code Review Fixes Round 2 (Adversarial Review)

- **H1 Fix:** Claude Tool-Output `toolUse.input as ExtractionResult` unsafe Cast durch Zod-Validation (`extractionResultSchema.safeParse`) ersetzt — `src/lib/ai/providers/claude.ts`, `src/types/ai.ts`
- **M1 Fix:** Timeout-Test für `withTimeout` in Pipeline mit `vi.useFakeTimers()` — `src/__tests__/lib/ai/pipeline.test.ts`
- **M2 Fix:** `isMedication` Prop an bestätigte ChatBubble im confirmed-State — `src/components/capture/chat-feed.tsx`
- **M3 Fix:** Warning-Log wenn `INTERNAL_API_SECRET` nicht gesetzt — `src/app/api/ai/extract/route.ts`
- **L1 Fix:** Sprint-Status synchronisiert (`review` → `done`) — `sprint-status.yaml`
- **L2 Fix:** Compound-Index `(symptom_event_id, field_name)` als UNIQUE — `supabase/migrations/00007_extracted_data_compound_index.sql`

### File List

Neue Dateien:
- `supabase/migrations/00005_extracted_data.sql`
- `src/types/ai.ts`
- `src/lib/ai/extract.ts`
- `src/lib/ai/providers/claude.ts`
- `src/lib/ai/pipeline.ts`
- `src/app/api/ai/extract/route.ts`
- `src/lib/ai/__fixtures__/extractions.ts`
- `src/__tests__/lib/ai/extract.test.ts`
- `src/__tests__/lib/ai/pipeline.test.ts`
- `src/__tests__/api/ai/extract.test.ts`

Modifizierte Dateien:
- `src/types/database.ts` — extracted_data Tabellen-Typen hinzugefügt
- `src/lib/actions/symptom-actions.ts` — Fire-and-forget Extraction-Trigger
- `src/components/capture/chat-bubble.tsx` — Medikamenten-Stil, ExtractedFieldTags, ExtractionFailed-State
- `src/components/capture/chat-feed.tsx` — extractedDataMap, onRetryExtraction Props
- `src/hooks/use-symptom-events.ts` — extractedDataMap State, Realtime extracted_data Loading
- `src/app/(app)/page.tsx` — extractedDataMap Destructuring, handleRetryExtraction
- `src/__tests__/symptom-actions.test.ts` — Extraction-Trigger Tests
- `src/__tests__/chat-bubble.test.tsx` — Tests für Medikament, ExtractedFields, ExtractionFailed
- `src/__tests__/chat-feed.test.tsx` — Tests für extractedDataMap, Medikament, ExtractionFailed
- `src/__tests__/example.test.tsx` — extractedDataMap Mock
- `package.json` — @anthropic-ai/sdk Dependency
