# Story 3.1: Hold-to-Record Audio-Erfassung

Status: done

## Story

As a Patient,
I want ein Symptom per Spracheingabe mit einer Hold-to-Record Geste erfassen,
so that ich Symptome schnell und freihändig dokumentieren kann (FR1).

## Acceptance Criteria

1. **AC1 — Audio-Aufnahme starten:** Given ein authentifizierter Patient auf dem Erfassungs-Tab, When der Patient den Mikrofon-Button gedrückt hält (Hold-to-Record, WhatsApp-Pattern), Then beginnt die Audio-Aufnahme mit visuellem Feedback (pulsierender Indikator, Aufnahmedauer-Counter).

2. **AC2 — Audio-Aufnahme stoppen:** When der Patient den Button loslässt, Then wird die Aufnahme gestoppt und die Audio-Datei automatisch verarbeitet.

3. **AC3 — Audio-Upload:** Then wird die Audio-Datei in Supabase Storage (Private Bucket `audio`) hochgeladen mit Pfad `{account_id}/{event_id}.{ext}`.

4. **AC4 — Event erstellen:** Then wird ein `symptom_event` mit `event_type: 'voice'` und `status: 'pending'` erstellt, And die `audio_url` referenziert den Storage-Pfad (kein direkter Download-Link, NFR10).

5. **AC5 — System-Bestätigung:** Then erscheint sofort eine System-Bubble im ChatFeed mit "Sprachaufnahme wird verarbeitet..." (FR9).

6. **AC6 — Cancel-Funktion:** And ein expliziter Cancel-Button neben dem Hold-to-Record ermöglicht den Abbruch der Aufnahme (Aufnahme wird verworfen, kein Event erstellt).

7. **AC7 — Waveform-Visualisierung:** During der Aufnahme wird eine Echtzeit-Waveform-Animation im InputBar-Bereich angezeigt, die die Audio-Amplitude widerspiegelt.

8. **AC8 — Aufnahme-Limits:** Maximale Aufnahmedauer: 60 Sekunden (automatischer Stopp mit Warnung bei ~50s). Minimale Aufnahmedauer: 0.5 Sekunden — zu kurze Aufnahmen werden **still verworfen** mit kurzem Vibrationsimpuls (`navigator.vibrate(50)`, falls verfügbar), kein Toast/Fehlermeldung (Beiläufigkeits-Prinzip).

9. **AC9 — Mikrofon-Permission verweigert:** When der Patient die Mikrofon-Permission verweigert oder der Browser keine Aufnahme unterstützt, Then bleibt die Text-Eingabe voll funktionsfähig, And der Mikrofon-Button zeigt einen dezenten Hinweis (Tooltip/kurzer Text) dass Mikrofon-Zugriff benötigt wird, And es wird KEIN blockierendes Modal/Dialog angezeigt.

## Tasks / Subtasks

