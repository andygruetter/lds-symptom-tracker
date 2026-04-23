---
title: 'Manuelle Transkription & Extraktion Wiederholung'
slug: 'manual-extraction-rerun'
created: '2026-03-31'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Next.js 15 (App Router)', 'Supabase (Realtime + RLS)', 'React 19', 'Tailwind CSS', 'shadcn/ui', 'Vitest + React Testing Library', 'Zod v4']
files_to_modify:
  - 'src/lib/ai/pipeline.ts'
  - 'src/lib/ai/rerun.ts (NEU)'
  - 'src/types/ai.ts'
  - 'src/app/api/ai/extract/route.ts'
  - 'src/components/capture/chat-bubble.tsx'
  - 'src/app/(app)/page.tsx'
  - 'src/components/event/event-detail-view.tsx'
  - 'src/hooks/use-long-press.ts (NEU)'
code_patterns:
  - 'Server Actions (use server) für DB-Mutationen + after() für async Pipeline'
  - 'API Route POST /api/ai/extract für Client-seitigen Retry via fetch()'
  - 'Supabase Realtime Subscription in useSymptomEvents Hook für Status-Updates'
  - 'Zod-Schemas in types/symptom.ts für Server Action Input-Validierung'
  - 'ActionResult<T> Pattern für einheitliche Server Action Responses'
  - 'Service Client (createServiceClient) für Pipeline — bypassed RLS'
test_patterns:
  - 'Vitest + React Testing Library'
  - 'Supabase-Mocks via vi.mock(@/lib/db/client) mit chainable .from().select().eq()'
  - 'Pipeline-Tests mit gemocktem extractSymptomData + transcribeAudio'
  - 'ChatBubble-Tests prüfen Rendering nach variant/status/props'
  - 'API-Route-Tests mit gemocktem Request/Response'
---

# Tech-Spec: Manuelle Transkription & Extraktion Wiederholung

**Created:** 2026-03-31

## Overview

### Problem Statement

Bei bereits erfolgreich verarbeiteten Symptom-Events (Status `extracted` oder `confirmed`) kann der User die Transkription und Extraktion nicht manuell neu starten. Der bestehende Retry-Mechanismus funktioniert nur bei Fehlerstatus (`extraction_failed`, `transcription_failed`). Wenn die KI ein Ergebnis liefert, das nicht korrekt ist, bleibt dem User nur die manuelle Korrektur einzelner Felder — ein kompletter Neuanlauf der Pipeline ist nicht möglich.

### Solution

Zwei separate Aktionen einführen: "Transkription wiederholen" (nur Voice-Events) und "Extraktion wiederholen". Auf der Capture-Seite werden diese per Long-Press (1.5s) auf eine ChatBubble zugänglich — mit haptischem Feedback und visuellem Progress-Ring. Bei Long-Press öffnet sich ein Popover/DropdownMenu mit den Aktionen. Auf der Event-Detail-Seite sind sie direkt als Buttons sichtbar. Bei Auslösung wird der Status zurückgesetzt, alle `extracted_data` werden gelöscht (Clean Slate), die Pipeline läuft neu, und die neuen Ergebnisse müssen vom User erneut bestätigt werden. Event-Metadaten (`occurred_at`, `ended_at`, `event_type`) bleiben erhalten.

### Scope

**In Scope:**
- Long-Press-Geste (1.5s) auf ChatBubble mit haptischem Feedback + Progress-Ring-Animation
- Popover/DropdownMenu bei Long-Press mit den zwei Aktionen
- Zwei direkt sichtbare Buttons auf der Event-Detail-Ansicht (`/history/[id]`)
- Button "Transkription wiederholen" (nur bei Voice-Events sichtbar)
- Button "Extraktion wiederholen" (bei allen Event-Typen)
- Status-Rücksetzung auf `pending` (Transkription) bzw. `transcribed` (Extraktion)
- Event-Metadaten (`occurred_at`, `ended_at`, `event_type`) bleiben erhalten
- Clean Slate: Alle `extracted_data` werden bei Re-Run gelöscht und neu generiert
- Neue `extracted_data` müssen vom User komplett neu bestätigt werden
- Real-time UI-Update via Supabase Realtime (bestehendes Pattern)

