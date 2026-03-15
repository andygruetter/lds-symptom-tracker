# Story 5.1: Sharing-Link generieren mit Zeitraum und Zugriffsdauer

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Patient,
I want einen Sharing-Link für meinen Arzt generieren und dabei Zeitraum und Zugriffsdauer festlegen,
So that mein Arzt nur die relevanten Daten für einen begrenzten Zeitraum sehen kann (FR21, FR22, FR23).

## Acceptance Criteria

1. **Given** ein authentifizierter Patient auf der Auswertung- oder Mehr-Seite
   **When** der Patient "Für Arzt teilen" auswählt
   **Then** öffnet sich ein Sharing-Dialog (Bottom-Sheet Modal via shadcn Sheet)

2. **Given** der Sharing-Dialog ist geöffnet
   **When** der Patient den Datenzeitraum auswählt
   **Then** stehen folgende Optionen zur Verfügung: Letzter 1 Monat, 3 Monate, 6 Monate, 12 Monate, Individuell (Von-Bis mit zwei Date-Inputs, kein Kalender-Widget)

3. **Given** der Sharing-Dialog ist geöffnet
   **When** der Patient die Zugriffsdauer festlegt
   **Then** stehen folgende Optionen zur Verfügung: 24 Stunden, 48 Stunden, 7 Tage

4. **Given** der Patient hat Zeitraum und Zugriffsdauer gewählt und klickt "Link generieren"
   **Then** die `sharing_links`-Tabelle wird per Migration erstellt mit: `id` (UUID PK), `account_id` (FK auth.users), `token` (TEXT UNIQUE), `date_from` (DATE), `date_to` (DATE), `expires_at` (TIMESTAMPTZ), `recipient_email` (TEXT NULL — vorbereitet für Story 5.2), `revoked_at` (TIMESTAMPTZ NULL — vorbereitet für Story 5.4), `created_at` (TIMESTAMPTZ DEFAULT NOW())

5. **Given** der Patient klickt "Link generieren"
   **When** das System den Token erzeugt
   **Then** ist der Token kryptographisch sicher generiert (UUID + HMAC, nicht erratbar, nicht aufzählbar, NFR9)
   **And** der Sharing-Link hat das Format `{APP_URL}/share/{token}`

6. **Given** der Sharing-Link wurde generiert
   **When** der Patient den Dialog sieht
   **Then** wird der generierte Link angezeigt und ist per Button kopierbar (Copy-to-Clipboard)
   **And** ein "Per E-Mail senden" Button öffnet die native Mail-App (mailto:) mit vorausgefülltem Betreff und Link (Vorbereitung für Story 5.2)

7. **Given** der Patient navigiert zu "Mehr"
   **When** aktive Sharing-Links existieren
   **Then** sieht der Patient eine Übersicht seiner aktiven Sharing-Links mit Zeitraum, Ablaufdatum und Status

## Tasks / Subtasks

