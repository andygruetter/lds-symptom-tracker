# Story 5.4: Automatisches Ablaufen von Sharing-Links

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a System,
I want Sharing-Links nach der festgelegten Zugriffsdauer automatisch ungültig machen,
so that der Datenzugriff zeitlich begrenzt ist und die Daten-Souveränität gewahrt bleibt (FR39).

## Acceptance Criteria

1. **Given** ein Sharing-Link mit gesetzter `expires_at`
   **When** die Zugriffsdauer abgelaufen ist
   **Then** wird der Zugriff über den Link verweigert (HTTP 410 Gone oder Redirect auf Expired-Seite)

2. **Given** ein abgelaufener Sharing-Link
   **When** ein Arzt diesen Link aufruft
   **Then** sieht er eine freundliche Meldung "Dieser Link ist abgelaufen" mit Hinweis, den Patienten um einen neuen Link zu bitten

3. **Given** ein Arzt hat eine aktive Sharing-Session (Cookie)
   **When** die Middleware einen Request auf `/share/dashboard` verarbeitet
   **Then** prüft die Middleware zusätzlich `expires_at` gegen die aktuelle Zeit und verweigert den Zugriff bei Ablauf

4. **Given** ein Patient auf der "Mehr"-Seite
   **When** der Patient die Sharing-Verwaltung öffnet
   **Then** sieht er sowohl aktive als auch abgelaufene Links mit jeweils klar unterscheidbarem Status (Badge: "Aktiv" grün, "Abgelaufen" grau, "Widerrufen" rot)

5. **Given** ein Patient sieht einen aktiven Sharing-Link
   **When** der Patient "Widerrufen" tippt und die Bestätigung gibt
   **Then** wird der Link vorzeitig deaktiviert (`revoked_at` wird gesetzt)
   **And** der Arzt kann den Link nicht mehr verwenden (Middleware prüft `revoked_at IS NULL`)

6. **Given** ein abgelaufener oder widerrufener Sharing-Link
   **When** das System den Link verarbeitet
   **Then** wird der Link NICHT aus der DB gelöscht (Audit-Trail-Anforderung, NFR11)
   **And** der zugehörige Sharing-Cookie wird invalidiert

7. **Given** ein Patient auf der "Mehr"-Seite
   **When** der Patient die Sharing-Link-Liste sieht
   **Then** zeigt jeder Eintrag: Erstelldatum, Datenzeitraum (von-bis), Ablaufdatum, aktueller Status
   **And** abgelaufene Links zeigen "Abgelaufen am [Datum]" statt dem Widerrufen-Button

## Tasks / Subtasks

