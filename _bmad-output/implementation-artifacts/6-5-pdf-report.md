# Story 6.5: PDF-Report generieren und herunterladen

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Patient,
I want einen PDF-Report meiner Symptom-Daten generieren und herunterladen oder drucken können,
So that ich eine physische Zusammenfassung für den Arztbesuch mitnehmen kann (FR25).

## Acceptance Criteria

1. **Dual-Auth Entry-Points**: Authentifizierter Patient über `/app/export/pdf` ODER Arzt über Sharing-Dashboard (Cookie-Auth) — beide nutzen denselben API-Endpunkt `/api/report/pdf` (bewusste Abweichung von Architektur-Spec `/api/share/pdf` — neutraler Pfad für Dual-Access)
2. **Report-Inhalt**: Zusammenfassung (KI-generierter Text), Timeline-Übersicht (tabellarisch), Symptom-Ranking (sortiert nach Häufigkeit mit Trends), Event-Details (mit Transkriptionen + Foto-Thumbnails)
3. **Zeitraum wählbar**: Patient wählt 1m/3m/6m/12m; Arzt nutzt automatisch den Sharing-Link-Zeitraum
4. **Performance**: PDF-Generierung < 20 Sekunden (NFR4)
5. **Download/Drucken**: PDF als Download (`Content-Disposition: attachment`) und per `window.print()` druckbar
6. **Kein Audio**: Keine Audio-Dateien im PDF — nur Transkriptionen. Fotos als Thumbnails (max 200px Breite)
7. **Audit-Log**: `pdf_download` Event wird für Patient und Arzt geloggt

## Tasks / Subtasks

- [ ] Task 1: Dependency installieren (AC: alle)
  - [ ] `npm install @react-pdf/renderer` (Architektur-Entscheidung D9)
  - [ ] Kompatibilität mit Next.js 15 / React 19 verifizieren
  - [ ] Falls Inkompatibilitäten: `@react-pdf/renderer@latest` oder Alternative `react-pdf` prüfen

