# Story 3.1: Hold-to-Record Audio-Erfassung

Status: ready-for-dev

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

- [ ] Task 1: DB-Migration — `symptom_events` erweitern + Storage Bucket (AC: #3, #4)
  - [ ] 1.1: Migration `00007_audio_support.sql` erstellen: `audio_url TEXT` Spalte zu `symptom_events` hinzufügen, `event_type` CHECK-Constraint um `'voice'` erweitern
  - [ ] 1.2: Supabase Storage Bucket `audio` erstellen (private, `audio/*` MIME-Types, 50MB Limit)
  - [ ] 1.3: RLS-Policies für Storage: Patient kann eigene Audio-Dateien hochladen (`INSERT`) und lesen (`SELECT`) mit `auth.uid() = owner`
  - [ ] 1.4: TypeScript-Types aktualisieren: `database.ts` um `audio_url`, `event_type` um `'voice'` erweitern; `symptom.ts` Zod-Schema für Voice-Events

- [ ] Task 2: Media-Upload-Service — `src/lib/db/media.ts` (AC: #3)
  - [ ] 2.1: `uploadAudio(accountId, eventId, blob, mimeType)` → Supabase Storage Upload mit Pfad `{accountId}/{eventId}.{ext}`
  - [ ] 2.2: `getSignedAudioUrl(path, expiresIn = 900)` → Signed URL generieren (15min TTL, NFR10)
  - [ ] 2.3: MIME-Type zu Extension-Mapping: `audio/webm` → `.webm`, `audio/mp4` → `.m4a`
  - [ ] 2.4: Verwende `createServiceClient()` im API-Route-Kontext, `createServerClient()` im Server-Action-Kontext

- [ ] Task 3: `use-audio-recorder` Hook — `src/hooks/use-audio-recorder.ts` (AC: #1, #2, #6, #7, #8, #9)
  - [ ] 3.1: `getUserMedia({ audio: true })` mit Permission-Handling und Fehler-States (`permissionDenied`, `notSupported`)
  - [ ] 3.2: MediaRecorder mit Browser-kompatiblem MIME-Type: Prioritätsliste `audio/webm;codecs=opus` → `audio/webm` → `audio/mp4` → Default (via `isTypeSupported()`)
  - [ ] 3.3: Aufnahme-States: `idle` | `recording` | `processing` mit `duration` Counter (eigener `setInterval`, NICHT `timeslice`)
  - [ ] 3.4: `startRecording()` / `stopRecording()` / `cancelRecording()` Methoden
  - [ ] 3.5: Chunks sammeln via `ondataavailable`, Blob erstellen in `onstop`
  - [ ] 3.6: AnalyserNode-Integration: `AudioContext` + `createMediaStreamSource()` → `AnalyserNode` für Echtzeit-Waveform-Daten (`getByteTimeDomainData`)
  - [ ] 3.7: `audioContext.resume()` bei User-Geste aufrufen (iOS Safari Requirement)
  - [ ] 3.8: 60s Max-Limit mit Warnung ab 50s, 0.5s Min-Limit (still verwerfen + `navigator.vibrate(50)`), automatischer Stopp
  - [ ] 3.9: `mediaStream.active` prüfen vor Aufnahme-Start (iOS App-Switch Recovery)
  - [ ] 3.10: Cleanup: MediaStream Tracks stoppen, AudioContext schliessen bei Unmount

- [ ] Task 4: Waveform-Komponente — `src/components/capture/audio-waveform.tsx` (AC: #7)
  - [ ] 4.1: React-Komponente die `analyserData: Uint8Array` als Prop entgegennimmt
  - [ ] 4.2: **CSS-basierte Balken-Visualisierung** (~20-30 Balken, Terracotta #C06A3C, Tailwind-Klassen). Kein Canvas — CSS-Balken sind einfacher zu stylen, besser mit Tailwind integrierbar, und performant genug
  - [ ] 4.3: Pulsierender Animations-Effekt während Aufnahme
  - [ ] 4.4: Aufnahmedauer-Anzeige (MM:SS Format)

- [ ] Task 5: InputBar erweitern — Recording-Modus (AC: #1, #2, #6, #7)
  - [ ] 5.1: Mikrofon-Button aktivieren (aktuell `disabled` + `opacity-40`): `onPointerDown` → `startRecording()`, `onPointerUp` → `stopRecording()`
  - [ ] 5.2: Recording-State: TextArea + Kamera-Button ausblenden, Waveform + Duration + Cancel-Button einblenden
  - [ ] 5.3: Cancel-Button: `cancelRecording()` aufrufen, zurück zum Idle-State
  - [ ] 5.4: Touch-Events: `onPointerDown`/`onPointerUp` statt `onMouseDown`/`onMouseUp` (Touch + Mouse kompatibel)
  - [ ] 5.5: Permission-Denied State: Mikrofon-Button zeigt dezenten Hinweis (z.B. durchgestrichen + Tooltip "Mikrofon-Zugriff benötigt"), Text-Eingabe bleibt voll funktionsfähig (AC: #9)
  - [ ] 5.6: Barrierefreiheit: `aria-label="Sprachaufnahme starten"`, `aria-live="polite"` für Recording-Status

- [ ] Task 6: Voice-Event Server Action (AC: #3, #4, #5)
  - [ ] 6.1: `createVoiceSymptomEvent(formData: FormData)` Server Action: Auth-Check → Event erstellen (`event_type: 'voice'`, `status: 'pending'`) → Audio aus FormData extrahieren → Upload via `createServerClient()` zu Supabase Storage → `audio_url` im Event speichern. **FormData-Pattern** (nicht Signed-URL): Audio-Dateien sind <500KB (60s WebM/Opus), Next.js `serverActions.bodySizeLimit` auf `'1mb'` setzen in `next.config.ts`
  - [ ] 6.2: Client-seitig: `const formData = new FormData(); formData.append('audio', blob, 'recording.{ext}'); formData.append('mimeType', mimeType)`
  - [ ] 6.3: Nach Upload: Fire-and-forget POST an `/api/ai/extract` mit `symptomEventId` (gleicher Trigger wie Text-Events)
  - [ ] 6.4: `x-internal-secret` Header für interne API-Calls senden (wie in Story 2.2 etabliert)

- [ ] Task 7: Pipeline-Anpassung für Voice-Events (AC: #4)
  - [ ] 7.1: In `src/lib/ai/pipeline.ts` → `runExtractionPipeline()`: Wenn `event_type === 'voice'` und kein `raw_input` vorhanden → Early Return ohne Fehler. Status bleibt `'pending'` (Transkription kommt in Story 3.2)
  - [ ] 7.2: Log-Nachricht: `[KI-Pipeline] Voice-Event ${id} — Transkription ausstehend, Extraktion übersprungen`
  - [ ] 7.3: Test in `pipeline.test.ts`: Voice-Event ohne raw_input → kein Claude-Aufruf, kein Status-Update, kein Fehler

- [ ] Task 8: ChatBubble Voice-Variante (AC: #5)
  - [ ] 8.1: Neue `voice`-Variante in `ChatBubble`: Audio-Indikator (Mikrofon-Icon + Dauer) statt Text
  - [ ] 8.2: System-Bubble "Sprachaufnahme wird verarbeitet..." mit Loading-Dots bei `status: 'pending'` und `event_type: 'voice'`
  - [ ] 8.3: Kein Audio-Playback in dieser Story (kommt in Story 3.2 mit Transkriptions-Anzeige)

- [ ] Task 9: useSymptomEvents Hook erweitern (AC: #5)
  - [ ] 9.1: Voice-Events in `loadEvents` einschliessen (bereits event_type-agnostisch)
  - [ ] 9.2: Realtime-Subscription prüfen: `INSERT` für neue Voice-Events triggert ChatFeed-Update
  - [ ] 9.3: `audio_url` Feld in SymptomEvent-Type verfügbar machen

- [ ] Task 10: Tests (alle ACs)
  - [ ] 10.1: `use-audio-recorder.test.ts`: MediaRecorder Mock, States, Start/Stop/Cancel, Duration-Timer, Max/Min-Limits, Permission-Denied
  - [ ] 10.2: `audio-waveform.test.tsx`: Rendering mit Mock-Daten, Dauer-Anzeige
  - [ ] 10.3: `input-bar.test.tsx`: Recording-Modus Toggle, Pointer-Events, Cancel-Button, Permission-Denied State, a11y-Attribute
  - [ ] 10.4: `media.test.ts`: Upload-Funktion mit Supabase-Mock, Signed-URL-Generierung, MIME-Type Mapping
  - [ ] 10.5: `chat-bubble.test.tsx`: Voice-Variante Rendering, System-Bubble für Voice-Processing
  - [ ] 10.6: `pipeline.test.ts`: Voice-Event Early-Return Test
  - [ ] 10.7: Server Action Tests: Auth-Check, FormData-Verarbeitung, Event-Erstellung, Upload-Flow

- [ ] Task 11: Build-Verifikation
  - [ ] 11.1: `npm run lint` — keine neuen Fehler
  - [ ] 11.2: `npm run build` — TypeScript fehlerfrei
  - [ ] 11.3: Alle Tests bestehen

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

(wird bei Implementierung ausgefüllt)

### Debug Log References

### Completion Notes List

### File List