- [x] Task 1: DB-Migration — `revoked_at` Spalte + RLS UPDATE Policy (AC: #5, #6)
  - [x] 1.1 Migration erstellen: `supabase migration new story-5-4_sharing_link_revoke`
  - [x] 1.2 `ALTER TABLE sharing_links ADD COLUMN revoked_at TIMESTAMPTZ DEFAULT NULL`
  - [x] 1.3 RLS UPDATE-Policy: `sharing_links_patient_update` — Patient darf eigene Links updaten (`auth.uid() = account_id`), nur `revoked_at` darf gesetzt werden
  - [x] 1.4 Index: `idx_sharing_links_expires_revoked` Composite-Index auf `(expires_at, revoked_at)` für performante Validierung

- [x] Task 2: DB-Layer — Revoke + Status-Queries `src/lib/db/sharing.ts` (AC: #4, #5, #7)
  - [x] 2.1 `revokeSharingLink(supabase, accountId, linkId)` — Setzt `revoked_at = NOW()`, nur wenn Link noch aktiv
  - [x] 2.2 `getAllSharingLinks(supabase, accountId)` — Alle Links (aktiv + abgelaufen + widerrufen) mit computed Status
  - [x] 2.3 `validateSharingLink(supabase, token)` — Token prüfen: existiert + `expires_at > NOW()` + `revoked_at IS NULL`
  - [x] 2.4 Helper `computeLinkStatus(link)`: `'active' | 'expired' | 'revoked'` basierend auf `expires_at` und `revoked_at`
  - [x] 2.5 Unit Tests für alle DB-Funktionen (happy + error paths)

- [x] Task 3: Server Actions `src/lib/actions/sharing-actions.ts` (AC: #4, #5)
  - [x] 3.1 `revokeSharingLink` Action — Zod-Validation (linkId: UUID) → Auth → DB → Return `ActionResult<void>`
  - [x] 3.2 `loadAllSharingLinks` Action — Auth → DB → Return `ActionResult<SharingLinkListItem[]>` (mit computed status)
  - [x] 3.3 Unit Tests für Actions (auth-check, validation, happy path, error paths)

- [x] Task 4: Middleware — Expiry + Revoke Prüfung `src/middleware.ts` (AC: #1, #3, #6)
  - [x] 4.1 Middleware-Check für `/share/dashboard` erweitern: Cookie auslesen → `sharing_link_id` aus Cookie/Session extrahieren → DB-Lookup → `expires_at > NOW()` + `revoked_at IS NULL` prüfen
  - [x] 4.2 Bei abgelaufenem/widerrufendem Link: Sharing-Cookie löschen + Redirect auf `/share/expired`
  - [x] 4.3 Bei gültigem Link: Request durchlassen (bestehendes Verhalten aus Story 5.3)
  - [x] 4.4 Performance: DB-Lookup pro Request ist akzeptabel (einfacher SELECT auf indexed Token, <5ms)

- [x] Task 5: Expired-Seite `src/app/share/expired/page.tsx` (AC: #2)
  - [x] 5.1 Statische Seite mit freundlicher Meldung: "Dieser Link ist abgelaufen"
  - [x] 5.2 Hinweistext: "Bitte wenden Sie sich an Ihren Patienten für einen neuen Sharing-Link."
  - [x] 5.3 Kein Login-Button, kein Header — minimale Seite mit App-Logo
  - [x] 5.4 `data-theme="doctor"` für konsistentes Arzt-Styling
  - [x] 5.5 Responsive: Mobile + iPad + Desktop

- [x] Task 6: Sharing-Links-Liste mit Status-Badges auf Mehr-Seite (AC: #4, #7)
  - [x] 6.1 `src/components/sharing/sharing-links-list.tsx` erweitern: Alle Links anzeigen (nicht nur aktive)
  - [x] 6.2 Status-Badge-Komponente: "Aktiv" (grün), "Abgelaufen" (grau), "Widerrufen" (rot)
  - [x] 6.3 Sortierung: Aktive Links oben, dann abgelaufene/widerrufene chronologisch
  - [x] 6.4 Aktive Links zeigen "Widerrufen"-Button (shadcn `Button` variant="destructive" size="sm")
  - [x] 6.5 Abgelaufene Links zeigen "Abgelaufen am [Datum]" statt Button
  - [x] 6.6 Widerrufene Links zeigen "Widerrufen am [Datum]" statt Button
  - [x] 6.7 Bestätigungs-Dialog vor Widerruf (shadcn `AlertDialog`): "Link wirklich widerrufen? Der Arzt kann danach nicht mehr auf die Daten zugreifen."
  - [x] 6.8 Loading-State mit `useTransition` während Widerruf
  - [x] 6.9 Component Tests

- [x] Task 7: Types & Schemas erweitern `src/types/sharing.ts` (AC: #4, #5)
  - [x] 7.1 `SharingLinkStatus` Type: `'active' | 'expired' | 'revoked'`
  - [x] 7.2 `SharingLinkListItem` erweitern: `status: SharingLinkStatus`, `revokedAt: string | null`, `expiresAt: string`
  - [x] 7.3 `RevokeSharingLinkSchema` Zod-Schema: `{ linkId: z.string().uuid() }`

- [x] Task 8: Zod Schemas + Types für Database `src/types/database.ts` (AC: #5)
  - [x] 8.1 `sharing_links` Row/Insert/Update Types um `revoked_at` ergänzen (nach Migration)

- [x] Task 9: E2E / Integration Tests (AC: alle)
  - [x] 9.1 Test: Abgelaufener Link → Redirect auf `/share/expired`
  - [x] 9.2 Test: Widerrufener Link → Redirect auf `/share/expired`
  - [x] 9.3 Test: Aktiver Link → Normaler Zugriff (Cookie + Dashboard)
  - [x] 9.4 Test: Patient widerruft Link → Link-Status in DB + UI-Badge
  - [x] 9.5 Test: Mehr-Seite zeigt aktive + abgelaufene + widerrufene Links mit Status-Badges
  - [x] 9.6 Test: Bestätigungs-Dialog vor Widerruf (Cancel-Flow)
  - [x] 9.7 Test: RLS — Patient sieht nur eigene Links (RLS SELECT Policy)

## Dev Notes

### Abhängigkeiten — KRITISCH

Diese Story hat **harte Abhängigkeiten** auf Stories 5.1 und 5.3, die VOR dieser Story implementiert sein müssen:

| Abhängigkeit | Story | Was wird benötigt |
|-------------|-------|-------------------|
| `sharing_links`-Tabelle | 5.1 | Tabelle mit `id`, `account_id`, `token`, `date_from`, `date_to`, `expires_at`, `created_at` |
| Token-Generierung | 5.1 | `generateSharingToken()` in `src/lib/utils/crypto.ts` |
| DB-Layer Basis | 5.1 | `createSharingLink()`, `getActiveSharingLinks()` in `src/lib/db/sharing.ts` |
| Server Actions Basis | 5.1 | `createSharingLink` Action in `src/lib/actions/sharing-actions.ts` |
| Sharing-Components | 5.1 | `share-sheet.tsx`, `sharing-links-list.tsx` in `src/components/sharing/` |
| Types/Schemas Basis | 5.1 | `SharingLink`, `SharingLinkListItem` in `src/types/sharing.ts` |
| Middleware | 5.3 | `src/middleware.ts` mit Sharing-Cookie-Prüfung |
| `/share/[token]` Route | 5.3 | Token-Validierung → Cookie setzen → Redirect |
| `/share/dashboard` Route | 5.3 | Arzt-Dashboard mit Cookie-Auth |
| Sharing-Cookie (HttpOnly) | 5.3 | `sharing_session` Cookie mit `SameSite=Strict`, `Secure` |

**Story 5.2** (E-Mail-Versand) ist KEINE Abhängigkeit — die mailto:-Funktionalität ist unabhängig.

### Architektur-Kontext: Zwei-Stufen-Token (D3)

Das Sharing-System nutzt ein **Zwei-Stufen-Token-System** (Architektur-Entscheidung D3):
1. **URL-Token** (Story 5.1): Kryptographisch sicher (UUID + HMAC), nur für initialen Lookup
2. **HttpOnly Cookie** (Story 5.3): `sharing_session` mit `SameSite=Strict`, `Secure` — für alle weiteren Requests

**Story 5.4 erweitert beide Stufen:**
- URL-Token-Validierung: Zusätzliche Prüfung auf `expires_at > NOW()` + `revoked_at IS NULL`
- Cookie-Validierung in Middleware: Bei jedem Request gegen `/share/dashboard` wird Ablauf geprüft
- Bei Ablauf/Widerruf: Cookie wird gelöscht, Redirect auf `/share/expired`

### Ablauf-Architektur — Kein Cron Job nötig

Die Ablauf-Prüfung erfolgt **request-basiert** (lazy expiration), nicht per Cron:
- Bei jedem Arzt-Request prüft die Middleware `expires_at > NOW()` und `revoked_at IS NULL`
- Die Patienten-UI berechnet den Status client-seitig aus `expires_at` und `revoked_at`
- Kein Background-Job nötig — Links "laufen ab" sobald die Zeit abgelaufen ist, ohne aktive Deaktivierung

**Vorteil:** Kein Cron-Setup, keine Background-Worker, keine Race Conditions.

### Widerruf vs. Ablauf — Unterscheidung

| Eigenschaft | Ablauf (Expiry) | Widerruf (Revoke) |
|------------|-----------------|-------------------|
| Trigger | Automatisch (Zeit) | Manuell (Patient) |
| DB-Feld | `expires_at < NOW()` | `revoked_at IS NOT NULL` |
| Prüfung | Middleware + UI | Middleware + UI |
| Reversibel | Nein (kein Verlängern) | Nein (final) |
| Audit-Trail | Link bleibt in DB | Link bleibt in DB, `revoked_at` gesetzt |
| Status-Badge | "Abgelaufen" (grau) | "Widerrufen" (rot) |

### Middleware-Erweiterung (aus Story 5.3 aufbauend)

Die Middleware aus Story 5.3 prüft aktuell nur ob ein `sharing_session` Cookie existiert. Story 5.4 erweitert diese Prüfung:

```typescript
// Erweiterung in src/middleware.ts
if (path.startsWith('/share/dashboard')) {
  const sharingSession = request.cookies.get('sharing_session')
  if (!sharingSession) {
    return NextResponse.redirect(new URL('/share/expired', request.url))
  }
  // NEU in Story 5.4: Ablauf + Widerruf prüfen
  // sharing_link_id aus Cookie-Session extrahieren
  // DB-Lookup: SELECT expires_at, revoked_at FROM sharing_links WHERE id = sharing_link_id
  // Wenn expires_at < NOW() ODER revoked_at IS NOT NULL:
  //   → Cookie löschen + Redirect auf /share/expired
}
```

**ACHTUNG:** Die Middleware muss einen DB-Lookup pro Request machen. Das ist akzeptabel weil:
- Einfacher SELECT auf indexed Spalte (<5ms)
- Sharing-Dashboard wird selten aufgerufen (nicht bei jedem Patient-Request)
- Security-Anforderung: Real-time Ablauf-Prüfung (NFR9, FR39)

### Sharing-Cookie-Struktur (aus Story 5.3)

Die Middleware muss die `sharing_link_id` aus dem Cookie extrahieren können. Die Cookie-Struktur wird in Story 5.3 definiert. Erwartete Struktur:

```typescript
interface SharingSession {
  sharing_link_id: string  // UUID → für DB-Lookup in Story 5.4
  account_id: string       // Patienten-ID → für Data-Scoping
  date_from: string        // Zeitraum Start
  date_to: string          // Zeitraum Ende
}
```

Der Cookie-Inhalt ist JWT-signed oder verschlüsselt (Story 5.3 entscheidet). Story 5.4 benötigt nur die `sharing_link_id` zum DB-Lookup.

### Expired-Seite Design

Minimalistische Seite ohne App-Chrome:
- App-Logo (klein, oben)
- Haupttext: **"Dieser Link ist abgelaufen"**
- Subtext: "Die Zugriffsdauer für diesen Sharing-Link ist abgelaufen. Bitte wenden Sie sich an Ihren Patienten für einen neuen Sharing-Link."
- Kein Login-Button, kein Zurück-Button, keine Navigation
- `data-theme="doctor"` (konsistent mit Arzt-Ansicht)
- Responsiv: zentriertes Layout auf allen Devices

### UX: Mehr-Seite Sharing-Verwaltung

Die "Mehr"-Seite erhält eine erweiterte Sharing-Sektion (aufbauend auf Story 5.1):

```
┌─────────────────────────────────┐
│ SHARING                          │
├─────────────────────────────────┤
│ 🟢 Aktiv — Erstellt 12.03.2026  │
│    Zeitraum: 01.12-12.03        │
│    Ablauf: 15.03.2026 14:30     │
│                    [Widerrufen]  │
├─────────────────────────────────┤
│ ⚫ Abgelaufen — Erstellt 01.02  │
│    Zeitraum: 01.11-01.02        │
│    Abgelaufen am 08.02.2026     │
├─────────────────────────────────┤
│ 🔴 Widerrufen — Erstellt 15.01  │
│    Zeitraum: 15.10-15.01        │
│    Widerrufen am 17.01.2026     │
└─────────────────────────────────┘
```

### RLS-Policy Checklist (bei DB-Änderungen)

- [ ] SELECT-Policy: Bestehende `sharing_links_patient_select` bleibt (kein Change)
- [ ] INSERT-Policy: Bestehende `sharing_links_patient_insert` bleibt (kein Change)
- [ ] UPDATE-Policy: **NEU** `sharing_links_patient_update` — `auth.uid() = account_id`, beschränkt auf `revoked_at`-Feld
- [ ] DELETE-Policy: **KEINE** — Links werden nie gelöscht (Audit-Trail, NFR11)
- [ ] Arzt-Zugriff: Kein RLS für Arzt-Lese-Zugriff nötig — Arzt greift über Service-Client zu (Story 5.3)

### Migrations-Konvention

- Dateiname: `XXXXX_story-5-4_sharing_link_revoke.sql`
- Generierung: `supabase migration new story-5-4_sharing_link_revoke`
- Story-Referenz im Dateinamen verhindert Nummerierungskonflikte bei paralleler Arbeit

### Project Structure Notes

Neue Dateien:
```
src/
  app/
    share/
      expired/
        page.tsx               → Expired-Link-Seite (NEU)
```

Bestehende Dateien die geändert werden (alle aus Stories 5.1 + 5.3):
```
src/
  middleware.ts                → Expiry + Revoke Check erweitern (Story 5.3 liefert Basis)
  lib/
    db/
      sharing.ts               → revokeSharingLink, getAllSharingLinks, validateSharingLink erweitern
    actions/
      sharing-actions.ts       → revokeSharingLink Action, loadAllSharingLinks Action
  components/
    sharing/
      sharing-links-list.tsx   → Status-Badges, Widerruf-Button, abgelaufene Links
  types/
    sharing.ts                 → SharingLinkStatus, revoked_at Felder
    database.ts                → sharing_links Types um revoked_at erweitern
supabase/
  migrations/                  → Neue Migration (ALTER TABLE)
```

### Established Code Patterns (aus Epics 1-4 und Story 5.1)

| Pattern | Wo anwenden | Referenz |
|---------|-------------|----------|
| `ActionResult<T>` | Alle Server Actions | `src/types/common.ts` |
| Zod → Auth → DB | `sharing-actions.ts` | `src/lib/actions/insights-actions.ts` |
| `createServerClient()` (mit RLS) | DB-Queries in Actions | `src/lib/db/client.ts` |
| `createServiceClient()` (ohne RLS) | Middleware DB-Lookup | `src/lib/db/client.ts` |
| `useTransition` | Revoke-Button Loading-State | `src/components/event/symptom-feed.tsx` |
| shadcn `AlertDialog` | Widerruf-Bestätigung | UX Pattern: Bestätigungs-Dialog für destruktive Aktionen |
| shadcn `Badge` | Status-Badges (Aktiv/Abgelaufen/Widerrufen) | Konsistentes Status-Anzeige-Pattern |
| `toLocalDateKey()` | Datum-Anzeige | `src/lib/utils/date.ts` |
| Soft-Status statt Hard-Delete | `revoked_at` statt DB-Delete | Gleich wie `deleted_at` Pattern bei Events |

### Technische Stack-Details

| Technologie | Version | Verwendung in dieser Story |
|-------------|---------|---------------------------|
| Next.js | 16.1.6 | Middleware, App Router, Server Actions |
| @supabase/supabase-js | ^2.98.0 | DB Client, RLS |
| @supabase/ssr | latest | Server Client Factory (Middleware) |
| shadcn/ui (AlertDialog, Badge, Button) | latest | Bestätigung, Status-Badges, Aktionen |
| zod | ^4.3.6 | Schema Validation (RevokeSharingLinkSchema) |
| vitest | ^4.0.18 | Unit/Integration Tests |
| Playwright | latest | E2E Tests |

### Abgrenzung (Out of Scope)

- **NICHT** in dieser Story: Sharing-Link erstellen (Story 5.1)
- **NICHT** in dieser Story: E-Mail-Versand (Story 5.2)
- **NICHT** in dieser Story: Token-Validierung und Cookie-Setup (Story 5.3 — aber Middleware-Erweiterung JA)
- **NICHT** in dieser Story: Audit-Log Einträge (Story 5.5)
- **NICHT** in dieser Story: Link-Verlängerung (kein Requirement)
- **NICHT** in dieser Story: Automatische Benachrichtigung an Patient bei Ablauf (nicht im PRD)
- **NICHT** in dieser Story: Cron-Job für Ablauf (lazy expiration stattdessen)

### Previous Story Intelligence (Story 5.1)

Aus der Story 5.1 Spezifikation — relevante Patterns und Vorbereitungen:

| Vorbereitung in 5.1 | Relevanz für 5.4 |
|---------------------|-------------------|
| `sharing_links`-Tabelle mit `expires_at` | Foundation für Ablauf-Prüfung |
| `revokeSharingLink` (Soft-Revoke optional) | In 5.4 vollständig implementiert |
| RLS: SELECT + INSERT Policies | UPDATE Policy muss in 5.4 ergänzt werden |
| `SharingLinkListItem` Type | Wird um `status`, `revokedAt` erweitert |
| `sharing-links-list.tsx` | Wird um Status-Badges und Widerruf erweitert |
| `computeLinkStatus` Helper | In 5.1 eventuell schon vorbereitet |

### Git Intelligence

Letzter relevanter Commit: `c128ff9 Add Epic 4 retrospective and mark epic as done (#9)`
- Alle Sharing-Dateien existieren noch NICHT im Codebase (erst ab Story 5.1)
- Migrations-Nummerierung: Letzte Migration ist `20260314224610_fix_rls_select_policy_for_soft_delete.sql`
- Supabase Migration-Format hat sich geändert: neuere Migrations nutzen Timestamp-Prefix statt numerisch

### Datenfilter-Checklist (Epic 4 Retrospective Action Item)

Bei allen DB-Queries sicherstellen:
- [ ] `account_id` Filter (Ownership via RLS + App-Level)
- [ ] `expires_at > NOW()` für Validierung aktiver Links
- [ ] `revoked_at IS NULL` für Validierung nicht-widerrufener Links
- [ ] Kein `deleted_at` auf `sharing_links` (keine Soft-Delete für Links — abgelaufene bleiben als Audit-Trail)

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 5, Story 5.4 (Lines 683-697)]
- [Source: _bmad-output/planning-artifacts/architecture.md — D3 Sharing-Security: Zwei-Stufen-Token]
- [Source: _bmad-output/planning-artifacts/architecture.md — Sharing-Flow, Middleware-Strategie]
- [Source: _bmad-output/planning-artifacts/architecture.md — D7 RLS-Strategie: Account-ID + Sharing-Token]
- [Source: _bmad-output/planning-artifacts/architecture.md — RLS Policies Table]
- [Source: _bmad-output/planning-artifacts/architecture.md — Naming Conventions (Datenbank + Code)]
- [Source: _bmad-output/planning-artifacts/architecture.md — Project Structure (Routing, Components)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Journey 4: Konsultations-Vorbereitung]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Pattern 3: Bottom-Sheet]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Modal & Overlay Patterns (AlertDialog für destruktiv)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Empty States (Sharing-Verwaltung)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Navigation: Mehr-Tab]
- [Source: _bmad-output/planning-artifacts/prd.md — FR39 (automatisches Ablaufen)]
- [Source: _bmad-output/planning-artifacts/prd.md — NFR9 (kryptographische Token)]
- [Source: _bmad-output/planning-artifacts/prd.md — NFR11 (Audit-Log unveränderbar)]
- [Source: _bmad-output/implementation-artifacts/5-1-sharing-link-generieren.md — Tabellen-Schema, Token-Format, Code-Patterns]
- [Source: _bmad-output/implementation-artifacts/sprint-status.yaml — Epic 5 Stories]
- [Source: src/types/common.ts — ActionResult<T>, AppError]
- [Source: src/lib/db/client.ts — Supabase Client Factories (3 Varianten)]
- [Source: src/lib/db/insights.ts — DB-Layer Pattern (Epic 4)]
- [Source: src/lib/actions/insights-actions.ts — Server Actions Pattern]
- [Source: src/app/(app)/more/page.tsx — Mehr-Seite (zu erweitern)]
- [Source: Epic 4 Retrospective — Error-Path Tests + Datenfilter-Checklist Action Items]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

Keine kritischen Debug-Probleme. Zwei Test-Korrekturen nötig:
1. Proxy-Test-Mock benötigte `.cookies.delete` auf Response-Objekt
2. SharingLinksList-Test: Regex-Match für Datum war mehrdeutig (createdAt + dateTo haben gleiches Datum)

### Completion Notes List

- **Task 1 (Migration)**: `revoked_at` und UPDATE-Policy existierten bereits aus Story 5.1. Neue Migration `20260315000002_story-5-4_sharing_link_revoke.sql` fügt nur den Composite-Index `idx_sharing_links_expires_revoked` hinzu.
- **Task 2 (DB-Layer)**: `computeLinkStatus(expiresAt, revokedAt)` exportiert für direkte Verwendung in Tests. `getAllSharingLinks` gibt alle Links ohne Filter zurück — Status wird client-seitig berechnet. `revokeSharingLink` existierte bereits aus Story 5.1.
- **Task 3 (Server Actions)**: `revokeSharingLinkAction` mit Zod UUID-Validation. `loadAllSharingLinks` parallel zu `loadActiveSharingLinks` für rückwärtskompatiblen Betrieb.
- **Task 4 (Middleware)**: `parseSharingSession` extrahiert `linkId` aus Cookie → `validateSharingLinkById` prüft Ablauf + Widerruf in DB. Cookie wird bei Fehler mit `response.cookies.delete` gelöscht. Architektur: Cookie-Format ist `{linkId}:{expiresAtUnix}:{hmacSignature}` (aus Story 5.3).
- **Task 5 (Expired-Seite)**: Bereits vollständig aus Story 5.3. Keine Änderung nötig.
- **Task 6 (SharingLinksList)**: Vollständig neu geschrieben. `StatusBadge`-Komponente mit drei Status. `AlertDialog` aus shadcn für Widerruf-Bestätigung. `useTransition` für Loading-State. Optimistisches Update: Status wird nach erfolgreichem Widerruf sofort im lokalen State aktualisiert.
- **Task 7 (Types)**: `SharingLinkStatus`, `RevokeSharingLinkSchema`, `SharingLinkListItem` um `status` + `revokedAt` erweitert.
- **Task 8 (database.ts)**: Bereits aus Story 5.1 vollständig vorhanden.
- **Task 9 (Tests)**: 7 Playwright E2E-Tests in `e2e/sharing-ablauf.spec.ts` decken Token-Validierung (expired/revoked/active) und Mehr-Seite Link-Verwaltung (Status-Badges, Widerruf-Dialog, RLS) ab.
- **615 Unit-Tests + 7 E2E-Tests — alle grün**.

### File List

- `supabase/migrations/20260315000002_story-5-4_sharing_link_revoke.sql` (NEU)
- `src/types/sharing.ts` (geändert — SharingLinkStatus, RevokeSharingLinkSchema, SharingLinkListItem erweitert)
- `src/types/database.ts` (geändert — sharing_links Row/Insert/Update um revoked_at erweitert)
- `src/lib/db/sharing.ts` (geändert — computeLinkStatus, getAllSharingLinks, revokeSharingLink mit IS NULL Guard)
- `src/lib/actions/sharing-actions.ts` (geändert — revokeSharingLinkAction, loadAllSharingLinks)
- `src/proxy.ts` (geändert — DB-Lookup für Ablauf + Widerruf in Middleware)
- `src/components/sharing/sharing-links-list.tsx` (geändert — Status-Badges, Widerruf-Button, AlertDialog, useTransition, Error-Toast)
- `src/app/share/expired/page.tsx` (geändert — Wording angepasst an AC #2, App-Logo ergänzt)
- `src/app/(app)/more/page.tsx` (geändert — getAllSharingLinks statt getActiveSharingLinks)
- `src/__tests__/more-page.test.tsx` (geändert — Sharing-Section Test)
- `src/__tests__/lib/db/sharing.test.ts` (geändert — computeLinkStatus + getAllSharingLinks + revoke IS NULL Tests)
- `src/__tests__/actions/sharing-actions.test.ts` (geändert — revokeSharingLinkAction + loadAllSharingLinks Tests)
- `src/__tests__/proxy.test.ts` (geändert — Middleware DB-Lookup + Cookie-Delete Tests)
- `src/__tests__/components/sharing/sharing-links-list.test.tsx` (geändert — Status-Badge + Widerruf Tests)
- `src/app/share/[token]/route.ts` (NEU — ersetzt page.tsx, Route Handler für Cookie-Set in Next.js 16)
- `src/lib/sharing/context.ts` (geändert — cookieStore.delete entfernt, Server Component-kompatibel)
- `e2e/sharing-ablauf.spec.ts` (NEU — 7 E2E-Tests für Token-Validierung + Mehr-Seite Link-Verwaltung)
- `e2e/fixtures/test-data.ts` (geändert — Sharing-Link Test-Helpers: createTestSharingLink, getSharingLink, cleanupTestSharingLinks)
- `e2e/global.teardown.ts` (geändert — sharing_links Cleanup)
- `src/__tests__/share-token-route.test.ts` (NEU — 5 Unit-Tests für Route Handler /share/[token])
- `playwright.config.ts` (geändert — SHARING_HMAC_SECRET Fallback für E2E)

## Change Log

- Story 5.4 implementiert: Automatisches Ablaufen + manueller Widerruf von Sharing-Links (Date: 2026-03-15)
- Code Review Fixes (Date: 2026-03-15):
  - H2: `revokeSharingLink` prüft nun `revoked_at IS NULL` + Return Count (Audit-Trail NFR11)
  - M1: Error-Toast bei fehlgeschlagenem Widerruf (sonner)
  - M2: Proxy-Tests verifizieren Cookie-Löschung (`sharing_session`)
  - M3: File List um `database.ts`, `more-page.test.tsx`, `expired/page.tsx` ergänzt
  - M4: Expired-Seite Wording an AC #2 angepasst + Text-Logo ergänzt
  - H1: Task 9 (E2E Tests) auf `[ ]` korrigiert — sind Unit-Tests, nicht E2E
- E2E Tests implementiert + Bug-Fixes (Date: 2026-03-15):
  - Task 9: 7 Playwright E2E-Tests in `e2e/sharing-ablauf.spec.ts`
  - Bug-Fix: `/share/[token]/page.tsx` → `route.ts` (cookies().set() nicht erlaubt in Server Components, Next.js 16)
  - Bug-Fix: `secure: process.env.NODE_ENV === 'production'` statt `secure: true` (WebKit sendet keine Secure Cookies über HTTP localhost)
  - Bug-Fix: `getSharingContext` cookieStore.delete() entfernt (nicht erlaubt in Server Components)
  - **615 Unit-Tests + 7 E2E-Tests — alle grün**
- Code Review #2 Fixes (Date: 2026-03-15):
  - M1: Unit-Test für Route Handler `/share/[token]/route.ts` hinzugefügt (5 Tests: Token-Format, Validation, Cookie-Set, maxAge)
  - L3: Stale Completion Notes korrigiert (Task 9 Beschreibung + Test-Count aktualisiert)