- [ ] Task 2: PDF-Dokument-Komponente (AC: 2, 6)
  - [ ] `src/lib/pdf/symptom-report.tsx` erstellen
  - [ ] `src/lib/pdf/pdf-styles.ts` erstellen
  - [ ] PDF-Sections implementieren:
    - Header: Titel "Symptom-Report", Zeitraum-Badge, Erstellungsdatum
    - Zusammenfassung: KI-generierter Fließtext (2-4 Sätze)
    - Symptom-Ranking: Tabelle (Name, Häufigkeit, Trend-Pfeil, Ø Intensität)
    - Timeline: Monatsweise Tabelle mit täglichen Event-Counts
    - Event-Details: Pro Event — Datum, Symptom, Intensität, Transkription, Foto-Thumbnails
  - [ ] Fotos: Signed URL → fetch → Base64 → `<Image />` (max 200px)
  - [ ] Design: Professional Slate (#374955 Primary, #F6F7F9 Background), print-optimiert

- [ ] Task 3: KI-Zusammenfassung (AC: 2)
  - [ ] `src/lib/ai/summarize.ts` erstellen — wiederverwendbares Interface für Story 6.1+
  - [ ] `generateSummary(events: SymptomEvent[]): Promise<string>` exportieren
  - [ ] Claude API via `src/lib/ai/providers/claude.ts` aufrufen
  - [ ] Prompt: "Erstelle eine medizinische Zusammenfassung (2-4 Sätze, Deutsch, faktisch, nicht wertend)"
  - [ ] Fallback bei API-Fehler: Statistische Zusammenfassung (X Events, häufigstes Symptom, Zeitraum)
  - [ ] `src/__tests__/lib/ai/summarize.test.ts` — Unit-Test mit gemocktem Claude-Provider

- [ ] Task 4: Daten-Aggregation (AC: 2, 3)
  - [ ] `src/lib/pdf/pdf-data.ts` erstellen
  - [ ] `aggregatePdfData(accountId, dateFrom, dateTo)` Funktion:
    - Symptom-Ranking: `getSymptomRankingByAccount()` nutzen (siehe Hinweis unten)
    - Timeline: `getMonthlyTimelineByAccount()` nutzen
    - Events: via Service Client direkt abfragen (mit extracted_data + event_photos)
    - Fotos: Signed URLs holen → fetch → Base64 (**max 50 Fotos, Thumbnails 150px** — Memory-Limit auf Serverless)
  - [ ] `DateRange` → absolute Datumsgrenzen Mapping:
    - `'1m'` → `today - 30 days` bis `today`
    - `'3m'` → `today - 90 days` bis `today`
    - `'6m'` → `today - 180 days` bis `today`
    - `'12m'` → `today - 365 days` bis `today`
    - NICHT `TimeRange` (`'30d'|'3m'|'6m'|'all'`) verwenden — das ist ein anderer Enum!

- [ ] Task 5: API-Route (AC: 1, 4, 5, 7)
  - [ ] `src/app/api/report/pdf/route.ts` erstellen
  - [ ] GET-Handler mit Query-Params: `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
  - [ ] Dual-Auth Logik:
    - Patient: `createServerClient()` → `auth.getUser()` → accountId aus Session
    - Arzt: `parseSharingSession()` aus Cookie → `validateSharingToken()` → accountId + Zeitraum aus Sharing-Link
  - [ ] `createServiceClient()` für Daten-Zugriff (RLS bypass)
  - [ ] `renderToBuffer()` → Response mit `Content-Type: application/pdf`
  - [ ] Audit-Log: `trackSharingAccess()` mit action `'pdf_download'`
  - [ ] Error Handling: `PDF_GENERATION_FAILED`, `AUTH_REQUIRED`, `INVALID_DATE_RANGE`

- [ ] Task 6: Patient-Export-Seite (AC: 1, 3, 5)
  - [ ] `src/app/(app)/export/pdf/page.tsx` erstellen
  - [ ] Zeitraum-Auswahl: shadcn `Select` (1 Monat, 3 Monate, 6 Monate, 12 Monate)
  - [ ] "PDF-Report erstellen" Button (Primary)
  - [ ] Loading-State: `isGeneratingPdf` → "PDF wird erstellt..." mit Spinner
  - [ ] Nach Generierung: Blob-URL erstellen → Download per `<a download>` + "Drucken" per `window.open(blobUrl)` in neuem Tab
  - [ ] Client Component mit `fetch('/api/report/pdf?...')` → Blob → Download
  - [ ] Navigation: Link/Button zur Export-Seite in bestehendem UI platzieren (z.B. Insights-Header oder Sharing-Sheet)

- [ ] Task 7: PDF-Button im Arzt-Dashboard (AC: 1, 5)
  - [ ] `src/components/sharing/pdf-download-button.tsx` erstellen
  - [ ] In `src/app/share/dashboard/page.tsx` integrieren (Sticky Header, rechts oben)
  - [ ] Nutzt Sharing-Context automatisch (dateFrom, dateTo aus Cookie/Session)
  - [ ] Doctor Theme Styling: `bg-primary rounded-lg` (#374955)
  - [ ] Download-Trigger: `fetch('/api/report/pdf')` → Blob → Download

- [ ] Task 8: Unit- & Integration-Tests (AC: alle)
  - [ ] `src/__tests__/lib/ai/summarize.test.ts` — KI-Summary (gemockter Claude-Provider)
  - [ ] `src/__tests__/lib/pdf/symptom-report.test.tsx` — PDF-Komponenten-Struktur (React-Komponente testen, NICHT renderToBuffer — `@react-pdf/renderer` Mocking ist komplex, stattdessen Struktur/Props-Tests)
  - [ ] `src/__tests__/api/report-pdf.test.ts` — API-Route (Dual-Auth, Validierung, Error Handling, Audit-Logging)
  - [ ] `src/__tests__/components/sharing/pdf-download-button.test.tsx` — Button-Interaktion + Download-Trigger

- [ ] Task 9: E2E-Test (AC: 1, 4, 5)
  - [ ] `e2e/pdf-export.spec.ts` — Playwright-Tests:
    - Patient-Flow: Login → Export-Seite → Zeitraum wählen → PDF generieren → Download verifizieren
    - Doctor-Flow: Sharing-Link → Dashboard → PDF-Button → Download verifizieren
  - [ ] Performance-Assertion: PDF-Generierung < 20 Sekunden (NFR4) mit realistischen Testdaten

## Dev Notes

### Kritische Architektur-Entscheidungen

- **D9**: `@react-pdf/renderer` — React-Komponenten → PDF, kein Headless Browser, Serverless-kompatibel
  - **Fallback-Plan**: Falls React 19 Inkompatibilität → `pdfkit` als Alternative (generiert PDF ohne React-Dependency, aber verliert React-Komponenten-Logik)
- **D4**: PDF als API Route (nicht Server Action) — Binary Response + Streaming möglich
- **Abweichung von D9-Spec**: API-Pfad `/api/report/pdf` statt `/api/share/pdf` — bewusste Entscheidung für neutralen Pfad, da sowohl Patient als auch Arzt zugreifen (nicht nur Sharing-Kontext)
- `createServiceClient()` NUR in `src/app/api/` — niemals in Server Actions oder Components

### Bestehender Code — WIEDERVERWENDEN, nicht neu bauen

| Funktion | Datei | Zweck für PDF |
|----------|-------|---------------|
| `getSymptomRanking()` | `src/lib/db/insights.ts` | Ranking mit Trends — **ACHTUNG**: nutzt aktuell `auth.getUser()` für accountId, muss für PDF mit explizitem accountId arbeiten |
| `getMonthlyTimeline()` | `src/lib/db/insights.ts` | Timeline-Aggregation — **gleiche Einschränkung** wie Ranking |
| `getEventDetail()` | `src/lib/db/insights.ts` | Event-Details mit Fotos + Audio-URLs |
| `getSharedSymptomEvents()` | `src/lib/db/sharing.ts` | Events gefiltert nach Sharing-Zeitraum — akzeptiert bereits accountId |
| `parseSharingSession()` | `src/lib/sharing/session.ts` | Cookie-Auth für Arzt-Zugriff |
| `validateSharingToken()` | `src/lib/db/sharing.ts` | Token-Validierung + Zeitraum |
| `trackSharingAccess()` | `src/lib/db/audit.ts` | Audit-Logging mit `'pdf_download'` |
| `createServiceClient()` | `src/lib/db/client.ts` | Service-Client (bypassed RLS) |
| `createServerClient()` | `src/lib/db/client.ts` | Server-Client (Patient-Session) |
| Claude Provider | `src/lib/ai/providers/claude.ts` | KI-Zusammenfassung generieren |
| `hashIpAddress()` | `src/lib/utils/crypto-utils.ts` | IP-Hashing für Audit-Log |

### WICHTIG: accountId-Problem bei Insights-Funktionen

`getSymptomRanking()` und `getMonthlyTimeline()` in `src/lib/db/insights.ts` nutzen intern `createServerClient()` + `auth.getUser()` — das funktioniert nur für authentifizierte Patienten. Für den Arzt-Zugriff (Service Client, kein User-Session) gibt es zwei Optionen:

**Option A (empfohlen)**: Neue Varianten `getSymptomRankingByAccount(supabaseClient, accountId, dateFrom, dateTo)` und `getMonthlyTimelineByAccount(supabaseClient, accountId, year, month)` in `src/lib/db/insights.ts` erstellen. Supabase-Client als Parameter (Dependency Injection) — so funktioniert dieselbe Logik mit Server- und Service-Client. Originalfunktionen können intern die neuen Varianten aufrufen.

**Option B**: In `src/lib/pdf/pdf-data.ts` direkte Supabase-Queries mit Service Client schreiben (dupliziert Logik, aber isoliert PDF-Code).

### API-Route Auth-Pattern

```typescript
// Dual-Auth: Patient ODER Arzt
async function resolveAuth(request: NextRequest): Promise<{
  accountId: string;
  dateFrom: string;
  dateTo: string;
  authType: 'patient' | 'doctor';
}> {
  // 1. Versuche Patient-Auth (Supabase Session)
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    // Patient: Datums-Parameter aus Query-String
    const startDate = request.nextUrl.searchParams.get('startDate')
    const endDate = request.nextUrl.searchParams.get('endDate')
    return { accountId: user.id, dateFrom: startDate!, dateTo: endDate!, authType: 'patient' }
  }

  // 2. Fallback: Arzt-Auth (Sharing-Cookie)
  const session = await parseSharingSession()
  if (session) {
    const link = await validateSharingToken(session)
    if (link) {
      return { accountId: link.accountId, dateFrom: link.dateFrom, dateTo: link.dateTo, authType: 'doctor' }
    }
  }

  throw new Error('AUTH_REQUIRED')
}
```

### Error Handling Pattern

```typescript
// Referenz: src/app/api/ai/extract/route.ts
// Fehler-Codes für PDF:
// - PDF_GENERATION_FAILED: renderToBuffer() Fehler
// - AUTH_REQUIRED: Weder Patient-Session noch Sharing-Cookie
// - INVALID_DATE_RANGE: startDate/endDate fehlt oder ungültig
// - INVALID_TOKEN: Sharing-Token abgelaufen/ungültig
// - SUMMARY_FAILED: KI-Zusammenfassung fehlgeschlagen (nicht-blockierend, Fallback nutzen)

