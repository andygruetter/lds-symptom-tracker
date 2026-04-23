---
title: 'KI-Dauer-Extraktion mit manuellem Slider-Fallback'
slug: 'duration-extraction-slider'
created: '2026-03-31'
status: 'Completed'
stepsCompleted: [1, 2, 3, 4, 5, 6]
tech_stack: ['Next.js (App Router)', 'React 19', 'TypeScript', 'Tailwind CSS', 'Supabase', 'Vitest + Testing Library']
files_to_modify: ['src/components/capture/review-bubble.tsx', 'src/components/capture/chat-bubble.tsx', 'src/components/capture/chat-feed.tsx', 'src/components/event/event-detail-utils.ts', 'src/lib/ai/validation.ts', 'src/lib/ai/clarification.ts', 'src/types/symptom.ts', 'src/lib/actions/symptom-actions.ts', 'src/hooks/use-symptom-events.ts', 'src/app/(app)/page.tsx', 'src/lib/utils/duration.ts', 'e2e/symptom-beenden.spec.ts']
code_patterns: ['Server Actions mit Zod-Validation', 'Realtime-Subscription via Supabase Channel', 'correctExtractedField fuer Insert/Update von extracted_data', 'formatDurationMinutes() fuer Dauer-Anzeige', 'STRUCTURED_FIELDS Set kontrolliert Rendering-Layout', 'editingField State fuer Inline-Edit-Modus']
test_patterns: ['vi.fn() Mocks + vi.clearAllMocks() in beforeEach', 'screen.getByText/queryByText Assertions', 'fireEvent.click fuer Interaktionen', 'makeField() Helper fuer ExtractedData-Fixtures', 'Describe-Block pro Feature/Action']
---

# Tech-Spec: KI-Dauer-Extraktion mit manuellem Slider-Fallback

**Created:** 2026-03-31

## Overview

### Problem Statement

Die Dauer eines Symptoms wird zwar von der KI extrahiert, aber nirgends prominent genutzt. Das manuelle "Symptom beenden"-Feature ist in der Praxis zu umstaendlich -- Patienten vergessen es oder finden es laestig. Das `ended_at`-Feld auf `symptom_events` ist dadurch nutzlos.

### Solution

Dauer wird primaer durch KI-Extraktion aus der Meldung gesetzt (funktioniert bereits). Wenn die KI keine Dauer extrahieren konnte, erscheint ein Slider direkt in der Review-Bubble mit diskreten Stufen. Dauer ist Pflichtfeld — Bestaetigung nur mit gesetzter Dauer moeglich. Das gesamte "Symptom beenden"-Feature wird entfernt.

### Scope

**In Scope:**
- Duration-Slider in Review-Bubble wenn keine Dauer extrahiert wurde
- Slider-Stufen: < 30 Sek, 1 Min, 5 Min, 15 Min, 30 Min, 1 Std, 2 Std, 4 Std, 8 Std, 12 Std, 24 Std
- "< 30 Sek." als Spezialwert `0` speichern, Anzeige "< 30 Sek."
- Slider auch als Edit-Modus fuer bereits KI-extrahierte Dauer
- Dauer ist Pflichtfeld — Bestaetigen-Button disabled ohne Duration
- "Symptom beenden"-Feature komplett entfernen
- Validation anpassen (`min: 0` statt `min: 1`)

**Out of Scope:**
- `ended_at`-Spalte aus DB-Schema entfernen (Breaking Change, kann bleiben)
- Aenderungen am KI-Prompt (Dauer-Extraktion funktioniert bereits)
- Event-Detail-View / Edit-Form Anpassungen

## Context for Development

### Codebase Patterns

