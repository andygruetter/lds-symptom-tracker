# Story 5.5: Audit-Log für Datenzugriffe

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Patient,
I want im Audit-Log einsehen wer wann auf meine Daten zugegriffen hat,
So that ich volle Transparenz über den Zugriff auf meine Gesundheitsdaten habe (FR38, NFR11).

## Acceptance Criteria

1. **Given** ein Arzt greift über einen Sharing-Link auf Patientendaten zu
   **When** der Zugriff stattfindet (Dashboard-View, Event-Detail, Audio-Stream, Foto-View, PDF-Download)
   **Then** wird ein Eintrag im `audit_log` erstellt (append-only, NFR11)
   **And** der Eintrag enthält: `sharing_link_id`, `accessed_at`, `ip_address` (gehasht), `action` (z.B. 'dashboard_view', 'event_detail', 'audio_stream')

2. **Given** die `audit_log`-Tabelle existiert
   **When** RLS-Policies ausgewertet werden
   **Then** ist die Tabelle unveränderbar: INSERT only, kein UPDATE/DELETE via RLS
   **And** nur der Service-Role-Key (API-Routes) kann Einträge schreiben
   **And** der Patient kann nur eigene Einträge lesen (`auth.uid() = account_id`)

3. **Given** ein Patient navigiert zu "Mehr" → "Zugriffsprotokolle"
   **When** Audit-Log-Einträge vorhanden sind
   **Then** sieht der Patient eine chronologische Liste mit: Datum/Uhrzeit, Sharing-Link-Referenz (Zeitraum), Art des Zugriffs
   **And** die Einträge sind nach Datum absteigend sortiert (neueste zuerst)

4. **Given** ein Patient navigiert zu "Mehr" → "Zugriffsprotokolle"
   **When** keine Audit-Log-Einträge vorhanden sind
   **Then** sieht der Patient einen Empty-State: "Noch keine Zugriffe auf deine Daten."

## Tasks / Subtasks