**Out of Scope:**
- Änderungen an der AI-Pipeline selbst (Whisper/Claude Prompts)
- Batch-Re-Run für mehrere Events gleichzeitig
- Re-Run über andere Oberflächen (z.B. History-Liste)

## Context for Development

### Codebase Patterns

- **Server Actions** (`'use server'`) in `symptom-actions.ts` für alle DB-Mutationen. Jede Action: Zod-Validierung → Auth-Check → Ownership-Check → DB-Operation → `revalidatePath()`. Pipeline wird via `after()` (Next.js) async nach Response gestartet.
- **API Route** `POST /api/ai/extract` für Client-seitigen Retry via `fetch()`. Authentifiziert über `INTERNAL_API_SECRET` Header. Nutzt `createServiceClient()` (RLS-bypass).
- **Pipeline** in `pipeline.ts`: `runExtractionPipeline()` ist der einzige Einstiegspunkt. Status-Guard auf Zeile 73-79 prüft `retriableStatuses` Array. Voice-Events: erst `transcribeVoiceEvent()`, dann Extraction. Cleanup: DELETE `extracted_data` vor Insert (Zeile 153).
- **Realtime**: `useSymptomEvents` Hook subscribed auf `symptom_events` INSERT/UPDATE. Bei UPDATE mit Status-Change wird `extractedDataMap` automatisch refreshed.
- **ChatBubble**: Rein presentational, keine eigene State-Logik. Props: `onRetryExtraction`, `isExtractionFailed`, `isTranscriptionFailed`. Aktuell kein Long-Press.
- **Event-Detail**: Server Component `page.tsx` → Client Component `EventDetailView`. Hat `detail.eventStatus` und `detail.eventType` verfügbar. Aktuell keine Re-Run-Buttons.

### Files to Modify

| File | Änderung |
| ---- | ------- |
| `src/lib/ai/pipeline.ts:73-79` | `retriableStatuses` Array erweitern um `'extracted'` und `'confirmed'`. Bei `confirmed`/`extracted` Voice-Events: Transkription-Check anpassen (raw_input bereits vorhanden → nicht erneut transkribieren, ausser explizit gewünscht) |
| `src/lib/ai/rerun.ts` **(NEU)** | Shared `prepareRerun(supabase, eventId, mode)` Funktion: Status-Reset + extracted_data-Cleanup. Wird von API-Route aufgerufen (DRY) |
| `src/app/api/ai/extract/route.ts` | Erweitern um `mode`-Parameter + Session-Auth (nicht nur `INTERNAL_API_SECRET`) + Ownership-Check. Nutzt `prepareRerun()` vor Pipeline-Start |
| `src/components/capture/chat-bubble.tsx` | Neue Props: `onRetryTranscription`, `onLongPress`. Long-Press-Detection via `useLongPress` Hook. Bei Long-Press: Custom Overlay (absolut positioniert, Tailwind) mit kontextabhängigen Aktionen rendern |
| `src/hooks/use-long-press.ts` **(NEU)** | Custom Hook: `useLongPress(callback, { delay: 1500 })`. Gibt `onTouchStart`, `onTouchEnd`, `onTouchCancel`, `isPressed`, `progress` zurück. Haptisches Feedback via `navigator.vibrate(50)` |
| `src/app/(app)/page.tsx` | Neue Handler: `handleRetryTranscription(eventId)` analog zu `handleRetryExtraction`. Beide via `fetch('/api/ai/extract', { body: { symptomEventId, mode } })` |
| `src/components/event/event-detail-view.tsx` | Zwei Buttons unterhalb ExtractedDataSection: "Transkription wiederholen" (nur wenn `detail.audioUrl` vorhanden) und "Extraktion wiederholen". Rufen `/api/ai/extract` direkt auf |

### Files to Reference (Read-Only)

