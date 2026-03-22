---
title: 'Fotodokumentation — Fotos als Symptom-Verlaufsdokumentation'
slug: 'fotodokumentation-symptom-verlauf'
created: '2026-03-22'
status: 'done'
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
tech_stack: ['Next.js App Router', 'Supabase (DB + Storage)', 'TypeScript', 'Tailwind CSS', 'Radix UI', '@react-pdf/renderer', 'Vitest + jsdom']
files_to_modify:
  - 'src/components/capture/input-bar.tsx'
  - 'src/components/capture/photo-picker.tsx'
  - 'src/components/capture/chat-bubble.tsx'
  - 'src/components/capture/chat-feed.tsx'
  - 'src/components/event/event-detail-view.tsx'
  - 'src/components/event/photo-gallery.tsx'
  - 'src/components/sharing/doctor-event-detail-view.tsx'
  - 'src/lib/db/insights.ts'
  - 'src/lib/actions/symptom-actions.ts'
  - 'src/lib/pdf/pdf-data.ts'
  - 'src/lib/pdf/pdf-styles.ts'
  - 'src/app/(app)/page.tsx'
  - 'src/app/(event)/event/[id]/page.tsx'
  - 'src/types/analytics.ts'
  - 'vitest.config.ts'
code_patterns:
  - 'Server Actions mit FormData für Uploads'
  - 'Signed URLs mit 15-min TTL via getSignedPhotoUrl()'
  - 'Client-seitige Komprimierung: Canvas → JPEG 0.8 @ 1920px'
  - 'Promise.allSettled() für batch signed URL Generierung'
  - 'Radix Dialog für Lightbox/Fullscreen'
  - 'photosMap: Record<string, EventPhoto[]> State im Hook'
test_patterns:
  - 'Vitest + jsdom, Dateien in src/__tests__/'
  - 'Mocks für Supabase Client, Dialog, Signed URLs'
  - 'Aria-Labels für Button-Tests'
  - 'Screen queries und fireEvent für Interaktions-Tests'
---

# Tech-Spec: Fotodokumentation — Fotos als Symptom-Verlaufsdokumentation

**Created:** 2026-03-22

## Overview

### Problem Statement

Fotos werden aktuell als eigenständige Symptom-Events behandelt (raw_input = "Foto-Dokumentation"). Es fehlt der Zusammenhang zwischen Foto und dem dokumentierten Symptom. Eine Verlaufsdokumentation, um z.B. zu sehen ob eine Schwellung stärker oder schwächer wird, ist nicht möglich.

### Solution

Foto-Button aus dem Input-Bar entfernen und in die Event-Detail-Ansicht verschieben. Zusätzlich ein Kamera-Icon direkt in der Chat-Feed-Karte jedes bestätigten Symptoms für Schnellzugriff. Beliebig viele Fotos können zu jedem bestätigten Symptom hinzugefügt werden (direkt fotografieren oder aus Galerie laden). Fotos werden chronologisch als Timeline mit Datum angezeigt (paginiert, letzte 10 zuerst). Die Foto-Timeline ist auch in der Arzt-Ansicht, in den Auswertungen und im PDF-Export (alle Fotos als Thumbnails) sichtbar.

### Scope

**In Scope:**
- Foto-Button aus Input-Bar entfernen
- Foto-Button in Event-Detail-Ansicht hinzufügen (Kamera + Galerie)
- Kamera-Icon in Chat-Feed-Karte für Schnellzugriff (bestätigte Symptome)
- Foto-Limit aufheben (unbegrenzt statt max 5)
- Chronologische Foto-Timeline mit Datum in Detail-Ansicht (paginiert, 10 pro Seite)
- Foto-Timeline in Arzt-Ansicht (Doctor-View / Sharing) sichtbar
- Foto-Timeline in Auswertungen (Insights) sichtbar
- Alle Fotos im PDF-Export einbetten (Thumbnails, max 400px Breite)
- Keine Migration bestehender "Foto-Dokumentation"-Events (Legacy bleibt)

**Out of Scope:**
- KI-Analyse der Fotos
- Notizen/Beschreibungen pro Foto
- Foto-Export als separate Datei
- Migration bestehender Foto-Events

## Context for Development

### Codebase Patterns

