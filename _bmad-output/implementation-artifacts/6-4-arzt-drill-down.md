# Story 6.4: Arzt Drill-Down mit Audio-Stream und Foto-Ansicht

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Arzt,
I want in einzelne Events eintauchen und Original-Audio sowie Fotos ansehen können,
So that ich die Patientenangaben im Detail nachvollziehen kann (FR30, FR31, FR32).

## Acceptance Criteria

1. **Given** ein Arzt tippt auf einen Event in der Dashboard-Event-Liste (temporär), Timeline (6.2) oder im Ranking (6.3)
   **When** die Detail-Ansicht (Drill-Down) geöffnet wird
   **Then** werden alle extrahierten Felder mit Konfidenz-Indikatoren angezeigt (Farb-Dot + Prozent-Zahl)
   **And** die Detail-Ansicht nutzt das Arzt-Theme (Professional Slate, erbt `data-theme="doctor"` vom Parent-Layout)

2. **Given** ein Event hat eine Original-Audio-Aufnahme
   **When** die Detail-Ansicht geöffnet wird
   **Then** ist die Audio-Aufnahme per Stream abspielbar (Signed URL, < 1 Sekunde Start, NFR6)
   **And** Audio kann NICHT heruntergeladen werden (Stream only, `controlsList="nodownload"`, `onContextMenu` disabled, FR31, NFR10)
   **And** die Transkription wird neben/unter dem Audio-Player angezeigt

3. **Given** ein Event hat angehängte Fotos
   **When** die Detail-Ansicht geöffnet wird
   **Then** werden Fotos in einer Galerie-Ansicht dargestellt (2-Spalten-Grid, FR32)
   **And** Tap auf ein Foto öffnet eine Lightbox (Dialog)
   **And** Fotos können NICHT heruntergeladen werden (Ansicht only, `onContextMenu` disabled, NFR10)

4. **Given** ein Event hat kein Audio und/oder keine Fotos
   **When** die Detail-Ansicht geöffnet wird
   **Then** werden die entsprechenden Sektionen nicht gerendert (conditional render)
   **And** die Ansicht bleibt visuell konsistent (kein leerer Platzhalter)

5. **Given** der Arzt befindet sich in der Detail-Ansicht
   **When** er den Zurück-Button tippt
   **Then** navigiert er zurück zur vorherigen Ansicht (Dashboard/Timeline/Ranking)

6. **Given** der Arzt öffnet eine Detail-Ansicht
   **When** die Seite serverseitig rendert
   **Then** wird die Event-ID gegen den Sharing-Kontext validiert (`account_id` Match + `occurred_at` innerhalb `date_from`/`date_to`)
   **And** bei ungültigem Event wird auf `/share/dashboard` redirected (nicht 404)
   **And** `deleted_at IS NULL` wird gefiltert (Soft-Delete Konvention)

7. **Given** der Arzt öffnet eine Detail-Ansicht
   **When** die Seite lädt
   **Then** wird ein Audit-Log-Eintrag mit `action: 'event_drill_down'` und `metadata: { eventId }` geschrieben

8. **Given** die Detail-Ansicht wird auf verschiedenen Geräten geöffnet
   **When** das Layout rendert
   **Then** ist die Ansicht responsive: Single Column auf Mobile, optimiert für iPad und Desktop

## Tasks / Subtasks