| File | Purpose |
| ---- | ------- |
| `src/hooks/use-symptom-events.ts` | Realtime-Hook — kein Änderungsbedarf, Status-Updates propagieren automatisch |
| `src/components/capture/chat-feed.tsx` | Durchreichung der neuen Props an ChatBubble — muss Props forwarden |
| `src/types/ai.ts` | `ExtractedData`, `ExtractionResult` Typen |
| `src/types/analytics.ts` | `EventDetail` Typ mit `eventStatus` und `eventType` |
| `src/__tests__/symptom-actions.test.ts` | Bestehende Action-Tests — Pattern für neue Tests |
| `src/__tests__/lib/ai/pipeline.test.ts` | Pipeline-Tests — Pattern für Status-Guard-Erweiterung |
| `src/__tests__/chat-bubble.test.tsx` | ChatBubble-Tests — Pattern für Long-Press-Tests |
| `src/__tests__/api/ai/extract.test.ts` | API-Route-Tests — Pattern für mode-Parameter |

### Technical Decisions

- **Long-Press-Dauer: 1.5s** mit haptischem Feedback (`navigator.vibrate(50)`) und visuellem Progress-Ring (CSS `conic-gradient` Animation um die Bubble). Kein bestehendes Long-Press-Pattern im Projekt → neuer `useLongPress` Hook.
- **Custom Overlay statt Radix DropdownMenu**: Kein neues Package nötig. Absolut positioniertes Div mit Tailwind, gesteuert durch `useLongPress`-State. Einfacher zu implementieren, zu testen und programmatisch zu steuern als Radix DropdownMenu.
- **Clean Slate**: Bei Re-Run werden alle `extracted_data` gelöscht. Pipeline macht das bereits (Zeile 153 in `pipeline.ts`). Kein Merge-Mechanismus nötig.
- **Transkription Re-Run bei Voice**: Setzt `raw_input` auf `''` und `status` auf `'pending'`. Pipeline erkennt leeres `raw_input` bei Voice-Event und transkribiert erneut (Zeile 90: `if (event.event_type === 'voice' && !event.raw_input?.trim())`).
- **Extraktion Re-Run**: Setzt `status` auf `'transcribed'`. Pipeline überspringt Transkription (raw_input bereits vorhanden) und führt nur Extraction aus.
- **Pipeline-Guard** (Zeile 73): `retriableStatuses` erweitern um `'extracted'` und `'confirmed'`. Kein weiterer Pipeline-Umbau nötig — die bestehende Logik funktioniert, sobald der Guard erweitert ist.
- **Shared `prepareRerun()` Funktion**: Kapselt Status-Reset + extracted_data-Cleanup in `src/lib/ai/rerun.ts`. Wird von API-Route aufgerufen. Vermeidet Duplikation (DRY).
- **Keine Server Actions für Re-Run**: Beide Oberflächen (Capture + Detail) nutzen die API-Route via `fetch()`. Ein einziger Endpunkt, ein Code-Pfad.
- **API-Route Session-Auth**: Route akzeptiert sowohl `INTERNAL_API_SECRET` (bestehender Fehler-Retry) als auch User-Session via Cookie (neuer manueller Re-Run). Bei Session-Auth: Ownership-Check auf `symptom_events.account_id`.
- **API-Route erweitern**: Neuer `mode`-Parameter (`'transcribe'` | `'extract'`). `'transcribe'` setzt zusätzlich `raw_input: ''` vor Pipeline-Start. Default bleibt `'extract'` für Rückwärtskompatibilität.
- **Event-Detail-Seite**: `EventDetailView` hat bereits `detail.eventStatus` und `detail.audioUrl` — daraus lässt sich ableiten ob "Transkription wiederholen" angezeigt werden soll (nur wenn `audioUrl` vorhanden, also Voice-Event).

## Implementation Plan

### Tasks