- Next.js App Router mit Server Components und Server Actions
- Supabase für Datenbank und Storage (Bucket: `photos`, privat)
- Foto-Upload via `uploadPhoto()` in `src/lib/db/media.ts` — Pfadformat: `{accountId}/{eventId}/{timestamp}-{baseName}.ext`
- Server Action `addPhotosToEvent` in `src/lib/actions/symptom-actions.ts` (Zeilen 655-742) — validiert Ownership, iteriert Fotos mit try/catch pro Foto
- Signed URLs mit 15-Minuten TTL via `getSignedPhotoUrl()` in `media.ts`
- Client-seitige Komprimierung: Canvas → JPEG bei 0.8 Qualität, 1920px max Breite
- `Promise.allSettled()` für Batch-Generierung von signed URLs in `getEventDetail()`
- Event-Status-Lifecycle: pending → extracted → confirmed
- Aktiv/Beendet via `ended_at` Feld (NULL = aktiv)
- `photosMap: Record<string, EventPhoto[]>` State-Management im `useSymptomEvents` Hook
- Radix Dialog für Lightbox/Fullscreen-Ansicht
- PhotoPicker: `MAX_PHOTOS = 5`, `MAX_FILE_SIZE = 10MB`, akzeptiert jpeg/png/webp/heic
- PDF via `@react-pdf/renderer` — Fotos als Base64 eingebettet in `EventCard` Komponente

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/components/capture/input-bar.tsx` | Input-Bar mit PhotoPicker Integration (Zeilen 170-175) — Foto-Button entfernen |
| `src/components/capture/photo-picker.tsx` | PhotoPicker Komponente mit MAX_PHOTOS=5 Limit — Limit entfernen, wiederverwendbar machen |
| `src/components/capture/chat-bubble.tsx` | PhotoGrid (292-355) + PhotoThumbnail (237-290) — Kamera-Icon für Schnellzugriff hinzufügen |
| `src/components/capture/chat-feed.tsx` | Verteilt photosMap an ChatBubble — onAddPhoto Callback durchreichen |
| `src/components/event/event-detail-view.tsx` | Event-Detail mit PhotoGallery (Zeilen 199-206) — PhotoPicker + Timeline hinzufügen |
| `src/components/event/photo-gallery.tsx` | 2-Spalten Grid + Lightbox — zu chronologischer Timeline mit Datums-Gruppierung umbauen |
| `src/components/sharing/doctor-event-detail-view.tsx` | Arzt-Ansicht Event-Detail (Zeilen 190-198) — Foto-Timeline einbauen |
| `src/lib/db/insights.ts` | `getEventDetail()` (573-648) — Pagination für Fotos (limit/offset) |
| `src/lib/db/media.ts` | `uploadPhoto()`, `getSignedPhotoUrl()` — keine Änderungen nötig |
| `src/lib/actions/symptom-actions.ts` | `addPhotosToEvent()` (655-742) — keine Änderungen nötig |
| `src/lib/pdf/symptom-report.tsx` | PDF mit Base64-Fotos in EventCard — Thumbnail-Grösse anpassen (400px) |
| `src/app/(app)/page.tsx` | handleSendPhotos (83-107) — Flow entfernen |
| `src/app/(event)/event/[id]/page.tsx` | Event-Detail Server Component — `addPhoto` Query-Param durchreichen |
| `src/hooks/use-symptom-events.ts` | `loadPhotos()`, `photosMap` State — bleibt für Chat-Feed |
| `src/types/analytics.ts` | `EventDetail`, `EventPhoto` Types — Pagination-Felder ergänzen |

### Technical Decisions

- Foto-Button wird komplett aus dem Input-Bar entfernt
- Fotos werden weiterhin in der bestehenden `event_photos` Tabelle gespeichert
- Das 5-Foto-Limit (MAX_PHOTOS) wird entfernt
- Signed URLs bleiben bei 15-Minuten TTL
- Foto-Anzeige paginiert: letzte 10 Fotos laden, "Ältere laden" Button (Performance bei vielen signed URLs)
- PDF-Export: alle Fotos als Thumbnails (max 400px Breite) einbetten
- Keine Migration bestehender "Foto-Dokumentation"-Events
- PhotoPicker wird aus InputBar extrahiert und als eigenständige Client-Komponente (`'use client'`) wiederverwendet
- Chat-Feed zeigt weiterhin Foto-Thumbnails für bestehende Events (PhotoGrid bleibt)
- Kamera-Icon in ChatBubble navigiert zu `/event/[id]?addPhoto=true` — Detail-Ansicht öffnet PhotoPicker automatisch
- Detail-Ansicht bleibt Server Component, PhotoPicker ist eingebettete Client-Komponente
- Foto-Timeline nach Datum gruppiert (Tages-Überschriften)

## Implementation Plan

### Tasks

- [x] Task 1: PhotoPicker vom MAX_PHOTOS Limit befreien und wiederverwendbar machen
  - File: `src/components/capture/photo-picker.tsx`
  - Action: `MAX_PHOTOS = 5` Konstante entfernen. Neues optionales Prop `maxPhotos?: number` hinzufügen (default: `undefined` = unbegrenzt). Bestehende Logik `remaining = MAX_PHOTOS - pendingPhotos.length` anpassen: wenn `maxPhotos` undefined, kein Limit. `disabled`-Logik für "max erreicht" nur wenn `maxPhotos` gesetzt. Sicherstellen, dass `accept="image/*"` und `capture="environment"` erhalten bleiben.
  - Notes: Komponente bleibt `'use client'`. Bestehende Komprimierung (1920px, 0.8 JPEG) und MAX_FILE_SIZE (10MB) bleiben unverändert.

- [x] Task 2: Foto-Button und Photo-Flow aus Input-Bar entfernen
  - File: `src/components/capture/input-bar.tsx`
  - Action: `PhotoPicker` Import und JSX entfernen (Zeilen 170-175). `pendingPhotos` State, `handlePhotosSelected`, `handleRemovePhoto` entfernen. `onSendPhotos` Prop aus `InputBarProps` Interface entfernen. Photo-Sende-Logik aus `handleSend()` entfernen (Zeilen 54-69).
  - File: `src/app/(app)/page.tsx`
  - Action: `handleSendPhotos` Funktion entfernen (Zeilen 83-107). `onSendPhotos` Prop vom `<InputBar>` entfernen. `addPhotosToEvent` Import entfernen.
  - Notes: `onSendAudio` bleibt unberührt. `refreshPhotos` Import bleibt, da Chat-Feed weiterhin Fotos anzeigt.

- [x] Task 3: EventDetail Type um Pagination erweitern
  - File: `src/types/analytics.ts`
  - Action: `EventPhoto` Type um `createdAt: string` Feld erweitern (für Datums-Gruppierung in Timeline). `EventDetail` Type um `totalPhotoCount: number` Feld erweitern (für "Ältere laden" Logik). Neues `EventPhotoWithDate` Type:
    ```typescript
    export type EventPhoto = {
      id: string
      signedUrl: string
      createdAt: string
    }
    ```
  - Notes: `createdAt` kommt aus der `event_photos.created_at` Spalte, die bereits in der DB existiert.

- [x] Task 4: getEventDetail() mit Foto-Pagination
  - File: `src/lib/db/insights.ts`
  - Action: `getEventDetail()` Funktionssignatur erweitern um `photoLimit?: number` und `photoOffset?: number` Parameter (Defaults: 10 und 0). Supabase-Query für `event_photos` anpassen: `.range(photoOffset, photoOffset + photoLimit - 1)`. Zusätzlichen Count-Query hinzufügen: `.select('id', { count: 'exact', head: true })` für `totalPhotoCount`. `created_at` in den Select aufnehmen. Signed-URL-Generierung anpassen: `created_at` im Ergebnis-Objekt mitgeben.
  - Notes: `Promise.allSettled()` Pattern bleibt. `order('created_at', { ascending: false })` für neueste zuerst (Umkehrung: aktuell ascending). **Wichtig:** `.eq('status', 'confirmed')` Filter wurde entfernt, damit auch `extraction_failed` Events mit Fotos in der Detail-Ansicht angezeigt werden können (benötigt für AC 9). `eventStatus` wird im Return-Objekt mitgegeben, damit die UI entscheiden kann, welche Aktionen verfügbar sind.

- [x] Task 5: PhotoGallery zu chronologischer Timeline mit Datums-Gruppierung umbauen
  - File: `src/components/event/photo-gallery.tsx`
  - Action: Komponente von 2-Spalten-Grid zu datums-gruppierter Timeline umbauen. Props erweitern: `photos: EventPhoto[]` (mit `createdAt`), `totalCount?: number`, `onLoadMore?: () => void`. Fotos nach Datum gruppieren (Tag-Ebene, z.B. "15. März 2026"). Pro Tag: 2-Spalten-Grid mit Fotos. "Ältere laden" Button am Ende wenn `totalCount > photos.length`. Lightbox bleibt (Radix Dialog). Datumsformat: `de-CH` Locale, z.B. `new Date(createdAt).toLocaleDateString('de-CH', { day: 'numeric', month: 'long', year: 'numeric' })`.
  - Notes: Bestehende `onContextMenu` Prevention bleibt. Single-Photo col-span-2 Logik pro Tag beibehalten.

- [x] Task 6: PhotoPicker in Event-Detail-Ansicht integrieren
  - File: `src/components/event/event-detail-view.tsx`
  - Action: Neue Client-Komponente `EventPhotoUploader` erstellen (inline oder separate Datei). Props: `eventId: string`, `autoOpen?: boolean`. Rendert `PhotoPicker` (ohne `maxPhotos` = unbegrenzt) + "Foto hinzufügen" Button. Bei Foto-Auswahl: `addPhotosToEvent` Server Action aufrufen, danach `router.refresh()` für Revalidierung. `autoOpen` Prop: wenn `true`, öffnet File-Input automatisch bei Mount.
  - File: `src/app/(event)/event/[id]/page.tsx`
  - Action: `searchParams` lesen für `addPhoto` Query-Param. `addPhoto={searchParams.addPhoto === 'true'}` an `EventDetailView` durchreichen.
  - File: `src/components/event/event-detail-view.tsx`
  - Action: `EventPhotoUploader` unter der bestehenden PhotoGallery einbauen. Props: `eventId={detail.id}`, `autoOpen={addPhoto}`. PhotoGallery erweitern um `totalCount` und `onLoadMore` Props.
  - Notes: `EventDetailView` bleibt Server Component. `EventPhotoUploader` ist `'use client'`. `addPhotosToEvent` wird direkt aus der Client-Komponente als Server Action aufgerufen.

- [x] Task 7: Kamera-Icon in ChatBubble für Schnellzugriff
  - File: `src/components/capture/chat-bubble.tsx`
  - Action: Für bestätigte oder fehlgeschlagene Events (`eventStatus === 'confirmed' || eventStatus === 'extraction_failed'`) ein kleines Kamera-Icon (`Camera` von lucide-react, Grösse `size-3.5`) neben dem Zeitstempel rendern. `onClick`: `onNavigate` Callback mit URL `/event/${eventId}?addPhoto=true` aufrufen (oder `router.push`). Icon nur anzeigen wenn `eventStatus === 'confirmed'` und `onNavigate` vorhanden.
  - File: `src/components/capture/chat-feed.tsx`
  - Action: `onNavigateToEvent` Callback so anpassen, dass bei Kamera-Icon-Klick die URL `/event/[id]?addPhoto=true` verwendet wird. Neues Prop `onAddPhotoToEvent?: (eventId: string) => void` hinzufügen und an ChatBubble durchreichen.
  - Notes: Bestehendes `onNavigate` für Tap auf die Bubble selbst bleibt (navigiert ohne `?addPhoto`). Nur das Kamera-Icon fügt den Query-Param hinzu. Icon bei `confirmed` und `extraction_failed` Events sichtbar, nicht bei `pending`/`extracted`.

- [x] Task 8: Foto-Timeline in Arzt-Ansicht (Doctor-View)
  - File: `src/components/sharing/doctor-event-detail-view.tsx`
  - Action: Bestehende PhotoGallery-Einbindung (Zeilen 190-198) auf die neue Timeline-Version aktualisieren. Props `totalCount` und `onLoadMore` durchreichen. Kein PhotoPicker in der Arzt-Ansicht (read-only).
  - Notes: Arzt-Ansicht nutzt dasselbe `PhotoGallery` Component. Signed URLs werden frisch generiert beim Arzt-Zugriff (nicht beim Link-Erstellen).

- [x] Task 9: PDF-Export Thumbnail-Komprimierung
  - File: `src/lib/pdf/symptom-report.tsx`
  - Action: In der `EventCard` Komponente die `pdfStyles.photo` Styles anpassen: `maxWidth: 400` setzen (aktuell vermutlich grösser). Wenn Fotos als Base64 geladen werden, clientseitig auf 400px Breite skalieren bevor Base64-Encoding. Falls die Foto-Lade-Funktion für PDF alle Fotos lädt (nicht paginiert): sicherstellen, dass alle Fotos des Events geladen werden (eigener Query ohne Pagination).
  - Notes: PDF braucht alle Fotos (nicht paginiert). Separate Query in der PDF-Generierung die alle `event_photos` für das Event lädt.

- [x] Task 10: Foto-Löschen-Funktion
  - File: `src/lib/actions/symptom-actions.ts`
  - Action: Neue Server Action `deleteEventPhoto(photoId: string)` erstellen. Auth-Check + Ownership-Validierung (über `event_photos` → `symptom_events.account_id`). Foto aus Supabase Storage löschen via `supabase.storage.from('photos').remove([storagePath])`. Dann Row aus `event_photos` Tabelle löschen. `revalidatePath` aufrufen.
  - File: `src/components/event/photo-gallery.tsx`
  - Action: Optionales Prop `onDeletePhoto?: (photoId: string) => void` hinzufügen. Pro Foto in der Timeline ein kleines Papierkorb-Icon (Trash2 von lucide-react) anzeigen wenn `onDeletePhoto` gesetzt. Bestätigungsdialog vor dem Löschen (AlertDialog von Radix/shadcn).
  - File: `src/components/event/event-detail-view.tsx`
  - Action: `deleteEventPhoto` Server Action als `onDeletePhoto` Callback an PhotoGallery durchreichen. Nach Löschen `router.refresh()`.
  - Notes: Arzt-Ansicht bekommt kein `onDeletePhoto` Prop → kein Löschen-Button. Nur der Event-Besitzer kann löschen.

- [x] Task 11: Tests aktualisieren und erweitern
  - File: `src/__tests__/components/photo-picker.test.tsx`
  - Action: MAX_PHOTOS=5 Tests entfernen/anpassen. Test für unbegrenztes Upload hinzufügen. Test für optionales `maxPhotos` Prop hinzufügen.
  - File: `src/__tests__/components/event/photo-gallery.test.tsx`
  - Action: Tests für Datums-Gruppierung hinzufügen. Test für "Ältere laden" Button hinzufügen. Test für `totalCount` > `photos.length` Szenario.
  - File: `src/__tests__/input-bar.test.tsx`
  - Action: Kamera-Button Tests entfernen (Button existiert nicht mehr).
  - File: `src/__tests__/chat-bubble.test.tsx`
  - Action: Test für Kamera-Icon bei bestätigten Events hinzufügen. Test dass Kamera-Icon bei pending/extracted Events nicht angezeigt wird.
  - File: `src/__tests__/components/event/event-detail-view.test.tsx`
  - Action: Tests für PhotoUploader-Sichtbarkeit in Detail-Ansicht: confirmed, extraction_failed (sichtbar), pending, extracted (versteckt).
  - File: `vitest.config.ts`
  - Action: `demo-video/**` zu Test-Excludes hinzugefügt (Video-Dateien sollen nicht als Tests gescannt werden).
  - Notes: Alle Tests mit Vitest + jsdom. Mocks für `addPhotosToEvent`, `deleteEventPhoto`, `loadMoreEventPhotos`, `useRouter`, `Dialog`.

### Acceptance Criteria

- [x] AC 1: Given ein User ist auf der Hauptseite, when er die Input-Bar sieht, then gibt es keinen Kamera/Foto-Button mehr.
- [x] AC 2: Given ein bestätigtes Symptom-Event im Chat-Feed, when der User das Kamera-Icon neben dem Zeitstempel antippt, then wird er zu `/event/[id]?addPhoto=true` navigiert.
- [x] AC 3: Given die Event-Detail-Ansicht mit `?addPhoto=true`, when die Seite lädt, then öffnet sich der PhotoPicker automatisch.
- [x] AC 4: Given die Event-Detail-Ansicht, when der User auf "Foto hinzufügen" tippt, then kann er ein Foto aufnehmen (Kamera) oder aus der Galerie wählen.
- [x] AC 5: Given ein ausgewähltes Foto, when es hochgeladen wird, then wird es komprimiert (1920px, 0.8 JPEG), via `addPhotosToEvent` Server Action gespeichert, und erscheint in der Foto-Timeline.
- [x] AC 6: Given ein Event mit 15 Fotos, when die Detail-Ansicht geladen wird, then werden die neuesten 10 Fotos angezeigt mit einem "Ältere laden" Button.
- [x] AC 7: Given der "Ältere laden" Button, when der User ihn antippt, then werden die nächsten 10 Fotos geladen und angezeigt.
- [x] AC 8: Given Fotos mit verschiedenen Aufnahmedaten, when sie in der Timeline angezeigt werden, then sind sie nach Datum gruppiert mit Tages-Überschriften (z.B. "15. März 2026").
- [x] AC 9: Given ein Event mit status pending/extracted, when die Detail-Ansicht angezeigt wird, then ist der "Foto hinzufügen" Button nicht sichtbar. Bei confirmed oder extraction_failed ist er sichtbar.
- [x] AC 10: Given ein Event mit Fotos, when ein Arzt die Sharing-Ansicht öffnet, then sieht er die gleiche chronologische Foto-Timeline (read-only, ohne Upload-Button).
- [x] AC 11: Given ein Event mit 20 Fotos, when der PDF-Report generiert wird, then sind alle 20 Fotos als Thumbnails (max 400px Breite) im PDF enthalten.
- [x] AC 12: Given ein pending/extracted Event im Chat-Feed, when der User es sieht, then gibt es kein Kamera-Icon (nur bei confirmed Events).
- [x] AC 13: Given bestehende "Foto-Dokumentation"-Events (Legacy), when sie angezeigt werden, then werden sie weiterhin korrekt dargestellt wie bisher.
- [x] AC 14: Given ein Event ohne Fotos, when die Detail-Ansicht angezeigt wird, then wird kein leerer Timeline-Container angezeigt, sondern nur der "Foto hinzufügen" Button.
- [x] AC 15: Given ein Foto in der Timeline, when der User auf den Löschen-Button tippt und bestätigt, then wird das Foto aus Storage und Datenbank gelöscht und verschwindet aus der Timeline.
- [x] AC 16: Given ein Foto in der Arzt-Ansicht, when der Arzt die Timeline sieht, then gibt es keinen Löschen-Button (read-only).

## Additional Context

### Dependencies

- Keine neuen externen Dependencies nötig
- Bestehende Packages reichen: `lucide-react` (Camera Icon), `@react-pdf/renderer` (PDF), Supabase Client
- Supabase `photos` Bucket und `event_photos` Tabelle existieren bereits
- `addPhotosToEvent` Server Action kann unverändert wiederverwendet werden

### Testing Strategy

**Unit Tests (Vitest + jsdom):**
- PhotoPicker: unbegrenztes Upload, optionales maxPhotos Prop
- PhotoGallery: Datums-Gruppierung, "Ältere laden" Button, totalCount Logik
- ChatBubble: Kamera-Icon Sichtbarkeit basierend auf eventStatus
- EventPhotoUploader: autoOpen Verhalten, Upload-Flow
- InputBar: Kein Kamera-Button mehr vorhanden

**Integration Tests:**
- getEventDetail() mit photoLimit/photoOffset Parametern
- PDF-Generierung mit vielen Fotos (Thumbnail-Grösse prüfen)

**Manuelle Tests:**
- Foto aufnehmen via Kamera auf mobilem Gerät
- Foto aus Galerie laden
- Pagination: 15+ Fotos hochladen, "Ältere laden" prüfen
- Arzt-Ansicht: Foto-Timeline prüfen
- PDF: Alle Fotos im Export prüfen
- Legacy "Foto-Dokumentation"-Events weiterhin korrekt angezeigt

### Notes

**Risiken:**
- PDF-Grösse bei vielen Fotos: 50 Fotos × ~30KB = ~1.5MB zusätzlich im PDF. Akzeptabel, aber bei Hunderten von Fotos könnte es problematisch werden. Zukünftig ggf. Foto-Limit für PDF einführen.
- Signed URL Generierung: Bei 10 Fotos pro Seite und 15-min TTL sollte Performance OK sein. Bei "Ältere laden" werden neue signed URLs generiert.
- `?addPhoto=true` Query-Param: Einfache Lösung, aber bei Browser-Refresh wird PhotoPicker erneut geöffnet. Akzeptabel für MVP.

**Implementierungsreihenfolge:**
Tasks 1-4 sind Basis-Infrastruktur (Types, Daten, Komponenten-Vorbereitung). Tasks 5-6 sind die Kern-UI. Tasks 7-8 sind Erweiterungen (Chat-Feed, Arzt-Ansicht). Task 9 ist PDF. Task 10 sind Tests — sollten parallel zu jedem Task geschrieben werden.
