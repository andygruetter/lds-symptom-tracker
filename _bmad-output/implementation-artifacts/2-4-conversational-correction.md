# Story 2.4: Conversational Correction bei niedriger Konfidenz

Status: done

## Story

As a Patient,
I want bei unsicheren Extraktionen eine gezielte Nachfrage erhalten statt selbst alle Felder prüfen zu müssen,
So that die Erfassung schneller und genauer wird (FR11).

## Acceptance Criteria

1. **Given** ein extrahiertes Feld hat eine Konfidenz unter 70% **When** die Review-Ansicht aufgebaut wird **Then** zeigt das System eine gezielte Nachfrage als ChatBubble (z.B. "Oberer oder unterer Rücken?")
2. **And** Auswahloptionen werden als tippbare Chips/Buttons angezeigt
3. **And** der Patient kann eine Option auswählen oder eine freie Textantwort geben
4. **And** die Antwort aktualisiert das extrahierte Feld und setzt `confirmed: true`
5. **And** mehrere unsichere Felder werden sequentiell nachgefragt (nicht alle gleichzeitig)
6. **And** maximal 1-2 Nachfrage-Runden pro Event (keine lange Konversation)

## Tasks / Subtasks

- [x] Task 1: Nachfrage-Logik implementieren (AC: #1, #5, #6)
  - [x] `src/lib/ai/clarification.ts` erstellen
  - [x] `generateClarificationQuestions(fields: ExtractedField[]): ClarificationQuestion[]`
  - [x] Filtert Felder mit confidence < 70%
  - [x] Generiert kontextbezogene Fragen pro Feld (regelbasiert, kein LLM-Call nötig)
  - [x] Sortiert nach Priorität: Körperregion > Seite > Symptomtyp > Intensität
  - [x] Max 2 Fragen pro Event (die wichtigsten unsicheren Felder)
  - [x] Vordefinierte Antwort-Optionen pro Feld-Typ (z.B. body_region → Unterkategorien)
- [x] Task 2: ClarificationBubble-Komponente (AC: #1, #2, #3)
  - [x] `src/components/capture/clarification-bubble.tsx` erstellen (Client Component)
  - [x] Fragetext als System-Bubble (bg-card, links-aligniert)
  - [x] Optionen als tippbare Chips: `rounded-full bg-muted px-4 py-2 min-h-11`
  - [x] Freitext-Option: "Andere Antwort..." → Kleines Input-Feld
  - [x] Nach Auswahl: Chip wird hervorgehoben (bg-primary text-primary-foreground)
  - [x] Beantwortet-State: Frage ausgegraut, Antwort sichtbar
  - [x] `role="group"`, `aria-label="Nachfrage: [Frage]"`
- [x] Task 3: ClarificationQuestion Typen (AC: #1)
  - [x] `ClarificationQuestion` Typ in `src/types/ai.ts` ergänzen
  - [x] `{ fieldName: string, question: string, options: string[], allowFreeText: boolean }`
  - [x] Vordefinierte Fragen-Templates pro Feld-Typ
- [x] Task 4: Server Action — Clarification-Antwort verarbeiten (AC: #4)
  - [x] `answerClarification(input): Promise<ActionResult<ExtractedData>>` in `symptom-actions.ts`
  - [x] Input: `{ eventId, fieldName, answer }`
  - [x] Update extracted_data: value = answer, confirmed = true
  - [x] Insert corrections-Tabelle (original_value = alter Wert)
  - [x] Wenn alle unsicheren Felder beantwortet → automatisch `status: 'confirmed'` prüfen
- [x] Task 5: ChatFeed-Integration (AC: #1, #5)
  - [x] ReviewBubble erweitern: Nach Anzeige der Tags, ClarificationBubbles für unsichere Felder rendern
  - [x] Sequentielle Darstellung: Erste Frage sofort, nächste erst nach Beantwortung
  - [x] State-Management: `currentClarificationIndex` für sequentielle Abfolge
  - [x] Nach letzter Antwort: "Bestätigen"-Button erscheint
- [x] Task 6: Tests (AC: #1-#6)
  - [x] `src/__tests__/lib/ai/clarification.test.ts` — Fragen-Generierung, Priorisierung, Max-Limit
  - [x] `src/__tests__/clarification-bubble.test.tsx` — Chips, Freitext, Auswahl-Verhalten
  - [x] `src/__tests__/symptom-actions.test.ts` — Erweitert: answerClarification
  - [x] `npm run test` verifizieren
- [x] Task 7: Build-Verifikation
  - [x] `npm run lint` fehlerfrei (nur vorbestehende Warnings)
  - [x] `npm run build` erfolgreich

## Dev Notes

### Scope-Abgrenzung (KRITISCH)

Diese Story implementiert:
- Automatische Nachfrage-Generierung bei niedriger Konfidenz
- ClarificationBubble mit tippbaren Chips
- Sequentielle Nachfrage-Abfolge (max 2)
- Antwort-Verarbeitung und Feld-Update

Gehört NICHT in diese Story:
- **KI-generierte Nachfragen (LLM-Call)** → Post-MVP Enhancement. MVP nutzt regelbasierte Templates.
- **KI-Lernen aus Antworten** → Epic 3, Story 3.5
- **Multi-Turn Konversation** → Explizit NICHT gewollt. Max 1-2 Runden.
- **Nachfrage bei Medikamenten** → Gleicher Mechanismus, aber separate Fragen-Templates

### Abhängigkeit: Story 2.3 (VORAUSSETZUNG)

Story 2.3 liefert: ReviewBubble, SymptomTag, ConfidenceIndicator, corrections-Tabelle, confirmSymptomEvent/correctExtractedField Actions

### Nachfrage-Flow (UX-Spec)

```
1. KI extrahiert: "Rückenschmerzen" (confidence: 90%), "links" (55%)
2. ReviewBubble zeigt Tags (Rückenschmerzen: grün, links: rot)
3. ClarificationBubble erscheint:
   "Rückenschmerzen — oberer oder unterer Rücken?"
   [Oberer Rücken] [Unterer Rücken] [Schulterblatt] [Andere...]
4. Patient tippt [Schulterblatt]
5. Tag aktualisiert: "Schulterblatt, links" — confirmed
6. Wenn keine weiteren Fragen → "Bestätigen"-Button
```

### Regelbasierte Fragen-Templates (kein LLM nötig)

```typescript
const clarificationTemplates: Record<string, ClarificationTemplate> = {
  body_region: {
    question: '{{symptom_name}} — welche Region genauer?',
    optionsByRegion: {
      'Rücken': ['Oberer Rücken', 'Unterer Rücken', 'Schulterblatt', 'Lendenbereich'],
      'Kopf': ['Stirn', 'Schläfe', 'Hinterkopf', 'Ganzer Kopf'],
      'Bein': ['Oberschenkel', 'Knie', 'Wade', 'Fuss'],
      // ... weitere Regionen
    }
  },
  side: {
    question: 'Welche Seite?',
    options: ['Links', 'Rechts', 'Beidseits']
  },
  intensity: {
    question: 'Wie stark auf einer Skala von 1-10?',
    options: ['Leicht (1-3)', 'Mittel (4-6)', 'Stark (7-9)', 'Unerträglich (10)']
  },
  symptom_type: {
    question: 'Wie fühlt sich {{symptom_name}} an?',
    options: ['Stechend', 'Ziehend', 'Dumpf', 'Brennend', 'Kribbelnd', 'Pochend']
  }
}
```

### Chip-Styling (UX-Spec konform)

```
Default Chip:
  bg-muted text-foreground rounded-full px-4 py-2 min-h-11
  border border-border

Selected Chip:
  bg-primary text-primary-foreground rounded-full px-4 py-2 min-h-11

Disabled Chip (nach Beantwortung):
  bg-muted/50 text-muted-foreground rounded-full px-4 py-2

Gap zwischen Chips: gap-2
Flex-Wrap: flex-wrap (mehrere Zeilen erlaubt)
```

### Anti-Patterns (VERMEIDEN)

- **NICHT** LLM-Call für Nachfrage-Generierung — regelbasiert ist schneller und billiger
- **NICHT** alle Nachfragen gleichzeitig — sequentiell, eines nach dem anderen
- **NICHT** mehr als 2 Nachfragen — Patient soll nicht verhört werden
- **NICHT** Modal/Dialog für Nachfragen — inline im Chat-Flow
- **NICHT** Nachfrage für Felder ≥70% — nur für <70% (Low Confidence)

### Neue Dateien

- `src/lib/ai/clarification.ts` — Nachfrage-Generierung
- `src/components/capture/clarification-bubble.tsx` — Nachfrage-UI
- `src/__tests__/lib/ai/clarification.test.ts`
- `src/__tests__/clarification-bubble.test.tsx`

### Modifizierte Dateien

- `src/types/ai.ts` — ClarificationQuestion Typ hinzufügen
- `src/lib/actions/symptom-actions.ts` — answerClarification Action
- `src/components/capture/review-bubble.tsx` — Clarification-Integration
- `src/components/capture/chat-feed.tsx` — Sequentielle Nachfrage-Logik
- `src/__tests__/symptom-actions.test.ts` — Erweitert

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 2, Story 2.4]
- [Source: _bmad-output/planning-artifacts/architecture.md — Conversational Correction Pattern]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Conversational Correction Flow]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Chip/Button Styling, Touch-Targets]
- [Source: _bmad-output/planning-artifacts/prd.md — FR11: Konfidenz unter 70% → gezielte Nachfrage]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Alle 212 Tests bestehen (27 neue Tests für Clarification-Logik, ClarificationBubble, answerClarification)
- Build erfolgreich
- Lint: nur vorbestehende Warnings (sw.js, Sentry, Supabase)

### Completion Notes List

- ✅ `ClarificationQuestion` Typ in `ai.ts` ergänzt (fieldName, question, options, allowFreeText)
- ✅ `clarification.ts`: Regelbasierte Fragen-Generierung mit Prioritätssortierung, Konfidenz-Schwelle <70%, Max 2 Fragen
- ✅ Vordefinierte Templates: Körperregion, Körperteil, Seite, Intensität, Symptomtyp mit kontextbezogenen Optionen
- ✅ `ClarificationBubble`: Tippbare Chips, "Andere Antwort..." Freitext-Option, beantworteter Zustand, Accessibility (role="group", aria-label)
- ✅ `answerClarification` Server Action: Zod → Auth → DB Pattern, Updates extracted_data + corrections-Tabelle, Auto-Confirm bei allen Feldern beantwortet
- ✅ `answerClarificationSchema` in symptom.ts
- ✅ ReviewBubble erweitert: Empfängt ClarificationQuestions, zeigt sequentielle Bubbles, versteckt Bestätigen-Button bis alle Fragen beantwortet
- ✅ ChatFeed: Berechnet Clarification-Questions aus extractedFields, reicht onAnswerClarification durch
- ✅ Page: answerClarification Action angebunden
- ✅ 212 Tests bestehen, Build erfolgreich

### File List

**Neue Dateien:**
- `src/lib/ai/clarification.ts`
- `src/components/capture/clarification-bubble.tsx`
- `src/__tests__/lib/ai/clarification.test.ts`
- `src/__tests__/clarification-bubble.test.tsx`

**Modifizierte Dateien:**
- `src/types/ai.ts` — ClarificationQuestion Interface hinzugefügt
- `src/types/symptom.ts` — answerClarificationSchema hinzugefügt
- `src/lib/actions/symptom-actions.ts` — answerClarification Action hinzugefügt
- `src/components/capture/review-bubble.tsx` — ClarificationBubble-Integration, sequentielle Abfolge
- `src/components/capture/chat-feed.tsx` — generateClarificationQuestions Import, onAnswerClarification Prop
- `src/app/(app)/page.tsx` — handleAnswerClarification Callback
- `src/__tests__/symptom-actions.test.ts` — answerClarification Tests (4 Tests)
- `src/__tests__/chat-feed.test.tsx` — ClarificationBubble-Integration Test

## Change Log

- 2026-03-03: Story 2.4 implementiert — Conversational Correction mit regelbasierter Nachfrage-Generierung, ClarificationBubble (tippbare Chips + Freitext), sequentieller Abfolge (max 2 Fragen), answerClarification Server Action mit Auto-Confirm
- 2026-03-03: Code Review — 5 Issues gefixed: (1) Race Condition: ReviewBubble von Index-basiert auf Answer-Dict umgestellt, (2) Error-Rollback bei fehlgeschlagener Clarification-Antwort, (3) Error-Feedback + Throw in handleAnswerClarification, (4) Happy-Path-Test für answerClarification hinzugefügt, (5) Ownership-Check in answerClarification. Tests: 214/214, Build OK.