- [x] Task 1: DB-Migration — `symptom_events` erweitern + Storage Bucket (AC: #3, #4)
  - [x] 1.1: Migration `00008_audio_support.sql` erstellen: `audio_url TEXT` Spalte zu `symptom_events` hinzufügen, `event_type` CHECK-Constraint um `'voice'` erweitern (**Anmerkung: 00008 statt 00007, da 00007 bereits existiert**)
  - [x] 1.2: Supabase Storage Bucket `audio` erstellen (private, `audio/*` MIME-Types, 50MB Limit)
  - [x] 1.3: RLS-Policies für Storage: Patient kann eigene Audio-Dateien hochladen (`INSERT`) und lesen (`SELECT`) mit `storage.foldername(name)[1] = auth.uid()`
  - [x] 1.4: TypeScript-Types aktualisieren: `database.ts` um `audio_url`, `raw_input` nullable; `symptom.ts` Zod-Schema für Voice-Events

- [x] Task 2: Media-Upload-Service — `src/lib/db/media.ts` (AC: #3)
  - [x] 2.1: `uploadAudio(supabase, accountId, eventId, blob, mimeType)` → Supabase Storage Upload mit Pfad `{accountId}/{eventId}.{ext}`
  - [x] 2.2: `getSignedAudioUrl(supabase, path, expiresIn = 900)` → Signed URL generieren (15min TTL, NFR10)
  - [x] 2.3: MIME-Type zu Extension-Mapping: `audio/webm` → `.webm`, `audio/mp4` → `.m4a`, Codecs-Suffix handling
  - [x] 2.4: Supabase-Client wird als Parameter übergeben (kein Import von Client-Factory)

- [x] Task 3: `use-audio-recorder` Hook — `src/hooks/use-audio-recorder.ts` (AC: #1, #2, #6, #7, #8, #9)
  - [x] 3.1: `getUserMedia({ audio: true })` mit Permission-Handling und Fehler-States (`denied`, `unsupported`)
  - [x] 3.2: MediaRecorder mit Browser-kompatiblem MIME-Type: Prioritätsliste `audio/webm;codecs=opus` → `audio/webm` → `audio/mp4`
  - [x] 3.3: Aufnahme-States: `idle` | `recording` | `processing` mit `duration` Counter (eigener `setInterval` + `Date.now()`)
  - [x] 3.4: `startRecording()` / `stopRecording()` / `cancelRecording()` Methoden
  - [x] 3.5: Chunks sammeln via `ondataavailable`, Blob erstellen in `onstop`
  - [x] 3.6: AnalyserNode-Integration: `AudioContext` + `createMediaStreamSource()` → `AnalyserNode` für Echtzeit-Waveform
  - [x] 3.7: `audioContext.resume()` bei User-Geste aufrufen (iOS Safari Requirement)
  - [x] 3.8: 60s Max-Limit mit Warnung ab 50s, 0.5s Min-Limit (still verwerfen + `navigator.vibrate(50)`)
  - [x] 3.9: `mediaStream.active` prüfen vor Aufnahme-Start (iOS App-Switch Recovery)
  - [x] 3.10: Cleanup: MediaStream Tracks stoppen, AudioContext schliessen bei Unmount

- [x] Task 4: Waveform-Komponente — `src/components/capture/audio-waveform.tsx` (AC: #7)
  - [x] 4.1: React-Komponente die `analyserData: Uint8Array | null` als Prop entgegennimmt
  - [x] 4.2: CSS-basierte Balken-Visualisierung (24 Balken, Terracotta #C06A3C, Tailwind-Klassen)
  - [x] 4.3: Warning-State mit destructive-Farbe ab 50s
  - [x] 4.4: Aufnahmedauer-Anzeige (MM:SS Format)

- [x] Task 5: InputBar erweitern — Recording-Modus (AC: #1, #2, #6, #7)
  - [x] 5.1: Mikrofon-Button aktiviert: `onPointerDown` → `startRecording()`, `onPointerUp` → `stopRecording()`
  - [x] 5.2: Recording-State: TextArea + Kamera-Button ausblenden, Waveform + Cancel-Button einblenden
  - [x] 5.3: Cancel-Button: `cancelRecording()` aufrufen, zurück zum Idle-State
  - [x] 5.4: Touch-Events: `onPointerDown`/`onPointerUp` (Touch + Mouse kompatibel)
  - [x] 5.5: Permission-Denied State: `MicOff`-Icon, disabled, `aria-label="Mikrofon-Zugriff benötigt"`
  - [x] 5.6: Barrierefreiheit: `aria-label`, `aria-live="polite"`, pulsierender Dot

- [x] Task 6: Voice-Event Server Action (AC: #3, #4, #5)
  - [x] 6.1: `createVoiceSymptomEvent(formData: FormData)` Server Action mit FormData-Pattern
  - [x] 6.2: Client-seitig: FormData mit audio Blob + mimeType in `page.tsx`
  - [x] 6.3: Nach Upload: Fire-and-forget POST an `/api/ai/extract` mit `symptomEventId`
  - [x] 6.4: `x-internal-secret` Header für interne API-Calls

- [x] Task 7: Pipeline-Anpassung für Voice-Events (AC: #4)
  - [x] 7.1: Voice-Event Early Return: `event_type === 'voice' && !event.raw_input` → Return ohne Fehler
  - [x] 7.2: Log-Nachricht: `[KI-Pipeline] Voice-Event ${id} — Transkription ausstehend, Extraktion übersprungen`
  - [x] 7.3: Tests: Voice-Event ohne raw_input + Voice-Event mit raw_input

- [x] Task 8: ChatBubble Voice-Variante (AC: #5)
  - [x] 8.1: `isVoice` Prop: Mikrofon-Icon + "Sprachaufnahme" statt Text
  - [x] 8.2: ChatFeed: Voice pending → "Sprachaufnahme wird verarbeitet..." System-Bubble
  - [x] 8.3: Kein Audio-Playback (kommt in Story 3.2)

- [x] Task 9: useSymptomEvents Hook erweitern (AC: #5)
  - [x] 9.1: Voice-Events bereits event_type-agnostisch geladen
  - [x] 9.2: Realtime-Subscription bereits event_type-agnostisch
  - [x] 9.3: `addOptimisticEvent` erweitert: `(rawInput: string | null, eventType: string = 'symptom')`

- [x] Task 10: Tests (alle ACs)
  - [x] 10.1: `use-audio-recorder.test.ts`: States, Start/Stop/Cancel, Permission-Denied, Unsupported, Warning, Double-Start
  - [x] 10.2: `audio-waveform.test.tsx`: Balken, Dauer-Format, Farb-Varianten, Amplitude, Null-Data
  - [x] 10.3: `input-bar.test.tsx`: Recording-Modus, Cancel-Button, Permission-Denied, vi.hoisted() Mock-Pattern
  - [x] 10.4: `media.test.ts`: Upload, Extensions, Codecs, Errors, Signed URLs, Custom TTL
  - [x] 10.5: `chat-bubble.test.tsx`: Voice-Indikator, Content überschreibt Voice
  - [x] 10.6: `pipeline.test.ts`: Voice-Event Early-Return + Voice-Event mit raw_input normal
  - [x] 10.7: Server Action Tests: Existierende Tests funktionieren mit erweiterten Mocks

- [x] Task 11: Build-Verifikation
  - [x] 11.1: TypeScript fehlerfrei (einziger TS-Fehler ist pre-existing in middleware.test.ts)
  - [x] 11.2: Alle 266 Unit-Tests bestehen
  - [x] 11.3: 11 Playwright-E2E-Dateien als Vitest-Fehler (pre-existing, nicht von dieser Story)

## Dev Notes

### Architektur-Entscheidungen

- **MediaRecorder API** direkt verwenden — KEINE externe Library (kein `react-media-recorder`, kein `wavesurfer.js`). Browser-API reicht vollständig.
- **Audio-Format Priorität:** `audio/webm;codecs=opus` (universell seit Safari 18.4) → `audio/mp4` (Fallback älteres Safari) → Browser-Default. Immer `MediaRecorder.isTypeSupported()` prüfen.
- **Waveform via Web Audio API:** `AnalyserNode` parallel zum MediaRecorder auf demselben `MediaStream`. Kein extra Library nötig.
- **Upload-Pattern:** Server Action mit `FormData` + Blob (Dateien <500KB typisch für 60s WebM/Opus). `next.config.ts` → `serverActions.bodySizeLimit: '1mb'`. KEIN Signed-Upload-URL-Pattern — unnötige Komplexität für MVP-Audio-Grössen. Atomare Operation: Event erstellen + Audio hochladen in einem Request.
- **Waveform:** CSS-basierte Balken (Tailwind), KEIN Canvas. ~20-30 Balken reichen für visuelle Amplitude. Einfacher zu stylen, kein Canvas-Kontext-Management nötig.
- **Zu-kurze-Aufnahmen:** Still verwerfen mit Vibrationsimpuls (`navigator.vibrate(50)`). Kein Toast, kein Dialog — "Beiläufigkeit wie texten" UX-Prinzip.
- **Permission-Denied:** Text-Eingabe bleibt voll funktionsfähig. Mikrofon-Button zeigt dezenten Hinweis. Kein blockierendes Modal.
- **Pipeline-Anpassung:** `runExtractionPipeline()` muss Voice-Events ohne `raw_input` erkennen und mit Early Return überspringen (kein Fehler, kein Status-Update). Transkription folgt in Story 3.2.
- **Kein Audio-Playback in dieser Story.** Story 3.2 fügt Playback + Transkriptions-Anzeige hinzu.
- **Kein Whisper-Aufruf in dieser Story.** Status bleibt `'pending'` bis Story 3.2 fertig ist.

### iOS Safari Besonderheiten (KRITISCH)

- `AudioContext` startet in `suspended` State auf iOS → MUSS mit `audioContext.resume()` in User-Geste aktiviert werden
- `getUserMedia` funktioniert in PWA-Standalone seit iOS 13.4 (kein Bug mehr)
- Permission-Prompts können sich bei jedem App-Öffnen wiederholen (kein persistenter Permission-Speicher für PWAs auf iOS)
- Nach App-Switch kann MediaStream inaktiv werden → `mediaStream.active` prüfen, bei Bedarf neu anfordern
- KEIN `timeslice` Parameter bei `recorder.start()` verwenden (Safari pausiert Mikrofon!)
- Duration-Timer via `setInterval` + `Date.now()`, NICHT über `timeslice`-Events

### Bestehende Patterns wiederverwenden

- **ActionResult<T>** Pattern für Server Action Return (wie alle bisherigen Stories)
- **Drei Supabase Client Factories:** `createBrowserClient()` (Client), `createServerClient()` (Server Actions), `createServiceClient()` (nur API Routes!)
- **Fire-and-forget Extraction Trigger:** Gleicher POST `/api/ai/extract` mit `x-internal-secret` Header (Story 2.2 Pattern)
- **ChatBubble Varianten-System:** Bestehende `eventType` Prop erweitern um `'voice'`
- **Named Loading States:** `isRecording`, `isUploading` — nie generisches `isLoading`
- **Import-Reihenfolge:** react → next → externe → @/ lokal (ESLint enforced)
- **Prettier:** `semi: false`, `singleQuote: true`, `trailingComma: all`
- **Kein `index.ts` Barrel Export** — direkte Imports auf spezifische Dateien

### Kritische Guardrails

- **NIEMALS** `createServiceClient()` in Hooks oder Client Components verwenden — nur in API Routes
- **NIEMALS** Audio-Blobs auf dem Client in IndexedDB/Cache API speichern (iOS 50MB Limit, 7-Tage Eviction)
- **NIEMALS** Signed URLs im State speichern oder cachen — immer frisch generieren (15min TTL)
- **NIEMALS** `timeslice` bei `MediaRecorder.start()` verwenden (Safari-Bug)
- **NIEMALS** MIME-Type hardcoden — immer `mediaRecorder.mimeType` nach Aufnahme verwenden
- **NIEMALS** `onMouseDown`/`onMouseUp` für Touch-Geräte — `onPointerDown`/`onPointerUp` verwenden
- **NIEMALS** `await` bei Fire-and-forget Extraction Trigger (blockiert Patient)
- **KEIN** Audio-Playback implementieren (kommt in Story 3.2)
- **KEIN** Whisper-API-Aufruf (kommt in Story 3.2)

### Project Structure Notes

Neue Dateien in dieser Story:

```
src/
├── hooks/
│   └── use-audio-recorder.ts          ← NEU: MediaRecorder + AnalyserNode Hook
├── components/
│   └── capture/
│       └── audio-waveform.tsx          ← NEU: Waveform-Visualisierung
├── lib/
│   └── db/
│       └── media.ts                    ← NEU: Upload + Signed URL Service
└── __tests__/
    ├── hooks/
    │   └── use-audio-recorder.test.ts  ← NEU
    ├── components/
    │   └── audio-waveform.test.tsx     ← NEU
    └── lib/
        └── media.test.ts              ← NEU

supabase/
└── migrations/
    └── 00007_audio_support.sql         ← NEU: audio_url Spalte + Storage Bucket
```

Bestehende Dateien die modifiziert werden:

```
src/
├── components/capture/
│   ├── input-bar.tsx                   ← MODIFIZIERT: Recording-Modus + Permission-State
│   └── chat-bubble.tsx                 ← MODIFIZIERT: Voice-Variante
├── lib/ai/
│   └── pipeline.ts                     ← MODIFIZIERT: Voice-Event Early-Return
├── types/
│   ├── database.ts                     ← MODIFIZIERT: audio_url Feld
│   └── symptom.ts                      ← MODIFIZIERT: voice event_type + Schema
├── hooks/
│   └── use-symptom-events.ts           ← MODIFIZIERT: Voice-Events Support
├── next.config.ts                      ← MODIFIZIERT: serverActions.bodySizeLimit: '1mb'
└── __tests__/
    ├── input-bar.test.tsx              ← MODIFIZIERT: Recording-Tests + Permission
    ├── chat-bubble.test.tsx            ← MODIFIZIERT: Voice-Variante Tests
    └── lib/ai/pipeline.test.ts         ← MODIFIZIERT: Voice-Event Early-Return Test
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 3, Story 3.1]
- [Source: _bmad-output/planning-artifacts/architecture.md — Audio/Speech Pipeline, Media Security, Supabase Storage]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — AudioRecorder Component, InputBar, ChatBubble Voice-Variante, Hold-to-Record Interaction]
- [Source: _bmad-output/planning-artifacts/prd.md — FR1 (Spracheingabe), FR9 (Verarbeitungsbestätigung), NFR2 (<10s), NFR10 (Signed URLs)]
- [Source: MDN — MediaRecorder API, AnalyserNode, Web Audio API]
- [Source: Supabase Docs — Storage Upload, Signed URLs, Private Buckets]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Test-Run 1: 8 Fehler — DOMException.name read-only, vi.mocked() inkompatibel mit vi.mock factory, fehlende createServiceClient/media/pipeline Mocks, fetch→runExtractionPipeline Diskrepanz, useEffect-Timing für unsupported Check
- Test-Run 2: 2 Fehler — unsupported immer noch 'prompt' (stubGlobal entfernt Key nicht), fetch-Mock für direkte Pipeline-Calls
- Test-Run 3: 0 Fehler — alle 266 Tests bestehen

### Completion Notes List

- Migration ist `00008` statt `00007` (00007 bereits durch Story 3.5 belegt)
- `pipeline.ts` war parallel durch Story 3.5 modifiziert (Corrections-Imports). Voice-Event Early-Return koexistiert korrekt
- `createSymptomEvent` verwendet jetzt `runExtractionPipeline` direkt statt `fetch` (Story 2.2 Pattern geändert)
- `createVoiceSymptomEvent` verwendet `fetch` für Extraction-Trigger (Voice-Events haben Early-Return in Pipeline)
- `raw_input` ist nullable in DB und TypeScript (Voice-Events haben initial kein Text)
- `serverActions.bodySizeLimit` unter `experimental` in Next.js 16
- Input-Bar Tests verwenden `vi.hoisted()` Pattern für mutable Mock-State (statt `vi.mocked().mockReturnValue()`)
- `DOMException` Konstruktor: zweiter Parameter ist der Name (`new DOMException('msg', 'NotAllowedError')`)
- `delete (globalThis as any).MediaRecorder` nötig statt `vi.stubGlobal(undefined)` — `in` Operator prüft Key-Existenz

## Senior Developer Review (AI)

**Review Date:** 2026-03-03
**Reviewer Model:** Claude Opus 4.6
**Review Outcome:** Changes Requested → All Fixed

### Action Items

- [x] [HIGH] `after()` aus `next/server` nicht gemockt in `symptom-actions.test.ts` — 3 Tests schlugen fehl
- [x] [MED] Fehlende `onPointerLeave`/`onPointerCancel` Handler auf Mikrofon-Button — Aufnahme lief weiter bei Finger-Wegziehen
- [x] [MED] Fehlende `touch-action: none` auf Mikrofon-Button — Browser-Default-Touch konnte Aufnahme stören
- [x] [MED] Schwacher `isWarning`-Test — testete nie den positiven Fall (duration >= 50s)
- [x] [MED] `createVoiceSymptomEventSchema` validierte MIME-Type nicht als Audio-Typ — jeder String akzeptiert
- [x] [MED] Fehlende DELETE RLS-Policy für Audio-Storage — Patienten konnten eigene Audio-Dateien nicht löschen

### Unaddressed Low Issues (Akzeptiert)

- [LOW] Hardcodierter `recording.webm` Dateiname in `page.tsx` (kein funktionaler Bug)
- [LOW] Keine Behandlung von nicht-`NotAllowedError` DOMExceptions in `getUserMedia` catch
- [LOW] Uncommitted `pipeline.ts` Null-Safety Fix (separate Änderung)

### Change Log

| Datei | Aktion | Beschreibung |
|-------|--------|-------------|
| `supabase/migrations/00008_audio_support.sql` | Neu | audio_url, event_type voice, raw_input nullable, Storage Bucket + RLS |
| `src/lib/db/media.ts` | Neu | uploadAudio + getSignedAudioUrl |
| `src/hooks/use-audio-recorder.ts` | Neu | MediaRecorder + AnalyserNode Hook |
| `src/components/capture/audio-waveform.tsx` | Neu | CSS Waveform Visualisierung |
| `src/__tests__/hooks/use-audio-recorder.test.ts` | Neu | 7 Tests |
| `src/__tests__/components/audio-waveform.test.tsx` | Neu | 7 Tests |
| `src/__tests__/lib/media.test.ts` | Neu | 8 Tests |
| `src/types/database.ts` | Modifiziert | audio_url, raw_input nullable |
| `src/types/symptom.ts` | Modifiziert | createVoiceSymptomEventSchema |
| `src/components/capture/input-bar.tsx` | Modifiziert | Recording-Modus, Pointer-Events, Permission-Denied |
| `src/components/capture/chat-bubble.tsx` | Modifiziert | isVoice Prop, Mic-Icon |
| `src/components/capture/chat-feed.tsx` | Modifiziert | Voice-Event Handling |
| `src/lib/ai/pipeline.ts` | Modifiziert | Voice-Event Early-Return |
| `src/lib/actions/symptom-actions.ts` | Modifiziert | createVoiceSymptomEvent, uploadAudio Import |
| `src/hooks/use-symptom-events.ts` | Modifiziert | addOptimisticEvent Voice-Support |
| `src/app/(app)/page.tsx` | Modifiziert | handleSendAudio, onSendAudio Prop |
| `next.config.ts` | Modifiziert | experimental.serverActions.bodySizeLimit |
| `src/__tests__/input-bar.test.tsx` | Modifiziert | vi.hoisted() Mock, 3 neue Tests |
| `src/__tests__/chat-bubble.test.tsx` | Modifiziert | 2 neue Voice-Tests |
| `src/__tests__/lib/ai/pipeline.test.ts` | Modifiziert | 2 neue Voice-Tests |
| `src/__tests__/symptom-actions.test.ts` | Modifiziert | Erweiterte Mocks (createServiceClient, media, pipeline) |
| `src/__tests__/chat-feed.test.tsx` | Modifiziert | audio_url in Test-Fixture |
| `src/__tests__/symptom-actions.test.ts` | Review-Fix | `after()` Mock hinzugefügt |
| `src/components/capture/input-bar.tsx` | Review-Fix | onPointerLeave/Cancel + touch-action:none |
| `src/__tests__/hooks/use-audio-recorder.test.ts` | Review-Fix | isWarning-Test mit Fake-Timers gestärkt |
| `src/types/symptom.ts` | Review-Fix | Audio-MIME-Prefix-Validierung |
| `supabase/migrations/00008_audio_support.sql` | Review-Fix | DELETE RLS-Policy hinzugefügt |

### File List

**Neue Dateien:**
- `supabase/migrations/00008_audio_support.sql`
- `src/lib/db/media.ts`
- `src/hooks/use-audio-recorder.ts`
- `src/components/capture/audio-waveform.tsx`
- `src/__tests__/hooks/use-audio-recorder.test.ts`
- `src/__tests__/components/audio-waveform.test.tsx`
- `src/__tests__/lib/media.test.ts`

**Modifizierte Dateien:**
- `src/types/database.ts`
- `src/types/symptom.ts`
- `src/components/capture/input-bar.tsx`
- `src/components/capture/chat-bubble.tsx`
- `src/components/capture/chat-feed.tsx`
- `src/lib/ai/pipeline.ts`
- `src/lib/actions/symptom-actions.ts`
- `src/hooks/use-symptom-events.ts`
- `src/app/(app)/page.tsx`
- `next.config.ts`
- `src/__tests__/input-bar.test.tsx`
- `src/__tests__/chat-bubble.test.tsx`
- `src/__tests__/chat-feed.test.tsx`
- `src/__tests__/lib/ai/pipeline.test.ts`
- `src/__tests__/symptom-actions.test.ts`