// Response-Format:
Response.json({ error: { error: 'Meldung', code: 'CODE' } }, { status: 4xx })
```

### Types — bereits vorhanden

```typescript
// src/types/analytics.ts — für Ranking + Timeline Daten
type SymptomRankingEntry = { name: string; totalCount: number; trend: 'increasing'|'stable'|'decreasing'; avgIntensity: number | null }

// src/types/sharing.ts — für Sharing-Auth
type SharingLinkData = { id: string; accountId: string; dateFrom: string; dateTo: string; expiresAt: string }

// src/types/audit.ts — 'pdf_download' bereits definiert!
type AuditAction = 'dashboard_view' | 'event_detail' | 'audio_stream' | 'photo_view' | 'pdf_download'

// src/types/common.ts
type ActionResult<T> = { data: T | null; error: AppError | null }
```

### Neuer Type für PDF

```typescript
// In src/types/report.ts oder direkt in src/lib/pdf/pdf-data.ts
type PdfReportData = {
  summary: string              // KI-generierte Zusammenfassung
  ranking: SymptomRankingEntry[]
  timeline: MonthTimeline[]
  events: PdfEventDetail[]     // Events mit Transkription + Foto-Base64
  metadata: {
    dateFrom: string
    dateTo: string
    generatedAt: string
    totalEvents: number
  }
}
```

### Naming Conventions (Projekt-Standard)

- Dateien: kebab-case (`pdf-download-button.tsx`, `pdf-data.ts`)
- Funktionen: camelCase, Verb-first (`generatePdfSummary`, `aggregatePdfData`)
- Types: PascalCase (`PdfReportData`, `PdfEventDetail`)
- API Routes: kebab-case Pfade (`/api/report/pdf`)
- Test-Dateien: Spiegeln Source-Pfade (`src/__tests__/lib/pdf/...`)

### Test-Pattern (aus bestehender Codebase)

```typescript
// Referenz: src/__tests__/lib/db/sharing.test.ts
// Pattern: vi.mock() → Mock Supabase Builder → Test Auth + Success + Error Paths