- [ ] Task 1: `getSharedEventDetail()` DB-Funktion (AC: #1, #2, #3, #4, #6)
  - [ ] 1.1 `src/lib/db/sharing.ts` erweitern (NICHT neue Datei)
  - [ ] 1.2 `getSharedEventDetail(accountId: string, eventId: string, dateFrom: string, dateTo: string): Promise<EventDetail | null>`
  - [ ] 1.3 Query: `symptom_events` WHERE `id = eventId AND account_id = accountId AND occurred_at >= dateFrom AND occurred_at <= dateTo AND deleted_at IS NULL AND status = 'confirmed'`
  - [ ] 1.4 Parallel-Queries: `extracted_data` (WHERE `symptom_event_id = eventId`) + `event_photos` (WHERE `symptom_event_id = eventId`, ORDER `created_at ASC`)
  - [ ] 1.5 Signed URLs via `getSignedMediaUrl(filePath, bucket)` (Service Client, 15min TTL) für Audio + jede Photo
  - [ ] 1.6 Return-Typ: `EventDetail` aus `src/types/analytics.ts` (identisch zur Patienten-Version)
  - [ ] 1.7 Return `null` bei nicht gefundenem Event oder Zeitraum-Verletzung
  - [ ] 1.8 **MUSS `createServiceClient()` verwenden** — Arzt hat keine Auth-Session
  - [ ] 1.9 Unit Tests: gültiges Event, Event ausserhalb Zeitraum, gelöschtes Event, Event anderer Account, Event ohne Audio/Fotos

- [ ] Task 2: Drill-Down Route erstellen (AC: #1, #5, #6, #8)
  - [ ] 2.1 `src/app/share/dashboard/event/[id]/page.tsx` — Server Component
  - [ ] 2.2 `getSharingContext()` aufrufen (React.cache, bereits validiert Cookie + DB)
  - [ ] 2.3 `getSharedEventDetail(context.accountId, params.id, context.dateFrom, context.dateTo)` aufrufen
  - [ ] 2.4 Bei `null` Result: `redirect('/share/dashboard')` (nicht `notFound()` — keine Info-Leaks)
  - [ ] 2.5 Rendern: `<DoctorEventDetailView detail={eventDetail} />`
  - [ ] 2.6 `loading.tsx` — Skeleton für Detail-Ansicht (Arzt-Theme)

- [ ] Task 3: DoctorEventDetailView Komponente (AC: #1, #2, #3, #4, #5, #8)
  - [ ] 3.1 `src/components/sharing/doctor-event-detail-view.tsx` erstellen (`'use client'`)
  - [ ] 3.2 Props: `detail: EventDetail`
  - [ ] 3.3 **Header**: Zurück-Button (`router.back()`) mit Label "← Übersicht" + Datum/Uhrzeit
  - [ ] 3.4 **Event-Typ-Badge**: Symptom (Terracotta `#C06A3C`) / Medikament (Stahlblau `#4A7FA5`)
  - [ ] 3.5 **Metadaten**: Datum (`de-CH` Format), Uhrzeit, Dauer (wenn `endedAt` vorhanden, via `formatDuration()`)
  - [ ] 3.6 **Transkription/rawInput**: Anzeige in grauem Block, nur wenn vorhanden
  - [ ] 3.7 **Audio-Sektion**: Nur rendern wenn `audioUrl !== null` → bestehende `<AudioPlayer>` Komponente
  - [ ] 3.8 **Foto-Sektion**: Nur rendern wenn `photos.length > 0` → bestehende `<PhotoGallery>` Komponente
  - [ ] 3.9 **Extrahierte Daten**: Read-only Tabelle mit Konfidenz-Dots (grün ≥85%, gelb ≥70%, rot <70%) + Prozent-Zahl
  - [ ] 3.10 Felder gruppiert nach `symptomIndex` (Multi-Symptom-Support)
  - [ ] 3.11 **KEIN** Edit-Button, **KEIN** Delete-Button — Arzt ist read-only
  - [ ] 3.12 Doctor-Theme Styling: `rounded-lg` (nicht `rounded-2xl`), `border` (nicht `shadow-sm`), Semibold für Emphasis
  - [ ] 3.13 Responsive: Single Column, `max-w-2xl mx-auto` auf Desktop

- [ ] Task 4: Audit-Logging für Drill-Down (AC: #7)
  - [ ] 4.1 In `page.tsx`: `trackSharingAccessFromPage()` mit `action: 'event_drill_down'` und `metadata: { eventId: params.id }`
  - [ ] 4.2 Fire-and-forget (`void`) — Fehler blockieren nicht den Seitenaufbau
  - [ ] 4.3 Bestehende Funktion aus `src/lib/db/audit.ts` verwenden (identischer Pattern wie `dashboard_view`)

- [ ] Task 5: Dashboard Event-Liste als temporärer Entry-Point (AC: #1)
  - [ ] 5.1 `src/app/share/dashboard/page.tsx` erweitern — bestehende Platzhalter-Cards durch einfache Event-Liste ersetzen/ergänzen
  - [ ] 5.2 Events aus `getSharedSymptomEvents()` als klickbare Karten darstellen
  - [ ] 5.3 Jede Karte zeigt: Datum, Symptomname (erster `symptom_name` aus extrahierten Daten), Event-Typ-Badge
  - [ ] 5.4 Tap auf Karte → `<Link href={/share/dashboard/event/${event.id}}>` Navigation
  - [ ] 5.5 Temporärer Platzhalter-Hinweis: "KI-Zusammenfassung, Timeline und Ranking folgen in den nächsten Stories"
  - [ ] 5.6 **Beachte**: `getSharedSymptomEvents()` gibt `SharedSymptomEvent[]` zurück — ggf. um `symptomName` erweitern oder zusätzlich extrahierte Daten laden
  - [ ] 5.7 Skeleton/Loading State für Event-Liste

- [ ] Task 6: Tests (AC: #1-#8)
  - [ ] 6.1 `src/__tests__/lib/db/sharing.test.ts` erweitern — `getSharedEventDetail()`: 5+ Tests (gültig, Zeitraum-Verletzung, gelöscht, falscher Account, ohne Audio/Fotos)
  - [ ] 6.2 `src/__tests__/components/sharing/doctor-event-detail-view.test.tsx` (NEU): 5+ Tests (Symptom-Event, Medikament-Event, ohne Audio, ohne Fotos, Konfidenz-Indikatoren)
  - [ ] 6.3 Bestehende `AudioPlayer` und `PhotoGallery` Tests decken Präsentation ab — keine neuen Tests nötig
  - [ ] 6.4 Alle bestehenden Tests müssen grün bleiben (keine Regressions)

- [ ] Task 7: Build-Verifikation
  - [ ] 7.1 `npx prettier --write` auf alle geänderten/neuen Dateien
  - [ ] 7.2 `npm run lint` — keine neuen Fehler
  - [ ] 7.3 `npm run build` — erfolgreich

## Dev Notes

### Architektur-Kontext: Arzt-Dashboard Drill-Down

Diese Story implementiert den **Drill-Down** im Arzt-Dashboard — die Detail-Ansicht für einzelne Events. Sie baut auf zwei Vorgänger-Stories auf:

1. **Story 5.3** (Arzt-Zugriff): Zwei-Stufen-Token, Cookie-Auth, Dashboard-Shell, Doctor-Theme, `getSharingContext()`, `getSignedMediaUrl()`
2. **Story 4.4** (Event-Detail-Ansicht): `EventDetailView`, `AudioPlayer`, `PhotoGallery`, `getEventDetail()`, Signed URL Pattern

**Architektur-Entscheidung: Eigene Komponente statt Wiederverwendung von EventDetailView**

Die Patienten-`EventDetailView` hat Edit-Link, Delete-Navigation, und Patient-spezifische Logik. Statt diese mit Feature-Flags zu überladen, erstellen wir eine schlanke `DoctorEventDetailView`:
- Read-only (kein Edit, kein Delete)
- Doctor-Theme Styling (kompakter, border statt shadow)
- Zurück-Navigation zum Dashboard (nicht zu `/insights`)
- Wiederverwendet: `AudioPlayer`, `PhotoGallery` (reine Präsentation)

### Daten-Zugriff: Service Client — KRITISCH

Der Arzt hat **keine Supabase Auth-Session**. Alle Dashboard-Queries MÜSSEN `createServiceClient()` verwenden:

```typescript
// RICHTIG: Service Client (bypasses RLS)
const supabase = createServiceClient()
const { data: event } = await supabase
  .from('symptom_events')
  .select('*')
  .eq('id', eventId)
  .eq('account_id', accountId)       // ← App-Level Ownership Check
  .gte('occurred_at', dateFrom)       // ← Sharing-Zeitraum Enforcement
  .lte('occurred_at', dateTo)
  .is('deleted_at', null)             // ← Soft-Delete Konvention
  .eq('status', 'confirmed')          // ← Nur bestätigte Events
  .single()

// FALSCH: createServerClient() — RLS blockt alles!
```

### Signed URL Pattern (identisch zu Story 4.4, aber Service Client)

```
Server Component (page.tsx)
  → getSharingContext() (React.cache — Cookie + DB validiert)
  → getSharedEventDetail(accountId, eventId, dateFrom, dateTo)
    → Query: symptom_events + extracted_data + event_photos
    → getSignedMediaUrl(audio_url, 'audio')           ← Service Client
    → getSignedMediaUrl(photo.storage_path, 'photos') × N  ← Service Client
  → <DoctorEventDetailView detail={eventDetail} />
    → <AudioPlayer audioUrl={signedUrl} />              ← Client, fertige URL
    → <PhotoGallery photos={[{id, signedUrl}]} />       ← Client, fertige URLs
```

### Routing-Struktur (neue Dateien)

```
src/app/share/dashboard/
├── layout.tsx               → (bestehend, Story 5.3) Cookie-Auth + Doctor-Theme + Context
├── page.tsx                 → (erweitern) Event-Liste als temporärer Entry-Point
├── loading.tsx              → (bestehend, Story 5.3) Dashboard Skeleton
└── event/
    └── [id]/
        ├── page.tsx         → (NEU) Event-Detail Drill-Down
        └── loading.tsx      → (NEU) Detail Skeleton
```

### Security-Validierung (KRITISCH)

Die Event-ID in der URL muss dreifach validiert werden:
1. **Account-Match**: `event.account_id === sharingContext.accountId`
2. **Zeitraum-Match**: `event.occurred_at` liegt innerhalb `dateFrom`/`dateTo`
3. **Soft-Delete**: `event.deleted_at IS NULL`

Alle drei Filter sind in der SQL-Query. Bei Verletzung: `redirect('/share/dashboard')` — kein 404 (Information Leakage vermeiden).

### Bestehende Komponenten-Wiederverwendung

| Komponente | Pfad | Änderung nötig? |
|-----------|------|-----------------|
| `AudioPlayer` | `src/components/event/audio-player.tsx` | Nein — nimmt `audioUrl`, rendert `<audio>` |
| `PhotoGallery` | `src/components/event/photo-gallery.tsx` | Nein — nimmt `photos[]`, rendert Grid + Lightbox |
| `getSharingContext()` | `src/lib/sharing/context.ts` | Nein — React.cache, validiert Cookie + DB |
| `getSignedMediaUrl()` | `src/lib/db/media.ts` | Nein — Service Client, 15min TTL |
| `trackSharingAccessFromPage()` | `src/lib/db/audit.ts` | Nein — fire-and-forget Audit-Log |
| `formatDuration()` | `src/lib/utils/duration.ts` | Nein — Dauer-Berechnung |

### UX-Spezifikationen: DoctorEventDetailView

**Layout-Anatomie (DrillDownCard aus UX-Spec):**
- Zurück-Button ("← Übersicht") + Datum/Uhrzeit Header
- Event-Typ-Badge (Terracotta/Stahlblau)
- Metadaten: Datum (`de-CH`), Uhrzeit, Dauer (wenn beendet)
- Original-Transkription (grauer Block)
- Audio-Player (HTML5 `<audio>`, Stream only)
- Foto-Galerie (2-Spalten-Grid, Lightbox bei Tap)
- Extrahierte Felder mit Konfidenz-Indikatoren

**Doctor-Theme Abweichungen (vs. Patient):**

| Aspekt | Patient | Arzt |
|--------|---------|------|
| Karten | `rounded-2xl`, `shadow-sm` | `rounded-lg`, `border` |
| Typografie | Medium für Emphasis | Semibold für Emphasis |
| Density | Grosszügig | Kompakt |
| Edit/Delete | Vorhanden | NICHT vorhanden (read-only) |
| Zurück-Navigation | `router.back()` → `/insights` | `router.back()` → `/share/dashboard` |

**Konfidenz-Farben (identisch zu Story 4.4):**
```typescript
≥85%  → bg-green-500   (hoch)    + "85%"
≥70%  → bg-yellow-500  (mittel)  + "72%"
<70%  → bg-red-500     (niedrig) + "45%"
```

**Feld-Labels (wiederverwenden aus EventEditForm):**
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

### Responsive Layout

| Breakpoint | Geräte | Layout |
|------------|--------|--------|
| Default (< 768px) | iPhone | Single Column, volle Breite, `px-4` |
| `md` (>= 768px) | iPad | Single Column, `max-w-2xl mx-auto` |
| `xl` (>= 1280px) | Desktop | Single Column, `max-w-2xl mx-auto`, Hover-Tooltips für Konfidenz |

### Dashboard-Erweiterung: Temporäre Event-Liste

Die Dashboard-Shell (Story 5.3) zeigt aktuell Platzhalter-Cards. Für Story 6.4 wird eine einfache Event-Liste als Entry-Point zum Drill-Down ergänzt:

```typescript
// Dashboard page.tsx — Events als klickbare Karten
const events = await getSharedSymptomEvents(ctx.accountId, ctx.dateFrom, ctx.dateTo)
// + Symptomname pro Event laden (erster symptom_name aus extracted_data)

// Rendern als:
<Link href={`/share/dashboard/event/${event.id}`}>
  <Card>Datum · Symptomname · Typ-Badge</Card>
</Link>
```

**Hinweis:** Diese Event-Liste wird in Stories 6.1-6.3 durch KI-Zusammenfassung, Timeline und Ranking ersetzt/ergänzt. Die Event-Karten-Komponente kann als Basis für die Timeline-Events (6.2) dienen.

**SharedSymptomEvent erweitern:** Der bestehende Typ hat kein `symptomName`. Zwei Optionen:
- **Option A**: `getSharedSymptomEvents()` erweitern mit einem Join auf `extracted_data` für den ersten `symptom_name`
- **Option B**: Separate Query pro Event (N+1 — vermeiden)
- **Empfehlung**: Option A — erweitere die Query um einen Nested Select oder einen zusätzlichen aggregierten Feld

### Anti-Patterns (VERMEIDEN)

- **NICHT** `EventDetailView` (Patient) direkt wiederverwenden — hat Edit/Delete-Logik
- **NICHT** `createServerClient()` für Arzt-Queries — RLS blockt ohne Auth-Session
- **NICHT** Event-ID ohne Sharing-Kontext-Validierung laden — Security-Lücke
- **NICHT** `notFound()` bei ungültigem Event — Information Leakage, stattdessen `redirect('/share/dashboard')`
- **NICHT** Signed URLs cachen — immer frisch generieren (15min TTL)
- **NICHT** Download-Buttons für Audio/Fotos — explizit verboten (FR31, FR40, NFR10)
- **NICHT** neue Type-Dateien erstellen — bestehende `analytics.ts` und `sharing.ts` verwenden
- **NICHT** barrel exports (index.ts) — direkte Imports
- **NICHT** Custom Audio Player mit Waveform — HTML5 `<audio>` mit `controls` reicht (MVP)
- **NICHT** Realtime-Subscription für Detail-Ansicht — einmalig serverseitig laden

### RLS-Policy Checklist (bei DB-Änderungen)

Keine DB-Schema-Änderungen nötig — diese Story nutzt nur bestehende Tabellen:

- [ ] Service Client (`createServiceClient()`) für ALLE Arzt-Dashboard-Queries
- [ ] `account_id` Filter in JEDER Query (App-Level Ownership-Check)
- [ ] Zeitraum-Filter (`date_from`/`date_to`) in Event-Query
- [ ] `deleted_at IS NULL` in Symptom-Queries (Soft-Delete Konvention)
- [ ] `status = 'confirmed'` Filter (nur bestätigte Events)
- [ ] Signed URLs für Media (nicht direkte Bucket-URLs)

### Migrations-Konvention

**KEINE neue DB-Migration nötig.** Alle benötigten Tabellen existieren bereits:
- `symptom_events` (Migration 00004)
- `extracted_data` (Migration 00006)
- `event_photos` (Migration 00009)
- `sharing_links` (Migration 00013)
- `audit_log` (Migration 00014)

### Abhängigkeiten

- **Story 5.3** ist VORAUSSETZUNG (done) — Zwei-Stufen-Token, Cookie-Auth, Dashboard-Shell, Doctor-Theme, `getSharingContext()`, `getSignedMediaUrl()`
- **Story 4.4** ist PATTERN-REFERENZ (done) — `AudioPlayer`, `PhotoGallery`, `EventDetail` Typ, `getEventDetail()` als Vorlage
- **Stories 6.1-6.3** sind NICHT Voraussetzung — temporäre Event-Liste als Entry-Point
- **Stories 6.1-6.3** werden SPÄTER den Entry-Point ersetzen (Timeline-Links, Ranking-Links → Drill-Down)

### Abgrenzung (Out of Scope)

- **NICHT** in dieser Story: KI-generierte Zusammenfassung (Story 6.1)
- **NICHT** in dieser Story: Arzt-Timeline mit Events (Story 6.2)
- **NICHT** in dieser Story: Arzt-Symptom-Ranking (Story 6.3)
- **NICHT** in dieser Story: PDF-Report generieren (Story 6.5)
- **NICHT** in dieser Story: Custom Audio Player mit Waveform (Post-MVP)
- **NICHT** in dieser Story: Swipe-Navigation zwischen Events (Post-MVP)
- **NICHT** in dieser Story: Inline-Edit oder Corrections-Anzeige (Arzt = read-only)

### DB-Schema Referenz (bestehend)

```
symptom_events: id, account_id, event_type, occurred_at, created_at, ended_at,
                raw_input, audio_url, status, deleted_at

extracted_data: id, symptom_event_id, field_name, value, confidence, confirmed, symptom_index
  → field_name values: 'symptom_name', 'body_region', 'side', 'symptom_type',
                       'intensity', 'medication', 'dosage', 'symptom_time', 'duration'

event_photos: id, symptom_event_id, storage_path, created_at
  → Storage bucket: 'photos' (private)

Audio Storage:
  → Bucket: 'audio' (private)
  → Referenziert via: symptom_events.audio_url (storage_path, NICHT signed URL)
```

### Bestehende Code-Patterns (aus Epic 1-5)

| Pattern | Wo anwenden | Referenz |
|---------|-------------|----------|
| `createServiceClient()` | Alle Arzt-Dashboard-Queries | `src/lib/db/client.ts` |
| `getSharingContext()` | Sharing-Kontext (React.cache) | `src/lib/sharing/context.ts` |
| `getSignedMediaUrl()` | Audio + Fotos Signed URLs | `src/lib/db/media.ts` |
| `trackSharingAccessFromPage()` | Audit-Log Eintrag | `src/lib/db/audit.ts` |
| `EventDetail` Typ | Return-Typ für Detail-Daten | `src/types/analytics.ts` |
| `AudioPlayer` | Audio-Streaming | `src/components/event/audio-player.tsx` |
| `PhotoGallery` | Foto-Galerie + Lightbox | `src/components/event/photo-gallery.tsx` |
| `formatDuration()` | Dauer-Anzeige | `src/lib/utils/duration.ts` |
| `redirect()` | Server-Side Redirects | `next/navigation` |
| `Promise.allSettled()` | Resiliente Signed URL Generierung | Pattern aus Story 4.4 |

### Technische Stack-Details

| Technologie | Version | Verwendung in dieser Story |
|-------------|---------|---------------------------|
| Next.js | 16.x | App Router, Server Components, `redirect()` |
| @supabase/supabase-js | ^2.98.0 | Service Client für Arzt-Queries, Signed URLs |
| Tailwind CSS | latest | Responsive Layout, Doctor-Theme Styling |
| shadcn/ui | latest | Dialog (Foto-Lightbox, via PhotoGallery) |
| vitest | ^4.x | Unit Tests |

### Git Intelligence

Letzte relevante Commits:
- `cd282cb` — Epic 5: Sharing-System & Daten-Souveränität (inkl. Story 5.3 Arzt-Zugriff)
- `61bb276` — Epic 4: Patienten-Auswertung (inkl. Story 4.4 Event-Detail-Ansicht)
- `fff6480` — Add LDS/Marfan/cerebrovascular symptom taxonomy to AI extraction

Relevante Pattern-Dateien:
- `src/lib/db/insights.ts` — `getEventDetail()` als Vorlage für `getSharedEventDetail()`
- `src/components/event/event-detail-view.tsx` — Pattern-Referenz für Layout/Struktur
- `src/app/share/dashboard/page.tsx` — Dashboard-Shell, wird erweitert
- `src/lib/sharing/context.ts` — `getSharingContext()` React.cache Pattern

### Project Structure Notes

Neue Dateien:
```
src/
  app/
    share/
      dashboard/
        event/
          [id]/
            page.tsx             → (NEU) Event-Detail Drill-Down (Server Component)
            loading.tsx          → (NEU) Detail Skeleton
  components/
    sharing/
      doctor-event-detail-view.tsx  → (NEU) Arzt Event-Detail Komponente (Client)
```

Geänderte Dateien:
```
src/lib/db/sharing.ts            → getSharedEventDetail() hinzufügen
src/app/share/dashboard/page.tsx → Event-Liste als temporärer Entry-Point
src/types/sharing.ts             → SharedSymptomEvent ggf. erweitern (symptomName)
src/__tests__/lib/db/sharing.test.ts → Tests für getSharedEventDetail()
```

Neue Test-Dateien:
```
src/__tests__/components/sharing/doctor-event-detail-view.test.tsx → Komponenten-Tests
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 6, Story 6.4 (FR30, FR31, FR32)]
- [Source: _bmad-output/planning-artifacts/architecture.md — D3 Sharing-Security (Zwei-Stufen-Token)]
- [Source: _bmad-output/planning-artifacts/architecture.md — D8 Media-Security (Signed URLs, 15min TTL, inline)]
- [Source: _bmad-output/planning-artifacts/architecture.md — Routing /share/dashboard/[symptom]/ Drill-Down]
- [Source: _bmad-output/planning-artifacts/architecture.md — Components: doctor-symptom-view.tsx, audio-player.tsx]
- [Source: _bmad-output/planning-artifacts/architecture.md — RLS Policies: Arzt Read via Sharing-Token]
- [Source: _bmad-output/planning-artifacts/architecture.md — Supabase Client Factories: Service Client für Arzt]
- [Source: _bmad-output/planning-artifacts/architecture.md — D11 Theme-Switching: data-theme="doctor"]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — DrillDownCard (Anatomie, States, Constraints)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — AudioPlayer (Stream, kein Download, Varianten)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — ConfidenceIndicator (Farben, Varianten, Tooltips)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Responsive: iPad 2-Spalten, Desktop 3-Spalten]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Arzt-Theme Abweichungen (Density, Karten, Typografie)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Accessibility: Alt-Texte, Touch-Targets ≥44px, Kontrast AA]
- [Source: _bmad-output/planning-artifacts/prd.md — FR30 (Drill-Down), FR31 (Audio-Stream), FR32 (Foto-Ansicht)]
- [Source: _bmad-output/planning-artifacts/prd.md — NFR6 (Audio-Start <1s), NFR10 (kein Download)]
- [Source: _bmad-output/implementation-artifacts/5-3-arzt-zugriff-sharing.md — Zwei-Stufen-Token, Cookie-Auth, Dashboard-Shell, getSharingContext()]
- [Source: _bmad-output/implementation-artifacts/4-4-event-detail-ansicht.md — EventDetailView, AudioPlayer, PhotoGallery, getEventDetail(), Signed URL Pattern]
- [Source: src/lib/db/insights.ts — getEventDetail() als Vorlage]
- [Source: src/lib/db/sharing.ts — getSharedSymptomEvents(), validateSharingToken()]
- [Source: src/lib/db/media.ts — getSignedMediaUrl() (Service Client)]
- [Source: src/lib/sharing/context.ts — getSharingContext() (React.cache)]
- [Source: src/lib/db/audit.ts — trackSharingAccessFromPage()]
- [Source: src/components/event/audio-player.tsx — AudioPlayer (wiederverwendbar)]
- [Source: src/components/event/photo-gallery.tsx — PhotoGallery (wiederverwendbar)]
- [Source: src/components/event/event-detail-view.tsx — Pattern-Referenz für Layout]
- [Source: src/types/analytics.ts — EventDetail, ExtractedField, EventPhoto Typen]
- [Source: src/app/share/dashboard/page.tsx — Dashboard-Shell (wird erweitert)]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
