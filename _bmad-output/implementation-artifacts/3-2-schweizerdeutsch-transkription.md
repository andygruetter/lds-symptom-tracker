# Story 3.2: Schweizerdeutsch-Transkription via Whisper API

Status: ready-for-dev

## Story

As a System,
I want Schweizerdeutsche Spracheingaben ins Hochdeutsche transkribieren,
So that die KI-Extraktion auf standardisiertem Deutsch arbeiten kann (FR6).

## Acceptance Criteria

1. **Given** ein Audio-Event mit `status: 'pending'` und `event_type: 'voice'` existiert in der DB **When** die KI-Pipeline für dieses Event ausgelöst wird **Then** wird die Audio-Datei aus Supabase Storage heruntergeladen und an die OpenAI Transcriptions API gesendet mit `language: 'de'` (NFR18)
2. **And** die hochdeutsche Transkription wird im `raw_input`-Feld des Events gespeichert
3. **And** der Event-Status wird auf `'transcribed'` gesetzt
4. **And** die Transkription wird als Text im ChatBubble (sent-Variante) im Feed angezeigt
5. **And** anschliessend wird automatisch die KI-Extraktion (Story 2.2 Pipeline) mit dem transkribierten Text ausgelöst
6. **And** Transkription + Extraktion zusammen < 10 Sekunden (NFR2)
7. **And** bei OpenAI-API-Ausfall wird der Status auf `'transcription_failed'` gesetzt und kann über Retry nachgeholt werden

## Tasks / Subtasks