vi.mock('@/lib/db/client', () => ({
  createServiceClient: vi.fn(() => mockSupabase),
  createServerClient: vi.fn(() => mockSupabase),
}))

// Coverage-Thresholds:
// src/lib/: 80% Lines, 75% Branches, 80% Functions
// src/components/: 60% Lines, 50% Branches, 60% Functions
```

### Abhängigkeiten & Gotchas

1. **`@react-pdf/renderer` noch NICHT installiert** — Task 1 zuerst!
2. **Stories 6.1-6.4 nicht implementiert** — PDF muss eigenständig funktionieren, kein Dependency auf Arzt-Dashboard-Features
3. **`lib/ai/summarize.ts` existiert nicht** — als eigenes Modul erstellen (NICHT inline in `pdf-data.ts`) — wird von Story 6.1 wiederverwendet
4. **Signed URLs für Fotos haben 15-Min TTL** — Fotos sofort fetchen und als Base64 einbetten, nicht URL im PDF referenzieren
5. **Sharing-Cookie HMAC-Secret** — `SHARING_HMAC_SECRET` env var muss gesetzt sein
6. **Patient-Zugriff braucht Datums-Params** — startDate/endDate als Query-Params validieren (Zod)
7. **Doctor-Dashboard Placeholder** — `src/app/share/dashboard/page.tsx` zeigt aktuell Placeholder-Cards, PDF-Button trotzdem integrieren
8. **`renderToBuffer()` ist async** — Memory-Verbrauch bei großen Reports beachten
9. **CI-Pipeline** — `npx prettier --write` auf alle geänderten Dateien vor Commit

### RLS-Policy Checklist (bei DB-Änderungen)

Keine DB-Schema-Änderungen in dieser Story. Bestehende RLS-Policies gelten:
- [x] `symptom_events`: SELECT via Service Client (RLS bypass)
- [x] `extracted_data`: SELECT via Service Client
- [x] `event_photos`: SELECT via Service Client
- [x] `sharing_links`: SELECT via Service Client
- [x] `audit_log`: INSERT via Service Client (`audit_log_system_insert`)

### Migrations-Konvention

Keine Migration erforderlich — alle benötigten Tabellen existieren bereits.

### Project Structure Notes

Neue Dateien:
```
src/
  ├── app/
  │   ├── api/report/pdf/
  │   │   └── route.ts                  → PDF API Route (Dual-Auth)
  │   └── (app)/export/pdf/
  │       └── page.tsx                  → Patient Export-Seite
  ├── components/sharing/
  │   └── pdf-download-button.tsx       → PDF-Button (Patient + Arzt)
  ├── lib/
  │   ├── ai/
  │   │   └── summarize.ts             → KI-Zusammenfassung (wiederverwendbar für 6.1)
  │   └── pdf/
  │       ├── symptom-report.tsx        → @react-pdf/renderer Dokument
  │       ├── pdf-styles.ts            → PDF Stylesheet
  │       └── pdf-data.ts              → Daten-Aggregation
  └── __tests__/
      ├── lib/
      │   ├── ai/summarize.test.ts
      │   └── pdf/symptom-report.test.tsx
      ├── api/
      │   └── report-pdf.test.ts
      └── components/sharing/
          └── pdf-download-button.test.tsx
