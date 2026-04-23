---
project_name: 'Symptomchat'
user_name: 'Andy'
date: '2026-04-23'
sections_completed: ['database_conventions', 'migrations']
---

# Project Context for AI Agents

_Diese Datei enthält projektspezifische Regeln und Muster, die AI-Agents bei der Implementierung beachten müssen. Fokus auf nicht-offensichtliche Details, die sonst übersehen werden._

---

## Database Conventions

### RLS-Policy Checklist (bei DB-Änderungen)

Falls eine Story Tabellen erstellt oder ändert, folgende RLS-Policies explizit prüfen:

- [ ] SELECT-Policy vorhanden (`auth.uid() = account_id`)
- [ ] INSERT-Policy vorhanden (falls User Daten anlegen)
- [ ] UPDATE-Policy vorhanden (falls User Daten ändern)
- [ ] DELETE-Policy vorhanden (falls User Daten löschen, Soft-Delete beachten)
- [ ] Policy-Naming: `[tabelle]_[rolle]_[operation]` (z.B. `symptoms_patient_select`)
- [ ] `deleted_at IS NULL` Filter in SELECT/UPDATE-Policies (Soft-Delete Konvention)

Referenz: `_bmad-output/planning-artifacts/architecture.md` Abschnitt "Row Level Security (RLS)" und Tabelle "RLS Policies Naming".

## Migrations Convention

- Dateiname: `XXXXX_story-N-M_beschreibung.sql` (z.B. `00016_story-4-2_timeline_data.sql`)
- Story-Referenz im Dateinamen verhindert Nummerierungskonflikte bei paralleler Arbeit an mehreren Stories
- Generierung: `supabase migration new story-N-M_beschreibung`
- Nach jeder Migration: `npx supabase gen types typescript --project-id $PROJECT_ID > src/types/database.ts` und Ergebnis committen (NIE manuell editieren)