#### Task 1: Pipeline Status-Guard erweitern
- [ ] **Datei:** `src/lib/ai/pipeline.ts`
- **Aktion:** `retriableStatuses` Array (Zeile 73) erweitern:
  ```typescript
  const retriableStatuses = [
    'pending',
    'transcribed',
    'extraction_failed',
    'transcription_failed',
    'extracted',    // NEU: Re-Run nach erfolgreicher Extraktion
    'confirmed',    // NEU: Re-Run nach Bestätigung
  ]
  ```
- **Notes:** Kein weiterer Pipeline-Umbau nötig. Die Voice-Transkription wird nur ausgeführt wenn `event.event_type === 'voice' && !event.raw_input?.trim()` (Zeile 90). Bei Re-Extraction ist `raw_input` bereits gefüllt → Transkription wird automatisch übersprungen. Bei Re-Transcription wird `raw_input` vorher geleert (siehe Task 3).

#### Task 2: Shared `prepareRerun()` Funktion
- [ ] **Datei:** `src/lib/ai/rerun.ts` **(NEU)**
- **Aktion:** Neue Funktion erstellen:
  ```typescript
  type RerunMode = 'extract' | 'transcribe'

  async function prepareRerun(
    supabase: SupabaseClient<Database>,
    eventId: string,
    mode: RerunMode,
  ): Promise<void>
  ```
  Logik:
  1. Event laden und validieren (existiert, nicht `pending`)
  2. Wenn `mode === 'transcribe'`: Prüfen dass `event_type === 'voice'` und `audio_url IS NOT NULL`
  3. `extracted_data` löschen: `DELETE FROM extracted_data WHERE symptom_event_id = eventId`
  4. Status-Update:
     - `'transcribe'`: `{ status: 'pending', raw_input: '' }`
     - `'extract'`: `{ status: 'transcribed' }`
- **Notes:** Wird von API-Route aufgerufen. Kapselt die gesamte Vorbereitungslogik (DRY). Wirft Fehler bei ungültigem Mode oder Event-Zustand.

#### Task 3: API-Route erweitern um `mode`-Parameter + Session-Auth
- [ ] **Datei:** `src/app/api/ai/extract/route.ts` + `src/types/ai.ts`
- **Aktion:**
  1. `extractRequestSchema` in `src/types/ai.ts` erweitern: `mode: z.enum(['extract', 'transcribe']).optional().default('extract')`
  2. Auth-Logik erweitern — zwei Pfade:
     - **Pfad A (bestehend):** `INTERNAL_API_SECRET` Header → Service Client (RLS-bypass, kein Ownership-Check)
     - **Pfad B (neu):** Kein Secret → Session-Auth via `createServerClient()` + `getUser()` → Ownership-Check (`symptom_events.account_id === user.id`)
  3. Vor `runExtractionPipeline()`: `prepareRerun(supabase, eventId, mode)` aufrufen
  4. Dann `runExtractionPipeline()` wie bisher
- **Notes:** Default `'extract'` für Rückwärtskompatibilität. Pfad A bleibt für bestehenden Fehler-Retry (wird intern via `after()` getriggert). Pfad B ist für den neuen User-initiierten Re-Run.

#### Task 4: useLongPress Hook erstellen
- [ ] **Datei:** `src/hooks/use-long-press.ts` **(NEU)**
- **Aktion:** Custom Hook implementieren:
  ```typescript
  interface UseLongPressOptions {
    delay?: number        // Default: 1500ms
    onStart?: () => void  // Callback bei Touch-Start
    onCancel?: () => void // Callback bei Abbruch
  }

  interface UseLongPressResult {
    handlers: {
      onTouchStart: (e: React.TouchEvent) => void
      onTouchEnd: () => void
      onTouchCancel: () => void
      onContextMenu: (e: React.SyntheticEvent) => void  // Prevent native context menu
    }
    isPressed: boolean    // Für visuellen Feedback
    progress: number      // 0-1, für Progress-Ring Animation
  }

  function useLongPress(onLongPress: () => void, options?: UseLongPressOptions): UseLongPressResult
  ```
  - Nutzt `useRef` für Timer und `useState` für `isPressed`/`progress`
  - `requestAnimationFrame`-Loop für smooth Progress-Updates
  - `navigator.vibrate(50)` bei Erreichen des Thresholds (mit Feature-Detection)
  - Cleanup: Timer + rAF bei Unmount, TouchEnd, TouchCancel
  - `onContextMenu: (e) => e.preventDefault()` um natives Kontextmenü zu unterdrücken
