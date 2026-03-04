# Story 3.3: Foto-Upload zu Symptom-Events

Status: done

## Story

As a Patient,
I want ein oder mehrere Fotos zu einem Symptom-Event anhängen,
So that visuelle Informationen (z.B. Hautausschlag, Schwellung) dokumentiert werden (FR3).

## Acceptance Criteria

1. **Given** ein authentifizierter Patient im Erfassungs-Tab **When** der Patient das Foto-Icon in der InputBar antippt **Then** kann der Patient ein Foto aufnehmen (Kamera) oder aus der Galerie wählen
2. **And** mehrere Fotos können zu einem Event hinzugefügt werden (vor dem Absenden)
3. **And** Fotos werden in Supabase Storage (Private Bucket `photos`) hochgeladen
4. **And** Fotos werden persistent gespeichert und sind dem jeweiligen Event zugeordnet (via `event_photos`-Tabelle)
5. **And** Fotos sind nur per Signed URL zugänglich (kein direkter Download, NFR10)
6. **And** eine Vorschau der angehängten Fotos wird im ChatFeed angezeigt
7. **And** Fotos können vor dem Absenden entfernt werden

## Tasks / Subtasks

- [x] Task 1: DB-Migration für event_photos (AC: #4)
  - [x] `supabase/migrations/00009_event_photos.sql` erstellen
  - [x] `event_photos`-Tabelle: `id UUID PK DEFAULT gen_random_uuid()`, `symptom_event_id UUID NOT NULL REFERENCES symptom_events(id) ON DELETE CASCADE`, `storage_path TEXT NOT NULL`, `created_at TIMESTAMPTZ DEFAULT now()`
  - [x] RLS-Policy: Patient sieht nur eigene Fotos (`auth.uid() = (SELECT account_id FROM symptom_events WHERE id = symptom_event_id)`)
  - [x] Index auf `symptom_event_id` für schnelle Abfragen
  - [x] Supabase Storage `photos` Bucket erstellen (private, 10MB Limit pro Datei)
  - [x] Storage-Policy: Nur authentifizierte User, Pfad `{account_id}/{event_id}/*`
  - [x] TypeScript-Typen aktualisieren (`src/types/database.ts` nach `supabase gen types`)
- [x] Task 2: Photo-Upload-Service (AC: #3, #5)
  - [x] `src/lib/db/media.ts` erweitern (bereits aus Story 3.1 vorhanden)
  - [x] `uploadPhoto(accountId: string, eventId: string, blob: Blob, fileName: string): Promise<string>` — gibt `storage_path` zurück
  - [x] Upload-Pfad: `{account_id}/{event_id}/{timestamp}-{fileName}`
  - [x] `getSignedPhotoUrl(storagePath: string, expiresIn = 900): Promise<string>` — 15min TTL
  - [x] Komprimierung: Client-seitig vor Upload (max 1920px Breite, JPEG 80% Qualität)
  - [x] MIME-Type Validierung: nur `image/jpeg`, `image/png`, `image/webp`, `image/heic`
- [x] Task 3: Photo-Picker-Komponente (AC: #1, #2, #7)
  - [x] `src/components/capture/photo-picker.tsx` erstellen (Client Component)
  - [x] `<input type="file" accept="image/*" capture="environment" multiple>` — Kamera oder Galerie
  - [x] Foto-Vorschau-Leiste: Thumbnails (64x64) mit X-Button zum Entfernen
  - [x] Max 5 Fotos pro Event (UX-Limit, kein technisches Limit)
  - [x] State: `pendingPhotos: File[]` — lokale Fotos vor Upload
  - [x] Komprimierungsfunktion: `compressImage(file: File, maxWidth: number, quality: number): Promise<Blob>`
  - [x] Komprimierung via Canvas API (client-seitig, kein externer Lib)
  - [x] **Testbarkeit:** `compressImage` als injectable Dependency designen (optional als Parameter übergeben), damit in Unit-Tests ein Identity-Mock genutzt werden kann. Canvas API existiert nicht in jsdom/Vitest — nur in E2E testbar.
  - [x] `aria-label="Fotos hinzufügen"`, Thumbnail-Grid mit `role="list"`
- [x] Task 4: InputBar-Integration (AC: #1, #2)
  - [x] `src/components/capture/input-bar.tsx` erweitern
  - [x] Kamera-Button (links neben Textfeld) aktiviert PhotoPicker
  - [x] Foto-Vorschau-Leiste erscheint über der InputBar wenn Fotos ausgewählt
  - [x] Senden-Button: Text + Fotos zusammen als Event absenden
  - [x] Auch Fotos-only Events möglich (ohne Text) — `raw_input` bleibt leer oder generisch "Foto-Dokumentation"
  - [x] Nach Absenden: Vorschau-Leiste leeren
- [x] Task 5: Photo-Upload Server Action (AC: #3, #4)
  - [x] `src/lib/actions/symptom-actions.ts` — `addPhotosToEvent` Action hinzufügen
  - [x] Input: `FormData` mit `eventId` + `photos[]` (Blob-Array)
  - [x] Zod-Validierung: eventId UUID, mindestens 1 Foto
  - [x] Auth-Check + Ownership-Check (Event gehört User)
  - [x] Für jedes Foto: `uploadPhoto()` → `event_photos` Insert
  - [x] Alternativ: Photos werden direkt beim `createSymptomEvent` mit hochgeladen (FormData-Pattern)
  - [x] `revalidatePath('/')` nach Upload
- [x] Task 6: ChatBubble Foto-Anzeige (AC: #6)
  - [x] `src/components/capture/chat-bubble.tsx` erweitern
  - [x] Foto-Thumbnails in der Bubble anzeigen (wenn `event_photos` vorhanden)
  - [x] Thumbnail-Grid: max 3 sichtbar, "+X" Badge für weitere
  - [x] Tap auf Thumbnail: Vollbild-Ansicht (Modal/Overlay, kein Download)
  - [x] Signed URLs on-demand laden (nicht pre-fetchen)
  - [x] Loading-Skeleton während Signed URL geladen wird
- [x] Task 7: useSymptomEvents Hook erweitern (AC: #6)
  - [x] `src/hooks/use-symptom-events.ts` erweitern
  - [x] `event_photos` in die Event-Query einbeziehen (Join oder separate Abfrage)
  - [x] `EventPhoto` Typ in `types/symptom.ts` exportieren
  - [x] Photos pro Event als `photos: EventPhoto[]` im State verfügbar
- [x] Task 8: Tests (AC: #1-#7)
  - [x] `src/__tests__/components/photo-picker.test.tsx` — File-Input, Vorschau, Entfernen, Max-Limit. **Hinweis:** `compressImage` muss gemockt werden (Canvas API nicht in jsdom verfügbar). PhotoPicker sollte `compressImage` als injizierbare Dependency akzeptieren oder via vi.mock() gemockt werden.
  - [x] `src/__tests__/input-bar.test.tsx` — Erweitert: Kamera-Button, Foto-Vorschau-Integration
  - [x] `src/__tests__/chat-bubble.test.tsx` — Erweitert: Foto-Thumbnails, Tap-Verhalten
  - [x] `src/__tests__/lib/media.test.ts` — Erweitert: uploadPhoto, getSignedPhotoUrl, MIME-Validierung
  - [x] `src/__tests__/symptom-actions.test.ts` — Erweitert: addPhotosToEvent
  - [x] Bestehende Tests dürfen NICHT brechen
  - [x] `npm run test` verifizieren
- [x] Task 9: Build-Verifikation
  - [x] `npm run lint` fehlerfrei
  - [x] `npm run build` — vorbestehender TS-Fehler in use-push-notifications.ts (Story 3.4, nicht von 3.3)

## Dev Notes

### Scope-Abgrenzung (KRITISCH)

Diese Story implementiert:
- Foto-Auswahl (Kamera/Galerie) via HTML `<input type="file">`
- Client-seitige Komprimierung (Canvas API)
- Upload zu Supabase Storage (Private Bucket)
- `event_photos`-Tabelle mit RLS
- Foto-Vorschau in InputBar (vor Absenden) und ChatBubble (nach Absenden)
- Signed URLs für Foto-Zugriff (NFR10)

Gehört NICHT in diese Story:
- **Fotos nachträglich zu bestehendem Event hinzufügen** → Post-MVP. MVP unterstützt nur gleichzeitiges Senden (Text + Fotos zusammen). Die DB-Struktur (`event_photos` mit `symptom_event_id`) erlaubt nachträgliches Anhängen — aber der UX-Flow dafür (z.B. Tap auf bestehende Bubble → "Foto hinzufügen") ist nicht in Scope.
- **Foto-Bearbeitung (Crop, Rotate)** → Post-MVP
- **KI-Analyse von Fotos (Computer Vision)** → Post-MVP
- **Foto-Download** → Explizit NICHT (NFR10: nur Stream/Ansicht)
- **Foto-Annotation** → Post-MVP
- **Video-Upload** → Nicht geplant
- **Offline-Foto-Queue** → Post-MVP

### Abhängigkeiten

- **Story 3.1**: Liefert `src/lib/db/media.ts` mit `uploadAudio()` und `getSignedAudioUrl()` — erweitern für Fotos
- **Story 2.1**: InputBar mit Kamera-Button (bereits Placeholder)

### Komprimierungs-Pattern (Client-seitig)

```typescript
async function compressImage(file: File, maxWidth = 1920, quality = 0.8): Promise<Blob> {
  const img = new Image()
  img.src = URL.createObjectURL(file)
  await new Promise(resolve => { img.onload = resolve })

  const canvas = document.createElement('canvas')
  const scale = Math.min(1, maxWidth / img.width)
  canvas.width = img.width * scale
  canvas.height = img.height * scale

  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  URL.revokeObjectURL(img.src)

  return new Promise(resolve => canvas.toBlob(resolve!, 'image/jpeg', quality))
}
```

**Wichtig iOS HEIC-Handling:** iOS konvertiert HEIC-Fotos automatisch zu JPEG wenn sie über `<input type="file" accept="image/*">` ausgewählt werden — die Konvertierung passiert VOR dem `File`-Objekt im JavaScript. Die Canvas-Komprimierung erhält also bereits ein JPEG. HEIC muss NICHT manuell konvertiert werden.

### HTML File Input Pattern (PWA-kompatibel)

```html
<!-- Kamera + Galerie (iOS zeigt Auswahl-Dialog) -->
<input type="file" accept="image/*" capture="environment" multiple />

<!-- Nur Galerie (kein Kamera-Trigger) -->
<input type="file" accept="image/*" multiple />
```

- `capture="environment"`: Rückkamera bevorzugen (Foto von Symptom)
- `multiple`: Mehrfach-Auswahl in Galerie
- iOS PWA: Funktioniert seit iOS 13.4

### Storage-Pfad-Schema

```
photos/{account_id}/{event_id}/{timestamp}-{original_filename}
```

Beispiel: `photos/abc-123/evt-456/1709510400-IMG_1234.jpg`

### Signed URL Handling

```typescript
// Signed URL on-demand generieren (15min TTL)
const signedUrl = await getSignedPhotoUrl(storagePath, 900)

// Client-seitig: URL nicht cachen, bei Ablauf neu laden
// <img src={signedUrl} /> — Browser cacht automatisch für TTL-Dauer
```

### ChatBubble Foto-Grid UX

```
┌────────────────────────────────┐
│ "Hämatom am linken Unterarm"   │
│                                │
│ ┌──────┐ ┌──────┐ ┌──────┐   │
│ │ 📷 1 │ │ 📷 2 │ │ +1   │   │
│ └──────┘ └──────┘ └──────┘   │
│                       14:32    │
└────────────────────────────────┘
```

- Max 3 Thumbnails sichtbar, danach "+X" Counter
- Tap → Vollbild-Overlay (keine Routing-Navigation)
- `rounded-lg` Thumbnails, `shadow-sm`

### Anti-Patterns (VERMEIDEN)

- **NICHT** Fotos base64-encodiert in DB speichern — immer Supabase Storage
- **NICHT** Fotos im Client komprimieren mit externer Library — Canvas API reicht
- **NICHT** Fotos pre-fetchen (alle Signed URLs auf einmal laden) — on-demand für sichtbare Fotos
- **NICHT** Download-Link anbieten — nur `<img>` Tag mit Signed URL (NFR10)
- **NICHT** Content-Disposition: attachment — immer `inline`
- **NICHT** Original-Dateigrösse hochladen — immer client-seitig komprimieren

### Neue Dateien

- `src/components/capture/photo-picker.tsx`
- `src/__tests__/components/photo-picker.test.tsx`
- `supabase/migrations/00009_event_photos.sql`

### Modifizierte Dateien

- `src/lib/db/media.ts` — `uploadPhoto()`, `getSignedPhotoUrl()` hinzufügen
- `src/components/capture/input-bar.tsx` — PhotoPicker Integration, Foto-Vorschau
- `src/components/capture/chat-bubble.tsx` — Foto-Thumbnail-Grid
- `src/hooks/use-symptom-events.ts` — event_photos laden
- `src/lib/actions/symptom-actions.ts` — `addPhotosToEvent` Action
- `src/types/symptom.ts` — `EventPhoto` Typ, `addPhotosToEventSchema`
- `src/types/database.ts` — Regeneriert nach Migration

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 3, Story 3.3]
- [Source: _bmad-output/planning-artifacts/prd.md — FR3, NFR10, NFR13, NFR24]
- [Source: _bmad-output/planning-artifacts/architecture.md — Supabase Storage, Signed URLs, Media Security D8]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — InputBar, ChatBubble, Foto-Upload Progress]
- [Source: _bmad-output/implementation-artifacts/3-1-hold-to-record.md — media.ts Pattern, Storage Bucket Setup]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- ChatFeed hatte zunächst `createBrowserClient` direkt importiert → Tests brachen wegen fehlender Supabase-Env-Vars. Fix: `getSignedPhotoUrl` als Prop vom CapturePage durchreichen.
- InputBar-Test erwartete disabled Kamera-Button → Test angepasst (Button jetzt aktiv durch PhotoPicker).
- example.test.tsx fehlte Mocks für neue Dependencies → Mocks für `createBrowserClient`, `getSignedPhotoUrl`, alle Action-Imports hinzugefügt.
- Import-Reihenfolge Lint-Fehler in page.tsx und symptom-actions.ts → Imports alphabetisch sortiert.

### Completion Notes List

- 303 Tests bestanden, 0 fehlgeschlagen (36 Test-Dateien)
- Lint fehlerfrei (nur vorbestehende Warnings)
- Build: Vorbestehender TS-Fehler in `use-push-notifications.ts` (Story 3.4) — nicht von Story 3.3 verursacht
- `compressImage` als injectable Dependency implementiert für Testbarkeit (Canvas API nicht in jsdom verfügbar)
- Signed URLs werden on-demand pro Thumbnail geladen (nicht pre-fetched) — NFR10 konform
- Foto-only Events verwenden `raw_input: "Foto-Dokumentation"` als Fallback

### File List

Neue Dateien:
- `supabase/migrations/00009_event_photos.sql`
- `src/components/capture/photo-picker.tsx`
- `src/__tests__/components/photo-picker.test.tsx`

Modifizierte Dateien:
- `src/types/database.ts` — `event_photos` Tabellen-Typen hinzugefügt
- `src/types/symptom.ts` — `EventPhoto` Typ, `addPhotosToEventSchema` Schema
- `src/lib/db/media.ts` — `uploadPhoto()`, `getSignedPhotoUrl()`, Image-MIME-Handling
- `src/components/capture/input-bar.tsx` — PhotoPicker-Integration, `onSendPhotos` Prop
- `src/components/capture/chat-bubble.tsx` — PhotoThumbnail, PhotoGrid, Fullscreen-Overlay
- `src/components/capture/chat-feed.tsx` — `photosMap`, `getSignedPhotoUrl` Props durchreichen
- `src/hooks/use-symptom-events.ts` — `photosMap` State, `loadPhotos()`, Realtime-Updates
- `src/lib/actions/symptom-actions.ts` — `addPhotosToEvent` Server Action
- `src/app/(app)/page.tsx` — Photo-Handler, `getSignedPhotoUrl` Callback, Props Wiring
- `src/__tests__/input-bar.test.tsx` — Kamera-Button-Test aktualisiert
- `src/__tests__/chat-bubble.test.tsx` — 4 neue Foto-Tests
- `src/__tests__/lib/media.test.ts` — `uploadPhoto`, `getSignedPhotoUrl` Tests
- `src/__tests__/symptom-actions.test.ts` — `addPhotosToEvent` Tests
- `src/__tests__/example.test.tsx` — Fehlende Mocks hinzugefügt

## Change Log

- 2026-03-03: Story 3.3 erstellt — Foto-Upload mit Kamera/Galerie, Client-Komprimierung, Supabase Storage, event_photos Tabelle, ChatBubble Integration
- 2026-03-03: Party-Mode Review — 4 Findings eingearbeitet: (1) Canvas-Testbarkeit-Guidance mit Injectable Dependency, (2) Scope-Entscheidung: nachträgliches Foto-Anhängen explizit Out-of-Scope, (3) HEIC→JPEG Auto-Konvertierung klargestellt, (4) AC #4 von Implementierungsdetail zu User-Kriterium umformuliert
- 2026-03-03: Implementierung abgeschlossen — Alle 9 Tasks umgesetzt (DB-Migration, Photo-Service, PhotoPicker, InputBar, Server Action, ChatBubble, Hook, Tests, Build-Verifikation). 303 Tests bestanden. Status → review
- 2026-03-04: Code Review (Adversarial) — 6 Fixes angewandt: (H1) refreshPhotos nach Upload in page.tsx, (M1) URL.createObjectURL Memory-Leak in PhotoPicker behoben, (M2) Side-Effect in PhotoThumbnail → useEffect, (M3) isPhoto Dead-Code behoben + Camera-Icon für Photo-Events mit Text, (M4) Happy-Path-Test für addPhotosToEvent hinzugefügt, (M5) Fullscreen-Overlay ESC-Key + aria-modal + stopPropagation. 364 Tests bestanden. Status → done
