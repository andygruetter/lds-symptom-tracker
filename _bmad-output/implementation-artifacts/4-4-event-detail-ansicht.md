# Story 4.4: Event-Detail-Ansicht

Status: done (modifiziert durch späteren Refactor)

## 📋 Implementation Update (Stand 2026-05-06)

**`EventDetail`-Schema überarbeitet.** Die in dieser Story beschriebenen Felder
`symptomName`, `medication` etc. existieren in der finalen Implementierung nicht
mehr. `eventType` ist Literal `'symptom'` (medikament-as-attribute-Modell, siehe
`tech-spec-precursor-medication-fields.md`).

**Aktuelles Schema** (`src/types/analytics.ts:82-94`):

```ts
type EventDetail = {
  id: string
  eventType: 'symptom'
  occurredAt: string
  createdAt: string
  endedAt: string | null
  rawInput: string | null
  audioUrl: string | null
  extractedFields: ExtractedField[]   // dynamische Feldliste
  photos: EventPhoto[]
  totalPhotoCount: number              // separates Count-Feld
  eventStatus: string
}

type ExtractedField = {
  fieldName: string
  value: string | null
  confidence: number | null
  confirmed: boolean
  symptomIndex: number
  medicationIndex: number | null
}
```

Die UI rendert die Detail-Ansicht über die dynamische `extractedFields`-Liste,
gruppiert nach `symptomIndex` / `medicationIndex` (siehe
`src/components/event/event-detail-view.tsx`,
`src/components/event/event-edit-form.tsx`).

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Patient,
I want einzelne Symptom-Events im Detail ansehen können, inklusive Audio, Fotos und extrahierte Daten,
So that ich alle erfassten Informationen zu einem Event nachvollziehen kann (FR19).

## Acceptance Criteria

1. **Given** ein Patient tippt auf einen Event im Feed, der Timeline oder dem Ranking **When** die Detail-Ansicht geöffnet wird **Then** werden alle extrahierten Felder mit Konfidenz-Indikatoren angezeigt
2. **And** falls vorhanden: die Original-Audio-Aufnahme ist abspielbar (Signed URL, Stream)
3. **And** falls vorhanden: angehängte Fotos werden in einer Galerie-Ansicht dargestellt
4. **And** die Transkription (bei Spracheingabe) wird angezeigt
5. **And** Datum, Uhrzeit, Dauer (wenn beendet) und Event-Typ sind sichtbar
6. **And** ein Zurück-Button führt zur vorherigen Ansicht

## Tasks / Subtasks