- **Notes:** Kein Mouse-Support nötig — App ist Mobile-PWA. Touch-Events reichen.

#### Task 5: ChatBubble um Long-Press und Overlay-Menu erweitern
- [ ] **Datei:** `src/components/capture/chat-bubble.tsx`
- **Aktion:**
  1. Neue Props im `ChatBubbleProps` Interface:
     ```typescript
     onRetryTranscription?: () => void
     isVoiceEvent?: boolean  // Steuert ob "Transkription wiederholen" im Menu erscheint
     showRerunMenu?: boolean // Steuert ob Long-Press aktiviert ist (nur bei extracted/confirmed)
     ```
  2. `useLongPress` Hook integrieren — Trigger setzt `menuOpen` State auf `true`
  3. Progress-Ring als `<div>` mit `conic-gradient` um die Bubble rendern wenn `isPressed`
  4. Custom Overlay-Menu (absolut positioniert, Tailwind):
     ```tsx
     {menuOpen && (
       <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-10 rounded-xl bg-popover border border-border shadow-lg p-1 flex flex-col gap-0.5">
         <button ...>Extraktion wiederholen</button>
         {isVoiceEvent && <button ...>Transkription wiederholen</button>}
       </div>
     )}
     ```
  5. Click-Away-Handler: `menuOpen` auf `false` bei Tap ausserhalb
  6. `e.stopPropagation()` in Menu-Items um Navigation zu verhindern
- **Notes:** Bestehender Click-to-Navigate bleibt erhalten. Long-Press und Click sind separate Gesten. Kein Radix-Package nötig.

#### Task 6: ChatFeed Props durchreichen
- [ ] **Datei:** `src/components/capture/chat-feed.tsx`
- **Aktion:** Neue Props `onRetryTranscription` und relevante Event-Informationen (`isVoiceEvent`, `showRerunMenu`) an `ChatBubble` durchreichen. `showRerunMenu` ist `true` wenn `eventStatus === 'extracted' || eventStatus === 'confirmed'`.
- **Notes:** ChatFeed ist die Brücke zwischen CapturePage und ChatBubble.

#### Task 7: CapturePage Handler hinzufügen
- [ ] **Datei:** `src/app/(app)/page.tsx`
- **Aktion:**
  1. Bestehende `handleRetryExtraction` anpassen: `mode: 'extract'` im Body mitsenden
  2. Neue Funktion `handleRetryTranscription(eventId: string)`:
     ```typescript
     const handleRetryTranscription = async (eventId: string) => {
       try {
         const response = await fetch('/api/ai/extract', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ symptomEventId: eventId, mode: 'transcribe' }),
         })
         if (!response.ok) {
           console.error('[Retry] Transcription failed:', response.status)
         }
       } catch (err) {
         console.error('[Retry] Network error:', err)
       }
     }
     ```
  3. Beide Handler an `ChatFeed` weitergeben

#### Task 8: Event-Detail-View Buttons hinzufügen
- [ ] **Datei:** `src/components/event/event-detail-view.tsx`
- **Aktion:**
  1. Neuen State `isRetrying` für Loading-Indikator
  2. Zwei Buttons unterhalb `<ExtractedDataSection>`, oberhalb des Foto-Bereichs:
     - "Extraktion wiederholen" — immer sichtbar wenn `detail.eventStatus` nicht `'pending'` oder `'transcribed'`
     - "Transkription wiederholen" — nur sichtbar wenn `detail.audioUrl` vorhanden
  3. Beide Buttons rufen `/api/ai/extract` via `fetch()` auf (mit `mode` Parameter)
  4. Buttons nutzen bestehendes Styling-Pattern: `rounded-xl border border-border px-6 text-sm font-medium` (analog "Bearbeiten"-Link)
  5. Disabled-State während Retry + Spinner/Loading-Text
  6. Nach erfolgreichem Retry: `router.refresh()` für Server Component Re-Fetch
