# Story 2.3: Review-Ansicht mit Konfidenz-Indikatoren

Status: done

## Story

As a Patient,
I want die KI-extrahierten Daten überprüfen und den Konfidenz-Score jedes Feldes sehen,
So that ich die Qualität der Extraktion einschätzen und bei Bedarf korrigieren kann (FR12, FR15).

## Acceptance Criteria

1. **Given** ein `symptom_event` mit Status `'extracted'` **When** die Review-Ansicht angezeigt wird **Then** werden alle extrahierten Felder in einer ReviewBubble im ChatFeed dargestellt
2. **And** jedes Feld zeigt einen Konfidenz-Indikator: Hoch (≥85% Teal #3A856F), Mittel (70-84% Amber #B8913A), Niedrig (<70% Terracotta #C06A3C)
3. **And** der Patient kann jedes Feld antippen um es zu bearbeiten/korrigieren
4. **And** bestätigte Felder werden als `confirmed: true` markiert
5. **And** korrigierte Felder werden mit dem neuen Wert und `confirmed: true` gespeichert
6. **And** nach Bestätigung wird der Event-Status auf `'confirmed'` gesetzt
7. **And** Korrekturen werden in einer `corrections`-Tabelle protokolliert (Basis für FR13 in Epic 3)

## Tasks / Subtasks

- [x] Task 1: Supabase-Migration — `corrections`-Tabelle (AC: #7)
  - [x] `supabase/migrations/00006_corrections.sql` erstellen
  - [x] Schema: `id UUID PK`, `account_id UUID FK auth.users NOT NULL`, `symptom_event_id UUID FK symptom_events NOT NULL`, `field_name TEXT NOT NULL`, `original_value TEXT NOT NULL`, `corrected_value TEXT NOT NULL`, `created_at TIMESTAMPTZ DEFAULT now()`
  - [x] RLS: Patient INSERT/SELECT (`auth.uid() = account_id`)
  - [x] Index: `idx_corrections_account_id`, `idx_corrections_symptom_event_id`
- [x] Task 2: ReviewBubble-Komponente (AC: #1, #2, #3)
  - [x] `src/components/capture/review-bubble.tsx` erstellen (Client Component)
  - [x] Zeigt extrahierte Felder als SymptomTag-Komponenten
  - [x] Konfidenz-Indikatoren pro Feld (farbcodiert)
  - [x] "Bestätigen"-Button (bg-success, rounded-full, min 48x48px)
  - [x] "Ändern"-Button (bg-muted, rounded-full)
  - [x] Layout: Received-Bubble Styling (`bg-card rounded-2xl rounded-bl-sm shadow-sm`)
- [x] Task 3: SymptomTag-Komponente (AC: #2, #3)
  - [x] `src/components/capture/symptom-tag.tsx` erstellen (Client Component)
  - [x] Props: `label`, `value`, `confidence`, `editable`, `onEdit`, `options?`
  - [x] States: Confirmed (bg-muted), Uncertain (border-warning), Editing (border-dashed, input visible)
  - [x] Tap → Inline-Edit: Dropdown mit Optionen ODER Freitext-Feld
  - [x] `role="button"`, `aria-label="[Label] ändern"`
  - [x] Touch-Target: min 44x44px
- [x] Task 4: ConfidenceIndicator-Komponente (AC: #2)
  - [x] `src/components/capture/confidence-indicator.tsx` erstellen
  - [x] Props: `score: number` (0-100)
  - [x] Rendering: Farbiger Dot + Prozent + Label
  - [x] ≥85%: Teal (#3A856F) + "sicher erkannt"
  - [x] 70-84%: Amber (#B8913A) + "relativ sicher"
  - [x] <70%: Terracotta (#C06A3C) + "unsicher, bitte überprüfen"
  - [x] Nie Farbe allein — immer mit Text-Label (Accessibility)
- [x] Task 5: Server Actions — Bestätigen und Korrigieren (AC: #4, #5, #6, #7)
  - [x] `confirmSymptomEvent(eventId: string): Promise<ActionResult<SymptomEvent>>` in `symptom-actions.ts`
  - [x] Setzt alle `extracted_data.confirmed = true` für diesen Event
  - [x] Setzt `symptom_event.status = 'confirmed'`
  - [x] `correctExtractedField(input): Promise<ActionResult<ExtractedData>>` in `symptom-actions.ts`
  - [x] Validierung: eventId, fieldName, newValue
  - [x] Update: `extracted_data.value` und `confirmed = true`
  - [x] Insert: `corrections`-Tabelle mit original_value und corrected_value
  - [x] Beide Actions: Zod → Auth → DB Pattern
- [x] Task 6: ChatFeed-Integration (AC: #1, #6)
  - [x] ChatBubble erweitern: Bei `status: 'extracted'` → ReviewBubble rendern
  - [x] Bei `status: 'confirmed'` → Bestätigte Ansicht (Tags grün, kein Edit möglich)
  - [x] Übergang: Processing-Dots → ReviewBubble (via Realtime Update)
  - [x] Nach Bestätigung: "Gespeichert ✓" Feedback-Text
- [x] Task 7: Tests (AC: #1-#7)
  - [x] `src/__tests__/review-bubble.test.tsx` — Felder anzeigen, Bestätigen-Button, Ändern-Button
  - [x] `src/__tests__/symptom-tag.test.tsx` — Varianten, Edit-Mode, Tap-Verhalten
  - [x] `src/__tests__/confidence-indicator.test.tsx` — Farbkodierung, Labels, Accessibility
  - [x] `src/__tests__/symptom-actions.test.ts` — Erweitert: confirmSymptomEvent, correctExtractedField
  - [x] `npm run test` verifizieren
- [x] Task 8: Build-Verifikation
  - [x] `npm run lint` fehlerfrei (nur vorbestehende Warnings in sw.js, Sentry-Dateien)
  - [x] `npm run build` erfolgreich

## Dev Notes

### Scope-Abgrenzung (KRITISCH)

Diese Story implementiert:
- ReviewBubble mit extrahierten Feldern und Konfidenz-Indikatoren
- SymptomTag (editierbar, farbcodiert)
- ConfidenceIndicator Komponente
- Bestätigen und Korrigieren Server Actions
- `corrections`-Tabelle für Lern-Daten

Gehört NICHT in diese Story:
- **Conversational Correction (Follow-up Fragen)** → Story 2.4
- **KI-Lernen aus Korrekturen (Few-Shot)** → Epic 3, Story 3.5
- **Persönliches Vokabular** → Epic 3, Story 3.6
- **Lern-Feedback in Chat ("Dieses Mal direkt erkannt")** → Epic 3

### Abhängigkeit: Story 2.1 + 2.2 (VORAUSSETZUNG)

Story 2.1 liefert: ChatBubble, ChatFeed, InputBar, symptom_events-Tabelle
Story 2.2 liefert: extracted_data-Tabelle, KI-Pipeline, Realtime-Updates

### ReviewBubble UX-Pattern

```
┌─────────────────────────────┐
│ Received-Bubble (Review):   │
├─────────────────────────────┤
│ [Rückenschmerzen] [links]   │  ← SymptomTags (tippbar)
│ [Schulterblatt] [ziehend]   │
│ [Intensität: 6/10]          │
│                             │
│ ◉ 92% — sicher erkannt      │  ← ConfidenceIndicator
│                             │
│ [Bestätigen]  [Ändern]      │  ← Action Buttons
└─────────────────────────────┘
```

### Inline-Korrektur Flow

```
1. Patient tippt auf Tag [Schulterblatt]
2. Tag wechselt zu Edit-Mode (dashed border)
3. Dropdown: [Oberer Rücken] [Unterer Rücken] [Schulterblatt] [Anderes...]
4. Patient wählt "Oberer Rücken"
5. Tag aktualisiert sofort, confirmed = true
6. Korrektur in corrections-Tabelle gespeichert
7. Kein Modal, kein separater Screen — alles inline
```

### Konfidenz-Farbsystem (UX-Spec)

```css
/* Hoch (≥85%) — Teal */
.confidence-high { color: #3A856F; }

/* Mittel (70-84%) — Amber */
.confidence-medium { color: #B8913A; }

/* Niedrig (<70%) — Terracotta */
.confidence-low { color: #C06A3C; }
```

Nie Farbe allein — immer Dot + Prozent + Text-Label (Accessibility-Requirement).

### SymptomTag States

```
Confirmed:    bg-muted text-foreground, kein Border
Uncertain:    bg-muted border border-warning, tippbar
Editing:      border-dashed, Input/Dropdown sichtbar
```

### Server Action: confirmSymptomEvent

```typescript
export async function confirmSymptomEvent(
  eventId: string
): Promise<ActionResult<SymptomEvent>> {
  // 1. Auth
  // 2. Update all extracted_data: confirmed = true WHERE symptom_event_id = eventId
  // 3. Update symptom_event: status = 'confirmed'
  // 4. revalidatePath('/')
}
```

### Server Action: correctExtractedField

```typescript
export async function correctExtractedField(
  input: unknown
): Promise<ActionResult<ExtractedData>> {
  // 1. Zod: { eventId, fieldName, newValue }
  // 2. Auth
  // 3. Load current extracted_data row
  // 4. UPDATE extracted_data: value = newValue, confirmed = true
  // 5. INSERT corrections: original_value, corrected_value
  // 6. revalidatePath('/')
}
```

### Anti-Patterns (VERMEIDEN)

- **NICHT** Modal-Dialoge für Korrekturen — alles inline im Chat
- **NICHT** alle Felder gleichzeitig editierbar — eines nach dem anderen
- **NICHT** Farbe als einziger Indikator — immer Text-Label dazu
- **NICHT** "Bestätigen" automatisch nach Timeout — Patient muss aktiv bestätigen
- **NICHT** corrections ohne original_value — immer Both speichern (für Lern-Algorithmus)
- **NICHT** `createServiceClient()` in Server Actions — `createServerClient()` (Patient-Context)

### Neue Dateien

- `supabase/migrations/00006_corrections.sql`
- `src/components/capture/review-bubble.tsx`
- `src/components/capture/symptom-tag.tsx`
- `src/components/capture/confidence-indicator.tsx`
- `src/__tests__/review-bubble.test.tsx`
- `src/__tests__/symptom-tag.test.tsx`
- `src/__tests__/confidence-indicator.test.tsx`

### Modifizierte Dateien

- `src/lib/actions/symptom-actions.ts` — confirmSymptomEvent, correctExtractedField hinzufügen
- `src/components/capture/chat-bubble.tsx` — ReviewBubble bei extracted Status rendern
- `src/components/capture/chat-feed.tsx` — Bestätigte Events visuell unterscheiden
- `src/__tests__/symptom-actions.test.ts` — Erweitert

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 2, Story 2.3]
- [Source: _bmad-output/planning-artifacts/architecture.md — extracted_data Schema, corrections Schema]
- [Source: _bmad-output/planning-artifacts/architecture.md — Server Action Pattern, ActionResult<T>]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — ReviewBubble, SymptomTag, ConfidenceIndicator Specs]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Konfidenz-Farbsystem: Teal/Amber/Terracotta]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Inline-Korrektur Pattern, kein Modal]
- [Source: _bmad-output/planning-artifacts/prd.md — FR12, FR15]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Initiale Testfehler: ReviewBubble-Tests matchten SymptomTag aria-labels statt Ändern-Button → Fix: exakte Regex `/^ändern$/i`
- chat-feed.test.tsx: Tests aktualisisert für neues ReviewBubble-Verhalten bei `extracted`-Status
- symptom-actions.test.ts: Zod v4 erfordert valid UUID v4-Format → Fake-UUID angepasst
- Vorbestehender Fehler: `duration.test.ts` importiert nicht existierendes Modul (Story 2.5)

### Completion Notes List

- ✅ `corrections`-Tabelle mit RLS und Indizes erstellt (Migration 00006)
- ✅ `database.ts` um `corrections`-Typ erweitert
- ✅ ReviewBubble zeigt extrahierte Felder als SymptomTags mit Bestätigen/Ändern-Buttons
- ✅ SymptomTag mit 3 States: Confirmed, Uncertain, Editing (inkl. Inline-Edit und Dropdown)
- ✅ ConfidenceIndicator mit Teal/Amber/Terracotta Farbsystem + Text-Labels (Accessibility)
- ✅ confirmSymptomEvent: Bestätigt alle extracted_data und setzt Event-Status auf 'confirmed'
- ✅ correctExtractedField: Korrigiert Feld, speichert Korrektur in corrections-Tabelle
- ✅ ChatFeed: `extracted`-Status → ReviewBubble, `confirmed`-Status → "Gespeichert ✓"
- ✅ Realtime-Hook erweitert: Lädt extracted_data bei 'confirmed'-Status nach
- ✅ Page: Neue Callbacks onConfirmEvent und onCorrectField durchgereicht
- ✅ 185 Tests bestehen (52 neue/überarbeitete Tests für Review-Komponenten und Server Actions)
- ✅ Build erfolgreich

### Code Review Findings (Fixed)

9 Findings identifiziert, alle behoben:

**HIGH:**
- H1: `confirmSymptomEvent` fehlte Zod-Validierung → Signature auf `(input: unknown)` geändert, `confirmSymptomEventSchema` hinzugefügt
- H2: `correctExtractedField` corrections INSERT Fehler wurde ignoriert → Error-Check hinzugefügt
- H3: Per-Feld Konfidenz-Indikator fehlte → Farbiger Dot zu SymptomTag hinzugefügt

**MEDIUM:**
- M1: ReviewBubble editingField nutzte `field_name` statt `field.id` → auf `field.id` umgestellt
- M2: Kein Happy-Path-Test für `correctExtractedField` → Test hinzugefügt
- M3: ConfidenceIndicator fehlte `role="img"` und `aria-label` → Ergänzt

**LOW:**
- L1: "Anderes..." Dropdown Dead Code in SymptomTag → Entfernt
- L2: `editValue` synchronisierte nicht bei Prop-Änderung → `useEffect` hinzugefügt
- L3: `confirmSymptomEvent` Test-Mocks fragil → `setupConfirmMocks` Helper extrahiert

### File List

**Neue Dateien:**
- `supabase/migrations/00006_corrections.sql`
- `src/components/capture/review-bubble.tsx`
- `src/components/capture/symptom-tag.tsx`
- `src/components/capture/confidence-indicator.tsx`
- `src/__tests__/review-bubble.test.tsx`
- `src/__tests__/symptom-tag.test.tsx`
- `src/__tests__/confidence-indicator.test.tsx`

**Modifizierte Dateien:**
- `src/types/database.ts` — corrections-Tabelle hinzugefügt
- `src/types/symptom.ts` — correctExtractedFieldSchema hinzugefügt
- `src/lib/actions/symptom-actions.ts` — confirmSymptomEvent, correctExtractedField
- `src/components/capture/chat-feed.tsx` — ReviewBubble-Integration, confirmed-Ansicht
- `src/app/(app)/page.tsx` — Confirm/Correct-Callbacks
- `src/hooks/use-symptom-events.ts` — Realtime für confirmed-Status
- `src/__tests__/symptom-actions.test.ts` — Erweitert um confirm/correct Tests
- `src/__tests__/chat-feed.test.tsx` — Aktualisiert für ReviewBubble-Verhalten

## Change Log

- 2026-03-02: Story 2.3 implementiert — ReviewBubble mit Konfidenz-Indikatoren, SymptomTag (3 States), ConfidenceIndicator (Teal/Amber/Terracotta), confirmSymptomEvent und correctExtractedField Server Actions, corrections-Tabelle, ChatFeed-Integration