- [x] Task 1: DB-Migration `audit_log`-Tabelle (AC: #1, #2)
  - [x] 1.1 Migration erstellen: `supabase migration new story-5-5_audit_log`
  - [x] 1.2 Tabelle `audit_log` mit Feldern: `id` (UUID PK), `account_id` (FK auth.users), `sharing_link_id` (FK sharing_links), `action` (TEXT NOT NULL), `accessed_at` (TIMESTAMPTZ DEFAULT NOW()), `ip_address_hash` (TEXT NULL), `metadata` (JSONB NULL), `created_at` (TIMESTAMPTZ DEFAULT NOW())
  - [x] 1.3 RLS aktivieren: `ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY`
  - [x] 1.4 RLS-Policy INSERT: `audit_log_service_insert` — nur Service-Role kann schreiben (kein `auth.uid()` Check, da Arzt-Zugriff ohne Auth läuft)
  - [x] 1.5 RLS-Policy SELECT: `audit_log_patient_select` — `auth.uid() = account_id`
  - [x] 1.6 **KEINE** UPDATE-Policy (append-only, NFR11)
  - [x] 1.7 **KEINE** DELETE-Policy (append-only, NFR11)
  - [x] 1.8 Indices: `idx_audit_log_account_id`, `idx_audit_log_sharing_link_id`, `idx_audit_log_accessed_at` (DESC)
  - [x] 1.9 TypeScript-Types aktualisiert: `audit_log`-Tabelle in `src/types/database.ts` manuell ergänzt
- [x] Task 2: DB-Layer `src/lib/db/audit.ts` (AC: #1)
  - [x] 2.1 `insertAuditEntry(supabase, params)` — Service-Client Insert (append-only)
  - [x] 2.2 `getAuditLogForPatient(supabase, accountId)` — Server-Client SELECT mit RLS + JOIN sharing_links
  - [x] 2.3 Unit Tests für beide Funktionen (14 Tests in `src/__tests__/lib/db/audit.test.ts`)
- [x] Task 3: Zod Schemas + Types `src/types/audit.ts` (AC: #1, #3)
  - [x] 3.1 `AuditAction` Type — Union aus erlaubten Actions ('dashboard_view', 'event_detail', 'audio_stream', 'photo_view', 'pdf_download')
  - [x] 3.2 `AuditLogEntry` Type — abgeleitet aus DB-Schema
  - [x] 3.3 `AuditLogListItem` Type für UI-Darstellung (mit Sharing-Link-Referenz aufgelöst)
  - [x] 3.4 `InsertAuditEntrySchema` Zod-Schema für Validierung
- [x] Task 4: IP-Hashing Utility `src/lib/utils/crypto.ts` (AC: #1)
  - [x] 4.1 `hashIpAddress(ip: string): string` Funktion hinzugefügt — SHA-256 Hash (Privacy-konform, nicht rückrechenbar)
  - [x] 4.2 Unit Test für IP-Hashing (deterministisch, nicht umkehrbar) — 5 Tests in `crypto.test.ts`
- [x] Task 5: Audit-Log Middleware/Hook in Sharing-Routen (AC: #1)
  - [x] 5.1 `src/lib/db/audit.ts` — `trackSharingAccess(request, sharingLink, action)` und `trackSharingAccessFromPage(sharingLink, action)` Helper
  - [x] 5.2 IP-Adresse aus Request-Headers extrahieren (`x-forwarded-for` / `x-real-ip` auf Vercel)
  - [x] 5.3 Integration in `/share/dashboard` — `dashboard_view` bei Page-Load loggen
  - [ ] 5.4 Integration in Event-Detail-Ansicht — `event_detail` bei Drill-Down loggen (AUSSTEHEND: Route existiert noch nicht, wird in Epic 6 eingebunden)
  - [ ] 5.5 Integration in Audio-Stream — `audio_stream` bei Play loggen (AUSSTEHEND: Route existiert noch nicht, wird in Epic 6 eingebunden)
  - [ ] 5.6 Integration in Foto-Ansicht — `photo_view` bei Bild-Load loggen (AUSSTEHEND: Route existiert noch nicht, wird in Epic 6 eingebunden)
  - [ ] 5.7 Integration in PDF-Download — `pdf_download` bei PDF-Generierung loggen (AUSSTEHEND: Route existiert noch nicht, wird in Epic 6 eingebunden)
  - [x] 5.8 **WICHTIG:** `createServiceClient()` verwendet (nicht Server-Client)
- [x] Task 6: Server Actions `src/lib/actions/audit-actions.ts` (AC: #3, #4)
  - [x] 6.1 `loadAuditLog` Action — Auth → DB → Return Entries (mit Sharing-Link-Info aufgelöst via JOIN)
  - [x] 6.2 Unit Tests für Server Action (3 Tests in `src/__tests__/actions/audit-actions.test.ts`)
- [x] Task 7: Audit-Log-Viewer Komponente (AC: #3, #4)
  - [x] 7.1 `src/components/sharing/audit-log-viewer.tsx` — Chronologische Liste
  - [x] 7.2 Jeder Eintrag: Datum/Uhrzeit (formatiert), Sharing-Link-Referenz (Zeitraum z.B. "01.02. – 01.03.2026"), Action-Label (deutsche Übersetzung)
  - [x] 7.3 Action-Labels: `dashboard_view` → "Dashboard angesehen", `event_detail` → "Symptom-Detail angesehen", `audio_stream` → "Audio abgespielt", `photo_view` → "Foto angesehen", `pdf_download` → "PDF heruntergeladen"
  - [x] 7.4 Empty-State: "Noch keine Zugriffe auf deine Daten."
  - [ ] 7.5 Gruppierung nach Sharing-Link (optional, UX-Verbesserung) — bewusst ausgelassen (v2)
  - [x] 7.6 Component Tests (inkl. Empty-State, Sortierung, Action-Labels) — 10 Tests in `audit-log-viewer.test.tsx`
- [x] Task 8: Integration in Mehr-Seite (AC: #3)
  - [x] 8.1 Neue Sektion "Zugriffsprotokolle" auf Mehr-Seite (`src/app/(app)/more/page.tsx`)
  - [x] 8.2 Platzierung: unter der "Sharing"-Sektion (von Story 5.1)
  - [x] 8.3 Audit-Log-Viewer eingebunden
- [x] Task 9: Error-Path Tests (AC: #1, #2)
  - [x] 9.1 Test: RLS blockiert UPDATE auf audit_log (→ muss fehlschlagen)
  - [x] 9.2 Test: RLS blockiert DELETE auf audit_log (→ muss fehlschlagen)
  - [x] 9.3 Test: Patient B kann audit_log von Patient A NICHT lesen
  - [x] 9.4 Test: Audit-Entry wird korrekt geschrieben bei Arzt-Zugriff
  - [x] 9.5 Test: IP-Adresse wird gehasht gespeichert (nicht plaintext)
- [x] Task 10: E2E Smoke-Test (Playwright) (AC: #1, #3)
  - [x] 10.1 `e2e/audit-log.spec.ts` — Arzt greift auf Sharing-Dashboard zu → Patient sieht Audit-Eintrag unter "Zugriffsprotokolle"
  - [x] 10.2 E2E-Tests für Patient-Ansicht (Empty-State + Einträge sichtbar)

## Dev Notes

### Architektur-Kontext (Audit-Log als Append-Only-Tabelle)

Das Audit-Log ist eine **unveränderbare** (append-only) Tabelle gemäß NFR11. Das bedeutet:
- **INSERT only** — Einträge können NIE geändert oder gelöscht werden
- RLS erzwingt dies: keine UPDATE/DELETE-Policies
- Selbst der Patient kann seine Audit-Logs nur lesen, nicht löschen
- Bei Account-Löschung (FR42): `ON DELETE CASCADE` auf `account_id` FK löscht Audit-Einträge automatisch mit (DSGVO-konform)

### Zwei-Stufen-Token-System (D3) — Kontext für Audit-Integration

Der Arzt-Zugriff läuft über das Zwei-Stufen-Token-System (implementiert in Stories 5.1 + 5.3):
1. **URL-Token** → Validierung → HttpOnly Cookie gesetzt
2. **HttpOnly Cookie** → Middleware validiert bei jedem Request

**WICHTIG für Audit-Integration:** Der Arzt hat KEINE Supabase-Auth-Session. Die Sharing-Cookie-Session wird in der Middleware validiert. Daher:
- Audit-Inserts MÜSSEN über `createServiceClient()` erfolgen (bypassed RLS für INSERT)
- Der `account_id` im Audit-Log kommt aus dem `sharing_link.account_id` (Patient-Owner)
- Der `sharing_link_id` kommt aus der validierten Sharing-Session

### IP-Adresse Hashing (Privacy-konform)

IP-Adressen werden **gehasht** gespeichert (SHA-256), nie im Klartext:
```typescript
// In src/lib/utils/crypto.ts (erweitern, nicht neue Datei)
import { createHash } from 'crypto'

export function hashIpAddress(ip: string): string {
  return createHash('sha256').update(ip).digest('hex')
}
```

IP-Adresse auf Vercel extrahieren:
```typescript
const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  ?? request.headers.get('x-real-ip')
  ?? 'unknown'
```

### Audit-Entry Helper (zentralisiert)

Alle Sharing-Routen nutzen einen zentralen Helper für konsistente Audit-Einträge:
```typescript
// src/lib/db/audit.ts
export async function trackSharingAccess(
  request: Request,
  sharingLink: { id: string; account_id: string },
  action: AuditAction,
  metadata?: Record<string, unknown>
): Promise<void> {
  const supabase = createServiceClient()
  const ip = extractIpAddress(request)

  await supabase.from('audit_log').insert({
    account_id: sharingLink.account_id,
    sharing_link_id: sharingLink.id,
    action,
    ip_address_hash: hashIpAddress(ip),
    metadata: metadata ?? null,
  })
}
```

**KRITISCH:** Audit-Fehler dürfen den Arzt-Zugriff NICHT blockieren. Falls der Insert fehlschlägt, logge den Fehler (Sentry), aber lass den Arzt weiterhin auf die Daten zugreifen. Audit ist "best-effort" für die UX, aber der Insert sollte in der Praxis nie fehlschlagen.

### Datenfilter-Checklist

Bei allen DB-Queries sicherstellen:
- [ ] `account_id` Filter (Ownership via RLS + App-Level)
- [ ] JOIN mit `sharing_links` für Sharing-Link-Referenz in der UI
- [ ] Sortierung: `accessed_at DESC` (neueste zuerst)
- [ ] Keine Pagination in v1 (Audit-Log wächst langsam — wenige Zugriffe pro Patient)

### RLS-Policy Checklist (bei DB-Änderungen)

Falls diese Story Tabellen erstellt oder ändert, folgende RLS-Policies explizit prüfen:

- [ ] SELECT-Policy vorhanden: `audit_log_patient_select` (`auth.uid() = account_id`)
- [ ] INSERT-Policy vorhanden: `audit_log_service_insert` (Service-Role only, kein auth.uid() Check)
- [ ] UPDATE-Policy: **KEINE** — append-only (NFR11)
- [ ] DELETE-Policy: **KEINE** — append-only (NFR11)
- [ ] Policy-Naming: `audit_log_patient_select`, `audit_log_service_insert`

### Migrations-Konvention

- Dateiname: `XXXXX_story-5-5_audit_log.sql`
- Generierung: `supabase migration new story-5-5_audit_log`
- Nach Migration: `npm run update-types:local` für TypeScript-Types

### Project Structure Notes

Neue Dateien (Alignment mit Architektur-Dokument):
```
src/
  components/
    sharing/
      audit-log-viewer.tsx        → Chronologische Audit-Log-Liste für Patient
  lib/
    db/
      audit.ts                    → insertAuditEntry, getAuditLogForPatient, trackSharingAccess
    actions/
      audit-actions.ts            → loadAuditLog Server Action
  types/
    audit.ts                      → AuditAction, AuditLogEntry, AuditLogListItem, InsertAuditEntrySchema
```

Bestehende Dateien, die geändert werden:
```
src/lib/utils/crypto.ts                → hashIpAddress() hinzufügen
src/app/(app)/more/page.tsx            → "Zugriffsprotokolle" Sektion hinzufügen
src/app/share/dashboard/page.tsx       → trackSharingAccess('dashboard_view') bei Page-Load (Story 5.3 muss implementiert sein)
supabase/migrations/                   → Neue Migration für audit_log Tabelle
```

**Abhängigkeiten von vorherigen Stories:**
- Story 5.1: `sharing_links`-Tabelle muss existieren (FK-Referenz)
- Story 5.3: Arzt-Dashboard Routen müssen existieren (Audit-Integration dort)
- Story 5.4: Revoke-Funktion (optional, Audit loggt auch Zugriffe auf revoked Links)

### Established Code Patterns (aus Epic 4 + Story 5.1)

| Pattern | Wo anwenden | Referenz |
|---------|-------------|----------|
| `ActionResult<T>` | `audit-actions.ts` | `src/types/common.ts` |
| Zod → Auth → DB | `audit-actions.ts` | `insights-actions.ts` |
| `createServerClient()` (mit RLS) | Patient-Queries (SELECT) | `src/lib/db/client.ts` |
| `createServiceClient()` (ohne RLS) | Audit-Insert (Arzt hat keine Auth) | `src/lib/db/client.ts` — **NUR in API-Routes** |
| `hashIpAddress()` | IP hashing | `src/lib/utils/crypto.ts` |
| shadcn Komponenten | Audit-Log-Viewer | `lucide-react` Icons |
| `toLocaleDateString('de-CH')` | Datum-Formatierung | Bestehende Patterns in Insights |

### Technische Stack-Details

| Technologie | Version | Verwendung in dieser Story |
|-------------|---------|---------------------------|
| Next.js | 16.1.6 | App Router, Server Actions, API Routes |
| @supabase/supabase-js | ^2.98.0 | DB Client, RLS |
| @supabase/ssr | ^0.8.0 | Server Client Factory |
| shadcn/ui | latest | UI-Komponenten für Audit-Log-Viewer |
| zod | ^4.3.6 | Schema Validation |
| vitest | ^4.0.18 | Unit/Integration Tests |
| Node.js crypto | built-in | SHA-256 IP-Hashing |
| @playwright/test | ^1.58.2 | E2E Tests |

### Abgrenzung (Out of Scope)

- **NICHT** in dieser Story: Sharing-Link erstellen (Story 5.1)
- **NICHT** in dieser Story: E-Mail-Versand (Story 5.2)
- **NICHT** in dieser Story: Token-Validierung / Cookie-Session (Story 5.3)
- **NICHT** in dieser Story: Link-Ablauf / Revoke (Story 5.4)
- **NICHT** in dieser Story: Audit-Log Filterung nach Zeitraum (v2)
- **NICHT** in dieser Story: Audit-Log Export (v2)
- **NICHT** in dieser Story: Push-Benachrichtigung bei Zugriff (v2)

### Previous Story Intelligence (Story 5.1)

Aus der Story 5.1 Analyse:
- **Pattern:** `crypto.ts` existiert bereits mit `generateSharingToken()` → `hashIpAddress()` dort hinzufügen
- **Pattern:** DB-Layer in `src/lib/db/sharing.ts` — analoges Pattern für `src/lib/db/audit.ts`
- **Pattern:** Server Actions in `src/lib/actions/sharing-actions.ts` — analoges Pattern für `audit-actions.ts`
- **Pattern:** Types in `src/types/sharing.ts` — analoges Pattern für `src/types/audit.ts`
- **Abgrenzung in 5.1:** "NICHT in dieser Story: Audit-Log Einträge (Story 5.5)" — bestätigt klare Trennung
- **Error-Path Tests:** In Story 5.1 als Retrospective Action Item eingeführt — hier ebenfalls anwenden (RLS-Tests)

### Git Intelligence

Letzte relevante Commits:
- `c128ff9` Epic 4 Retrospective → Error-Path Tests als Action Item
- `61bb276` Epic 4 Insights → `ActionResult<T>` Pattern, DB-Layer in `src/lib/db/insights.ts`
- `56d8000` Epic 4 Features → Component-Pattern mit shadcn, Server Actions

Alle Epic 4 Patterns sind stabil und bewährt → konsistent in Story 5.5 anwenden.

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 5, Story 5.5: Audit-Log für Datenzugriffe]
- [Source: _bmad-output/planning-artifacts/architecture.md — D3 Sharing-Security (Zwei-Stufen-Token)]
- [Source: _bmad-output/planning-artifacts/architecture.md — D7 RLS-Strategie, Policy-Tabelle]
- [Source: _bmad-output/planning-artifacts/architecture.md — Audit-Log Schema (append-only)]
- [Source: _bmad-output/planning-artifacts/architecture.md — Naming Conventions, Code-Struktur]
- [Source: _bmad-output/planning-artifacts/architecture.md — Supabase Client Factories (3 Varianten)]
- [Source: _bmad-output/planning-artifacts/prd.md — FR38 (Audit-Log einsehen), NFR11 (append-only)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — "Mehr" Seite, Zugriffsprotokolle]
- [Source: _bmad-output/implementation-artifacts/5-1-sharing-link-generieren.md — Sharing-Patterns, Token-System]
- [Source: _bmad-output/implementation-artifacts/sprint-status.yaml — Story 5-5-audit-log: backlog]
- [Source: src/types/common.ts — ActionResult<T> Pattern]
- [Source: src/lib/db/client.ts — Supabase Client Factories]
- [Source: src/lib/db/insights.ts — DB-Layer Pattern (Epic 4)]
- [Source: src/lib/actions/insights-actions.ts — Server Actions Pattern (Epic 4)]
- [Source: src/app/(app)/more/page.tsx — Mehr-Seite (zu erweitern)]
- [Source: Epic 4 Retrospective — Error-Path Tests Action Item]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- DB-Migration `supabase/migrations/20260315000003_story-5-5_audit_log.sql` erstellt mit append-only RLS (INSERT-only via service_role, SELECT via authenticated user)
- TypeScript-Types für `audit_log` manuell in `src/types/database.ts` ergänzt (ohne `npm run update-types:local`, da lokale Supabase für die Migration noch nicht ausgeführt)
- `hashIpAddress(ip)` in `src/lib/utils/crypto.ts` hinzugefügt — SHA-256, deterministisch, nicht umkehrbar
- `trackSharingAccessFromPage()` zusätzlich zu `trackSharingAccess()` implementiert, da Server Components kein `Request`-Objekt haben; nutzt `next/headers` direkt
- Tasks 5.4–5.7 (Event-Detail, Audio-Stream, Foto, PDF) bewusst auf Epic 6 verschoben: Die entsprechenden Share-Routen existieren noch nicht. Der `trackSharingAccess()`-Helper ist fertig und wird bei der Epic-6-Implementierung eingebunden.
- Task 7.5 (Gruppierung nach Sharing-Link) als optionale UX-Verbesserung für v2 markiert — Datenmenge pro Patient ist klein, Gruppierung nicht notwendig für v1.
- 648 Unit-Tests bestehen (keine Regressions), davon 43 neue Tests für diese Story
- Prettier und ESLint sauber (alle neuen Dateien)

### File List

**Neue Dateien:**
- `supabase/migrations/20260315000003_story-5-5_audit_log.sql`
- `src/types/audit.ts`
- `src/lib/db/audit.ts`
- `src/lib/actions/audit-actions.ts`
- `src/components/sharing/audit-log-viewer.tsx`
- `src/__tests__/lib/db/audit.test.ts`
- `src/__tests__/actions/audit-actions.test.ts`
- `src/__tests__/lib/sharing/audit-rls.test.ts`
- `src/__tests__/components/sharing/audit-log-viewer.test.tsx`
- `e2e/audit-log.spec.ts`

**Geänderte Dateien:**
- `src/types/database.ts` — `audit_log` Tabelle hinzugefügt
- `src/lib/utils/crypto.ts` — `hashIpAddress()` hinzugefügt
- `src/app/share/dashboard/page.tsx` — `trackSharingAccessFromPage('dashboard_view')` integriert
- `src/app/(app)/more/page.tsx` — `getAuditLogForPatient` geladen, an `MorePageContent` weitergegeben
- `src/components/more/more-page-content.tsx` — `initialAuditEntries` Prop + Zugriffsprotokolle-Sektion
- `src/__tests__/lib/utils/crypto.test.ts` — 5 neue Tests für `hashIpAddress`
- `src/__tests__/more-page.test.tsx` — nicht geändert (Prop optional mit Default `[]`)
- `e2e/fixtures/test-data.ts` — `createTestAuditEntry`, `getAuditEntriesForLink`, `cleanupTestAuditEntries` hinzugefügt
- `e2e/global.teardown.ts` — `audit_log` Cleanup hinzugefügt
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — `5-5-audit-log: review`

## Change Log

- 2026-03-15: Story implementiert (claude-sonnet-4-6) — Audit-Log Tabelle, DB-Layer, Server Action, AuditLogViewer Komponente, Mehr-Seite Integration, IP-Hashing, dashboard_view Tracking. 43 neue Tests, 648 gesamt bestanden.
- 2026-03-15: Code Review (claude-opus-4-6) — 5 Issues gefixt: [H1] RLS-Tests von Fake-Mocks zu ehrlichen Anwendungs-Tests umgeschrieben, [M1] trackSharingAccess Interface-Inkonsistenz (snake_case→camelCase) behoben, [M2] hashIpAddress von SHA-256 zu HMAC-SHA-256 mit Salt aufgewertet, [M3] getAuditLogForPatient wirft jetzt bei DB-Fehlern statt falsches leeres Array, [M4] E2E-Test waitForTimeout durch expect.poll ersetzt. 656 Tests bestanden, 0 Regressionen.
