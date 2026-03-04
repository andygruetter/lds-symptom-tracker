# Story 3.2: Schweizerdeutsch-Transkription via Whisper API

Status: done

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

- [x] Task 1: OpenAI SDK installieren und Provider erstellen (AC: #1)
  - [x] `npm install openai@^6` — OpenAI Node.js SDK v6.x (v4 hat Zod-v4-Konflikt, v6 unterstützt Zod v4 nativ)
  - [x] `src/lib/ai/providers/whisper.ts` erstellen
  - [x] `transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<TranscriptionResult>` implementieren
  - [x] OpenAI Client mit `OPENAI_API_KEY` initialisieren (server-side only)
  - [x] Modell: `gpt-4o-mini-transcribe` (kosteneffizient, ausreichende Qualität für Schweizerdeutsch)
  - [x] Parameter: `language: 'de'`, `response_format: 'json'`
  - [x] Audio-Buffer als `File`-Objekt übergeben (OpenAI SDK `toFile()`)
  - [x] Response-Parsing: `result.text` extrahieren
  - [x] Error-Handling: API-Fehler abfangen und als typisierte Fehler werfen
- [x] Task 2: Transkription-Interface und Mock-Provider (AC: #1, #7)
  - [x] `src/lib/ai/transcribe.ts` erstellen — Provider-Abstraktion
  - [x] `transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<TranscriptionResult>` exportieren
  - [x] Environment-Switch: `E2E_MOCK_TRANSCRIPTION` → Mock-Provider, sonst Whisper-Provider
  - [x] `src/lib/ai/providers/mock-whisper.ts` erstellen — deterministisch für Tests
  - [x] Mock: Audio-Grösse > 0 → fester deutscher Text zurückgeben ("Ich habe Rückenschmerzen links im Schulterblatt")
  - [x] `TranscriptionResult` und `TranscriptionProvider` Types in `src/types/ai.ts` ergänzt
- [x] Task 3: Pipeline um Transkription erweitern (AC: #1, #2, #3, #5, #6)
  - [x] `src/lib/ai/pipeline.ts` — `runExtractionPipeline()` angepasst
  - [x] Bestehenden Early-Return für Voice-Events durch Transkription ersetzt
  - [x] Neuer Flow: Audio laden → Transkription → `raw_input` speichern → Status `transcribed` → Extraktion fortsetzen
  - [x] Audio-Datei von Supabase Storage via Signed URL heruntergeladen
  - [x] MIME-Type aus `audio_url` Extension abgeleitet
  - [x] Status-Transition: `pending` → `transcribed` → `extracted`
  - [x] Retry-Wrapper und Timeout-Wrapper (15s) für Transkription
  - [x] Retry auch für `extraction_failed` und `transcription_failed` Status ermöglicht
- [x] Task 4: Fehler-Handling bei Transkription (AC: #7)
  - [x] Bei Transkriptions-Fehler: Status auf `'transcription_failed'` gesetzt
  - [x] `transcription_failed` als gültigen Status ergänzt
  - [x] Retry-Button in ChatBubble für `transcription_failed`-Events
  - [x] Pipeline erkennt automatisch Voice-Events beim Retry
  - [x] Catch-Block verhindert Überschreiben von `transcription_failed` mit `extraction_failed`
- [x] Task 5: ChatBubble Transkription anzeigen (AC: #4)
  - [x] `src/components/capture/chat-bubble.tsx` erweitert mit `isTranscriptionFailed` Prop
  - [x] Bubble State-Transition: pending → transcribed → extracted korrekt
  - [x] Mikrofon-Icon permanent sichtbar bei Voice-Events mit transkribiertem Text
  - [x] `transcription_failed`: Fehler-Nachricht + Retry-Button
  - [x] ChatFeed: `transcribed` Status zeigt Processing-Dots (Extraktion läuft)
- [x] Task 6: Status-Typ-Erweiterungen (AC: #3, #7)
  - [x] `supabase/migrations/00009_transcription_status.sql` erstellt — CHECK-Constraint erweitert
  - [x] `src/types/symptom.ts` — Status-Typ-Kommentar aktualisiert
- [x] Task 7: Tests (AC: #1-#7)
  - [x] `src/__tests__/lib/ai/whisper.test.ts` — 5 Provider-Tests (API-Call, MIME-Types, Error, Codec-Suffix)
  - [x] `src/__tests__/lib/ai/transcribe.test.ts` — 2 Interface-Tests (Provider-Switch)
  - [x] `src/__tests__/lib/ai/pipeline.test.ts` — 13 Tests (aktualisiert: Voice-Transkription, transcription_failed, Retry)
  - [x] `src/__tests__/chat-bubble.test.tsx` — 18 Tests (erweitert: Mic-Icon, transcription_failed Retry)
  - [x] Alle bestehenden Unit-Tests bestehen (38 von 38)
- [x] Task 8: Optionaler Smoke-Test mit echter API
  - [x] `src/__tests__/lib/ai/whisper.smoke.ts` — Smoke-Test erstellt
  - [x] Überspringt automatisch wenn OPENAI_API_KEY oder Audio-Fixture fehlt
- [x] Task 9: Build-Verifikation
  - [x] `npm run lint` — keine neuen Fehler (nur vorbestehende)
  - [x] `npm run build` erfolgreich
  - [x] `OPENAI_API_KEY` in `.env.local.example` dokumentiert

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

Claude Opus 4.6

### Debug Log References

- OpenAI SDK v4 hat Zod v4 Peer-Dependency-Konflikt → v6 verwendet (unterstützt `zod@^3.25 || ^4.0`)
- Pipeline Error-Handling: catch-Block prüft aktuellen Status, verhindert Überschreiben von `transcription_failed` mit `extraction_failed`

### Completion Notes List

- OpenAI SDK v6.x installiert (statt v4 wegen Zod v4 Kompatibilität)
- Whisper Provider mit `gpt-4o-mini-transcribe` Modell, `language: 'de'`, `response_format: 'json'`
- Provider-Abstraktion mit `transcribe.ts` Interface und `mock-whisper.ts` Mock-Provider
- Pipeline Early-Return für Voice-Events durch vollständigen Transkriptions-Flow ersetzt
- Voice-Event-Flow: Audio laden → Transkription (15s Timeout, 3x Retry) → raw_input speichern → Status `transcribed` → Extraktion
- Fehler-Handling: `transcription_failed` Status, Retry möglich über bestehenden `/api/ai/extract` Endpoint
- ChatBubble erweitert: `isTranscriptionFailed` Prop, Mikrofon-Icon bei Voice-Events mit Text
- ChatFeed: `transcribed` Status zeigt Processing-Dots
- DB Migration `00010_transcription_status.sql`: CHECK-Constraint erweitert (umbenannt von 00009 wegen Konflikt mit Story 3.3)
- Alle 358 Unit-Tests bestehen, keine Regressionen
- Build erfolgreich, keine neuen Lint-Fehler

### File List

Neue Dateien:
- `src/lib/ai/transcribe.ts`
- `src/lib/ai/providers/whisper.ts`
- `src/lib/ai/providers/mock-whisper.ts`
- `src/__tests__/lib/ai/whisper.test.ts`
- `src/__tests__/lib/ai/transcribe.test.ts`
- `src/__tests__/lib/ai/whisper.smoke.ts`
- `supabase/migrations/00010_transcription_status.sql`

Modifizierte Dateien:
- `src/lib/ai/pipeline.ts`
- `src/types/ai.ts`
- `src/types/symptom.ts`
- `src/components/capture/chat-bubble.tsx`
- `src/components/capture/chat-feed.tsx`
- `src/__tests__/lib/ai/pipeline.test.ts`
- `src/__tests__/chat-bubble.test.tsx`
- `package.json`
- `package-lock.json`
- `.env.local.example`

## Change Log

- 2026-03-03: Story 3.2 erstellt — Umfassende Story-Datei mit OpenAI SDK Integration, Pipeline-Erweiterung, Provider-Abstraktion, Performance-Budget und allen Tests
- 2026-03-03: Party-Mode Review — 4 Findings eingearbeitet: (1) Bubble State-Transition UX definiert, (2) audio_url als storagePath klargestellt, (3) OpenAI SDK v4 spezifiziert, (4) Smoke-Test-Task + Pipeline-Early-Return-Testwarnung + Migrations-Nummern-Hinweis + Cross-Story-Pipeline-Warnung
- 2026-03-03: Story implementiert — OpenAI SDK v6 (Zod v4 kompatibel), Whisper Provider, Pipeline-Transkription, ChatBubble UX, 38 Tests bestanden, Build erfolgreich
- 2026-03-03: Code Review abgeschlossen — 6 Findings (2 HIGH, 2 MEDIUM, 2 LOW). Fixes: (1) `transcribed` zu `retriableStatuses` hinzugefügt (orphaned events Bug), (2) Migration von 00009 zu 00010 umbenannt (Konflikt mit Story 3.3), (3) Test für `transcribed`-Retry hinzugefügt, (4) Kommentar für ChatFeed Voice-Processing Logik. Action Item: MIME-Mapping-Konsolidierung (3 Dateien). 358 Tests bestanden.

## Senior Developer Review (AI)

**Reviewer:** Andy (Claude Opus 4.6)
**Datum:** 2026-03-03
**Ergebnis:** APPROVED (nach Fixes)

### Findings (6 total: 2 HIGH, 2 MEDIUM, 2 LOW)

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| 1 | HIGH | `transcribed` fehlte in `retriableStatuses` — Orphaned Events möglich | ✅ Fixed |
| 2 | HIGH | Doppelte Migrationsnummer 00009 (Konflikt mit Story 3.3) | ✅ Fixed (→ 00010) |
| 3 | MEDIUM | Kein Test für `transcribed` Status-Retry | ✅ Fixed (Test hinzugefügt) |
| 4 | MEDIUM | MIME-Mapping dreifach dupliziert (whisper.ts, pipeline.ts, media.ts) | 📋 Action Item |
| 5 | LOW | `as string` Type-Assertions für neue Status-Werte | ℹ️ Löst sich nach `supabase gen types` |
| 6 | LOW | ChatFeed Voice-Processing Logik schwer lesbar | ✅ Fixed (Kommentar) |

### AC-Validierung

| AC | Status |
|----|--------|
| AC1: Audio laden + OpenAI `language: 'de'` | ✅ |
| AC2: Transkription in raw_input | ✅ |
| AC3: Status `transcribed` | ✅ |
| AC4: ChatBubble Anzeige | ✅ |
| AC5: Automatische Extraktion | ✅ |
| AC6: <10s Performance | ✅ |
| AC7: transcription_failed + Retry | ✅ |

### Action Items

- [ ] [AI-Review][MEDIUM] MIME-Type-Mapping konsolidieren: Shared Utility `lib/utils/mime.ts` aus `whisper.ts:extensionFromMime`, `pipeline.ts:mimeTypeFromPath`, `media.ts:AUDIO_MIME_TO_EXT` erstellen
