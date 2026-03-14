# Story {{epic_num}}.{{story_num}}: {{story_title}}

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a {{role}},
I want {{action}},
so that {{benefit}}.

## Acceptance Criteria

1. [Add acceptance criteria from epics/PRD]

## Tasks / Subtasks

- [ ] Task 1 (AC: #)
  - [ ] Subtask 1.1
- [ ] Task 2 (AC: #)
  - [ ] Subtask 2.1

## Dev Notes

- Relevant architecture patterns and constraints
- Source tree components to touch
- Testing standards summary

### RLS-Policy Checklist (bei DB-Änderungen)

Falls diese Story Tabellen erstellt oder ändert, folgende RLS-Policies explizit prüfen:

- [ ] SELECT-Policy vorhanden (`auth.uid() = account_id`)
- [ ] INSERT-Policy vorhanden (falls User Daten anlegen)
- [ ] UPDATE-Policy vorhanden (falls User Daten ändern)
- [ ] DELETE-Policy vorhanden (falls User Daten löschen, Soft-Delete beachten)
- [ ] Policy-Naming: `[tabelle]_[rolle]_[operation]` (z.B. `symptoms_patient_select`)
- [ ] `deleted_at IS NULL` Filter in SELECT/UPDATE-Policies (Soft-Delete Konvention)

### Migrations-Konvention

- Dateiname: `XXXXX_story-N-M_beschreibung.sql` (z.B. `00016_story-4-2_timeline_data.sql`)
- Story-Referenz im Dateinamen verhindert Nummerierungskonflikte bei paralleler Arbeit
- Generierung: `supabase migration new story-N-M_beschreibung`

### Project Structure Notes

- Alignment with unified project structure (paths, modules, naming)
- Detected conflicts or variances (with rationale)

### References

- Cite all technical details with source paths and sections, e.g. [Source: docs/<file>.md#Section]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
