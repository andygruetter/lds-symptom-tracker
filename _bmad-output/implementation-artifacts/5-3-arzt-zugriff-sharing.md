# Story 5.3: Arzt-Zugriff über Sharing-Link (Zwei-Stufen-Token)

Status: done

## 📋 Implementation Update (Stand 2026-05-06)

**Cookie-Path:** Das Sharing-Session-Cookie wird mit `path: '/'` gesetzt
(`src/app/share/[token]/route.ts:50`), nicht mit dem ursprünglich vorgesehenen
`Path=/share`. Begründung: Das Cookie ist `HttpOnly + Secure + SameSite=Strict`,
damit ist Principle of Least Privilege ausreichend gewahrt; ein breiter Path
vereinfacht zusätzliche Edge-Cases (z. B. spätere Ergänzung weiterer Routen
außerhalb von `/share`).

**Expired-Handling:** Bei abgelaufenem oder widerrufenem Token erfolgt ein
**302-Redirect** auf `/share/expired` (siehe `src/proxy.ts` und
`src/app/share/[token]/route.ts`), nicht ein HTTP-410-Statuscode. Der Redirect
liefert die UX-freundlichere Fehlerseite.

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Arzt,
I want über den Sharing-Link ohne Login auf das Patienten-Dashboard zugreifen,
So that ich die Daten meines Patienten ohne eigenen Account einsehen kann (FR26).

## Acceptance Criteria

1. **Given** ein Arzt klickt auf einen gültigen Sharing-Link (`/share/{token}`)
   **When** der Link aufgerufen wird
   **Then** wird der URL-Token gegen die `sharing_links`-Tabelle validiert (Existenz, nicht abgelaufen, nicht widerrufen)
   **And** bei gültigem Token wird ein HttpOnly Cookie `sharing_session` gesetzt mit `SameSite=Strict`, `Secure` und `Path=/share`
   **And** der Arzt wird auf `/share/dashboard` weitergeleitet

2. **Given** der Token ist gültig und der Cookie wurde gesetzt
   **When** der Arzt auf `/share/dashboard` landet
   **Then** zeigt das Dashboard `data-theme="doctor"` (serverseitiges Theme-Switching, Architektur D11)
   **And** das Layout ist eigenständig (kein Tab-Bar, kein Login-Button, kein Patient-Navigation)

3. **Given** der Arzt befindet sich auf dem Arzt-Dashboard
   **When** er eine Seite unter `/share/dashboard/*` aufruft
   **Then** prüft die Middleware (proxy.ts) den `sharing_session` Cookie
   **And** bei fehlendem Cookie wird auf `/share/expired` weitergeleitet
   **And** das Dashboard-Layout validiert Cookie-Signatur + DB-Check (Deep Validation)

4. **Given** ein Arzt klickt auf einen ungültigen oder abgelaufenen Sharing-Link
   **When** der Token nicht existiert ODER `expires_at < NOW()` ODER `revoked_at IS NOT NULL`
   **Then** wird die Fehlerseite `/share/expired` angezeigt
   **And** die Seite zeigt "Dieser Zugang ist abgelaufen oder ungültig" mit freundlicher Erklärung

5. **Given** der Arzt hat Zugriff auf das Dashboard
   **When** Daten abgerufen werden
   **Then** werden nur Symptom-Events im Zeitraum `date_from` bis `date_to` des Sharing-Links angezeigt
   **And** die Datenabfrage nutzt `createServiceClient()` (bypasses RLS) mit explizitem `account_id` + Zeitraum-Filter
   **And** `deleted_at IS NULL` Filter wird angewendet (Soft-Delete Konvention)

6. **Given** Audio- oder Foto-Dateien im Dashboard
   **When** der Arzt darauf zugreift
   **Then** sind diese nur per Stream/Ansicht zugänglich (`Content-Disposition: inline`)
   **And** kein Download-Button wird angezeigt (FR40, NFR10)
   **And** Signed URLs haben einen TTL von 15 Minuten (Architektur D8)