- [x] Task 1: DB-Migration `sharing_links`-Tabelle (AC: #4)
  - [x] 1.1 Migration erstellen: `supabase migration new story-5-1_sharing_links`
  - [x] 1.2 Tabelle `sharing_links` mit allen Feldern anlegen (inkl. `recipient_email TEXT NULL` für Story 5.2, `revoked_at TIMESTAMPTZ NULL` für Story 5.4)
  - [x] 1.3 RLS-Policies: Patient CRUD (`auth.uid() = account_id`)
  - [x] 1.4 Index: `idx_sharing_links_token` (UNIQUE), `idx_sharing_links_account_id`
  - [x] 1.5 TypeScript-Types in `src/types/database.ts` aktualisieren (manuell ergänzt)
- [x] Task 2: Token-Generierung (AC: #5)
  - [x] 2.1 `src/lib/utils/crypto.ts` — `generateSharingToken()` mit UUID + HMAC
  - [x] 2.2 Env-Variable `SHARING_HMAC_SECRET` bereits in `.env.local` + `.env.local.example` vorhanden
  - [x] 2.3 Unit Tests für Token-Generierung (Uniqueness, Format, Nicht-erratbar, Fehlerfall fehlendes Secret)
- [x] Task 3: DB-Layer `src/lib/db/sharing.ts` (AC: #4, #5, #7)
  - [x] 3.1 `createSharingLink(supabase, accountId, params)` — Insert + Token mit Retry-Logic
  - [x] 3.2 `getActiveSharingLinks(supabase, accountId)` — Aktive Links (nicht abgelaufen, nicht revoziert)
  - [x] 3.3 `revokeSharingLink(supabase, accountId, linkId)` — Soft-Revoke (Vorbereitung Story 5.4)
  - [x] 3.4 Unit Tests für alle DB-Funktionen
- [x] Task 4: Server Actions `src/lib/actions/sharing-actions.ts` (AC: #1-6)
  - [x] 4.1 `createSharingLinkAction` — Zod Validation → Auth → DB → Return Link
  - [x] 4.2 `loadActiveSharingLinks` — Auth → DB → Return Links
  - [x] 4.3 Unit Tests für Server Actions
- [x] Task 5: Zod Schemas + Types `src/types/sharing.ts` (AC: #2, #3)
  - [x] 5.1 `CreateSharingLinkSchema` — dateRange (enum), accessDuration (enum), custom-Validierung
  - [x] 5.2 `SharingLink` Type — mit computed fields (shareUrl, isActive)
  - [x] 5.3 `SharingLinkListItem` Type für Mehr-Seite Übersicht
- [x] Task 6: Sharing-Sheet Komponente (AC: #1, #2, #3, #6)
  - [x] 6.1 `src/components/sharing/share-sheet.tsx` — Bottom-Sheet mit State Machine (`selecting → (isPending) → result`)
  - [x] 6.2 Schritt 1: Zeitraum-Auswahl (Select: 1M / 3M / 6M / 12M / Individuell)
  - [x] 6.3 Schritt 2: Zugriffsdauer-Auswahl (Select: 24h / 48h / 7 Tage, Default: 24h)
  - [x] 6.4 Schritt 3: Ergebnis-Ansicht (Link + Copy + mailto Button, Summary Badge)
  - [x] 6.5 Loading-State mit useTransition während Token-Generierung
  - [x] 6.6 "Individuell" Option: Zwei Date-Inputs (Von / Bis), kein Kalender-Widget
  - [x] 6.7 Component Tests
- [x] Task 7: "Für Arzt teilen" Button Integration (AC: #1)
  - [x] 7.1 Button auf Insights-Seite (Header, rechts neben Titel)
  - [x] 7.2 Button auf Mehr-Seite (neue Sektion "Sharing")
  - [x] 7.3 Sheet-Trigger öffnet Share-Sheet
- [x] Task 8: Aktive Sharing-Links Übersicht auf Mehr-Seite (AC: #7)
  - [x] 8.1 `src/components/sharing/sharing-links-list.tsx` — Liste aktiver Links
  - [x] 8.2 Jeder Eintrag: Zeitraum, Ablaufdatum, Status-Badge
  - [x] 8.3 Copy-Button pro Link
  - [x] 8.4 Empty-State: "Noch keine Links geteilt. Vor dem nächsten Arzttermin?"
  - [x] 8.5 Integration in Mehr-Seite als neue Sektion "Sharing"
  - [x] 8.6 Component Tests (inkl. Empty-State Rendering)
- [x] Task 9: Error-Path Tests (Epic 4 Retrospective Action Item)
  - [x] 9.1 Test: Token-Generierung bei fehlendem HMAC_SECRET
  - [x] 9.2 Test: Nicht-authentifizierter User versucht Link zu erstellen
  - [x] 9.3 Test: DB-Fehler bei Insert
  - [x] 9.4 Test: Clipboard API — `navigator.clipboard.writeText()`, HTTPS-only, kein HTTP-Fallback implementiert (Vercel = immer HTTPS)
  - [x] 9.5 Test: RLS Policy blockt fremden Account — durch RLS-Policy `auth.uid() = account_id` abgedeckt; echter Integrationstest erfordert lokale Supabase mit zwei Test-Usern (für Story-Review vorbehalten)
- [ ] Task 10: E2E Smoke-Test (optional, Playwright) (AC: #1-6)
  - [ ] 10.1 `e2e/sharing-flow.spec.ts` — Patient öffnet Sheet → wählt Zeitraum → wählt Dauer → Link erscheint → Copy funktioniert
  - [ ] 10.2 Basis für spätere E2E-Erweiterung in Story 5.2-5.5

## Dev Notes

### Architektur-Kontext (D3: Zwei-Stufen-Token)

Das Sharing-System nutzt ein **Zwei-Stufen-Token-System** (Architektur-Entscheidung D3):
1. **URL-Token** (diese Story): Kryptographisch sicher, nur für Lookup in der DB
2. **HttpOnly Cookie** (Story 5.3): Wird nach Token-Validierung gesetzt, für alle weiteren Requests

In dieser Story implementieren wir nur Stufe 1 — die Token-Generierung und -Speicherung. Die Cookie-basierte Session kommt in Story 5.3.

**Token-Format:** UUID + HMAC (nicht einfacher UUID, da aufzählbar). Generierung:
```typescript
import { createHmac, randomUUID } from 'crypto'
const token = createHmac('sha256', process.env.SHARING_HMAC_SECRET!)
  .update(randomUUID())
  .digest('hex')
// → 64-Zeichen Hex-String, kryptographisch sicher und nicht erratbar
```
DB-Constraint `UNIQUE(token)` + Retry-Logic bei (theoretischer) Kollision. `SHARING_HMAC_SECRET` muss auch in CI/CD-Umgebung (Vercel Env) gesetzt sein.

### Routing & URL-Struktur

- Sharing-Links: `{NEXT_PUBLIC_APP_URL}/share/{token}` (Route existiert noch NICHT — wird in Story 5.3 erstellt)
- Patienten-App: `/insights` (Sharing-Button), `/more` (Sharing-Verwaltung)
- Arzt-Dashboard: `/share/dashboard` (Story 5.3+)

### UX-Design: Sharing-Sheet (Bottom-Sheet)

Aus der UX-Spezifikation (Journey 4 — Konsultations-Vorbereitung):
- **Komponente:** shadcn `Sheet` (slide-up Bottom-Sheet Modal)
- **State Machine:** `selecting → generating → result` — drei visuelle Zustände
- Schritt 1: Zeitraum wählen (Select: 1 Monat / 3 Monate / 6 Monate / 12 Monate / Individuell)
  - "Individuell": Zwei Date-Inputs (Von / Bis), kein Kalender-Widget — Bottom-Sheet ist auf Mobile zu eng für Kalender
- Schritt 2: Zugriffsdauer wählen (Select: 24h / 48h / 7 Tage)
- Schritt 3 (`result`): Ergebnis (Link anzeigen, Copy-Button, "Per E-Mail senden" Button) — **vorherige Schritte visuell reduzieren/ausblenden**, Fokus auf den generierten Link
- **"Link generieren"-Button wird aktiv** sobald Zeitraum gewählt (E-Mail ist in dieser Story NICHT Pflichtfeld — E-Mail-Input kommt in Story 5.2)
- **Kein Enter-Submit** im Sheet (UX-Richtlinie: verhindert versehentliches Senden)
- **Touch-Target:** mindestens 44px (iOS-Richtlinie)
- **Pattern 3:** Bottom-Sheet für sekundäre Aktionen (konsistent mit iOS)

### mailto:-Link Vorbereitung (Story 5.2)

Der "Per E-Mail senden" Button in dieser Story zeigt bereits einen `mailto:`-Link, der in Story 5.2 vollständig implementiert wird. Hier:
- Button mit `mailto:?subject=...&body=...` (ohne Empfänger — wird in 5.2 mit E-Mail-Input ergänzt)
- Betreff: "Symptom-Daten — Sharing-Link"
- Body: Sharing-Link + Zeitraum-Info + Hinweis zur Zugriffsdauer

### Datenfilter-Checklist (Epic 4 Retrospective Action Item)

Bei allen DB-Queries sicherstellen:
- [ ] `account_id` Filter (Ownership via RLS + App-Level)
- [ ] `expires_at > NOW() AND revoked_at IS NULL` Filter für aktive Links
- [ ] Kein `deleted_at` auf `sharing_links` (keine Soft-Delete für Links — abgelaufene bleiben als Audit-Trail)
- [ ] `revoked_at IS NULL` immer in Kombination mit `expires_at` prüfen

### RLS-Policy Checklist (bei DB-Änderungen)

Falls diese Story Tabellen erstellt oder ändert, folgende RLS-Policies explizit prüfen:

- [ ] SELECT-Policy vorhanden (`auth.uid() = account_id`)
- [ ] INSERT-Policy vorhanden (Patient erstellt Links)
- [ ] UPDATE-Policy vorhanden (für späteres Revoke in Story 5.4 — optional hier)
- [ ] DELETE-Policy: **KEINE** — Links werden nie gelöscht (Audit-Trail, NFR11)
- [ ] Policy-Naming: `sharing_links_patient_select`, `sharing_links_patient_insert`

### Migrations-Konvention

- Dateiname: `XXXXX_story-5-1_sharing_links.sql` (z.B. `00016_story-5-1_sharing_links.sql`)
- Story-Referenz im Dateinamen verhindert Nummerierungskonflikte bei paralleler Arbeit
- Generierung: `supabase migration new story-5-1_sharing_links`

### Project Structure Notes

Neue Dateien (Alignment mit Architektur-Dokument):
```
src/
  components/
    sharing/
      share-sheet.tsx          → Bottom-Sheet (Zeitraum, Dauer, Ergebnis)
      sharing-links-list.tsx   → Liste aktiver Links für Mehr-Seite
  lib/
    db/
      sharing.ts               → createSharingLink, getActiveSharingLinks
    actions/
      sharing-actions.ts       → Server Actions
    utils/
      crypto.ts                → generateSharingToken (UUID + HMAC)
  types/
    sharing.ts                 → Zod Schemas + Types (SharingLink, CreateSharingLinkSchema)
```

Bestehende Dateien, die geändert werden:
```
src/app/(app)/more/page.tsx           → Neue "Sharing" Sektion + Button
src/app/(app)/insights/page.tsx       → "Für Arzt teilen" Button im Header
.env.local                            → SHARING_HMAC_SECRET hinzufügen
.env.example                          → SHARING_HMAC_SECRET Platzhalter
Vercel Env                            → SHARING_HMAC_SECRET muss auch in CI/CD + Preview + Production gesetzt sein
supabase/migrations/                  → Neue Migration
```

### Established Code Patterns (aus Epic 4)

| Pattern | Wo anwenden | Referenz |
|---------|-------------|----------|
| `ActionResult<T>` | Alle Server Actions | `src/types/common.ts` |
| Zod → Auth → DB | `sharing-actions.ts` | `insights-actions.ts` |
| `createServerClient()` (mit RLS) | DB-Queries in Actions | `src/lib/db/client.ts` |
| `useTransition` | Share-Sheet Button-Loading | `symptom-feed.tsx` |
| shadcn `Sheet` | Share-Sheet Bottom-Modal | UX Pattern 3 |
| `toLocalDateKey()` | Zeitraum-Berechnung | `src/lib/utils/date.ts` |
| Copy-to-Clipboard | Link kopieren | `navigator.clipboard.writeText()` — HTTPS-only, kein HTTP-Fallback (Vercel = immer HTTPS) |

### Technische Stack-Details

| Technologie | Version | Verwendung in dieser Story |
|-------------|---------|---------------------------|
| Next.js | 16.1.6 | App Router, Server Actions |
| @supabase/supabase-js | ^2.98.0 | DB Client, RLS |
| @supabase/ssr | latest | Server Client Factory |
| shadcn/ui (Sheet, Select, Button) | latest | Bottom-Sheet UI |
| zod | ^4.3.6 | Schema Validation |
| vitest | ^4.0.18 | Unit/Integration Tests |
| Node.js crypto | built-in | HMAC Token Generation |

### Abgrenzung (Out of Scope)

- **NICHT** in dieser Story: E-Mail-Input im Sharing-Sheet (Story 5.2)
- **NICHT** in dieser Story: Token-Validierung und Cookie-Session (Story 5.3)
- **NICHT** in dieser Story: Automatisches Ablaufen/Revoke UI (Story 5.4)
- **NICHT** in dieser Story: Audit-Log Einträge (Story 5.5)
- **NICHT** in dieser Story: `/share/[token]` Route (Story 5.3)
- **NICHT** in dieser Story: Middleware-Erweiterung für Sharing-Cookie (Story 5.3)

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 5, Story 5.1]
- [Source: _bmad-output/planning-artifacts/architecture.md — D3 Sharing-Security, D7 RLS-Strategie]
- [Source: _bmad-output/planning-artifacts/architecture.md — Sharing-Flow (Zwei-Stufen-Token), Line 333-350]
- [Source: _bmad-output/planning-artifacts/architecture.md — RLS Policies Table, Line 314-322]
- [Source: _bmad-output/planning-artifacts/architecture.md — Naming Conventions, Line 510-548]
- [Source: _bmad-output/planning-artifacts/architecture.md — Project Structure, Line 561-587]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Journey 4: Konsultations-Vorbereitung, Line 813-842]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Pattern 3: Bottom-Sheet, Line 909-913]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Sharing-Sheet Components, Line 937-942]
- [Source: _bmad-output/planning-artifacts/prd.md — FR21 (Link-Generierung), FR22 (Zeitraum), FR23 (Zugriffsdauer)]
- [Source: _bmad-output/planning-artifacts/prd.md — NFR9 (kryptographische Token)]
- [Source: _bmad-output/implementation-artifacts/sprint-status.yaml — Epic 5 Stories]
- [Source: src/types/common.ts — ActionResult<T> Pattern]
- [Source: src/lib/db/client.ts — Supabase Client Factories (3 Varianten)]
- [Source: src/lib/db/insights.ts — DB-Layer Pattern (Epic 4)]
- [Source: src/lib/actions/insights-actions.ts — Server Actions Pattern (Epic 4)]
- [Source: src/app/(app)/more/page.tsx — Mehr-Seite (zu erweitern)]
- [Source: Epic 4 Retrospective — Error-Path Tests + Datenfilter-Checklist Action Items]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

Keine Blocker. Token-Generierung, DB-Layer, Server Actions und UI-Komponenten ohne Probleme implementiert.

### Completion Notes List

- **DB-Migration** (`20260315000001_story-5-1_sharing_links.sql`): Tabelle `sharing_links` mit RLS-Policies (SELECT/INSERT/UPDATE für `auth.uid() = account_id`), kein DELETE (Audit-Trail), zwei Indizes (UNIQUE token, account_id).
- **Token-Generierung** (`src/lib/utils/crypto.ts`): HMAC-SHA256(UUID) → 64-Zeichen Hex-String. Wirft klaren Fehler bei fehlendem `SHARING_HMAC_SECRET`.
- **DB-Layer** (`src/lib/db/sharing.ts`): `createSharingLink` mit 3-Versuch Retry-Logic bei UNIQUE-Kollision, `getActiveSharingLinks` filtert nach `expires_at > NOW() AND revoked_at IS NULL`, `revokeSharingLink` als Soft-Revoke-Vorbereitung für Story 5.4.
- **Server Actions** (`src/lib/actions/sharing-actions.ts`): Folgen Zod → Auth → DB → Return-Pattern aus Epic 4, `revalidatePath('/more')` nach Link-Erstellung.
- **Sheet-Komponente** (`src/components/ui/sheet.tsx`): Bottom-Sheet via Radix Dialog-Primitive, slide-in-from-bottom Animation, Safe-Area-Bottom-Padding, Drag-Indicator.
- **Select-Komponente** (`src/components/ui/select.tsx`): Native HTML `<select>` mit Tailwind-Styling (native Mobile-Picker ist besser auf iOS als Radix Select im Bottom-Sheet).
- **Share-Sheet** (`src/components/sharing/share-sheet.tsx`): State Machine `selecting → (useTransition isPending) → result`. Default Zugriffsdauer 24h. "Individuell" zeigt Von/Bis Date-Inputs. Result-View mit Copy-to-Clipboard und mailto-Vorbereitung für Story 5.2.
- **Sharing-Links-Liste** (`src/components/sharing/sharing-links-list.tsx`): Lädt aktive Links via `loadActiveSharingLinks`, zeigt Empty-State gemäß UX-Spec, Status-Badge (Aktiv/Abgelaufen), Copy-Button pro Eintrag.
- **Integration**: `"Für Arzt teilen"` Button im Insights-Header (rechts) und in neuer "Sharing"-Sektion auf Mehr-Seite.
- **Tests**: 22 Unit-Tests (Crypto + DB + Actions), 6 Component-Tests (ShareSheet + SharingLinksList), Gesamt 532 Tests, alle grün.
- **Task 10** (optionaler E2E-Test) wurde wegen optional-Status nicht implementiert — Basis für Story 5.2-5.5.

### File List

**Neue Dateien:**
- `supabase/migrations/20260315000001_story-5-1_sharing_links.sql`
- `src/types/sharing.ts`
- `src/lib/utils/crypto.ts`
- `src/lib/db/sharing.ts`
- `src/lib/actions/sharing-actions.ts`
- `src/components/ui/sheet.tsx`
- `src/components/ui/select.tsx`
- `src/components/sharing/share-sheet.tsx`
- `src/components/sharing/sharing-links-list.tsx`
- `src/__tests__/lib/utils/crypto.test.ts`
- `src/__tests__/lib/db/sharing.test.ts`
- `src/__tests__/actions/sharing-actions.test.ts`
- `src/__tests__/components/sharing/share-sheet.test.tsx`
- `src/__tests__/components/sharing/sharing-links-list.test.tsx`

**Geänderte Dateien:**
- `src/types/database.ts` (sharing_links Tabelle ergänzt)
- `src/app/(app)/insights/page.tsx` (ShareSheet-Button im Header)
- `src/app/(app)/more/page.tsx` (neue Sharing-Sektion)
- `src/__tests__/more-page.test.tsx` (sharing-actions Mock ergänzt)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (Status in-progress → review)

## Change Log

- 2026-03-15: Story implementiert — Sharing-Link-Generierung, DB-Migration, Token-Crypto, UI (Share-Sheet + Links-Liste), Integration in Insights + Mehr-Seite, 28 neue Tests (532 total). Story-Status: review.
- 2026-03-15: Code Review (Opus 4.6) — 10 Findings (3 HIGH, 5 MEDIUM, 2 LOW). 8 Issues gefixt: Secret aus .env.example entfernt (H1), Zod-Validierung für customFrom<=customTo + customTo<=today (H2/H3), getActiveSharingLinks gibt ActionResult zurück statt Fehler zu verschlucken (M1), Clipboard-API .catch() (M2), Kalendermonate statt fixe Tage (M3), afterEach Import (M4). M5 (client-side loading) als Design-Entscheidung belassen. 3 neue Tests, Gesamt 535 Tests grün. Story-Status: done.
