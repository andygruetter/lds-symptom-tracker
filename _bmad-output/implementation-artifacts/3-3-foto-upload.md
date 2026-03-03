# Story 3.3: Foto-Upload zu Symptom-Events

Status: ready-for-dev

## Story

As a Patient,
I want ein oder mehrere Fotos zu einem Symptom-Event anhängen,
So that visuelle Informationen (z.B. Hautausschlag, Schwellung) dokumentiert werden (FR3).

## Acceptance Criteria

1. **Given** ein authentifizierter Patient im Erfassungs-Tab **When** der Patient das Foto-Icon in der InputBar antippt **Then** kann der Patient ein Foto aufnehmen (Kamera) oder aus der Galerie wählen
2. **And** mehrere Fotos können zu einem Event hinzugefügt werden (vor dem Absenden)
3. **And** Fotos werden in Supabase Storage (Private Bucket `photos`) hochgeladen
4. **And** die `event_photos`-Tabelle wird erstellt mit `id`, `symptom_event_id`, `storage_path`, `created_at`
5. **And** Fotos sind nur per Signed URL zugänglich (kein direkter Download, NFR10)
6. **And** eine Vorschau der angehängten Fotos wird im ChatFeed angezeigt
7. **And** Fotos können vor dem Absenden entfernt werden

## Tasks / Subtasks