- **Server Actions**: Zod-Schema-Validation -> Auth-Check -> Ownership-Check -> DB-Operation -> `revalidatePath`
- **Extracted Data Flow**: `correctExtractedField` unterstuetzt Insert (neues Feld) und Update (bestehendes Feld). Speichert Correction-History und triggert Vocabulary-Builder.
- **Review-Bubble Rendering**: `STRUCTURED_FIELDS` Set kontrolliert welche Felder im strukturierten Layout erscheinen (vs. generische SymptomTags). Duration ist bereits in `STRUCTURED_FIELDS`.
- **Inline-Edit**: `editingField` State (string ID oder null) steuert welches Feld gerade editiert wird. `renderEditableField()` zeigt SymptomTag im Edit-Modus oder klickbaren Content.
- **Clarification**: `generateClarificationQuestions()` erzeugt max 2 Fragen fuer Felder mit Confidence < 70%. Duration hat Priority 6 (niedrig). Template: Button-Optionen + Freitext.
- **Duration-Formatierung**: `formatDurationMinutes(minutesStr)` gibt `null` bei `<= 0` zurueck — muss fuer Wert `0` ("< 30 Sek.") angepasst werden.
- **Realtime**: `useSymptomEvents` Hook subscribed auf `symptom_events_changes` Channel. Updates werden automatisch in den State uebernommen.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/components/capture/review-bubble.tsx` | Haupt-Aenderung: Slider einbauen, Duration-Edit-Modus, Pflichtfeld-Check |
| `src/components/capture/chat-bubble.tsx` | Entfernen: `onEndSymptom` Button, `activeSinceLabel`, `durationLabel` Props |
| `src/components/capture/chat-feed.tsx` | Entfernen: `ended_at`-Logik, System-Bubble, `formatActiveSince`-Import, `hasActiveEvents`-Timer |
| `src/app/(app)/page.tsx` | Entfernen: `endSymptomEvent`-Import, `handleEndSymptom`-Handler, `onEndSymptom`-Prop |
| `src/components/event/event-detail-utils.ts` | Anpassen: `formatDurationMinutes()` fuer Wert `0` |
| `src/lib/ai/validation.ts` | Anpassen: `duration.min: 0` statt `1` |
| `src/lib/ai/clarification.ts` | Duration-Clarification-Template entfernen |
| `src/lib/actions/symptom-actions.ts` | Entfernen: `endSymptomEvent` Action |
| `src/types/symptom.ts` | Entfernen: `endSymptomEventSchema` |
| `src/lib/utils/duration.ts` | Entfernen: nur `formatActiveSince`. `formatDuration` bleibt (Event-Detail, PDF, Sharing) |
| `e2e/symptom-beenden.spec.ts` | Entfernen: gesamte E2E-Test-Datei |

### Technical Decisions

- Dauer wird ausschliesslich als `extracted_data`-Feld gespeichert (`field_name = 'duration'`, Wert in Minuten)
- `ended_at` auf `symptom_events` wird nicht mehr geschrieben/genutzt
- Slider-Wert `0` = "< 30 Sek." (Spezialfall in Formatierung)
- **Slider mit Snap-Points**: Nativer `<input type="range">` mit 11 diskreten Positionen (Index 0-10), gemappt auf Minuten-Werte [0, 1, 5, 15, 30, 60, 120, 240, 480, 720, 1440]. Labels an den Enden ("< 30s" / "24 Std"), aktueller Wert als Label ueber dem Thumb. Rastet beim Loslassen auf naechste Stufe ein.
- **Ein Component fuer beide Use-Cases**: Slider erscheint (a) wenn KI keine Dauer extrahiert hat UND (b) als Edit-Modus wenn User den KI-extrahierten Wert aendern will
- **Bestehende Events mit `ended_at` ignorieren** — kein Legacy-Display noetig
- Slider-Wert wird ueber bestehenden `correctExtractedField`-Action-Pfad gespeichert (Insert bei fehlendem Feld, Update bei bestehendem)
- Duration-Clarification-Template wird entfernt — Slider ersetzt die Clarification-Frage komplett
- **Dauer ist Pflicht**: Bestaetigen-Button disabled wenn kein Duration-Feld existiert und Slider noch nicht bewegt. Hinweis "Bitte Dauer angeben" unter dem Slider.
- **Snap-Point-Logik als pure Functions**: `DURATION_STEPS` Array, `stepIndexToMinutes(index)`, `minutesToStepIndex(minutes)`, `formatStepLabel(minutes)` — testbar ohne DOM.
- **`duration.ts` behalten**: Nur `formatActiveSince` entfernen. `formatDuration` bleibt fuer `event-detail-sections.tsx`, PDF-Export und Sharing.
- **Medikament-Erkennung in ReviewBubble**: Kein neues Prop — `const isMedication = extractedFields.some(f => f.field_name === 'medication_name')`. Slider und Pflichtfeld-Check nur fuer Symptome.
- **Slider DB-Write nur beim Loslassen**: `onChange` aktualisiert nur lokalen State (`selectedIndex`). `correctExtractedField` wird erst bei `onPointerUp`/`onTouchEnd` aufgerufen (Commit-Pattern).
- **`sliderDuration` nach Commit nullen**: Nach erfolgreichem `onCorrect`-Call `setSliderDuration(null)` — der Wert kommt dann aus den echten DB-Daten (`extractedFields`) zurueck.
- **Duration optional wenn `frequency` vorhanden**: Bei chronischen Symptomen ("seit 3 Tagen") extrahiert die KI `frequency` statt `duration`. In diesem Fall ist der Slider optional — Bestaetigen-Button nicht blockiert. Check: `const hasDuration = isMedication || hasFrequency || extractedFields.some(f => f.field_name === 'duration') || sliderDuration !== null`

## Implementation Plan

### Tasks

#### Phase 1: Foundation (keine Abhaengigkeiten)

- [x] Task 1: Duration-Slider Utility Functions erstellen
  - File: `src/lib/utils/duration-steps.ts` (NEU)
  - Action: Pure Functions fuer Slider-Logik erstellen:
    - `DURATION_STEPS = [0, 1, 5, 15, 30, 60, 120, 240, 480, 720, 1440]` als exportiertes const Array
    - `stepIndexToMinutes(index: number): number` — Index 0-10 auf Minuten-Wert mappen
    - `minutesToStepIndex(minutes: number): number` — Minuten-Wert auf naechsten Step-Index mappen (fuer KI-extrahierte Werte die nicht exakt auf einen Step fallen)
    - `formatStepLabel(minutes: number): string` — Minuten-Wert als lesbares Label ("< 30 Sek.", "1 Min.", "5 Min.", "15 Min.", "30 Min.", "1 Std.", "2 Std.", "4 Std.", "8 Std.", "12 Std.", "24 Std.")

- [x] Task2: Validation anpassen — `duration.min: 0`
  - File: `src/lib/ai/validation.ts`
  - Action: In `NUMERIC_FIELDS` den Wert `duration: { min: 1, max: 43200 }` aendern zu `duration: { min: 0, max: 43200 }`

- [x] Task3: `formatDurationMinutes()` fuer Wert `0` anpassen
  - File: `src/components/capture/review-bubble.tsx` (lokale Funktion, Zeile 69-77)
  - Action: Die Bedingung `if (isNaN(minutes) || minutes <= 0) return null` aendern zu: `if (isNaN(minutes) || minutes < 0) return null` und neuen Case hinzufuegen: `if (minutes === 0) return '< 30 Sek.'`
  - File: `src/components/event/event-detail-utils.ts` (exportierte Funktion, Zeile 36-44)
  - Action: Gleiche Aenderung wie oben — `minutes < 0` statt `minutes <= 0`, plus `if (minutes === 0) return '< 30 Sek.'`

#### Phase 2: "Symptom beenden" entfernen

- [x] Task4: `endSymptomEvent` Action und Schema entfernen
  - File: `src/lib/actions/symptom-actions.ts`
  - Action: Gesamte `endSymptomEvent` Funktion (Zeile 259-324) entfernen. Import von `endSymptomEventSchema` aus der Import-Liste entfernen.
  - File: `src/types/symptom.ts`
  - Action: `endSymptomEventSchema` (Zeile 26-28) und zugehoeriger Kommentar entfernen.

- [x] Task5: `onEndSymptom` aus Page-Component entfernen
  - File: `src/app/(app)/page.tsx`
  - Action: `endSymptomEvent` aus Import (Zeile 17) entfernen. `handleEndSymptom` Handler-Funktion (um Zeile 96) entfernen. `onEndSymptom={handleEndSymptom}` Prop (Zeile 165) entfernen.

- [x] Task6: `onEndSymptom`, `activeSinceLabel`, `durationLabel` aus ChatBubble entfernen
  - File: `src/components/capture/chat-bubble.tsx`
  - Action:
    - Props entfernen: `activeSinceLabel`, `durationLabel`, `onEndSymptom` (Zeile 30-32)
    - Destructuring in Funktion anpassen (Zeile 381)
    - "Aktiv seit"-Badge + "Symptom beendet"-Button entfernen (Zeile 603-620)
    - "Dauer:"-Badge entfernen (Zeile 622-628)

- [x] Task7: `ended_at`-Logik aus ChatFeed entfernen
  - File: `src/components/capture/chat-feed.tsx`
  - Action:
    - Import entfernen: `formatActiveSince, formatDuration` aus `@/lib/utils/duration` (Zeile 8)
    - `onEndSymptom` aus Props-Interface und Destructuring entfernen (Zeile 26, 54)
    - `hasActiveEvents`-Check und 60s-Timer-`useEffect` entfernen (Zeile 70-77)
    - `activeSinceLabel`-Prop entfernen (Zeile 191-195)
    - `durationLabel`-Prop entfernen (Zeile 196-203)
    - `onEndSymptom`-Prop entfernen (Zeile 204-208)
    - System-Bubble "Symptom beendet — Dauer: X" entfernen (Zeile 216-223)

- [x] Task8: `formatActiveSince` aus `duration.ts` entfernen
  - File: `src/lib/utils/duration.ts`
  - Action: `formatActiveSince` Funktion (Zeile 16-18) und ihren Export entfernen. `formatDuration` bleibt (wird in `event-detail-sections.tsx` importiert).

- [x] Task9: E2E-Test fuer "Symptom beenden" entfernen
  - File: `e2e/symptom-beenden.spec.ts`
  - Action: Gesamte Datei loeschen.

#### Phase 3: Duration-Slider einbauen (abhaengig von Phase 1)

- [x] Task10: DurationSlider Component erstellen
  - File: `src/components/capture/duration-slider.tsx` (NEU)
  - Action: Neue `'use client'` Komponente erstellen:
    - Props: `{ value?: number; onChange: (minutes: number) => void }`
    - `value` ist der aktuelle Wert in Minuten (undefined wenn kein Wert gesetzt)
    - State: `selectedIndex` — initialisiert aus `value` via `minutesToStepIndex()` oder `null` wenn kein Wert
    - Render: `<input type="range" min={0} max={10} step={1}>` mit Tailwind-Styling
    - Label links: "< 30s", Label rechts: "24 Std."
    - Aktueller Wert als zentriertes Label ueber dem Slider: `formatStepLabel(stepIndexToMinutes(selectedIndex))`
    - Wenn `selectedIndex === null` (kein Wert): Hinweis "Bitte Dauer angeben" in `text-muted-foreground text-xs`
    - `onChange`-Handler: Aktualisiert nur lokalen State `selectedIndex`. Label aktualisiert sich live.
    - `onCommit`-Handler: Wird bei `onPointerUp`/`onTouchEnd` aufgerufen — erst dann `onChange(stepIndexToMinutes(selectedIndex))` an Parent weitergeben (vermeidet DB-Writes bei jedem Slider-Schritt)
    - Accessibility: `aria-label="Symptomdauer"`, `aria-valuetext={formatStepLabel(...)}`, `min-h-[44px]`

- [x] Task11: DurationSlider in ReviewBubble integrieren
  - File: `src/components/capture/review-bubble.tsx`
  - Action:
    - Import: `DurationSlider` aus `./duration-slider`
    - In `SingleSymptomReview`: Pruefen ob `duration`-Feld in `fields` existiert
    - **Wenn Dauer fehlt**: DurationSlider mit `value={undefined}` anzeigen, unter dem Clock-Bereich (nach Zeile 253)
    - **Wenn Dauer vorhanden**: Bestehende Anzeige beibehalten (formatierter Text). Beim Tippen auf das Duration-Feld (renderEditableField) statt SymptomTag-Freitext den DurationSlider als Edit-Modus zeigen.
    - `onChange`-Handler: `handleEdit('duration', String(minutes))` aufrufen (nutzt bestehenden `onCorrect`-Pfad)
    - Neuer lokaler State `sliderDuration: number | null` fuer den Fall dass noch kein Feld in `extracted_data` existiert. Beim Slider-Change wird `sliderDuration` gesetzt UND `onCorrect` aufgerufen.

- [x] Task12: Pflichtfeld-Check — Bestaetigen-Button disabled ohne Duration
  - File: `src/components/capture/review-bubble.tsx`
  - Action:
    - In `ReviewBubble`: Pruefen ob mindestens ein `duration`-Feld (in irgendeinem symptomIndex) existiert ODER `sliderDuration !== null`
    - Medikament-Check: `const isMedication = extractedFields.some(f => f.field_name === 'medication_name')`
    - Frequency-Check: `const hasFrequency = extractedFields.some(f => f.field_name === 'frequency')`
    - Variable: `const hasDuration = isMedication || hasFrequency || extractedFields.some(f => f.field_name === 'duration') || sliderDuration !== null`
    - Bestaetigen-Button: `disabled={isConfirming || !hasDuration}`
    - Wenn `!hasDuration`: Hinweis "Bitte Dauer angeben" anzeigen
    - Medikamente und Symptome mit `frequency` brauchen keine Dauer.

- [x] Task13: Duration-Clarification-Template entfernen
  - File: `src/lib/ai/clarification.ts`
  - Action: Den `duration`-Eintrag aus dem `clarificationTemplates`-Objekt (Zeile 150-159) entfernen. Duration-Clarification wird nicht mehr generiert — der Slider in der ReviewBubble uebernimmt diese Rolle.

#### Phase 4: Tests

- [x] Task14: Unit Tests fuer `duration-steps.ts`
  - File: `src/__tests__/lib/utils/duration-steps.test.ts` (NEU)
  - Action: Tests fuer alle pure Functions:
    - `stepIndexToMinutes`: Jeder Index 0-10 gibt korrekten Minuten-Wert
    - `minutesToStepIndex`: Exakte Werte (60 -> Index 5), Zwischen-Werte (90 -> naechster Step-Index 5 oder 6)
    - `formatStepLabel`: Wert 0 -> "< 30 Sek.", 1 -> "1 Min.", 60 -> "1 Std.", 1440 -> "24 Std."

- [x] Task15: Unit Tests fuer DurationSlider Component
  - File: `src/__tests__/components/capture/duration-slider.test.tsx` (NEU)
  - Action: Tests:
    - Rendert Slider mit `role="slider"`
    - Zeigt "Bitte Dauer angeben" wenn kein `value`
    - Zeigt formatierten Wert wenn `value` gesetzt (z.B. `value={120}` -> "2 Std.")
    - Ruft `onChange` mit korrektem Minuten-Wert bei Aenderung auf
    - Hat `aria-label="Symptomdauer"`

- [x] Task16: ReviewBubble Tests fuer Slider-Integration und Pflichtfeld
  - File: `src/__tests__/review-bubble.test.tsx` (bestehend oder NEU — pruefen)
  - Action: Tests:
    - Zeigt DurationSlider wenn kein Duration-Feld in extractedFields
    - Zeigt formatierten Duration-Wert wenn Duration-Feld vorhanden
    - Bestaetigen-Button disabled wenn keine Duration gesetzt
    - Bestaetigen-Button enabled nach Slider-Auswahl
    - Slider nicht angezeigt fuer Medikamenten-Events

- [x] Task17: Bestehende Tests anpassen
  - File: `src/__tests__/chat-bubble.test.tsx`
  - Action: Tests entfernen die `activeSinceLabel`, `durationLabel`, `onEndSymptom` pruefen (ca. Zeile 127-185 und 533-551)
  - File: `src/__tests__/chat-feed.test.tsx`
  - Action: Tests entfernen die System-Bubble "Symptom beendet" und `ended_at`-Logik pruefen
  - File: `src/__tests__/symptom-actions.test.ts`
  - Action: Gesamten `describe('endSymptomEvent', ...)` Block entfernen (Zeile 754+)
  - File: `src/__tests__/lib/ai/validation.test.ts`
  - Action: Duration-Validation-Test anpassen: `min: 0` statt `min: 1`. Test hinzufuegen dass Wert `0` valide ist.
  - File: `src/__tests__/lib/ai/clarification.test.ts`
  - Action: Tests die Duration-Clarification-Template pruefen entfernen/anpassen
  - File: `src/__tests__/lib/utils/duration.test.ts`
  - Action: Tests fuer `formatActiveSince` entfernen. Tests fuer `formatDuration` behalten.
  - File: `src/__tests__/example.test.tsx`
  - Action: Mock `endSymptomEvent: vi.fn()` (Zeile 39) entfernen falls vorhanden

### Acceptance Criteria

- [x] AC1: Given ein Symptom-Event ohne KI-extrahierte Dauer, when die Review-Bubble angezeigt wird, then erscheint ein Duration-Slider mit 11 Stufen (< 30 Sek bis 24 Std)
- [x] AC2: Given der Slider wurde nicht bewegt und keine Dauer existiert, when der User "Bestaetigen" drueckt, then ist der Button disabled und ein Hinweis "Bitte Dauer angeben" wird angezeigt
- [x] AC3: Given der User bewegt den Slider auf "2 Std", when er loslaesst, then wird der Wert "120" ueber `correctExtractedField` als `duration`-Feld gespeichert und der Bestaetigen-Button wird aktiv
- [x] AC4: Given ein Symptom-Event mit KI-extrahierter Dauer "120", when die Review-Bubble angezeigt wird, then zeigt sie "2 Std." als formatierten Dauer-Wert an
- [x] AC5: Given ein Symptom-Event mit KI-extrahierter Dauer, when der User auf den Dauer-Wert tippt, then erscheint ein Slider im Edit-Modus mit dem aktuellen Wert voreingestellt
- [x] AC6: Given der User waehlt "< 30 Sek." im Slider, when der Wert gespeichert wird, then steht `"0"` in `extracted_data.value` und die Anzeige zeigt "< 30 Sek."
- [x] AC7: Given ein Medikamenten-Event, when die Review-Bubble angezeigt wird, then erscheint kein Duration-Slider und der Bestaetigen-Button ist nicht an Duration gebunden
- [x] AC7b: Given ein Symptom-Event mit extrahiertem `frequency`-Feld ("seit 3 Tagen") aber ohne `duration`, when die Review-Bubble angezeigt wird, then ist der Bestaetigen-Button aktiv (Duration optional bei chronischen Symptomen)
- [x] AC8: Given ein bestaetigtes Symptom-Event, when der Chat-Feed angezeigt wird, then gibt es keinen "Symptom beendet"-Button, keine "Aktiv seit"-Badge, keine System-Bubble "Symptom beendet — Dauer: X"
- [x] AC9: Given `duration` Wert `0` in der KI-Extraktion, when die Validation laeuft, then wird der Wert akzeptiert (nicht auf Konfidenz 0 gesetzt)
- [x] AC10: Given eine niedrige Konfidenz auf dem Duration-Feld (<70%), when Clarification-Questions generiert werden, then wird keine Duration-Clarification-Frage erzeugt (Slider ersetzt das)

## Additional Context

### Dependencies

- Keine neuen Dependencies noetig. Slider wird mit nativem `<input type="range">` + Tailwind CSS gebaut.
- `correctExtractedField` Server Action wird wiederverwendet — kein neuer API-Pfad.

### Testing Strategy

- **Unit Tests (Pure Functions)**: `duration-steps.ts` — Snap-Point-Mapping, Label-Formatierung
- **Component Tests**: `DurationSlider` — Rendering, Interaktion, Accessibility
- **Integration Tests**: ReviewBubble + Slider — Pflichtfeld-Check, Edit-Modus, `onCorrect`-Pfad
- **Entfernte Tests**: Alle Tests die `onEndSymptom`, `activeSinceLabel`, `durationLabel`, `ended_at`, `endSymptomEvent` pruefen
- **Angepasste Tests**: Validation min=0, Clarification ohne Duration, duration.test.ts ohne formatActiveSince
- **E2E**: `e2e/symptom-beenden.spec.ts` wird geloescht

### Notes

- `formatDurationMinutes()` existiert doppelt: in `review-bubble.tsx` (lokal) und in `event-detail-utils.ts` (exportiert). Beide muessen Wert `0` behandeln.
- `formatDuration()` in `duration.ts` bleibt — wird von `event-detail-sections.tsx` importiert.
- `ended_at`-Spalte bleibt in DB und Types. Wird nur nicht mehr beschrieben oder gelesen. Kann spaeter in einer separaten Migration entfernt werden.
- `useSymptomEvents` hat `ended_at: null` im optimistischen Event-Create — kann bleiben, schadet nicht.
- Slider-Component koennte spaeter auch fuer Intensitaet (1-10) wiederverwendet werden — aber das ist Out of Scope.

## Review Notes

- Adversarial review completed (2026-04-01)
- Findings: 11 total, 9 fixed, 2 skipped
- Resolution approach: auto-fix
- Skipped: F5 (multi-symptom isMedication scope — edge case, low priority), F7 (confidence=100 for manual values — no functional bug)
- Key fixes: DurationSlider prop sync, double-commit on touch, UNKNOWN field hasDuration bypass, sliderDuration stale-on-rerun, button hint, formatStepLabel float, frequency-event slider suppression, hasFrequency test coverage