e2e/
  └── pdf-export.spec.ts               → Playwright E2E (Patient + Doctor Flow)
```

Bestehende Dateien (Modifikation):
```
src/app/share/dashboard/page.tsx        → PDF-Button einfügen
src/lib/db/insights.ts                  → getSymptomRankingByAccount(), getMonthlyTimelineByAccount()
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 6.5]
- [Source: _bmad-output/planning-artifacts/architecture.md#D9 @react-pdf/renderer]
- [Source: _bmad-output/planning-artifacts/architecture.md#D4 API Routes vs Server Actions]
- [Source: _bmad-output/planning-artifacts/architecture.md#Sharing-Token-System]
- [Source: _bmad-output/planning-artifacts/architecture.md#Service Client Pattern]
- [Source: _bmad-output/planning-artifacts/prd.md#FR25 PDF-Report]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR4 Performance]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey 4 Konsultations-Vorbereitung]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Professional Slate Theme]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Arzt-Dashboard Responsive Layout]
- [Source: src/lib/db/sharing.ts — Sharing-System Referenz]
- [Source: src/lib/db/insights.ts — Insights-Funktionen Referenz]
- [Source: src/lib/db/audit.ts — Audit-Logging Referenz]
- [Source: src/lib/sharing/session.ts — Session-Management Referenz]
- [Source: src/types/audit.ts — AuditAction 'pdf_download' bereits definiert]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