- **Notes:** Beide Oberflächen (Capture + Detail) nutzen `fetch('/api/ai/extract')` — ein einziger Endpunkt, konsistentes Pattern.

#### Task 9: Tests

- [ ] **9a: Pipeline-Tests erweitern**
  - **Datei:** `src/__tests__/lib/ai/pipeline.test.ts`
  - Neue Testfälle:
    - `'should process event with status extracted'`
    - `'should process event with status confirmed'`
    - `'should skip transcription for extracted voice event with existing raw_input'`

- [ ] **9b: prepareRerun-Tests**
  - **Datei:** `src/__tests__/lib/ai/rerun.test.ts` **(NEU)**
  - Testfälle:
    - `'should delete extracted_data and set status to transcribed for mode=extract'`
    - `'should delete extracted_data, clear raw_input and set status to pending for mode=transcribe'`
    - `'should reject mode=transcribe for non-voice events'`
    - `'should reject mode=transcribe for events without audio_url'`

- [ ] **9c: API-Route-Tests erweitern**
  - **Datei:** `src/__tests__/api/ai/extract.test.ts`
  - Neue Testfälle:
    - `'should accept mode=extract (default)'`
    - `'should accept mode=transcribe'`
    - `'should reject invalid mode value'`
    - `'should authenticate via session when no INTERNAL_API_SECRET header'`
    - `'should reject unauthenticated session requests'`
    - `'should reject session request for event owned by another user'`

- [ ] **9d: useLongPress Hook-Tests**
  - **Datei:** `src/__tests__/hooks/use-long-press.test.ts` **(NEU)**
  - Testfälle:
    - Callback wird nach 1500ms aufgerufen
    - Callback wird NICHT aufgerufen wenn Touch vor 1500ms endet
    - `isPressed` ist `true` während Touch, `false` danach
    - Cleanup bei Unmount (kein Memory Leak)

- [ ] **9e: ChatBubble-Tests erweitern**
  - **Datei:** `src/__tests__/chat-bubble.test.tsx`
  - Neue Testfälle:
    - Overlay-Menu wird nicht gerendert wenn `showRerunMenu=false`
    - Overlay enthält "Extraktion wiederholen" bei allen Events
    - Overlay enthält "Transkription wiederholen" nur bei Voice-Events

- [ ] **9f: EventDetailView-Tests erweitern**
  - **Datei:** `src/__tests__/components/event/event-detail-view.test.tsx`
  - Neue Testfälle:
    - "Extraktion wiederholen" Button ist sichtbar bei `eventStatus: 'confirmed'`
    - "Transkription wiederholen" Button nur bei Events mit `audioUrl`
    - Button-Click triggert fetch() mit korrektem mode-Parameter

### Acceptance Criteria