- [x] Task 1: EventDetail-Typ definieren (AC: #1, #2, #3, #4, #5)
  - [x] `src/types/analytics.ts` erweitern (NICHT neue Datei)
  - [x] `ExtractedField` Typ: `{ fieldName: string, value: string | null, confidence: number | null, confirmed: boolean }`
  - [x] `EventPhoto` Typ: `{ id: string, signedUrl: string }`
  - [x] `EventDetail` Typ: `{ id: string, eventType: 'symptom' | 'medication', occurredAt: string, createdAt: string, endedAt: string | null, rawInput: string | null, audioUrl: string | null, extractedFields: ExtractedField[], photos: EventPhoto[], symptomName: string | null, medication: string | null }`

- [x] Task 2: DB-Funktion für Event-Detail-Daten (AC: #1, #2, #3, #4, #5)
  - [x] `src/lib/db/insights.ts` erweitern (NICHT neue Datei)
  - [x] `getEventDetail(supabase, eventId, accountId): Promise<EventDetail | null>`
  - [x] Query 1: `supabase.from('symptom_events').select('*').eq('id', eventId).eq('account_id', accountId).is('deleted_at', null).single()`
  - [x] Query 2: `supabase.from('extracted_data').select('field_name, value, confidence, confirmed').eq('symptom_event_id', eventId)`
  - [x] Query 3: `supabase.from('event_photos').select('id, storage_path').eq('symptom_event_id', eventId).order('created_at', { ascending: true })`
  - [x] Signed URL Generierung: Für `audio_url` via `getSignedAudioUrl()`, für jede Photo via `getSignedPhotoUrl()` — alles serverseitig
  - [x] Mapping auf `EventDetail` Typ
  - [x] Return `null` bei nicht gefundenem oder gelöschtem Event

- [x] Task 3: Server Action für Event-Detail (AC: #1) — OPTIONAL, nur für späteren URL-Refresh
  - [x] `src/lib/actions/insights-actions.ts` erweitern (NICHT neue Datei)
  - [x] `loadEventDetail(eventId: string): Promise<ActionResult<EventDetail>>`
  - [x] Zod-Schema: `z.object({ eventId: z.string().uuid() })`
  - [x] Auth-Check via `createServerClient()`
  - [x] Return: `ActionResult<EventDetail>` (bestehender Pattern)

- [x] Task 4: AudioPlayer Component (AC: #2)
  - [x] `src/components/event/audio-player.tsx` erstellen (`'use client'`)
  - [x] Props: `audioUrl: string` (bereits signierte URL)
  - [x] HTML5 `<audio>` Element mit nativen Controls (kein custom Player für MVP)
  - [x] Styling: `w-full rounded-xl` mit Audio-Element
  - [x] Kein Download-Button: `controlsList="nodownload"` auf `<audio>`
  - [x] Kein Rechtsklick: `onContextMenu={(e) => e.preventDefault()}`
  - [x] Error-State: "Audio konnte nicht geladen werden" bei Fehler
  - [x] `preload="metadata"` für schnelle Dauer-Anzeige ohne vollen Download

- [x] Task 5: PhotoGallery Component (AC: #3)
  - [x] `src/components/event/photo-gallery.tsx` erstellen (`'use client'`)
  - [x] Props: `photos: EventPhoto[]`
  - [x] Responsive Grid: `grid grid-cols-2 gap-2`
  - [x] Einzelnes Foto: volle Breite (`col-span-2`)
  - [x] Ungerade Anzahl: letztes Foto `col-span-2` (wenn >1 Foto)
  - [x] `<img>` mit `object-cover aspect-square rounded-xl`
  - [x] Tap auf Foto → Fullscreen-Lightbox (Dialog)
  - [x] Lightbox: `shadcn Dialog` mit `<img>` volle Grösse, X-Button zum Schliessen
  - [x] Kein Rechtsklick-Save: `onContextMenu` prevent

- [x] Task 6: EventDetailView Component (AC: #1, #2, #3, #4, #5, #6)
  - [x] `src/components/event/event-detail-view.tsx` erstellen (`'use client'`)
  - [x] Props: `detail: EventDetail`
  - [x] **Header**: Zurück-Button (ArrowLeft Icon) + Titel "Event-Details"
  - [x] **Zurück-Navigation**: `router.back()` mit Fallback auf `/insights`
  - [x] **Typ-Badge**: Terracotta für Symptom, Stahlblau für Medikament
  - [x] **Datum/Uhrzeit**: `Intl.DateTimeFormat('de-CH', ...)`
  - [x] **Dauer**: `formatDuration()` aus `src/lib/utils/duration.ts`
  - [x] **Transkription/rawInput**: Nur anzeigen wenn vorhanden
  - [x] **Audio-Sektion**: nur rendern wenn `audioUrl !== null`
  - [x] **Fotos-Sektion**: nur rendern wenn `photos.length > 0`
  - [x] **Extrahierte Daten**: Read-only Liste mit Konfidenz-Dots (grün/gelb/rot)
  - [x] **Bearbeiten-Link**: nur für Symptom-Events
  - [x] Scroll-Container: `overflow-y-auto`

- [x] Task 7: `/event/[id]/page.tsx` zu Detail-Ansicht umbauen (AC: #1, #5, #6)
  - [x] `src/app/(event)/event/[id]/page.tsx` ersetzt mit Detail-Ansicht
  - [x] Server Component: Auth-Check, Event laden via `getEventDetail()`, Signed URLs serverseitig
  - [x] Rendern: `<EventDetailView detail={eventDetail} />`
  - [x] Medikamenten-Events: AUCH unterstützt
  - [x] Gelöschte Events: `notFound()` beibehalten
  - [x] Error-Handling: Bei nicht gefundenem Event → `notFound()`

- [x] Task 8: Edit-Route verschieben (AC: #1)
  - [x] `src/app/(event)/event/[id]/edit/page.tsx` erstellt
  - [x] EventEditForm-Logik identisch zur vorherigen page.tsx
  - [x] Medikament-Check beibehalten (Edit nur für Symptome)

- [x] Task 9: Tests (AC: #1-#6)
  - [x] `src/__tests__/lib/db/insights.test.ts` erweitert — getEventDetail: 6 Tests
  - [x] `src/__tests__/components/event/audio-player.test.tsx` (NEU): 2 Tests
  - [x] `src/__tests__/components/event/photo-gallery.test.tsx` (NEU): 3 Tests
  - [x] `src/__tests__/components/event/event-detail-view.test.tsx` (NEU): 6 Tests
  - [x] `src/__tests__/actions/insights-actions.test.ts` erweitert: 3 Tests für loadEventDetail
  - [x] 485 Tests grün, keine Regressions

- [x] Task 10: Build-Verifikation
  - [x] `npx prettier --write` auf alle geänderten Dateien
  - [x] `npm run lint` — keine neuen Fehler (pre-existierender Fehler in day-drill-down.tsx)
  - [x] `npm run build` — erfolgreich

## Dev Notes

### Scope-Abgrenzung (KRITISCH)

Diese Story implementiert:
- Detail-Ansicht für einzelne Events (Symptome UND Medikamente)
- Audio-Player für Original-Aufnahmen via Signed URL
- Foto-Galerie mit Lightbox für angehängte Fotos
- Anzeige aller extrahierten Felder mit Konfidenz-Indikatoren
- Transkription / Original-Text Anzeige
- Event-Metadaten (Datum, Uhrzeit, Dauer, Typ)
- Zurück-Navigation
- Link zur bestehenden Bearbeiten-Seite

Gehört NICHT in diese Story:
- **Event-Löschen** → Story 4.5
- **Custom Audio Player mit Waveform** → Post-MVP (HTML5 native controls reichen für MVP)
- **Foto-Download** → Explizit NICHT erlaubt (UX: "Fotos: Ansicht, kein Download")
- **Audio-Download** → Explizit NICHT erlaubt (UX: "Audio: nur Stream, kein Download-Button")
- **Arzt-Detail-Ansicht** → Epic 6 (Story 6.4, nutzt gleiche Datenquelle mit Arzt-Theme)
- **Offline-Caching von Audio/Fotos** → Post-MVP
- **Realtime-Updates der Detail-Ansicht** → Post-MVP
- **Swipe-zwischen-Events Navigation** → Post-MVP
- **Correction/Edit Inline in Detail-View** → Bestehende Edit-Seite verlinken stattdessen

### Architektur-Entscheidungen

**Route-Struktur Änderung:**
```
VORHER:
/event/[id]       → EventEditForm (nur Symptome, Edit)

NACHHER:
/event/[id]       → EventDetailView (Symptome + Medikamente, Read-Only)
/event/[id]/edit  → EventEditForm (nur Symptome, Edit) ← verschoben
```

**Signed URL Strategie:**
```
Server Component (page.tsx)
  → createServerClient() + getUser()
  → getEventDetail(supabase, eventId, accountId)
    → Query: symptom_events + extracted_data + event_photos
    → getSignedAudioUrl(supabase, audio_url)       ← Serverseitig
    → getSignedPhotoUrl(supabase, photo.storage_path) × N  ← Serverseitig
  → <EventDetailView detail={eventDetail} />
    → <AudioPlayer audioUrl={signedUrl} />          ← Client, erhält fertige URL
    → <PhotoGallery photos={[{id, signedUrl}]} />   ← Client, erhält fertige URLs
```

Signed URLs werden serverseitig generiert (15min TTL). Client-Komponenten erhalten nur die fertigen URLs — kein Supabase Storage Client nötig im Browser.

**Medikament-Events Support:**
- Bestehende Edit-Seite ignoriert Medikamente (`notFound()`)
- Detail-Ansicht zeigt BEIDE Event-Typen
- Medikament-Felder: `medication`, `dosage` (statt Symptom-Felder)
- Medikament-Events haben keinen "Bearbeiten"-Link (Edit unterstützt nur Symptome)

**Konfidenz-Farben (identisch zu EventEditForm):**
```typescript
≥85%  → bg-green-500   (hoch)
≥70%  → bg-yellow-500  (mittel)
<70%  → bg-red-500     (niedrig)
```

**Feld-Labels (wiederverwenden):**
```typescript
const FIELD_LABELS: Record<string, string> = {
  symptom_name: 'Symptomname',
  body_region: 'Körperregion',
  side: 'Seite',
  symptom_type: 'Symptomtyp',
  intensity: 'Intensität',
  symptom_time: 'Zeitpunkt',
  duration: 'Dauer',
  medication: 'Medikament',
  dosage: 'Dosierung',
}
```

**Medikament-Feld-Labels ergänzen:**
- `medication` und `dosage` sind zusätzliche Felder in `extracted_data` für Medikament-Events
- In der Detail-Ansicht: Symptom-Felder für `event_type !== 'medication'`, Medikament-Felder für `event_type === 'medication'`

### RLS-Policy Checklist (bei DB-Änderungen)

Keine DB-Schema-Änderungen nötig — diese Story nutzt nur bestehende Tabellen und RLS-Policies:

- [x] `symptom_events` SELECT-Policy: `auth.uid() = account_id` ✓
- [x] `extracted_data` SELECT via JOIN (symptom_event_id → symptom_events.account_id) ✓
- [x] `event_photos` SELECT-Policy: `auth.uid() = (SELECT account_id FROM symptom_events WHERE id = symptom_event_id)` ✓
- [x] Audio Storage: RLS `auth.uid()::text = (storage.foldername(name))[1]` ✓
- [x] Photos Storage: RLS `auth.uid()::text = (storage.foldername(name))[1]` ✓
- [x] Keine neuen Tabellen oder Migrationen nötig

### Migrations-Konvention

Keine Migration nötig für diese Story. Bestehende Tabellen und Indizes reichen aus.

### Bestehende Event-Seite (wird umgebaut)

Die aktuelle `src/app/(event)/event/[id]/page.tsx` zeigt NUR eine Bearbeitungs-Ansicht (`EventEditForm`). Diese Story baut die Route um:

1. `/event/[id]/page.tsx` wird zur **Detail-Ansicht** (neu: `EventDetailView`)
2. `/event/[id]/edit/page.tsx` wird zur **Bearbeitungs-Ansicht** (bestehende `EventEditForm` verschoben)

Bestehende Dateien die ERWEITERT werden:
- `src/types/analytics.ts` — EventDetail, ExtractedField, EventPhoto Typen
- `src/lib/db/insights.ts` — `getEventDetail()` hinzufügen
- `src/lib/actions/insights-actions.ts` — `loadEventDetail()` Server Action
- `src/__tests__/lib/db/insights.test.ts` — getEventDetail Tests
- `src/__tests__/actions/insights-actions.test.ts` — loadEventDetail Tests

Bestehende Dateien die VERSCHOBEN werden:
- `src/app/(event)/event/[id]/page.tsx` → ERSETZEN (alte Edit-Logik nach `/edit/page.tsx`)

Neue Dateien:
- `src/components/event/event-detail-view.tsx` — Detail-Ansicht Hauptkomponente
- `src/components/event/audio-player.tsx` — Audio-Player mit native controls
- `src/components/event/photo-gallery.tsx` — Foto-Grid mit Lightbox
- `src/app/(event)/event/[id]/edit/page.tsx` — Bearbeitungs-Seite (verschobene Logik)

### Learnings aus Story 4.1-4.3 (KRITISCH)

- **Supabase nested select**: `extracted_data(field_name, value, confidence, confirmed)` für Key-Value-Daten. ABER für Detail-Ansicht brauchen wir die vollen Felder (confidence + confirmed), nicht nur pivotiert.
- **Signed URL Pattern**: `getSignedAudioUrl()` und `getSignedPhotoUrl()` existieren in `src/lib/db/media.ts`. TTL: 15 Minuten. IMMER serverseitig generieren, nie cachen.
- **Event-Type Mapping**: `event_type !== 'medication'` → Symptom (inkl. `'voice'`). Detail-Ansicht muss BEIDE Typen unterstützen.
- **`useTransition` Pattern**: Nicht nötig für Detail-Ansicht — Seite wird einmal als Server Component geladen.
- **FeedEventCard Navigation**: Bereits `router.push(/event/${event.id})` implementiert — keine Änderung nötig.
- **`formatDuration()`**: Funktion in `feed-event-card.tsx` — als Utility extrahieren oder inline in Detail-Ansicht duplizieren.
- **Test-Count**: Aktuell ~435 Tests grün. Neue Tests hinzufügen, nicht brechen.
- **Composite Index**: Bestehender Index für `symptom_events` reicht — Einzelabfrage per `id` nutzt Primary Key.
- **Keine barrel exports**: Direkte Imports verwenden, keine `index.ts` Dateien.
- **`createServerClient()` statt `createServiceClient()`**: Immer mit RLS arbeiten.

### Learnings aus EventEditForm (Pattern-Referenz)

- **Konfidenz-Farben**: `getConfidenceColor()` Funktion bereits in `event-edit-form.tsx` implementiert. Gleiche Logik für read-only Darstellung verwenden.
- **Feld-Labels**: `FIELD_LABELS` Map bereits definiert. Erweitern um `medication`, `dosage`.
- **Back-Navigation**: `window.history.length > 1 ? router.back() : router.push('/')` Pattern. Für Detail-View: Fallback auf `/insights` statt `/`.
- **Corrections-Historie**: `CorrectionHistory` Komponente existiert — in Detail-Ansicht NICHT einbauen, nur in Edit-Ansicht.

### Farb-Referenz (aus UX-Spec & Story 4.1)

| Kategorie | Hex | Verwendung |
|-----------|-----|-----------|
| Symptom (Terracotta) | `#C06A3C` | Typ-Badge, Border-Akzent |
| Medikament (Stahlblau) | `#4A7FA5` | Typ-Badge, Border-Akzent |
| Konfidenz hoch | `bg-green-500` | ≥85% |
| Konfidenz mittel | `bg-yellow-500` | ≥70% |
| Konfidenz niedrig | `bg-red-500` | <70% |

### Anti-Patterns (VERMEIDEN)

- **NICHT** einen Custom Audio Player mit Waveform bauen — HTML5 `<audio>` mit `controls` reicht für MVP
- **NICHT** Signed URLs im Client generieren — immer serverseitig (Security)
- **NICHT** Fotos direkt aus Storage Bucket verlinken — nur Signed URLs mit TTL
- **NICHT** Download-Buttons für Audio/Fotos anbieten — UX-Spec explizit: "nur Stream, kein Download"
- **NICHT** Corrections-Historie in Detail-Ansicht einbauen — gehört zur Edit-Ansicht
- **NICHT** EventEditForm umbauen — bestehende Komponente beibehalten, nur Route verschieben
- **NICHT** neue Type-Datei erstellen — `analytics.ts` erweitern
- **NICHT** neue DB-Datei erstellen — `insights.ts` erweitern
- **NICHT** neue Action-Datei erstellen — `insights-actions.ts` erweitern
- **NICHT** `createServiceClient()` verwenden — `createServerClient()` mit RLS
- **NICHT** barrel exports (index.ts) erstellen — direkte Imports
- **NICHT** recharts/d3 oder andere Libraries installieren
- **NICHT** Realtime-Subscription für Detail-Ansicht
- **NICHT** `event_photos` Query ohne Order — `created_at ASC` für konsistente Reihenfolge
- **NICHT** Signed URLs parallel für alle Fotos+Audio generieren ohne Error-Handling — `Promise.allSettled` verwenden falls eine URL fehlschlägt
- **NICHT** Swipe-Navigation zwischen Events bauen — Post-MVP

### Abhängigkeiten

- **Story 4.1**: Chronologischer Feed (VORAUSSETZUNG ✓ — done)
- **Story 4.2**: Timeline-Ansicht (VORAUSSETZUNG ✓ — done)
- **Story 4.3**: Symptom-Ranking mit Inline-Expansion (VORAUSSETZUNG — in-progress/review)
- **FeedEventCard**: `src/components/insights/feed-event-card.tsx` — bereits Navigation zu `/event/${id}` ✓
- **EventEditForm**: `src/components/event/event-edit-form.tsx` — wird verschoben ✓
- **CorrectionHistory**: `src/components/event/correction-history.tsx` — bleibt in Edit ✓
- **Media Utils**: `src/lib/db/media.ts` — `getSignedAudioUrl()`, `getSignedPhotoUrl()` ✓
- **shadcn Dialog**: `src/components/ui/dialog.tsx` — für Foto-Lightbox ✓
- **Composite Index**: Migration 00015 existiert ✓
- **Audio Bucket**: Migration 00008 (private, RLS) ✓
- **Photos Bucket**: Migration 00009 (private, RLS) ✓
- **event_photos Tabelle**: Migration 00009 ✓

### DB-Schema Referenz (bestehend)

```
symptom_events: id, account_id, event_type, occurred_at, created_at, ended_at,
                raw_input, audio_url, status, deleted_at

extracted_data: id, symptom_event_id, field_name, value, confidence, confirmed
  → field_name values: 'symptom_name', 'body_region', 'side', 'symptom_type',
                       'intensity', 'medication', 'dosage', 'symptom_time', 'duration'

event_photos: id, symptom_event_id, storage_path, created_at
  → Storage bucket: 'photos' (private)
  → Pfad: {accountId}/{eventId}/{timestamp}-{filename}

Audio Storage:
  → Bucket: 'audio' (private)
  → Pfad: {accountId}/{eventId}.{ext}
  → Referenziert via: symptom_events.audio_url (storage_path, NICHT signed URL)
```

### Git Intelligence

Letzte relevante Commits:
- `315fab3` — Implement Stories 4.1-4.2: chronological feed, timeline view with code review fixes
- `df941a6` — Add Story 4.1 spec and start Epic 4 (Patienten-Auswertung)
- `638d9b6` — Add symptom time/duration extraction (occurred_at Feld)

Relevante Implementierungs-Dateien (zum Referenzieren):
- `src/app/(event)/event/[id]/page.tsx` — **WIRD UMGEBAUT** (aktuell: Edit, nachher: Detail)
- `src/components/event/event-edit-form.tsx` — Bestehende Edit-Logik, Konfidenz-Farben, Feld-Labels
- `src/components/event/correction-history.tsx` — Bleibt in Edit-Ansicht
- `src/lib/db/media.ts` — `getSignedAudioUrl()`, `getSignedPhotoUrl()` — WIEDERVERWENDEN
- `src/lib/db/insights.ts` — DB-Query Pattern, erweitern um `getEventDetail()`
- `src/lib/actions/insights-actions.ts` — Server Action Pattern, erweitern um `loadEventDetail()`
- `src/components/insights/feed-event-card.tsx` — Navigation bereits verdrahtet (`/event/${event.id}`)
- `src/types/analytics.ts` — Bestehende Typen erweitern
- `src/types/common.ts` — `ActionResult<T>` Pattern
- `src/lib/utils/date.ts` — `toLocalDateKey()` Shared Utility

### Project Structure Notes

- Alignment: Folgt dem bestehenden `(event)` Route-Group Pattern
- Neue Komponenten unter `src/components/event/` (architekturkonform)
- DB-Layer erweitert `src/lib/db/insights.ts` (bestehender Pattern)
- Server Actions erweitert `src/lib/actions/insights-actions.ts` (bestehender Pattern)
- Typen erweitert `src/types/analytics.ts` (bestehender Pattern)
- Tests unter `src/__tests__/` mit bestehender Struktur
- Route-Verschiebung: `/event/[id]` → Detail, `/event/[id]/edit` → Edit
- UX-Spec nennt `DrillDownCard` als Komponente für Event-Details — genau das wird implementiert

### Prüfe ob shadcn Dialog installiert ist

Der Foto-Lightbox benötigt `shadcn Dialog`. Prüfe ob `src/components/ui/dialog.tsx` existiert. Falls nicht: `npx shadcn@latest add dialog` ausführen.

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 4, Story 4.4 (FR19)]
- [Source: _bmad-output/planning-artifacts/prd.md — FR19: Event-Detail-Ansicht]
- [Source: _bmad-output/planning-artifacts/architecture.md — DrillDownCard, Signed URLs, Media-Security, Audio-Streaming, [symptom]/ Route]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — DrillDownCard (Anatomie: Datum/Uhrzeit, Symptom-Tags, Audio-Player, Foto-Carousel, Original-Transkription, Dauer), AudioPlayer (Streaming, kein Download), Lightbox Pattern]
- [Source: _bmad-output/implementation-artifacts/4-3-symptom-ranking-trendlinien.md — Inline-Expansion Pattern, FeedEventCard Wiederverwendung, useTransition Pattern, Learnings]
- [Source: _bmad-output/implementation-artifacts/4-1-chronologischer-feed.md — Feed-Implementation, FeedEventCard Navigation zu /event/${id}]
- [Source: src/app/(event)/event/[id]/page.tsx — Bestehende Edit-Seite, wird umgebaut]
- [Source: src/components/event/event-edit-form.tsx — Konfidenz-Farben, Feld-Labels, Back-Navigation Pattern]
- [Source: src/lib/db/media.ts — getSignedAudioUrl, getSignedPhotoUrl (15min TTL)]
- [Source: src/lib/db/insights.ts — DB-Query Pattern, pivotExtractedData, mapRowToFeedEvent]
- [Source: src/types/analytics.ts — FeedEvent Typ (photoCount, hasAudio)]
- [Source: src/types/common.ts — ActionResult<T> Pattern]
- [Source: supabase/migrations/00008_audio_support.sql — audio_url Spalte, Audio Bucket, RLS]
- [Source: supabase/migrations/00009_event_photos.sql — event_photos Tabelle, Photos Bucket, RLS]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

Keine kritischen Debug-Einträge. Test-Fix: `createMockSupabaseEventDetail` Builder musste thenable sein, da `extracted_data`-Query mit `.eq()` endet (kein `.single()` oder `.order()`).

### Completion Notes List

- **Task 1**: `ExtractedField`, `EventPhoto`, `EventDetail` Typen in `src/types/analytics.ts` ergänzt
- **Task 2**: `getEventDetail()` in `src/lib/db/insights.ts` — 3 Queries (symptom_events, extracted_data, event_photos), Signed URLs via `Promise.allSettled` für resiliente URL-Generierung
- **Task 3**: `loadEventDetail()` Server Action mit Zod-Validierung (UUID) und Auth-Check
- **Task 4**: `AudioPlayer` mit HTML5 `<audio>`, `nodownload`, `preload="metadata"`, Error-State
- **Task 5**: `PhotoGallery` mit 2-spaltigem Grid, letztes Foto `col-span-2` bei ungerade Anzahl, shadcn Dialog Lightbox
- **Task 6**: `EventDetailView` mit vollständigem Layout: Header, Typ-Badge (Terracotta/Stahlblau), Datum/Zeit, Dauer via `formatDuration()`, rawInput-Box, Audio/Foto-Sektionen conditional, extrahierte Felder mit Konfidenz-Dots, Bearbeiten-Link nur für Symptome
- **Task 7**: `/event/[id]/page.tsx` zur Detail-Ansicht umgebaut (war: Edit-Form). Unterstützt jetzt BEIDE Event-Typen
- **Task 8**: `/event/[id]/edit/page.tsx` mit identischer EventEditForm-Logik erstellt
- **Task 9**: 20 neue Tests — 485 gesamt, alle grün
- **Task 10**: Prettier, Lint (kein neuer Fehler), Build erfolgreich

### Code Review Fixes (claude-opus-4-6, 2026-03-14)

- **H1**: `src/app/(event)/event/[id]/edit/page.tsx` — `deleted_at` Filter hinzugefügt (soft-deleted Events konnten editiert werden)
- **H2**: `src/lib/db/insights.ts` — `getEventDetail()` filtert jetzt `.eq('status', 'confirmed')` (Konsistenz mit Feed/Timeline/Ranking)
- **M1**: `src/components/event/photo-gallery.tsx` — `onContextMenu` Schutz auf Gallery-Thumbnails ergänzt (nur Lightbox hatte es)
- **M2**: `src/__tests__/actions/insights-actions.test.ts` — Test für `loadEventDetail` NOT_FOUND Pfad ergänzt
- **M3**: `src/lib/db/insights.ts` — `extracted_data` und `event_photos` Queries parallelisiert via `Promise.all()`
- 500 Tests grün nach Fixes

### File List

- `src/types/analytics.ts` (erweitert)
- `src/lib/db/insights.ts` (erweitert — `getEventDetail`, Review-Fix: status-Filter + Promise.all)
- `src/lib/actions/insights-actions.ts` (erweitert — `loadEventDetail`)
- `src/components/event/audio-player.tsx` (NEU)
- `src/components/event/photo-gallery.tsx` (NEU, Review-Fix: onContextMenu auf Thumbnails)
- `src/components/event/event-detail-view.tsx` (NEU)
- `src/app/(event)/event/[id]/page.tsx` (ersetzt — war EventEditForm)
- `src/app/(event)/event/[id]/edit/page.tsx` (NEU — verschobene EventEditForm, Review-Fix: deleted_at Filter)
- `src/__tests__/lib/db/insights.test.ts` (erweitert)
- `src/__tests__/actions/insights-actions.test.ts` (erweitert, Review-Fix: NOT_FOUND Test)
- `src/__tests__/components/event/audio-player.test.tsx` (NEU)
- `src/__tests__/components/event/photo-gallery.test.tsx` (NEU)
- `src/__tests__/components/event/event-detail-view.test.tsx` (NEU)