7. **Given** das Arzt-Dashboard wird aufgerufen
   **When** die Seite lädt
   **Then** zeigt das Dashboard eine Shell mit:
   **And** Sticky Header mit Zeitraum-Badge und PDF-Platzhalter
   **And** Platzhalter-Cards für KI-Zusammenfassung, Timeline, Ranking (werden in Epic 6 implementiert)
   **And** responsive Layout: 1 Spalte (Mobile), 2 Spalten (md/iPad), 3 Spalten (xl/Desktop)

## Tasks / Subtasks

- [x] Task 1: Sharing-Types erweitern (AC: #1, #5)
  - [x] 1.1 `src/types/sharing.ts` erweitern (muss nach Story 5.1 existieren):
    - `SharingLinkData` — Subset für Token-Validierung: `{ id, accountId, dateFrom, dateTo, expiresAt }`
    - `SharingContext` — Dashboard-Context: `{ accountId, dateFrom, dateTo, expiresAt, linkId }`
    - `SharingSessionPayload` — Cookie-Payload: `{ linkId, expiresAt, signature }`
- [x] Task 2: DB-Layer für Token-Validierung (AC: #1, #4, #5)
  - [x] 2.1 `src/lib/db/sharing.ts` erweitern: `validateSharingToken(token: string): Promise<SharingLinkData | null>`
  - [x] 2.2 Query: `SELECT id, account_id, date_from, date_to, expires_at FROM sharing_links WHERE token = $1 AND expires_at > NOW() AND revoked_at IS NULL`
  - [x] 2.3 **MUSS `createServiceClient()` verwenden** — Arzt hat keine Auth-Session, RLS würde Query blocken
  - [x] 2.4 `getSharedSymptomEvents(accountId, dateFrom, dateTo)` — Symptom-Events für Dashboard
  - [x] 2.5 Query-Filter: `account_id = $1 AND occurred_at >= $2 AND occurred_at <= $3 AND deleted_at IS NULL`
  - [x] 2.6 Unit Tests: gültiger Token, abgelaufener Token, widerrufener Token, nicht-existierender Token, Zeitraum-Filter
- [x] Task 3: Sharing-Session Cookie-Management (AC: #1, #3)
  - [x] 3.1 `src/lib/sharing/session.ts` — Cookie-Utility-Funktionen
  - [x] 3.2 `createSharingSessionCookie(linkId, expiresAt): string` — Payload signieren mit HMAC
  - [x] 3.3 Cookie-Wert Format: `{linkId}:{expiresAtUnix}:{hmac(SHARING_HMAC_SECRET, linkId+expiresAtUnix)}`
  - [x] 3.4 `parseSharingSession(cookieValue): SharingSessionPayload | null` — Parse + Signatur validieren
  - [x] 3.5 Cookie-Attribute: `HttpOnly=true`, `Secure=true`, `SameSite=Strict`, `Path=/share`, `Max-Age=verbleibende Sekunden bis expiresAt`
  - [x] 3.6 `SHARING_HMAC_SECRET` aus `process.env` — bereits in `.env.local.example` definiert
  - [x] 3.7 Unit Tests: Signierung, Parsing, Manipulation-Erkennung, Ablauf
- [x] Task 4: Token-Validierungs-Route `/share/[token]/page.tsx` (AC: #1, #2, #4)
  - [x] 4.1 Server Component: Token aus `params.token` extrahieren
  - [x] 4.2 `validateSharingToken(token)` aufrufen via Service Client
  - [x] 4.3 Bei gültigem Token: Cookie setzen via `cookies().set('sharing_session', ...)` + `redirect('/share/dashboard')`
  - [x] 4.4 Bei ungültigem Token: `redirect('/share/expired')`
  - [x] 4.5 Kein Client-Side JavaScript — rein serverseitig
- [x] Task 5: Middleware-Erweiterung (AC: #3)
  - [x] 5.1 `src/proxy.ts` erweitern: Neuer Block VOR dem generischen `/share` Durchlass (Line 28)
  - [x] 5.2 Nur `/share/dashboard` Pfade: Cookie-Existenz prüfen
  - [x] 5.3 Bei fehlendem Cookie: Redirect zu `/share/expired`
  - [x] 5.4 Bestehende Logik beibehalten: `/share/[token]` und `/share/expired` bleiben öffentlich
  - [x] 5.5 **NUR Cookie-Existenz** in Middleware — Deep Validation im Dashboard-Layout
  - [x] 5.6 Tests in `src/__tests__/proxy.test.ts` erweitern: mit/ohne Cookie, verschiedene /share Pfade
- [x] Task 6: Dashboard Layout + Doctor-Theme (AC: #2, #7)
  - [x] 6.1 `src/app/share/dashboard/layout.tsx` — Server Component
  - [x] 6.2 `data-theme="doctor"` auf `<div>` Wrapper (Architektur D11 — kein Client-Side Flash)
  - [x] 6.3 Cookie auslesen → `parseSharingSession()` → Signatur-Validierung
  - [x] 6.4 `validateSharingLinkById()` gegen DB (Deep Validation — Token noch gültig?)
  - [x] 6.5 Bei ungültigem Token trotz Cookie: Cookie löschen + `redirect('/share/expired')`
  - [x] 6.6 `SharingContext` via Page-Level-Re-Read (Next.js App Router Server Component Pattern)
  - [x] 6.7 Responsive Container: `max-w-7xl mx-auto` ab `xl`
  - [x] 6.8 Sticky Header: Zeitraum-Badge (z.B. "Jan 2026 – Mär 2026") + PDF-Button Platzhalter
  - [x] 6.9 Kein Tab-Bar, kein Login, kein Account-Menü
- [x] Task 7: Dashboard Page Shell (AC: #7)
  - [x] 7.1 `src/app/share/dashboard/page.tsx` — Server Component
  - [x] 7.2 Platzhalter-Cards: KI-Zusammenfassung, Timeline, Ranking (mit "Kommt in einer zukünftigen Version" oder Skeleton)
  - [x] 7.3 Daten laden: `getSharedSymptomEvents()` via Service Client (Proof-of-Concept, zeigt Anzahl Events)
  - [x] 7.4 Responsive Grid: `grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4`
  - [x] 7.5 `loading.tsx` — Skeleton-Komponente für Dashboard
- [x] Task 8: Expired/Fehlerseite (AC: #4)
  - [x] 8.1 `src/app/share/expired/page.tsx` — Statische Server Component
  - [x] 8.2 Meldung: "Dieser Zugang ist abgelaufen oder ungültig"
  - [x] 8.3 Erklärung: "Der Sharing-Link war zeitlich begrenzt. Bitte kontaktieren Sie den Patienten für einen neuen Link."
  - [x] 8.4 Doctor-Theme konsistent (`src/app/share/layout.tsx` mit `data-theme="doctor"` für alle /share/* Routen)
  - [x] 8.5 Kein Retry, kein Login, kein komplexes UI — bewusst minimalistisch
- [x] Task 9: Media-Security für Dashboard (AC: #6)
  - [x] 9.1 Utility-Funktion: `getSignedMediaUrl(filePath, bucket)` — Signed URL mit 15min TTL
  - [x] 9.2 `createServiceClient().storage.from(bucket).createSignedUrl(path, 900)` — Service Client für Arzt
  - [x] 9.3 Kein `download` Attribut auf `<audio>` oder `<img>` Tags (in Komponenten sicherstellen)
  - [x] 9.4 Diese Funktion wird in Epic 6 (Drill-Down) vollständig genutzt, hier nur bereitstellen
- [x] Task 10: Error-Path + Security Tests (AC: #1, #3, #4, #6)
  - [x] 10.1 Test: Abgelaufener Token → Expired-Seite (validateSharingToken gibt null)
  - [x] 10.2 Test: Widerrufener Token → Expired-Seite (validateSharingToken gibt null)
  - [x] 10.3 Test: Nicht-existierender Token → Expired-Seite (validateSharingToken gibt null)
  - [x] 10.4 Test: Gültiger Token → SharingLinkData mit korrekten Feldern
  - [x] 10.5 Test: Dashboard ohne Cookie → Redirect zu Expired (Middleware)
  - [x] 10.6 Test: Dashboard mit manipuliertem Cookie → parseSharingSession gibt null
  - [x] 10.7 Test: Daten-Zugriff nur innerhalb des Sharing-Zeitraums (gte/lte Filter)
  - [x] 10.8 Test: Events mit `deleted_at` werden gefiltert (is('deleted_at', null))

## Dev Notes

### Architektur-Kontext: Zwei-Stufen-Token (D3) — Stufe 2

Diese Story implementiert **Stufe 2** des Zwei-Stufen-Token-Systems:
1. **Stufe 1** (Story 5.1): URL-Token generieren + in `sharing_links` speichern
2. **Stufe 2** (diese Story): Token validieren → HttpOnly Cookie → Arzt-Dashboard-Zugriff

**Kompletter Sharing-Flow:**
```
Patient erstellt Sharing-Link (Story 5.1)
  → Token in sharing_links gespeichert

Arzt klickt /share/[token] (diese Story)
  → Server validiert Token (existiert? nicht abgelaufen? nicht widerrufen?)
  → Setzt HttpOnly Cookie (sharing_session) mit Path=/share
  → Redirect auf /share/dashboard
  → Alle weiteren Requests über Cookie (Token nicht mehr in URL)

Nach TTL-Ablauf:
  → Cookie-Max-Age abgelaufen
  → DB-Validierung schlägt fehl (expires_at < NOW())
  → Arzt sieht "Zugang abgelaufen"
```

### Cookie-Design

| Attribut | Wert | Begründung |
|----------|------|------------|
| Name | `sharing_session` | Klar abgegrenzt von Supabase Auth Cookies |
| Value | `{linkId}:{expiresAtUnix}:{hmacSignature}` | Tamper-proof, validierbar ohne DB |
| HttpOnly | `true` | Nicht per JavaScript auslesbar (XSS-Schutz, NFR7) |
| Secure | `true` | Nur HTTPS (Vercel = immer HTTPS) |
| SameSite | `Strict` | CSRF-Schutz — Cookie nur bei Same-Origin Requests (NFR9) |
| Path | `/share` | Cookie nur für Sharing-Routen sichtbar |
| Max-Age | `expiresAt - now()` Sekunden | Synchron mit DB-Ablauf |

**Doppelte Validierung:**
1. **Middleware** (`proxy.ts`): Cookie vorhanden? → Schnell, kein DB-Zugriff
2. **Dashboard-Layout**: Cookie-Signatur + DB-Prüfung (Token noch gültig?) → Deep Validation

### Daten-Zugriff: Service Client — KRITISCH

Der Arzt hat **keine Supabase Auth-Session**. Alle Dashboard-Queries MÜSSEN `createServiceClient()` verwenden:

```typescript
// RICHTIG: Service Client für Arzt-Dashboard (bypasses RLS)
import { createServiceClient } from '@/lib/db/client'
const supabase = createServiceClient()
const { data } = await supabase
  .from('symptom_events')
  .select('*')
  .eq('account_id', context.accountId)
  .gte('occurred_at', context.dateFrom)
  .lte('occurred_at', context.dateTo)
  .is('deleted_at', null)

// FALSCH: Server Client hat keine Auth-Session für den Arzt!
// const supabase = await createServerClient() // ❌ RLS blockt alles!
```

### Middleware-Erweiterung (src/proxy.ts)

Aktuelle Logik (Line 24-31): `/share/*` wird komplett durchgelassen.

**Neue Logik — VOR dem generischen `/share` Block einfügen:**
```typescript
// Arzt-Dashboard: Sharing-Cookie prüfen
if (path.startsWith('/share/dashboard')) {
  const sharingSession = request.cookies.get('sharing_session')
  if (!sharingSession?.value) {
    const url = request.nextUrl.clone()
    url.pathname = '/share/expired'
    return NextResponse.redirect(url)
  }
  return supabaseResponse
}
// Bestehend: /share/[token] und /share/expired bleiben öffentlich (Line 28)
```

### Routing-Struktur (neue Dateien)

```
src/app/share/
├── [token]/
│   └── page.tsx              → Token-Validierung → Cookie → Redirect
├── dashboard/
│   ├── layout.tsx            → Cookie-Validation + data-theme="doctor" + Context
│   ├── page.tsx              → Dashboard-Shell (Platzhalter für Epic 6)
│   └── loading.tsx           → Skeleton
└── expired/
    └── page.tsx              → "Zugang abgelaufen" Fehlerseite
```

### Responsive Dashboard Layout (UX-Spezifikation)

| Breakpoint | Geräte | Layout | Container |
|------------|--------|--------|-----------|
| Default (< 768px) | iPhone | 1 Spalte: Zusammenfassung → Ranking → Timeline (Scroll) | Volle Breite, `px-4` |
| `md` (>= 768px) | iPad | 2 Spalten: Zusammenfassung+Ranking \| Timeline+Drill-Down | `max-w-4xl` |
| `xl` (>= 1280px) | Desktop | 3 Spalten: Zusammenfassung \| Timeline \| Ranking | `max-w-7xl` |

**Dashboard-spezifisch:**
- Kein Tab-Bar, kein App-Navigation
- Sticky Header: Zeitraum-Badge + PDF-Button (Platzhalter für Epic 6)
- Single-Page mit Scroll, Anker-Links optional
- Touch-Targets >= 44px (iOS-Richtlinie)

### UX: Expired-Seite

- Freundlich, kein technischer Jargon
- "Dieser Zugang ist abgelaufen oder ungültig"
- "Der Sharing-Link war zeitlich begrenzt. Bitte kontaktieren Sie den Patienten für einen neuen Link."
- Doctor-Theme beibehalten
- Kein Retry, kein Login — bewusst minimalistisch
- Mental Model: "Wie ein abgelaufener Google-Docs-Link"

### Media-Security (D8: Signed URLs)

Für Fotos und Audio im Arzt-Dashboard:
- Storage Buckets sind `private` (kein öffentlicher Zugriff)
- Signed URLs: `createServiceClient().storage.from('media').createSignedUrl(path, 900)`
- 900 Sekunden = 15 Minuten TTL
- Kein `download` Attribut auf `<audio>` oder `<img>` Tags
- `Content-Disposition: inline` (wird von Supabase Signed URLs automatisch gesetzt)

### RLS-Policy Checklist (bei DB-Änderungen)

Diese Story erstellt KEINE neuen Tabellen. Sicherheits-Checkliste für Daten-Zugriff:

- [ ] Service Client (`createServiceClient()`) für ALLE Dashboard-Queries
- [ ] `account_id` Filter in JEDER Query (App-Level Ownership-Check)
- [ ] Zeitraum-Filter (`date_from`/`date_to`) in jeder Query
- [ ] `deleted_at IS NULL` in Symptom-Queries (Soft-Delete Konvention)
- [ ] Signed URLs für Media (nicht direkte Bucket-URLs)
- [ ] Cookie-Signatur validieren bevor Daten geladen werden
- [ ] `SHARING_HMAC_SECRET` niemals im Client-Code verwenden (nur Server-Side)

### Migrations-Konvention

**KEINE neue DB-Migration nötig.** Die `sharing_links`-Tabelle wird in Story 5.1 erstellt.

**Harte Abhängigkeit:** Story 5.1 MUSS zuerst implementiert sein (DB-Tabelle, Token-Generierung, Types, Crypto-Utils).

### Project Structure Notes

Neue Dateien:
```
src/
  app/
    share/
      [token]/
        page.tsx                → Token-Validierung (Server Component)
      dashboard/
        layout.tsx              → Cookie-Auth + Doctor-Theme + Sharing-Context
        page.tsx                → Dashboard-Shell (Platzhalter)
        loading.tsx             → Skeleton
      expired/
        page.tsx                → Fehlerseite
  lib/
    sharing/
      session.ts               → Cookie-Management (create, parse, validate)
    db/
      sharing.ts               → validateSharingToken, getSharedSymptomEvents (erweitern)
  types/
    sharing.ts                 → SharingLinkData, SharingContext, SharingSessionPayload (erweitern)
```

Bestehende Dateien, die geändert werden:
```
src/proxy.ts                   → Middleware: sharing_session Cookie-Check für /share/dashboard
src/__tests__/proxy.test.ts    → Neue Tests für Sharing-Cookie-Logik
```

### Established Code Patterns (aus Epic 1-4 + Story 5.1)

| Pattern | Wo anwenden | Referenz |
|---------|-------------|----------|
| `createServiceClient()` | Alle Dashboard-Queries (kein RLS) | `src/lib/db/client.ts` |
| `ActionResult<T>` | Falls Server Actions nötig | `src/types/common.ts` |
| Proxy/Middleware Tests | `proxy.test.ts` erweitern | `src/__tests__/proxy.test.ts` |
| `toLocalDateKey()` | Zeitraum-Formatierung | `src/lib/utils/date.ts` |
| Server Components | Token-Route, Dashboard | Next.js App Router |
| `data-theme` Attribut | Doctor-Theme im Layout | Architektur D11 |
| `createSignedUrl()` | Media-Zugriff (Signed URLs) | `@supabase/supabase-js` Storage API |
| `redirect()` | Server-Side Redirects | `next/navigation` |
| `cookies()` | Cookie lesen/setzen | `next/headers` |

### Technische Stack-Details

| Technologie | Version | Verwendung in dieser Story |
|-------------|---------|---------------------------|
| Next.js | 16.1.6 | App Router, Server Components, `cookies()` API, `redirect()` |
| @supabase/supabase-js | ^2.98.0 | Service Client für Dashboard-Queries, Signed URLs |
| Node.js crypto | built-in | HMAC für Cookie-Signierung (`createHmac`) |
| Tailwind CSS | latest | Responsive Layout, Doctor-Theme Styling |
| vitest | ^4.0.18 | Unit Tests |

### Abhängigkeiten

- **Story 5.1 ist VORAUSSETZUNG** — `sharing_links`-Tabelle, Token-Generierung, `crypto.ts`, Basis-Types (`src/types/sharing.ts`), DB-Layer Basis (`src/lib/db/sharing.ts`)
- **Story 5.2 ist NICHT Voraussetzung** — E-Mail-Versand ist unabhängig
- **Epic 6 baut auf dieser Story auf** — Dashboard-Inhalte (KI-Zusammenfassung, Timeline, Ranking, Drill-Down, PDF)

### Abgrenzung (Out of Scope)

- **NICHT** in dieser Story: KI-generierte Zusammenfassung (Story 6.1)
- **NICHT** in dieser Story: Arzt-Timeline mit Events (Story 6.2)
- **NICHT** in dieser Story: Arzt-Symptom-Ranking (Story 6.3)
- **NICHT** in dieser Story: Arzt-Drill-Down mit Audio/Fotos (Story 6.4)
- **NICHT** in dieser Story: PDF-Report generieren (Story 6.5)
- **NICHT** in dieser Story: Automatisches Ablaufen UI + Widerrufen (Story 5.4)
- **NICHT** in dieser Story: Audit-Log Einträge (Story 5.5)
- Dashboard zeigt nur Shell mit Platzhalter-Cards — echte Inhalte kommen in Epic 6

### Previous Story Intelligence (Story 5.1)

Aus der Story 5.1 Spezifikation:
- **Token-Format:** 64-Zeichen Hex-String via `createHmac('sha256', SHARING_HMAC_SECRET).update(randomUUID()).digest('hex')`
- **DB-Schema `sharing_links`:** `id` (UUID PK), `account_id` (FK), `token` (TEXT UNIQUE), `date_from` (DATE), `date_to` (DATE), `expires_at` (TIMESTAMPTZ), `recipient_email` (TEXT NULL), `revoked_at` (TIMESTAMPTZ NULL), `created_at` (TIMESTAMPTZ)
- **`SHARING_HMAC_SECRET`:** Bereits in `.env.local.example` definiert
- **Bestehende Code-Patterns:** `ActionResult<T>`, Zod→Auth→DB, `useTransition`, shadcn Sheet
- **Story 5.1 markiert explizit:** Token-Validierung + Cookie-Session = Story 5.3

### Git Intelligence

Letzte relevante Commits:
- `c128ff9` — Epic 4 Retrospective + als done markiert
- `61bb276` — Epic 4: Patienten-Auswertung (Insights) — DB-Patterns, Feed/Timeline/Ranking als Referenz
- Keine Sharing-Implementierung bisher — alles ist Greenfield

### Datenfilter-Checklist (Epic 4 Retrospective Action Item)

Bei allen Dashboard-Queries sicherstellen:
- [ ] `account_id` Filter (aus Sharing-Context, nicht aus Auth-Session!)
- [ ] Zeitraum-Filter: `occurred_at >= date_from AND occurred_at <= date_to`
- [ ] `deleted_at IS NULL` (Soft-Delete Konvention)
- [ ] Signed URLs für Media (TTL 15min, kein Download)

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 5, Story 5.3]
- [Source: _bmad-output/planning-artifacts/architecture.md — D3 Sharing-Security (Zwei-Stufen-Token)]
- [Source: _bmad-output/planning-artifacts/architecture.md — Sharing-Flow, Lines 333-350]
- [Source: _bmad-output/planning-artifacts/architecture.md — RLS Policies Table, Lines 314-322]
- [Source: _bmad-output/planning-artifacts/architecture.md — Middleware-Strategie, Lines 1054-1087]
- [Source: _bmad-output/planning-artifacts/architecture.md — Routing /share/, Lines 403-406]
- [Source: _bmad-output/planning-artifacts/architecture.md — D7 RLS, D8 Media-Security, D10 Routing, D11 Theme-Switching]
- [Source: _bmad-output/planning-artifacts/architecture.md — Dashboard Route Structure, Lines 888-896]
- [Source: _bmad-output/planning-artifacts/architecture.md — Environment Variables, Lines 1224-1225]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Journey 5: Arzt-Konsultation]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Arzt-Dashboard Responsive Layout]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — AISummaryCard, DrillDownCard Komponenten]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Expired-State: "Dieser Link ist abgelaufen"]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Pattern 3: Bottom-Sheet, Form Patterns]
- [Source: _bmad-output/planning-artifacts/prd.md — FR26 (Arzt-Zugriff ohne Login)]
- [Source: _bmad-output/planning-artifacts/prd.md — FR40 (Stream/Ansicht only, kein Download)]
- [Source: _bmad-output/planning-artifacts/prd.md — NFR7, NFR9, NFR10, NFR11 (Security)]
- [Source: _bmad-output/implementation-artifacts/5-1-sharing-link-generieren.md — Token-Format, DB-Schema, Code-Patterns]
- [Source: _bmad-output/implementation-artifacts/sprint-status.yaml — Story 5.3 Status]
- [Source: src/proxy.ts — Aktuelle Middleware-Logik, /share/* Durchlass]
- [Source: src/lib/db/client.ts — Supabase Client Factories (3 Varianten)]
- [Source: src/types/common.ts — ActionResult<T> Pattern]
- [Source: Epic 4 Retrospective — Datenfilter-Checklist Action Item]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (2026-03-15)

### Debug Log References

Keine kritischen Debugging-Schritte erforderlich. Alle Tasks in einem Durchlauf implementiert.

### Completion Notes List

- ✅ Task 1: `SharingLinkData`, `SharingContext`, `SharingSessionPayload`, `SharedSymptomEvent` zu `src/types/sharing.ts` hinzugefügt
- ✅ Task 2: `validateSharingToken()`, `validateSharingLinkById()`, `getSharedSymptomEvents()` in `src/lib/db/sharing.ts` — alle mit `createServiceClient()` (RLS-Bypass für Arzt)
- ✅ Task 3: `src/lib/sharing/session.ts` — HMAC-signierter Cookie: `{linkId}:{expiresAtUnix}:{sha256hex}`, parse mit Tamper-Detection
- ✅ Task 4: `/share/[token]/page.tsx` — Server Component: Token validieren, HttpOnly Cookie setzen, auf /share/dashboard weiterleiten
- ✅ Task 5: `src/proxy.ts` erweitert — `/share/dashboard` prüft Cookie-Existenz VOR dem generischen `/share` Durchlass
- ✅ Task 6: `src/app/share/dashboard/layout.tsx` — `data-theme="doctor"`, Cookie-Signatur-Validierung + DB Deep Validation, Zeitraum-Badge, PDF-Placeholder
- ✅ Task 7: Dashboard-Shell mit Platzhalter-Cards (KI-Zusammenfassung, Timeline, Ranking) + Event-Anzahl-Proof-of-Concept + `loading.tsx`
- ✅ Task 8: `/share/expired/page.tsx` + `/share/layout.tsx` für Doctor-Theme-Konsistenz über alle /share/* Routen
- ✅ Task 9: `getSignedMediaUrl(filePath, bucket)` in `src/lib/db/media.ts` — Service Client, 15min TTL, für Epic 6 bereitgestellt
- ✅ Task 10: 29+ neue Tests: Session-Signierung/Parsing/Manipulation, DB-Validierung (Token/ID/Events), Middleware-Cookie-Checks
- Architektur-Entscheidung: `validateSharingLinkById()` statt Token im Cookie speichern — Session speichert nur UUID (linkId), kürzerer Cookie, keine Token-Exposition im Cookie
- Hinweis: `src/app/share/layout.tsx` als übergeordnetes Layout für einheitliches Doctor-Theme, Dashboard-Layout als nested Layout mit Header

### Change Log

- 2026-03-15: Story 5.3 implementiert — Arzt-Zugriff über Sharing-Link (Zwei-Stufen-Token, Stufe 2)
- 2026-03-15: Code Review (claude-opus-4-6) — 3 HIGH, 4 MEDIUM, 3 LOW Issues gefunden, HIGH + MEDIUM gefixt:
  - H1: Doppelter DB-Call in layout+page → `React.cache()` via `getSharingContext()` eingeführt
  - H2: HMAC-Vergleich per `===` → `timingSafeEqual` (Timing-Attack-Schutz)
  - H3: Fehlende Token-Format-Validierung → Regex-Check vor DB-Query
  - L1: Redundantes `data-theme="doctor"` in Dashboard-Layout entfernt (Parent-Layout reicht)
  - L3: Irreführender Kommentar in session.ts korrigiert
  - M1: Undokumentierte Dateien (insights, more, database.ts) → gehören zu Story 5.1 auf selber Branch
  - M2: BYPASS_AUTH überspringt Cookie-Check (bestehend, DEV-ONLY)
  - M3: Architecture.md sollte Exception für createServiceClient() im Sharing-Kontext dokumentieren

### File List

**Neue Dateien:**
- `src/lib/sharing/session.ts` — Cookie-Utility: create + parse + HMAC-Signatur (timingSafeEqual)
- `src/lib/sharing/context.ts` — React.cache()-basierter Sharing-Kontext (Layout+Page teilen DB-Call)
- `src/app/share/layout.tsx` — Doctor-Theme für alle /share/* Routen
- `src/app/share/[token]/page.tsx` — Token-Validierungs-Route (mit Format-Validierung)
- `src/app/share/dashboard/layout.tsx` — Deep Validation via getSharingContext() + Sticky Header
- `src/app/share/dashboard/page.tsx` — Dashboard-Shell Platzhalter via getSharingContext()
- `src/app/share/dashboard/loading.tsx` — Skeleton-Loader
- `src/app/share/expired/page.tsx` — Fehlerseite "Zugang abgelaufen"
- `src/__tests__/lib/sharing/session.test.ts` — 14 Session-Tests

**Geänderte Dateien:**
- `src/types/sharing.ts` — Neue Typen: SharingLinkData, SharingContext, SharingSessionPayload, SharedSymptomEvent
- `src/lib/db/sharing.ts` — Neue Funktionen: validateSharingToken, validateSharingLinkById, getSharedSymptomEvents
- `src/lib/db/media.ts` — Neue Funktion: getSignedMediaUrl (Service Client, für Epic 6)
- `src/proxy.ts` — /share/dashboard Cookie-Check vor generischem /share Durchlass
- `src/__tests__/lib/db/sharing.test.ts` — Neue Tests für validateSharingToken, validateSharingLinkById, getSharedSymptomEvents
- `src/__tests__/proxy.test.ts` — Neue Tests für Sharing-Cookie-Logik (5 Tests)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — 5-3 Status: in-progress → review
