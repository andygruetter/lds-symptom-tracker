# Story 3.6: Persönliches Symptom-Vokabular

Status: ready-for-dev

## Story

As a Patient,
I want dass das System mein persönliches Symptom-Vokabular aufbaut und erkennt,
So that meine individuellen Beschreibungen (z.B. "Stächä" für stechender Schmerz) korrekt zugeordnet werden (FR14).

## Acceptance Criteria

1. **Given** ein Patient hat mehrfach bestimmte Begriffe verwendet und bestätigt/korrigiert **When** das System das Vokabular aktualisiert **Then** wird die `patient_vocabulary`-Tabelle erstellt mit `account_id`, `patient_term`, `mapped_term`, `usage_count`
2. **And** bei neuen Eingaben werden erkannte Vokabular-Begriffe automatisch zugeordnet
3. **And** das Vokabular wird bei der Extraktion als zusätzlicher Kontext mitgegeben
4. **And** der Patient kann sein Vokabular unter "Mehr" einsehen (Read-only)

## Tasks / Subtasks

- [ ] Task 1: DB-Migration für patient_vocabulary (AC: #1)
  - [ ] `supabase/migrations/00011_patient_vocabulary.sql` erstellen
  - [ ] `patient_vocabulary`-Tabelle: `id UUID PK DEFAULT gen_random_uuid()`, `account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE`, `patient_term TEXT NOT NULL`, `mapped_term TEXT NOT NULL`, `field_name TEXT NOT NULL`, `usage_count INT NOT NULL DEFAULT 1`, `created_at TIMESTAMPTZ DEFAULT now()`, `updated_at TIMESTAMPTZ DEFAULT now()`
  - [ ] UNIQUE Constraint auf `(account_id, patient_term, field_name)` — ein Mapping pro Term+Feld pro Patient
  - [ ] RLS-Policy: Patient liest/schreibt nur eigenes Vokabular (`auth.uid() = account_id`)
  - [ ] Index auf `account_id` für schnelle Abfragen
  - [ ] TypeScript-Typen regenerieren
- [ ] Task 2: Vokabular-Service (AC: #1, #2)
  - [ ] `src/lib/db/vocabulary.ts` erstellen
  - [ ] `getVocabulary(supabase: SupabaseClient, accountId: string): Promise<VocabularyEntry[]>` — alle Einträge des Patienten
  - [ ] `upsertVocabularyEntry(supabase: SupabaseClient, entry: UpsertVocabulary): Promise<void>` — Eintrag erstellen oder `usage_count` erhöhen
  - [ ] `VocabularyEntry` Typ: `{ patientTerm: string, mappedTerm: string, fieldName: string, usageCount: number }`
  - [ ] Service-Client für Pipeline-Kontext, Server-Client für Server Actions
- [ ] Task 3: Vokabular aus Korrekturen aufbauen (AC: #1)
  - [ ] `src/lib/ai/vocabulary-builder.ts` erstellen
  - [ ] `updateVocabularyFromCorrection(supabase: SupabaseClient, accountId: string, correction: { fieldName: string, originalValue: string, correctedValue: string }): Promise<void>`
  - [ ] Logik: Wenn `originalValue !== correctedValue` → Upsert in `patient_vocabulary`
  - [ ] Bei bestehendem Eintrag: `usage_count` incrementieren, `updated_at` aktualisieren
  - [ ] Aufgerufen nach jeder Korrektur in `correctExtractedField` und `answerClarification`
- [ ] Task 4: Prompt-Enrichment erweitern (AC: #2, #3)
  - [ ] `src/lib/ai/prompt-enrichment.ts` erweitern
  - [ ] `buildVocabularyContext(vocabulary: VocabularyEntry[]): string` — formatiert Vokabular als Prompt-Kontext
  - [ ] Format: `Persönliches Vokabular:\n- "Rügge" → "Rücken" (body_region, 5x verwendet)\n- "Stächä" → "stechend" (symptom_type, 3x)`
  - [ ] `ExtractionContext` erweitern: `{ corrections?: string, vocabulary?: string }`
  - [ ] Pipeline-Integration: Vokabular laden und an Extraktion übergeben
- [ ] Task 5: Pipeline-Integration (AC: #2, #3)
  - [ ] `src/lib/ai/pipeline.ts` erweitern
  - [ ] Vor Extraktion: `getVocabulary(supabase, accountId)` laden
  - [ ] `buildVocabularyContext(vocabulary)` → Kontext-String
  - [ ] `extractSymptomData(rawInput, { corrections, vocabulary })` aufrufen
  - [ ] Claude-Provider: Vokabular-Kontext an System-Prompt anhängen (analog zu Corrections in Story 3.5)
  - [ ] Performance: Vocabulary-Query einzelner SELECT → <50ms
- [ ] Task 6: Mehr-Seite Vokabular-Ansicht (AC: #4)
  - [ ] `src/app/(app)/mehr/vokabular/page.tsx` erstellen (Server Component)
  - [ ] Vokabular des Patienten laden (Server-seitig via `createServerClient`)
  - [ ] Read-only Liste: Tabelle mit Spalten "Mein Begriff", "Bedeutung", "Häufigkeit"
  - [ ] Sortiert nach `usage_count` DESC (häufigste zuerst)
  - [ ] Empty-State: "Noch keine Begriffe gelernt. Das System lernt automatisch aus deinen Korrekturen."
  - [ ] Link in Mehr-Seite (`src/app/(app)/mehr/page.tsx`) hinzufügen: "Mein Vokabular"
- [ ] Task 7: Server Actions erweitern (AC: #1)
  - [ ] `src/lib/actions/symptom-actions.ts` — `correctExtractedField` und `answerClarification` erweitern
  - [ ] Nach erfolgreicher Korrektur: `updateVocabularyFromCorrection()` aufrufen
  - [ ] Fire-and-Forget: Vokabular-Update darf Korrektur nicht blockieren (`.catch()` mit Logging)
- [ ] Task 8: Tests (AC: #1-#4)
  - [ ] `src/__tests__/lib/db/vocabulary.test.ts` — getVocabulary, upsertVocabularyEntry
  - [ ] `src/__tests__/lib/ai/vocabulary-builder.test.ts` — updateVocabularyFromCorrection: neuer Eintrag, bestehender Eintrag (increment), gleicher Wert (kein Eintrag)
  - [ ] `src/__tests__/lib/ai/prompt-enrichment.test.ts` — Erweitert: buildVocabularyContext, kombinierter Kontext
  - [ ] `src/__tests__/lib/ai/pipeline.test.ts` — Erweitert: Vokabular in Pipeline
  - [ ] `src/__tests__/app/vokabular-page.test.tsx` — Vokabular-Anzeige, Empty-State
  - [ ] Bestehende Tests dürfen NICHT brechen
  - [ ] `npm run test` verifizieren
- [ ] Task 9: Build-Verifikation
  - [ ] `npm run lint` fehlerfrei
  - [ ] `npm run build` erfolgreich

## Dev Notes

### Scope-Abgrenzung (KRITISCH)

Diese Story implementiert:
- `patient_vocabulary`-Tabelle mit Upsert-Logik
- Automatischer Vokabular-Aufbau aus Korrekturen
- Vokabular als Prompt-Kontext an Claude übergeben
- Read-only Vokabular-Ansicht unter "Mehr"

Gehört NICHT in diese Story:
- **Vokabular manuell bearbeiten/löschen** → Post-MVP (aktuell Read-only)
- **Vokabular zwischen Patienten teilen** → Nicht geplant (datenschutzrechtlich bedenklich)
- **Vokabular-Import/Export** → Post-MVP
- **Automatische Vokabular-Erkennung ohne Korrektur** → Post-MVP (erfordert NLP)
- **Vokabular-Gewichtung im Extraction-Score** → Post-MVP

### Abhängigkeiten

- **Story 2.3**: `correctExtractedField` Action und `corrections`-Tabelle
- **Story 2.4**: `answerClarification` Action
- **Story 3.5**: `ExtractionContext` Interface und Prompt-Enrichment-Pattern (VORAUSSETZUNG)

### Beziehung zu Story 3.5

Story 3.5 führt ein:
- `ExtractionContext` Typ: `{ corrections?: string }`
- `buildCorrectionContext()` in `prompt-enrichment.ts`
- Provider-Interface-Erweiterung: `extract(rawInput, context?)`

Story 3.6 erweitert:
- `ExtractionContext` um `vocabulary?: string`
- `prompt-enrichment.ts` um `buildVocabularyContext()`
- Pipeline lädt zusätzlich Vokabular

### Vokabular-Aufbau Flow

```
1. Patient korrigiert Feld (correctExtractedField oder answerClarification)
2. Korrektur wird in corrections-Tabelle gespeichert (bestehend)
3. NEU: updateVocabularyFromCorrection() wird aufgerufen
4. Wenn original !== corrected:
   → Upsert in patient_vocabulary (ON CONFLICT: usage_count + 1)
5. Bei nächster Extraktion:
   → Vokabular wird als Prompt-Kontext geladen
   → Claude erkennt "Rügge" → "Rücken" automatisch
```

### Prompt-Kontext Format (Vokabular)

```
Persönliches Vokabular dieses Patienten:
- "Rügge" bedeutet "Rücken" (body_region, 5x bestätigt)
- "Stächä" bedeutet "stechend" (symptom_type, 3x bestätigt)
- "Chopfweh" bedeutet "Kopfschmerzen" (symptom_name, 2x bestätigt)

Wenn der Patient diese Begriffe verwendet, übersetze sie direkt und setze Konfidenz auf 90+.
```

### UX: Vokabular-Seite

```
┌──────────────────────────────────┐
│ ← Mein Vokabular                │
├──────────────────────────────────┤
│ Mein Begriff    Bedeutung    #   │
│ ─────────────────────────────── │
│ Rügge           Rücken       5   │
│ Stächä          stechend     3   │
│ Chopfweh        Kopfschmerzen 2  │
│ lingge          links        1   │
├──────────────────────────────────┤
│ Das System lernt automatisch     │
│ aus deinen Korrekturen.          │
└──────────────────────────────────┘
```

- Read-only (kein Edit/Delete in MVP)
- Sortiert nach Häufigkeit (usage_count DESC)
- Einfache Tabelle, kein komplexes UI nötig

### Mehr-Seite Navigation

```typescript
// Bestehende Mehr-Seite erweitern mit neuem Link:
<Link href="/mehr/vokabular">
  <BookOpen className="h-5 w-5" />
  Mein Vokabular
</Link>
```

### Upsert-Pattern (Supabase)

```typescript
const { error } = await supabase
  .from('patient_vocabulary')
  .upsert(
    {
      account_id: accountId,
      patient_term: originalValue.toLowerCase(),
      mapped_term: correctedValue,
      field_name: fieldName,
      usage_count: 1,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'account_id,patient_term,field_name',
      ignoreDuplicates: false,
    }
  )

// Für Increment: Separater Update nach Upsert-Conflict
// ODER: RPC-Funktion in Migration für atomares Increment
```

**Hinweis**: Supabase `upsert` kann `usage_count` nicht direkt incrementieren. Optionen:
1. **RPC-Funktion** in Migration: `increment_vocabulary_count(p_account_id, p_term, p_field_name)` — atomarer Increment
2. **Select + Insert/Update** Pattern im Service — einfacher, aber Race-Condition-anfällig bei hoher Last (für MVP akzeptabel)

Empfehlung: Option 2 (Select + Insert/Update) für MVP, da Vokabular-Updates selten und nicht zeitkritisch.

### Anti-Patterns (VERMEIDEN)

- **NICHT** Vokabular-Einträge bei jedem Event erstellen — nur bei Korrekturen (expliziter Lernmoment)
- **NICHT** Vokabular unlimitiert wachsen lassen — ggf. Max 200 Einträge pro Patient (Performance)
- **NICHT** Vokabular bearbeitbar machen — MVP ist Read-only, Bearbeitung in Post-MVP
- **NICHT** Vokabular synchron in Pipeline laden wenn keines existiert — schneller Check, leeres Array
- **NICHT** `patient_term` case-sensitiv speichern — immer `toLowerCase()` für konsistenten Match
- **NICHT** Vokabular-Update awaiten in Server Actions — Fire-and-Forget mit `.catch()`

### Neue Dateien

- `src/lib/db/vocabulary.ts` — Vokabular-Service
- `src/lib/ai/vocabulary-builder.ts` — Vokabular aus Korrekturen aufbauen
- `src/app/(app)/mehr/vokabular/page.tsx` — Vokabular-Ansicht
- `supabase/migrations/00011_patient_vocabulary.sql`
- `src/__tests__/lib/db/vocabulary.test.ts`
- `src/__tests__/lib/ai/vocabulary-builder.test.ts`
- `src/__tests__/app/vokabular-page.test.tsx`

### Modifizierte Dateien

- `src/types/ai.ts` — `VocabularyEntry` Typ, `ExtractionContext` erweitern
- `src/lib/ai/prompt-enrichment.ts` — `buildVocabularyContext()` hinzufügen
- `src/lib/ai/pipeline.ts` — Vokabular laden und an Extraktion übergeben
- `src/lib/ai/providers/claude.ts` — Vokabular-Kontext an Prompt anhängen
- `src/lib/actions/symptom-actions.ts` — `correctExtractedField`, `answerClarification` → Vokabular-Update
- `src/app/(app)/mehr/page.tsx` — Link zu Vokabular-Seite
- `src/types/database.ts` — Regeneriert nach Migration
- `src/__tests__/lib/ai/prompt-enrichment.test.ts` — Erweitert
- `src/__tests__/lib/ai/pipeline.test.ts` — Erweitert

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 3, Story 3.6]
- [Source: _bmad-output/planning-artifacts/prd.md — FR14: Persönliches Vokabular]
- [Source: _bmad-output/planning-artifacts/architecture.md — KI-Pipeline, Prompt-Enrichment]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Mehr-Seite Navigation]
- [Source: _bmad-output/implementation-artifacts/3-5-ki-lernen-korrekturen.md — ExtractionContext Pattern]
- [Source: supabase/migrations/00006_corrections.sql — corrections Tabelle]
- [Source: src/lib/ai/providers/claude.ts — System-Prompt-Erweiterung]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

## Change Log

- 2026-03-03: Story 3.6 erstellt — Persönliches Vokabular mit automatischem Aufbau aus Korrekturen, Prompt-Enrichment, Read-only Ansicht