- [ ] Task 1: DB-Migration für event_photos (AC: #4)
  - [ ] `supabase/migrations/00009_event_photos.sql` erstellen
  - [ ] `event_photos`-Tabelle: `id UUID PK DEFAULT gen_random_uuid()`, `symptom_event_id UUID NOT NULL REFERENCES symptom_events(id) ON DELETE CASCADE`, `storage_path TEXT NOT NULL`, `created_at TIMESTAMPTZ DEFAULT now()`
  - [ ] RLS-Policy: Patient sieht nur eigene Fotos (`auth.uid() = (SELECT account_id FROM symptom_events WHERE id = symptom_event_id)`)
  - [ ] Index auf `symptom_event_id` für schnelle Abfragen
  - [ ] Supabase Storage `photos` Bucket erstellen (private, 10MB Limit pro Datei)
  - [ ] Storage-Policy: Nur authentifizierte User, Pfad `{account_id}/{event_id}/*`
  - [ ] TypeScript-Typen aktualisieren (`src/types/database.ts` nach `supabase gen types`)
- [ ] Task 2: Photo-Upload-Service (AC: #3, #5)
  - [ ] `src/lib/db/media.ts` erweitern (bereits aus Story 3.1 vorhanden)
  - [ ] `uploadPhoto(accountId: string, eventId: string, blob: Blob, fileName: string): Promise<string>` — gibt `storage_path` zurück
  - [ ] Upload-Pfad: `{account_id}/{event_id}/{timestamp}-{fileName}`
  - [ ] `getSignedPhotoUrl(storagePath: string, expiresIn = 900): Promise<string>` — 15min TTL
  - [ ] Komprimierung: Client-seitig vor Upload (max 1920px Breite, JPEG 80% Qualität)
  - [ ] MIME-Type Validierung: nur `image/jpeg`, `image/png`, `image/webp`, `image/heic`
- [ ] Task 3: Photo-Picker-Komponente (AC: #1, #2, #7)
  - [ ] `src/components/capture/photo-picker.tsx` erstellen (Client Component)
  - [ ] `<input type="file" accept="image/*" capture="environment" multiple>` — Kamera oder Galerie
  - [ ] Foto-Vorschau-Leiste: Thumbnails (64x64) mit X-Button zum Entfernen
  - [ ] Max 5 Fotos pro Event (UX-Limit, kein technisches Limit)
  - [ ] State: `pendingPhotos: File[]` — lokale Fotos vor Upload
  - [ ] Komprimierungsfunktion: `compressImage(file: File, maxWidth: number, quality: number): Promise<Blob>`
  - [ ] Komprimierung via Canvas API (client-seitig, kein externer Lib)
  - [ ] `aria-label="Fotos hinzufügen"`, Thumbnail-Grid mit `role="list"`
- [ ] Task 4: InputBar-Integration (AC: #1, #2)
  - [ ] `src/components/capture/input-bar.tsx` erweitern
  - [ ] Kamera-Button (links neben Textfeld) aktiviert PhotoPicker
  - [ ] Foto-Vorschau-Leiste erscheint über der InputBar wenn Fotos ausgewählt
  - [ ] Senden-Button: Text + Fotos zusammen als Event absenden
  - [ ] Auch Fotos-only Events möglich (ohne Text) — `raw_input` bleibt leer oder generisch "Foto-Dokumentation"
  - [ ] Nach Absenden: Vorschau-Leiste leeren
- [ ] Task 5: Photo-Upload Server Action (AC: #3, #4)
  - [ ] `src/lib/actions/symptom-actions.ts` — `addPhotosToEvent` Action hinzufügen
  - [ ] Input: `FormData` mit `eventId` + `photos[]` (Blob-Array)
  - [ ] Zod-Validierung: eventId UUID, mindestens 1 Foto
  - [ ] Auth-Check + Ownership-Check (Event gehört User)
  - [ ] Für jedes Foto: `uploadPhoto()` → `event_photos` Insert
  - [ ] Alternativ: Photos werden direkt beim `createSymptomEvent` mit hochgeladen (FormData-Pattern)
  - [ ] `revalidatePath('/')` nach Upload
- [ ] Task 6: ChatBubble Foto-Anzeige (AC: #6)
  - [ ] `src/components/capture/chat-bubble.tsx` erweitern
  - [ ] Foto-Thumbnails in der Bubble anzeigen (wenn `event_photos` vorhanden)
  - [ ] Thumbnail-Grid: max 3 sichtbar, "+X" Badge für weitere
  - [ ] Tap auf Thumbnail: Vollbild-Ansicht (Modal/Overlay, kein Download)
  - [ ] Signed URLs on-demand laden (nicht pre-fetchen)
  - [ ] Loading-Skeleton während Signed URL geladen wird
- [ ] Task 7: useSymptomEvents Hook erweitern (AC: #6)
  - [ ] `src/hooks/use-symptom-events.ts` erweitern
  - [ ] `event_photos` in die Event-Query einbeziehen (Join oder separate Abfrage)
  - [ ] `EventPhoto` Typ in `types/symptom.ts` exportieren
  - [ ] Photos pro Event als `photos: EventPhoto[]` im State verfügbar
- [ ] Task 8: Tests (AC: #1-#7)
  - [ ] `src/__tests__/components/photo-picker.test.tsx` — File-Input, Vorschau, Entfernen, Max-Limit
  - [ ] `src/__tests__/input-bar.test.tsx` — Erweitert: Kamera-Button, Foto-Vorschau-Integration
  - [ ] `src/__tests__/chat-bubble.test.tsx` — Erweitert: Foto-Thumbnails, Tap-Verhalten
  - [ ] `src/__tests__/lib/media.test.ts` — Erweitert: uploadPhoto, getSignedPhotoUrl, MIME-Validierung
  - [ ] `src/__tests__/symptom-actions.test.ts` — Erweitert: addPhotosToEvent
  - [ ] Bestehende Tests dürfen NICHT brechen
  - [ ] `npm run test` verifizieren
- [ ] Task 9: Build-Verifikation
  - [ ] `npm run lint` fehlerfrei
  - [ ] `npm run build` erfolgreich

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

**Wichtig**: HEIC-Fotos (iPhone) werden automatisch durch Canvas zu JPEG konvertiert.

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

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

## Change Log

- 2026-03-03: Story 3.3 erstellt — Foto-Upload mit Kamera/Galerie, Client-Komprimierung, Supabase Storage, event_photos Tabelle, ChatBubble Integration
