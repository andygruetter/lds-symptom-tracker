# Story 3.6: Persönliches Symptom-Vokabular

Status: done

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

- [x] Task 1: DB-Migration für patient_vocabulary (AC: #1)
  - [x] `supabase/migrations/00011_patient_vocabulary.sql` erstellen
  - [x] `patient_vocabulary`-Tabelle: `id UUID PK DEFAULT gen_random_uuid()`, `account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE`, `patient_term TEXT NOT NULL`, `mapped_term TEXT NOT NULL`, `field_name TEXT NOT NULL`, `usage_count INT NOT NULL DEFAULT 1`, `created_at TIMESTAMPTZ DEFAULT now()`, `updated_at TIMESTAMPTZ DEFAULT now()`
  - [x] UNIQUE Constraint auf `(account_id, patient_term, field_name)` — ein Mapping pro Term+Feld pro Patient
  - [x] RLS-Policy: Patient liest/schreibt nur eigenes Vokabular (`auth.uid() = account_id`)
  - [x] Index auf `account_id` für schnelle Abfragen
  - [x] TypeScript-Typen regenerieren
- [x] Task 2: Vokabular-Service (AC: #1, #2)
  - [x] `src/lib/db/vocabulary.ts` erstellen
  - [x] `getVocabulary(supabase: SupabaseClient, accountId: string): Promise<VocabularyEntry[]>` — alle Einträge des Patienten
  - [x] `upsertVocabularyEntry(supabase: SupabaseClient, entry: UpsertVocabulary): Promise<void>` — Eintrag erstellen oder `usage_count` erhöhen
  - [x] `VocabularyEntry` Typ: `{ patientTerm: string, mappedTerm: string, fieldName: string, usageCount: number }`
  - [x] Service-Client für Pipeline-Kontext, Server-Client für Server Actions
- [x] Task 3: Vokabular aus Korrekturen aufbauen (AC: #1)
  - [x] `src/lib/ai/vocabulary-builder.ts` erstellen
  - [x] `updateVocabularyFromCorrection(supabase: SupabaseClient, accountId: string, correction: { fieldName: string, originalValue: string, correctedValue: string }): Promise<void>`
  - [x] Logik: Wenn `originalValue !== correctedValue` → Upsert in `patient_vocabulary`
  - [x] Bei bestehendem Eintrag: `usage_count` incrementieren, `updated_at` aktualisieren
  - [x] Aufgerufen nach jeder Korrektur in `correctExtractedField` und `answerClarification`
- [x] Task 4: Prompt-Enrichment erweitern (AC: #2, #3)
  - [x] `src/lib/ai/prompt-enrichment.ts` erweitern
  - [x] `buildVocabularyContext(vocabulary: VocabularyEntry[]): string` — formatiert Vokabular als Prompt-Kontext
  - [x] Format: `Persönliches Vokabular:\n- "Rügge" → "Rücken" (body_region, 5x verwendet)\n- "Stächä" → "stechend" (symptom_type, 3x)`
  - [x] `ExtractionContext` erweitern: `{ corrections?: string, vocabulary?: string }`
  - [x] Pipeline-Integration: Vokabular laden und an Extraktion übergeben
- [x] Task 5: Pipeline-Integration (AC: #2, #3)
  - [x] `src/lib/ai/pipeline.ts` erweitern
  - [x] Vor Extraktion: `getVocabulary(supabase, accountId)` laden
  - [x] `buildVocabularyContext(vocabulary)` → Kontext-String
  - [x] `extractSymptomData(rawInput, { corrections, vocabulary })` aufrufen
  - [x] Claude-Provider: Vokabular-Kontext an System-Prompt anhängen (analog zu Corrections in Story 3.5)
  - [x] Performance: Vocabulary-Query einzelner SELECT → <50ms
- [x] Task 6: Mehr-Seite Vokabular-Ansicht (AC: #4)
  - [x] `src/app/(app)/more/vokabular/page.tsx` erstellen (Server Component)
  - [x] Vokabular des Patienten laden (Server-seitig via `createServerClient`)
  - [x] Read-only Liste: Tabelle mit Spalten "Mein Begriff", "Bedeutung", "Häufigkeit"
  - [x] Sortiert nach `usage_count` DESC (häufigste zuerst)
  - [x] Empty-State: "Noch keine Begriffe gelernt. Das System lernt automatisch aus deinen Korrekturen."
  - [x] Link in Mehr-Seite (`src/app/(app)/more/page.tsx`) hinzufügen: "Mein Vokabular"
- [x] Task 7: Server Actions erweitern (AC: #1)
  - [x] `src/lib/actions/symptom-actions.ts` — `correctExtractedField` und `answerClarification` erweitern
  - [x] Nach erfolgreicher Korrektur: `updateVocabularyFromCorrection()` aufrufen
  - [x] Fire-and-Forget: Vokabular-Update darf Korrektur nicht blockieren (`.catch()` mit Logging)
- [x] Task 8: Tests (AC: #1-#4)
  - [x] `src/__tests__/lib/db/vocabulary.test.ts` — getVocabulary, upsertVocabularyEntry (6 Tests)
  - [x] `src/__tests__/lib/ai/vocabulary-builder.test.ts` — updateVocabularyFromCorrection: neuer Eintrag, bestehender Eintrag (increment), gleicher Wert (kein Eintrag) (3 Tests)
  - [x] `src/__tests__/lib/ai/prompt-enrichment.test.ts` — Erweitert: buildVocabularyContext, kombinierter Kontext (4 neue Tests)
  - [x] `src/__tests__/lib/ai/pipeline.test.ts` — Erweitert: Vokabular in Pipeline (3 neue Tests)
  - [x] `src/__tests__/app/vokabular-page.test.tsx` — Vokabular-Anzeige, Empty-State (5 Tests)
  - [x] `src/__tests__/more-page.test.tsx` — Erweitert: Vokabular-Link (2 neue Tests)
  - [x] Bestehende Tests dürfen NICHT brechen
  - [x] `npm run test` verifizieren — 357/357 Tests bestanden
- [x] Task 9: Build-Verifikation
  - [x] `npm run lint` — keine neuen Fehler (alle vorbestehend in e2e/sw.js)
  - [x] `npm run build` — vorbestehender Fehler in `web-push` Types (Story 3.4), keine neuen Fehler

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

Die bestehende Mehr-Seite (`src/app/(app)/mehr/page.tsx`) verwendet eine einheitliche Navigation mit Card-Links (siehe Story 1.6/1.7 Pattern mit `ChevronRight`-Icons). Den neuen Link im gleichen Pattern hinzufügen:

```typescript
// Bestehende Mehr-Seite erweitern mit neuem Link (gleiches Pattern wie Account/Disclaimer):
<Link href="/mehr/vokabular" className="flex items-center justify-between p-4 ...">
  <div className="flex items-center gap-3">
    <BookOpen className="h-5 w-5" />
    <span>Mein Vokabular</span>
  </div>
  <ChevronRight className="h-5 w-5 text-muted-foreground" />
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

Empfehlung: **Option 1 (RPC-Funktion)** — atomarer Increment ist robuster und vermeidet Race Conditions. Die RPC-Funktion wird in `00011_patient_vocabulary.sql` mitdefiniert:

```sql
CREATE OR REPLACE FUNCTION upsert_vocabulary_entry(
  p_account_id UUID,
  p_patient_term TEXT,
  p_mapped_term TEXT,
  p_field_name TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO patient_vocabulary (account_id, patient_term, mapped_term, field_name, usage_count)
  VALUES (p_account_id, p_patient_term, p_mapped_term, p_field_name, 1)
  ON CONFLICT (account_id, patient_term, field_name)
  DO UPDATE SET usage_count = patient_vocabulary.usage_count + 1,
               mapped_term = EXCLUDED.mapped_term,
               updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Der Service nutzt dann `supabase.rpc('upsert_vocabulary_entry', { ... })` statt manuelles Select+Insert/Update.

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

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- Alle 363 Unit-Tests bestanden (43 Testdateien)
- Lint: Keine neuen Fehler (vorbestehende in e2e/sw.js)
- Build: Vorbestehender `web-push` Types-Fehler (Story 3.4), keine neuen Fehler
- TypeScript: Keine Fehler in allen neuen/modifizierten Dateien
- Code-Review: 4 Fixes angewendet (1 HIGH, 3 MEDIUM)

### Completion Notes List

- RPC-Funktion `upsert_vocabulary_entry` für atomares usage_count Increment implementiert (wie in Dev Notes empfohlen)
- Mehr-Seite Route ist `/more/` nicht `/mehr/` — Vokabular-Seite entsprechend unter `/more/vokabular/` erstellt
- Vocabulary-Loading parallel mit Corrections via `Promise.all` für optimale Performance
- Fire-and-Forget Pattern für Vokabular-Updates in Server Actions (`.catch()` mit Logging)
- `patient_term` wird immer als `toLowerCase()` gespeichert für konsistenten Match

### File List

**Neue Dateien:**
- `supabase/migrations/00011_patient_vocabulary.sql` — DB-Migration mit Tabelle, RLS, Index, RPC-Funktion
- `src/lib/db/vocabulary.ts` — Vokabular-Service (getVocabulary, upsertVocabularyEntry)
- `src/lib/ai/vocabulary-builder.ts` — Vokabular aus Korrekturen aufbauen
- `src/app/(app)/more/vokabular/page.tsx` — Read-only Vokabular-Ansicht (Server Component)
- `src/__tests__/lib/db/vocabulary.test.ts` — 6 Tests
- `src/__tests__/lib/ai/vocabulary-builder.test.ts` — 5 Tests
- `src/__tests__/app/vokabular-page.test.tsx` — 5 Tests

**Modifizierte Dateien:**
- `src/types/ai.ts` — VocabularyEntry Interface, ExtractionContext um vocabulary erweitert
- `src/types/database.ts` — patient_vocabulary Tabellen-Typen und RPC-Funktion-Typ
- `src/lib/ai/prompt-enrichment.ts` — buildVocabularyContext() hinzugefügt
- `src/lib/ai/pipeline.ts` — Paralleles Laden von Vocabulary + Corrections, kombinierter Context
- `src/lib/ai/providers/claude.ts` — Vocabulary-Kontext an System-Prompt anhängen
- `src/lib/actions/symptom-actions.ts` — Vocabulary-Update nach Korrekturen (Fire-and-Forget)
- `src/app/(app)/more/page.tsx` — "KI & Lernen" Section mit "Mein Vokabular" Link
- `src/__tests__/lib/ai/prompt-enrichment.test.ts` — 4 neue Tests (10 total)
- `src/__tests__/lib/ai/pipeline.test.ts` — 3 neue Tests
- `src/__tests__/more-page.test.tsx` — 2 neue Tests (9 total)
- `src/__tests__/symptom-actions.test.ts` — 2 neue Tests für Vocabulary-Integration

## Change Log

- 2026-03-03: Story 3.6 erstellt — Persönliches Vokabular mit automatischem Aufbau aus Korrekturen, Prompt-Enrichment, Read-only Ansicht
- 2026-03-03: Party-Mode Review — 2 Findings eingearbeitet: (1) RPC-Funktion für atomares usage_count Increment empfohlen statt Select+Update, (2) Mehr-Seite Navigation-Pattern aus Story 1.6/1.7 referenziert
- 2026-03-03: Implementation abgeschlossen — Alle 9 Tasks implementiert, 357/357 Tests bestanden, Status → review
- 2026-03-04: Code-Review — 4 Fixes: (H1) auth.uid()-Check in RPC-Funktion, (M1) Leere-String-Guard in vocabulary-builder, (M2) Vocabulary-Integration-Tests in symptom-actions, (M3) LIMIT(200) in getVocabulary. 363/363 Tests bestanden.