- [ ] Task 1: OpenAI SDK installieren und Provider erstellen (AC: #1)
  - [ ] `npm install openai@^4` — OpenAI Node.js SDK v4.x hinzufügen (Types sind enthalten, kein separates `@types/openai` nötig)
  - [ ] `src/lib/ai/providers/whisper.ts` erstellen
  - [ ] `transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<TranscriptionResult>` implementieren
  - [ ] OpenAI Client mit `OPENAI_API_KEY` initialisieren (server-side only)
  - [ ] Modell: `gpt-4o-mini-transcribe` (kosteneffizient, ausreichende Qualität für Schweizerdeutsch)
  - [ ] Parameter: `language: 'de'`, `response_format: 'json'`
  - [ ] Audio-Buffer als `File`-Objekt übergeben (OpenAI SDK erwartet `Uploadable`)
  - [ ] Response-Parsing: `result.text` extrahieren
  - [ ] Error-Handling: API-Fehler abfangen und als typisierte Fehler werfen
- [ ] Task 2: Transkription-Interface und Mock-Provider (AC: #1, #7)
  - [ ] `src/lib/ai/transcribe.ts` erstellen — Provider-Abstraktion
  - [ ] `transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<TranscriptionResult>` exportieren
  - [ ] Environment-Switch: `E2E_MOCK_TRANSCRIPTION` → Mock-Provider, sonst Whisper-Provider
  - [ ] `src/lib/ai/providers/mock-whisper.ts` erstellen — deterministisch für Tests
  - [ ] Mock: Audio-Grösse > 0 → fester deutscher Text zurückgeben (z.B. "Ich habe Rückenschmerzen links im Schulterblatt")
  - [ ] `TranscriptionResult` Typ in `src/types/ai.ts` ergänzen: `{ text: string, duration?: number }`
- [ ] Task 3: Pipeline um Transkription erweitern (AC: #1, #2, #3, #5, #6)
  - [ ] `src/lib/ai/pipeline.ts` — `runExtractionPipeline()` anpassen
  - [ ] Bestehenden Early-Return für Voice-Events (aus Story 3.1) durch Transkription ersetzen
  - [ ] Neuer Flow für Voice-Events: Audio laden → Transkription → `raw_input` speichern → Status `transcribed` → Extraktion fortsetzen
  - [ ] Audio-Datei von Supabase Storage via Signed URL herunterladen — `getSignedAudioUrl(supabase, storagePath)` wobei `storagePath` der Wert aus `event.audio_url` ist (das ist der Storage-Pfad im Bucket, NICHT eine vollständige URL)
  - [ ] Audio als Buffer lesen (`fetch` + `arrayBuffer()`)
  - [ ] MIME-Type aus `audio_url` Extension ableiten (`.webm` → `audio/webm`, `.mp4` → `audio/mp4`)
  - [ ] Nach Transkription: `raw_input = transcript.text` in DB speichern
  - [ ] Status-Transition: `pending` → `transcribed` → `extracted` (zwei DB-Updates)
  - [ ] Retry-Wrapper (`withRetry`) auch für Transkription nutzen (bestehende Funktion)
  - [ ] Timeout-Wrapper (`withTimeout`) mit 15s für Transkription (separater Timeout vom Extraction-Timeout)
- [ ] Task 4: Fehler-Handling bei Transkription (AC: #7)
  - [ ] Bei Transkriptions-Fehler: Status auf `'transcription_failed'` setzen
  - [ ] `transcription_failed` als gültigen Status in Typ-Definitionen ergänzen
  - [ ] Retry-Button in ChatBubble für `transcription_failed`-Events (analog zu `extraction_failed`)
  - [ ] Retry-Handler in `page.tsx` erweitern: `handleRetryExtraction` funktioniert bereits für `/api/ai/extract` → Pipeline erkennt automatisch Voice-Events
  - [ ] Error-Logging: `console.error('[Transcription] Failed:', error)` mit Sentry-Capture
- [ ] Task 5: ChatBubble Transkription anzeigen (AC: #4)
  - [ ] `src/components/capture/chat-bubble.tsx` erweitern
  - [ ] **Bubble State-Transition (KRITISCH UX):** Die bestehende Sent-Bubble für Voice-Events aktualisiert sich in-place — KEIN neues Element erstellen:
    - `pending`: Audio-Indikator + "Sprachaufnahme wird verarbeitet..." (aus Story 3.1)
    - `transcribed`/`extracted`: Transkribierter Text + kleines Mikrofon-Icon (zeigt Voice-Ursprung)
    - `transcription_failed`: Fehler-Nachricht + Retry-Button (gleicher Pattern wie `extraction_failed`)
  - [ ] Die Transition geschieht durch Realtime-Subscription: Event-Update in DB → Hook-Refresh → Bubble re-rendert mit neuem Status/Text
  - [ ] Das Mikrofon-Icon bleibt permanent sichtbar um Voice-Ursprung von Text-Eingaben zu unterscheiden
- [ ] Task 6: Status-Typ-Erweiterungen (AC: #3, #7)
  - [ ] `src/types/database.ts` — Hinweis: wird automatisch regeneriert nach Migration
  - [ ] `supabase/migrations/00008_transcription_status.sql` erstellen (falls Status-Enum oder CHECK Constraint nötig)
  - [ ] ODER: Status-Werte sind bereits TEXT ohne Constraint → kein Migration nötig, nur TypeScript-Typen aktualisieren
  - [ ] **Hinweis Migrations-Nummerierung:** Falls KEINE Migration erstellt wird, bleibt `00008` frei. Nachfolgende Stories (3.3: `00009`, 3.4: `00010`, 3.6: `00011`) müssen ihre Nummern entsprechend anpassen. Prüfe die höchste vorhandene Migrationsnummer vor dem Erstellen.
  - [ ] `src/types/symptom.ts` — Status-Typ-Kommentar aktualisieren: `pending | transcribed | extracted | extraction_failed | transcription_failed | confirmed`
- [ ] Task 7: Tests (AC: #1-#7)
  - [ ] `src/__tests__/lib/ai/whisper.test.ts` — Provider-Tests: API-Call-Format, Response-Parsing, Error-Handling
  - [ ] `src/__tests__/lib/ai/transcribe.test.ts` — Interface-Tests: Provider-Switch (Mock vs. Real), Delegation
  - [ ] `src/__tests__/lib/ai/pipeline.test.ts` — Erweitert: Voice-Event-Flow (Transkription → Extraktion), Transkriptions-Fehler → `transcription_failed`, Text-Event-Flow unverändert. **ACHTUNG:** Bestehender Test für Voice-Event-Early-Return (aus Story 3.1) muss aktualisiert werden — der Early-Return wird durch Transkription ersetzt!
  - [ ] `src/__tests__/chat-bubble.test.tsx` — Erweitert: Voice-Event mit Transkription anzeigen, `transcription_failed` Retry-Button
  - [ ] Bestehende Tests dürfen NICHT brechen (214 Tests + neue)
  - [ ] `npm run test` verifizieren
- [ ] Task 8: Optionaler Smoke-Test mit echter API
  - [ ] `src/__tests__/lib/ai/whisper.smoke.ts` — Smoke-Test mit echtem Audio-Fixture (`src/lib/ai/__fixtures__/audio/rueckenschmerzen-schweizerdeutsch.webm`)
  - [ ] Nur manuell ausführbar (nicht in `npm run test`) — z.B. via `vitest run --testPathPattern smoke`
  - [ ] Prüft: Echter API-Call → Text-Response erhalten → enthält deutsche Wörter
  - [ ] Benötigt echten `OPENAI_API_KEY` — überspringen wenn nicht gesetzt
- [ ] Task 9: Build-Verifikation
  - [ ] `npm run lint` fehlerfrei (nur vorbestehende Warnings)
  - [ ] `npm run build` erfolgreich
  - [ ] Env-Variable `OPENAI_API_KEY` in `.env.local.example` dokumentieren

## Dev Notes

### Scope-Abgrenzung (KRITISCH)

Diese Story implementiert:
- OpenAI Transcriptions API Integration (Provider-Pattern)
- Pipeline-Erweiterung: Voice-Events → Transkription → Extraktion
- ChatBubble Transkriptions-Anzeige
- Fehler-Handling mit `transcription_failed` Status

Gehört NICHT in diese Story:
- **Audio-Aufnahme und Upload** → Story 3.1 (VORAUSSETZUNG — muss implementiert sein!)
- **Audio-Playback** → Spätere Story oder Post-MVP
- **Streaming-Transkription (Realtime API)** → Post-MVP Enhancement. MVP nutzt File-based Transcription.
- **Speaker Diarization** → Nicht relevant (einzelner Patient)
- **Eigenständiges Whisper-Modell (self-hosted)** → Post-MVP. MVP nutzt OpenAI API.
- **Schweizerdeutsch Fine-Tuning** → Post-MVP. Standard-Modell liefert bereits gute Ergebnisse.

### Abhängigkeit: Story 3.1 (VORAUSSETZUNG)

Story 3.1 liefert:
- `src/lib/db/media.ts` — `uploadAudio()`, `getSignedAudioUrl()`
- `src/hooks/use-audio-recorder.ts` — Audio-Aufnahme
- `supabase/migrations/00007_audio_support.sql` — `audio_url` Spalte, Storage Bucket
- `src/components/capture/chat-bubble.tsx` — Voice-Variante mit Audio-Indikator
- `src/lib/ai/pipeline.ts` — Early-Return für Voice-Events ohne `raw_input`
- `src/types/symptom.ts` — `createVoiceSymptomEventSchema`

### Architektur-Entscheidung: Modell-Wahl

| Modell | Kosten | Latenz | Schweizerdeutsch | Gewählt |
|--------|--------|--------|------------------|---------|
| `whisper-1` (Whisper V2) | $0.006/min | 2-5s | Gut | Nein |
| `gpt-4o-transcribe` | Höher | 1-3s | Sehr gut | Nein |
| `gpt-4o-mini-transcribe` | Günstiger | 1-3s | Sehr gut | **Ja** |

**Begründung**: `gpt-4o-mini-transcribe` bietet bessere Qualität als `whisper-1` bei geringeren Kosten als `gpt-4o-transcribe`. Für 15-60s Audio-Clips ist die Latenz optimal. Unterstützt `language: 'de'` für verbesserte Genauigkeit bei deutschen Dialekten.

### OpenAI SDK Integration (Node.js)

```typescript
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Transcription erstellen
const result = await openai.audio.transcriptions.create({
  file: audioFile, // Uploadable: File, Blob, oder Buffer
  model: 'gpt-4o-mini-transcribe',
  language: 'de',
  response_format: 'json',
})

// result.text enthält die Transkription
```

**Wichtig**: Das OpenAI SDK erwartet ein `Uploadable`-Objekt. Für Server-seitige Verarbeitung einen `File`-artigen Blob aus dem Buffer erstellen:
```typescript
import { toFile } from 'openai'

const file = await toFile(audioBuffer, `audio.${extension}`, { type: mimeType })
```

### Pipeline-Flow (Voice-Event)

```
1. /api/ai/extract erhält symptomEventId
2. Pipeline lädt Event aus DB
3. Check: event_type === 'voice' && !raw_input?
   JA → Transkriptions-Pfad:
     a. Audio-URL aus event.audio_url
     b. Signed URL generieren (getSignedAudioUrl)
     c. Audio herunterladen (fetch → arrayBuffer → Buffer)
     d. MIME-Type ableiten (Extension-basiert)
     e. transcribeAudio(buffer, mimeType) aufrufen
     f. raw_input = transcript.text → DB Update
     g. status = 'transcribed' → DB Update
     h. Weiter mit Standard-Extraktion (extractSymptomData)
   NEIN → Standard-Extraktion direkt starten
4. extractSymptomData(raw_input) → extracted_data Insert
5. status = 'extracted' → DB Update
```

### Status-Transitionen (Voice-Events)

```
pending ──────→ transcribed ──────→ extracted ──────→ confirmed
   │                                     │
   └→ transcription_failed               └→ extraction_failed
         (Retry möglich)                      (Retry möglich)
```

**Text-Events (unverändert):**
```
pending → extracted → confirmed
```

### Provider-Abstraktion (Bestehendes Pattern kopieren)

Das Projekt nutzt bereits Provider-Abstraktion für die KI-Extraktion:
- `src/lib/ai/extract.ts` — Interface
- `src/lib/ai/providers/claude.ts` — Produktiv-Provider
- `src/lib/ai/providers/mock.ts` — Test-Provider
- Environment-Switch: `E2E_MOCK_EXTRACTION`

**Gleicher Pattern für Transkription:**
- `src/lib/ai/transcribe.ts` — Interface
- `src/lib/ai/providers/whisper.ts` — Produktiv-Provider (OpenAI)
- `src/lib/ai/providers/mock-whisper.ts` — Test-Provider
- Environment-Switch: `E2E_MOCK_TRANSCRIPTION`

### Audio-Download aus Supabase Storage

**Wichtig:** `event.audio_url` enthält den **Storage-Pfad** (z.B. `audio/abc-123/evt-456/recording.webm`), NICHT eine vollständige URL. `getSignedAudioUrl()` aus Story 3.1 generiert daraus eine temporäre Signed URL.

```typescript
// In pipeline.ts — Audio aus Storage laden
import { getSignedAudioUrl } from '@/lib/db/media'  // Aus Story 3.1

async function downloadAudio(supabase: SupabaseClient, storagePath: string): Promise<Buffer> {
  // storagePath = event.audio_url (Storage-Pfad, keine URL)
  const signedUrl = await getSignedAudioUrl(supabase, storagePath)
  const response = await fetch(signedUrl)
  if (!response.ok) throw new Error('Audio-Download fehlgeschlagen')
  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
```

### Performance-Budget (NFR2: <10s gesamt)

| Schritt | Erwartete Latenz | Budget |
|---------|-----------------|--------|
| Audio herunterladen | <500ms | 1s |
| Transkription (OpenAI) | 1-3s | 4s |
| Extraktion (Claude) | 1-3s | 4s |
| DB Updates | <100ms | 1s |
| **Gesamt** | **~3-7s** | **<10s** |

### Bestehende Retry/Timeout-Infrastruktur

`pipeline.ts` hat bereits:
```typescript
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T>
async function withTimeout<T>(fn: () => Promise<T>, ms: number): Promise<T>
```

Für Transkription nutzen:
```typescript
const transcript = await withRetry(
  () => withTimeout(() => transcribeAudio(audioBuffer, mimeType), 15000)
)
```

### Neue Env-Variable

| Variable | Scope | Beschreibung |
|----------|-------|-------------|
| `OPENAI_API_KEY` | Server-only | OpenAI API-Schlüssel für Transkription |
| `E2E_MOCK_TRANSCRIPTION` | Test-only | Aktiviert Mock-Provider (kein API-Call) |

### Anti-Patterns (VERMEIDEN)

- **NICHT** `whisper-1` verwenden — `gpt-4o-mini-transcribe` ist besser und günstiger
- **NICHT** Audio im Client transkribieren — immer Server-seitig (API-Schlüssel schützen)
- **NICHT** Audio-Datei im Request-Body an API-Route senden — Audio ist bereits in Supabase Storage, nur EventID senden
- **NICHT** eigenen HTTP-Client für OpenAI verwenden — offizielles SDK nutzen
- **NICHT** Realtime API verwenden — File-based Transcription ist für Batch-Verarbeitung optimaler
- **NICHT** `response_format: 'verbose_json'` — `json` reicht, wir brauchen nur den Text
- **NICHT** Transkription und Extraktion parallel ausführen — sequentiell (Transkription → Text → Extraktion)
- **NICHT** `createServiceClient()` in Provider-Dateien — Supabase-Client wird von Pipeline durchgereicht

### Neue Dateien

- `src/lib/ai/transcribe.ts` — Transkriptions-Interface mit Provider-Switch
- `src/lib/ai/providers/whisper.ts` — OpenAI Whisper/GPT-4o-mini-transcribe Provider
- `src/lib/ai/providers/mock-whisper.ts` — Mock-Provider für Tests
- `src/__tests__/lib/ai/whisper.test.ts` — Provider-Unit-Tests
- `src/__tests__/lib/ai/transcribe.test.ts` — Interface-Tests

### Modifizierte Dateien

- `src/lib/ai/pipeline.ts` — Transkriptions-Schritt für Voice-Events
- `src/types/ai.ts` — `TranscriptionResult` Interface
- `src/components/capture/chat-bubble.tsx` — Transkription-Anzeige, `transcription_failed` Status
- `src/__tests__/lib/ai/pipeline.test.ts` — Voice-Event-Tests
- `src/__tests__/chat-bubble.test.tsx` — Transkription-Tests
- `package.json` / `package-lock.json` — `openai` Dependency

### Cross-Story Pipeline-Warnung

`src/lib/ai/pipeline.ts` wird von 4 Stories modifiziert (3.2, 3.4, 3.5, 3.6). Implementierungsreihenfolge ist kritisch — Stories MÜSSEN sequentiell auf pipeline.ts arbeiten. Bei paralleler Entwicklung: Merge-Konflikte sind garantiert.

### Project Structure Notes

- Provider-Pattern folgt exakt dem bestehenden Pattern von `extract.ts` / `claude.ts` / `mock.ts`
- OpenAI SDK wird nur in `src/lib/ai/providers/whisper.ts` importiert — niemals in Komponenten
- Alle Pipeline-Änderungen sind abwärtskompatibel: Text-Events fliessen unverändert durch
- Supabase-Client wird von Pipeline an Provider durchgereicht (nicht in Provider erstellt)

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 3, Story 3.2]
- [Source: _bmad-output/planning-artifacts/architecture.md — D6: Whisper + Claude Pipeline]
- [Source: _bmad-output/planning-artifacts/architecture.md — KI-Pipeline Route, Error-Handling D12]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — ChatBubble States, Processing Feedback]
- [Source: _bmad-output/planning-artifacts/prd.md — FR6: Schweizerdeutsch, NFR2: <10s, NFR18: STT-API]
- [Source: _bmad-output/implementation-artifacts/3-1-hold-to-record.md — Voraussetzung: Audio-Upload, Pipeline Early-Return]
- [Source: OpenAI API Docs — gpt-4o-mini-transcribe, audio.transcriptions.create()]
- [Source: openai-node GitHub — TranscriptionCreateParams, toFile()]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

## Change Log

- 2026-03-03: Story 3.2 erstellt — Umfassende Story-Datei mit OpenAI SDK Integration, Pipeline-Erweiterung, Provider-Abstraktion, Performance-Budget und allen Tests
- 2026-03-03: Party-Mode Review — 4 Findings eingearbeitet: (1) Bubble State-Transition UX definiert, (2) audio_url als storagePath klargestellt, (3) OpenAI SDK v4 spezifiziert, (4) Smoke-Test-Task + Pipeline-Early-Return-Testwarnung + Migrations-Nummern-Hinweis + Cross-Story-Pipeline-Warnung