- [ ] **AC1:** Given ein Voice-Event mit Status `confirmed`, when der User auf der Capture-Seite 1.5s Long-Press auf die ChatBubble ausführt, then erscheint ein DropdownMenu mit "Transkription wiederholen" und "Extraktion wiederholen"
- [ ] **AC2:** Given ein Text-Event mit Status `extracted`, when der User Long-Press ausführt, then erscheint nur "Extraktion wiederholen" (kein Transkription-Button)
- [ ] **AC3:** Given ein Event mit Status `pending`, when der User Long-Press ausführt, then passiert nichts (kein DropdownMenu)
- [ ] **AC4:** Given der User wählt "Transkription wiederholen" auf einem Voice-Event, when die Aktion ausgeführt wird, then wird `raw_input` geleert, Status auf `pending` gesetzt, `extracted_data` gelöscht, und die komplette Pipeline (Transkription + Extraktion) läuft neu
- [ ] **AC5:** Given der User wählt "Extraktion wiederholen", when die Aktion ausgeführt wird, then wird Status auf `transcribed` gesetzt, `extracted_data` gelöscht, und nur die Extraktion läuft neu (Transkription bleibt erhalten)
- [ ] **AC6:** Given die Pipeline läuft nach Re-Run, when der Status sich ändert, then zeigt die UI den Fortschritt in Echtzeit (Processing-Dots → extrahierte Daten → Review-Ansicht)
- [ ] **AC7:** Given neue `extracted_data` werden nach Re-Run generiert, when der User die Bubble sieht, then sind alle Felder unbestätigt (`confirmed: false`) und müssen erneut bestätigt werden
- [ ] **AC8:** Given ein Event mit Status `confirmed` auf der Event-Detail-Seite, when der User die Seite öffnet, then sind zwei Buttons sichtbar: "Extraktion wiederholen" und (bei Voice) "Transkription wiederholen"
- [ ] **AC9:** Given die Event-Metadaten, when ein Re-Run ausgeführt wird, then bleiben `ended_at` und `event_type` erhalten. `occurred_at` wird durch die Pipeline basierend auf dem neu extrahierten `symptom_time` aktualisiert (gewolltes Verhalten)
- [ ] **AC10:** Given ein Long-Press auf der ChatBubble, when der User den Finger vor 1.5s loslässt, then wird kein DropdownMenu geöffnet und keine Aktion ausgelöst
- [ ] **AC11:** Given ein Long-Press läuft, when die 1.5s erreicht werden, then gibt es haptisches Feedback (Vibration) und ein visueller Progress-Ring zeigt den Fortschritt
- [ ] **AC12:** Given die Pipeline schlägt bei einem Re-Run fehl, when der Fehler auftritt, then landet das Event im Status `extraction_failed` oder `transcription_failed` — der bestehende Fehler-Retry bleibt funktional

## Additional Context

### Dependencies

- Bestehende AI-Pipeline (Whisper + Claude) bleibt unverändert
- Supabase Realtime für Status-Updates — propagiert automatisch
- Bestehende RLS-Policies schützen Events bereits
- **Keine neuen Dependencies** — Custom Overlay mit Tailwind statt Radix DropdownMenu

### Testing Strategy

- **Pipeline-Tests**: Neue Testfälle für `extracted` → Re-Run und `confirmed` → Re-Run
- **prepareRerun-Tests**: Status-Reset, extracted_data-Cleanup, Voice-Validierung
- **API-Route-Tests**: `mode`-Parameter, Session-Auth + Ownership, Rückwärtskompatibilität
- **ChatBubble-Tests**: Long-Press Rendering (Overlay-Menu erscheint), kontextabhängige Aktionen (Voice vs. Text)
- **useLongPress Hook-Test**: Timer-Logik, Cleanup bei Cancel, Progress-Berechnung
- **EventDetailView-Tests**: Buttons sichtbar, korrekte Handler-Aufrufe, Voice-Button nur bei audioUrl

### Notes

- GitHub Issue: #48
- Branch: `feature/48-manual-extraction-rerun`
- **Risiko**: Long-Press-Geste könnte mit bestehender Click-to-Navigate-Logik auf ChatBubble kollidieren. Lösung: `useLongPress` unterscheidet zwischen Tap (< 300ms → Navigate) und Long-Press (> 1500ms → Menu). Bereich dazwischen (300ms-1500ms) → keine Aktion.
- **Hinweis zu occurred_at**: Pipeline-Schritt 9 setzt `occurred_at` basierend auf dem extrahierten `symptom_time`. Bei Re-Extraction wird `occurred_at` daher potentiell mit einem neuen Wert überschrieben. Das ist gewollt — der neue extrahierte Zeitpunkt ist aktueller.
- **Rückwärtskompatibilität**: Der bestehende Fehler-Retry-Button in ChatBubble bleibt unverändert. Er nutzt denselben `/api/ai/extract`-Endpunkt, aber ohne `mode`-Parameter (Default: `'extract'`).
