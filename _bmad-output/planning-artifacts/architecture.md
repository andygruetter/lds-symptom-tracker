---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-03-01'
inputDocuments: ['_bmad-output/planning-artifacts/prd.md', '_bmad-output/planning-artifacts/product-brief-lds-symptome-tracker-2026-02-28.md', '_bmad-output/planning-artifacts/ux-design-specification.md', '_bmad-output/planning-artifacts/prd-validation-report.md']
workflowType: 'architecture'
project_name: 'lds-symptome-tracker'
user_name: 'Andy'
date: '2026-03-01'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements (45 FRs in 7 Bereichen):**

| Bereich | FRs | Architektonische Implikation |
|---------|-----|------------------------------|
| Symptom-Erfassung | FR1-FR10 | Audio-Upload, Foto-Upload, STT-Integration, LLM-Extraktion, Push-Notification-Service |
| KI-Verarbeitung & Lernen | FR11-FR15 | Konfidenz-Scoring, Patienten-spezifisches Vokabular-Modell, asynchrone Verarbeitungs-Pipeline |
| Patienten-Ansicht | FR16-FR20 | Chat-Verlauf, Timeline-Aggregation, Daten-Löschung (nDSG) |
| Arzt-Export | FR21-FR33 | Sharing-Link-Service, Token-basierter Zugang, PDF-Generierung, Audio-Streaming, Multi-Device-Responsive |
| Account & Auth | FR34-FR36 | Apple ID OAuth2/OIDC, Zero-Formular-Onboarding, pseudonymisierter Account |
| Daten-Souveränität | FR37-FR42 | Audit-Log (append-only), Link-Ablauf-Mechanismus, vollständige Account-Löschung inkl. Backups |
| Marketing & Plattform | FR43-FR45 | Statische Marketing-Seite (SEO), API-First Backend |

**Non-Functional Requirements (25 NFRs in 5 Kategorien):**

| Kategorie | NFRs | Architektur-treibend |
|-----------|------|---------------------|
| Performance | NFR1-6 | App-Start <3s, KI <10s, Dashboard <2s, PDF <20s, Audio-Start <1s |
| Security & Datenschutz | NFR7-13 | TLS + encryption at rest, Pseudonymisierung, kryptographische Sharing-Links, append-only Audit-Log, nDSG-konform |
| Reliability | NFR14-17 | 99.5% Verfügbarkeit, kein Datenverlust, tägliche Backups (30 Tage) |
| Integration | NFR18-22 | STT-API (Schweizerdeutsch), LLM-API (graceful degradation), Apple ID (OAuth2), Web Push, native Mail-App (mailto:) |
| Scalability & Kosten | NFR23-25 | Horizontal skalierbar 1→1000 Patienten, Cloud Object Storage, ausschliesslich Pay-per-Use |

**UX-Architektur-Implikationen:**

| UX-Entscheidung | Technische Anforderung |
|----------------|----------------------|
| Conversational UI (Chat-as-Interface) | WebSocket oder SSE für Echtzeit-Updates, Chat-State-Management |
| Asynchroner Push-Review-Loop | Background Job Queue, Web Push API, Deep-Linking in Push |
| Zwei Themes (Patient/Arzt) | CSS Custom Properties, Theme-Context, Route-basierte Theme-Auswahl |
| InputBar (Mikrofon + Kamera + Text) | MediaRecorder API, Camera API, Multipart-Upload |
| Arzt-Dashboard ohne Login | Token-basierte Route, separate SPA-Route, kein Auth-Dependency |
| Audio-Streaming ohne Download | Signed URLs mit kurzer TTL, Web Audio API, kein direkter S3-Link |

### Scale & Complexity

- **Primäre Domäne:** Full-Stack Web (PWA) + KI-Integration
- **Komplexitätsstufe:** Hoch
- **Geschätzte Architektur-Komponenten:** ~12-15 (Frontend-App, API-Gateway, Auth-Service, Symptom-Service, KI-Pipeline, Media-Storage, Push-Service, Sharing-Service, PDF-Service, Audit-Service, Datenbank, Object Storage)
- **Externe Abhängigkeiten:** 4 (STT-API, LLM-API, Apple ID, Push-Service)
- **Besonderheit:** Solo-Entwickler — Architektur muss managed/serverless-lastig sein, keine selbstverwaltete Infrastruktur

### Technical Constraints & Dependencies

| Constraint | Quelle | Implikation |
|-----------|--------|-------------|
| Ausschliesslich Pay-per-Use | NFR25 | Serverless-Architektur (z.B. Vercel/Railway + Supabase/PlanetScale), keine fixen Server |
| Europäischer Serverstandort | Datenschutz (nDSG) | Cloud-Region EU (Frankfurt/Zürich) |
| API-First, native-ready | PRD | REST/GraphQL mit OpenAPI/Schema, stateless Backend |
| Kein Offline-Modus im MVP | PRD | Server-basierte Verarbeitung, kein Service Worker für Daten |
| Apple ID als einziger Auth-Provider | FR34 | OIDC-Integration, aber erweiterbar für weitere Provider |
| Solo-Entwickler | Ressourcen | Managed Services bevorzugen, minimale DevOps-Last |
| Schweizerdeutsch-STT | FR6, NFR18 | Externe API (Whisper, Google, Azure), Fallback auf Hochdeutsch/Text |

### Cross-Cutting Concerns

| Concern | Betroffene Bereiche | Architektur-Antwort |
|---------|--------------------|--------------------|
| **Pseudonymisierung** | Alle Daten, Sharing, Audit | Account-ID als einziger Schlüssel, keine PII in Datenbank |
| **Audit-Logging** | Sharing-Zugriffe, Daten-Änderungen, Account-Events | Append-only Log-System, unveränderbar |
| **Media-Security** | Audio, Fotos, Sharing | Signed URLs, kein direkter Download, TTL-basiert |
| **Push-Notifications** | KI-Ergebnis, Sharing-Status | Web Push API, Service Worker für Push-Empfang |
| **Theme-System** | Patient-UI, Arzt-UI, Marketing | CSS Custom Properties, Route-basierte Theme-Selektion |
| **Graceful Degradation** | STT-Ausfall, LLM-Ausfall | Erfassung immer möglich, Extraktion wird nachgeholt |
| **Internationalisierung** | MVP nur Deutsch, aber vorbereitet | String-Externalisierung, Locale-Struktur |

## Starter Template Evaluation

### Primary Technology Domain

Full-Stack Web Application (PWA) mit KI-Integration, basierend auf Projektkontextanalyse: Mobile-first PWA, API-First Backend, asynchrone KI-Pipeline, pseudonymisierte Gesundheitsdaten.

### Technical Preferences

| Dimension | Entscheidung | Begründung |
|-----------|-------------|------------|
| Sprache | TypeScript | Type-Safety, shadcn/ui-Standard, KI-Code-Generierung zuverlässiger |
| Framework | Next.js 16 (App Router) | shadcn/ui-Kompatibilität, SSR für Marketing-Seite, API-Routes, React Server Components |
| Datenbank | PostgreSQL via Supabase | Managed DB + Auth + Storage + Realtime in einem Service, Pay-per-Use |
| Deployment (MVP) | Vercel | Zero-Config, Pay-per-Use, EU Edge, `git push` = deployed. Ideal für Solo-Entwickler. |
| Deployment (Post-MVP) | AWS via SST (OpenNext) | Migration-Option bei Skalierung oder Kosten-Optimierung. API-First + Abstraktionsschicht ermöglicht Wechsel. |
| UI-System | Tailwind CSS 4 + shadcn/ui | Aus UX-Spezifikation bestätigt, themeable, keine npm-Dependency |
| Testing | Vitest + React Testing Library + Playwright | Saubere Test-Pyramide: Unit → Integration → E2E |

### Starter Options Considered

| Option | Bewertung | Ergebnis |
|--------|----------|---------|
| **create-t3-app** (T3 Stack v7.40) | tRPC, Prisma, NextAuth — redundant mit Supabase. Zu viel Overlap, unnötige Complexity. | Abgelehnt |
| **Supabase + Next.js Vercel Template** | Gute Auth-Referenz, aber zu minimal (kein shadcn/ui, kein PWA, kein Theming). | Als Referenz |
| **create-next-app + shadcn/ui init** | Saubere Basis, keine Konflikte, jede Dependency bewusst gewählt. | Gewählt |

### Selected Starter: create-next-app + shadcn/ui

**Rationale:**
Kein Starter-Template liefert die spezifische Kombination Next.js + Supabase + shadcn/ui + PWA + Vercel ohne Ballast. Die offizielle Basis (`create-next-app`) plus `shadcn/ui init` ist der sauberste Weg — jede weitere Dependency wird bewusst hinzugefügt, nichts muss entfernt werden.

**Initialization Commands:**

```bash
# 1. Next.js Projekt erstellen
npx create-next-app@latest lds-symptom-tracker \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --turbopack

# 2. shadcn/ui initialisieren
npx shadcn@latest init

# 3. Supabase Integration
npm install @supabase/supabase-js @supabase/ssr

# 4. PWA + Web Push
npm install serwist

# 5. KI-Pipeline
npm install @anthropic-ai/sdk   # Claude für Symptom-Extraktion + Zusammenfassung
npm install openai               # Whisper für STT

# 6. Test-Pyramide
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
npm install -D @playwright/test
```

### Architectural Decisions Provided by Starter

**Language & Runtime:**
- TypeScript 5 mit strikter Konfiguration
- React 19 mit Server Components
- Node.js Runtime für API Routes / Server Actions

**Styling Solution:**
- Tailwind CSS 4 (Utility-First)
- CSS Custom Properties für Theme-System (Patient/Arzt)
- shadcn/ui Komponenten (Radix UI Primitives) — kopiert ins Projekt, keine npm-Dependency

**Build Tooling:**
- Turbopack (Dev Server — schnellere Compile-Zeiten)
- Next.js Built-in Optimization (Image, Font, Bundle Splitting)

**Testing Framework (Saubere Test-Pyramide):**

| Stufe | Tool | Scope | Beispiel |
|-------|------|-------|---------|
| **Unit** | Vitest | Einzelne Funktionen, Utilities, Hooks | KI-Konfidenz-Berechnung, Symptom-Parser, Date-Utils |
| **Integration** | Vitest + React Testing Library | Komponenten mit Interaktion, API-Calls gemockt | ChatBubble Render + Tap, InputBar States, ReviewFlow |
| **E2E** | Playwright | Vollständige User Journeys, echte Browser | Symptom-Erfassung → Review → Bestätigung, Sharing-Flow |

**Code Organization:**
- `src/` Directory (aktiviert)
- App Router (`src/app/`) — File-based Routing
- `src/components/ui/` — shadcn/ui Komponenten
- `src/components/` — Domain-spezifische Komponenten (ChatBubble, InputBar, etc.)
- `src/lib/` — Supabase-Client, Utilities, Abstraktionsschicht
- `src/__tests__/` — Unit + Integration Tests (Vitest)
- `e2e/` — E2E Tests (Playwright)
- `@/*` Import-Alias

**Development Experience:**
- Turbopack Hot Reload
- TypeScript IntelliSense
- ESLint (Code-Qualität)
- Vitest Watch Mode (Test-Feedback in Echtzeit)

**Deployment (MVP):**
- Vercel (Zero-Config, `git push` = deployed)
- Supabase EU-Region (Frankfurt) für Datenbank + Auth + Storage
- Vercel EU Edge für Frontend
- Pay-per-Use auf beiden Plattformen

### Architektur-Prinzipien aus Party Mode

**1. Supabase Abstraktionsschicht:**
Keine direkten Supabase-Calls aus Komponenten. Alle Zugriffe über Server Actions oder API Routes (`src/lib/`). Ermöglicht spätere Migration zu AWS-nativen Services ohne Frontend-Änderungen.

**2. Vercel → AWS Migration Path:**
MVP auf Vercel, Post-MVP Migration zu SST/AWS dokumentiert. API-First + Abstraktionsschicht machen den Wechsel möglich ohne App-Umbau.

**3. Supabase Realtime für Chat-UX:**
KI-Pipeline schreibt Ergebnis in DB → Supabase Realtime pusht Update via WebSocket → Review-Bubble erscheint live im Chat. Kein Polling, kein Page-Reload.

### KI-Pipeline Stack

**Architektur-Entscheidung:** Zwei-Stufen-Pipeline mit Provider-Abstraktion.

**Stufe 1 — Speech-to-Text: OpenAI Whisper API**

| Aspekt | Detail |
|--------|--------|
| **Service** | OpenAI Whisper API (neuestes Modell) |
| **Stärke** | Bestes multilinguales Modell für Dialekte. Übersetzt Schweizerdeutsch natürlich ins Hochdeutsche — kein separater Übersetzungsschritt. |
| **Kosten** | $0.006/Minute, Pay-per-Use |
| **Latenz** | ~2-5 Sekunden für 15s Audio |
| **Fallback** | Hochdeutsch sprechen oder Text-Eingabe (FR6) |

**Stufe 2 — Symptom-Extraktion: Anthropic Claude Sonnet**

| Aspekt | Detail |
|--------|--------|
| **Service** | Anthropic Claude Sonnet (aktuelles Modell) |
| **Stärke** | Tool Use für garantiert valides JSON-Schema. Exzellent im Befolgen von System-Prompt-Instruktionen (persönliches Vokabular-Lernen). |
| **Output** | Array von Extraktionen — pro erkanntes Symptom/Medikament ein Eintrag mit: Bezeichnung, Körperregion, Seite, Art, Intensität, Konfidenz-Score, Event-Typ. Multi-Symptom-Eingaben (z.B. "Kopfschmerzen und Nackenschmerzen") erzeugen separate Events. |
| **Kosten** | ~$0.003/Event, Pay-per-Use |
| **Latenz** | ~1-3 Sekunden |
| **Persönliches Lernen** | Korrektur-History als Few-Shot-Beispiele im System Prompt |

**Provider-Abstraktionsschicht:**

```
src/lib/ai/
  ├── transcribe.ts      → Interface: audio → transcript
  ├── extract.ts         → Interface: text + patientCorrections → MultiExtractionResult (Array von Symptomen/Medikamenten)
  └── providers/
      ├── whisper.ts     → OpenAI Whisper Implementation
      └── claude.ts      → Anthropic Claude Sonnet Implementation (Multi-Symptom via items-Array)
```

Provider-Wechsel = ein File tauschen. Kein App-Umbau nötig.

**Async Pipeline-Flow:**

```
Audio-Upload → Supabase Storage
       ↓
Serverless Function triggered
       ↓
Whisper API: Audio → Transcript (2-5s)
       ↓
Claude Sonnet: Transcript + Korrekturen → Strukturierte Daten (1-3s)
       ↓ (Multi-Symptom: ein Event pro erkanntes Symptom/Medikament)
Ergebnisse in Supabase DB gespeichert (erstes Ergebnis → bestehendes Event, weitere → neue Events)
       ↓
Supabase Realtime → Client Update (WebSocket)
       ↓
Web Push Notification → Patient
```

**Gesamtlatenz:** ~3-8 Sekunden (innerhalb NFR2: <10 Sekunden)

**Graceful Degradation (NFR19):** Bei API-Ausfall wird das Audio gespeichert, die Extraktion in eine Retry-Queue gestellt und nachgeholt. Erfassung ist immer möglich.

**Note:** Projektinitialisierung mit diesen Commands sollte die erste Implementation Story sein.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**

| # | Entscheidung | Wahl | Rationale |
|---|-------------|------|-----------|
| D1 | DB-Zugriff | Supabase Client direkt | RLS, Realtime, Type-Generierung aus einer Hand. Abstraktionsschicht in `src/lib/`. |
| D2 | Auth | Apple ID via Supabase Auth (OAuth2/OIDC) | Out-of-the-box Support, Zero-Config |
| D3 | Sharing-Security | Zwei-Stufen-Token → Cookie-Session | Token in URL nur für Lookup, HttpOnly-Cookie für Zugriff. Sicherer für Gesundheitsdaten (nDSG). |
| D4 | API-Pattern | Hybrid: Server Actions + API Routes | Server Actions für App-Interaktion, API Routes für KI-Pipeline, Webhooks, PDF |
| D5 | State Management | Server Components + Supabase Realtime + React Context | Kein Zustand/Redux nötig. State lebt in Supabase. Context nur für Theme + Auth-Session. |
| D6 | KI-Pipeline | Whisper (STT) + Claude Sonnet (Extraktion) mit Provider-Abstraktion | Bereits in Step 3 entschieden |

**Important Decisions (Shape Architecture):**

| # | Entscheidung | Wahl | Rationale |
|---|-------------|------|-----------|
| D7 | RLS-Strategie | Account-ID-basiert + Sharing-Token-Policy | Patient sieht nur eigene Daten. Arzt-Zugang über validiertes Token + Cookie. |
| D8 | Media-Security | Private Buckets, Signed URLs (15min TTL), Content-Disposition: inline | Kein Download möglich, Stream/Ansicht only |
| D9 | PDF-Generierung | `@react-pdf/renderer` | React-Komponenten-Logik, <5s Generierung, kein Headless Browser, kein Timeout-Risiko auf Serverless |
| D10 | Routing | Root `/` = Marketing, `(app)/` = Authenticated Patient-App, `share/[token]/` = Arzt | Marketing als Einstieg, App hinter Auth, Arzt ohne Auth |
| D11 | Theme-Switching | Serverseitig per Route-Layout (`data-theme` auf Layout-Element) | Kein Client-Side-Flash beim Arzt-Dashboard |
| D12 | Error Handling | Einheitliches Schema `{ error, code, details? }`, KI-Retry (3x Exponential Backoff) | Konsistenz über alle Endpoints |
| D13 | CI/CD | GitHub Actions → Lint → Types → Unit → Integration → E2E → Vercel Deploy | Automatische Preview Deployments pro Branch |
| D14 | Monitoring | Vercel Analytics + Sentry (Free Tier) | Pragmatisch für MVP, kein Custom-Monitoring |

**Deferred Decisions (Post-MVP):**

| Entscheidung | Begründung |
|-------------|------------|
| AWS/SST Migration | Erst bei Skalierung oder Kosten-Optimierung relevant |
| Custom Monitoring/Alerting | Vercel + Sentry reichen für Pilot |
| Rate Limiting | Bei 1 Patientin nicht relevant, Supabase hat eingebautes Rate Limiting |
| CDN-Konfiguration | Vercel Edge reicht, CloudFront erst bei AWS-Migration |

### Data Architecture

**Datenbank-Zugriff:**
- Supabase Client (`@supabase/supabase-js` + `@supabase/ssr`)
- TypeScript-Types auto-generiert via `supabase gen types typescript`
- Alle DB-Zugriffe über Abstraktionsschicht in `src/lib/db/`
- Migrations via Supabase CLI (`supabase migration new`, `supabase db push`)

**Row Level Security (RLS):**

| Tabelle | Policy | Regel |
|---------|--------|-------|
| `symptoms` | Patient CRUD | `auth.uid() = account_id` |
| `symptoms` | Arzt Read | Gültiger Sharing-Token + nicht abgelaufen |
| `media` | Patient CRUD | `auth.uid() = account_id` |
| `media` | Arzt Read (Signed URL) | Über Sharing-Service, nicht direkt |
| `sharing_links` | Patient CRUD | `auth.uid() = account_id` |
| `audit_log` | Insert only | Kein Update, kein Delete. System + Sharing-Zugriffe. |
| `patient_corrections` | Patient CRUD | `auth.uid() = account_id` |

### Authentication & Security

**Auth-Flow:**

```
Marketing → "Anmelden" → Apple ID OAuth (Supabase Auth)
  → Callback → Session-Cookie gesetzt → Redirect zu /(app)/
```

**Sharing-Flow (Zwei-Stufen-Token):**

```
Patient erstellt Sharing-Link
  → System generiert kryptographischen Token (UUID + HMAC)
  → Token gespeichert mit: E-Mail, Zeitraum, TTL, account_id

Arzt klickt /share/[token]
  → Server validiert Token (existiert? nicht abgelaufen?)
  → Setzt HttpOnly Session-Cookie (sharing_session)
  → Redirect auf /share/dashboard
  → Alle weiteren Requests über Cookie (kein Token in URL)
  → Audit-Log: Zugriff protokolliert

Nach TTL-Ablauf:
  → Cookie ungültig, Token deaktiviert
  → Arzt sieht "Zugang abgelaufen"
```

**Media-Security:**
- Supabase Storage: Private Buckets
- Signed URLs: 15 Minuten TTL, Content-Disposition: `inline`
- Audio: Streaming via Web Audio API über Signed URL
- Fotos: `<img>` mit Signed URL, kein Download-Button
- Neue Signed URL bei Ablauf (Client refresht automatisch)

### API & Communication Patterns

**Hybrid-Ansatz:**

| Kontext | Methode | Beispiele |
|---------|---------|----------|
| Patient-Interaktion | Server Actions | Symptom bestätigen, Sharing erstellen, Daten laden, Account löschen |
| KI-Pipeline | API Route (`/api/ai/process`) | Triggered nach Audio-Upload, ruft Whisper + Claude |
| PDF | API Route (`/api/share/pdf`) | `@react-pdf/renderer`, Streaming Response |

**Error Handling:**

```typescript
type AppError = {
  error: string;        // Nutzer-freundliche Meldung
  code: string;         // Maschinen-lesbarer Code (z.B. "AI_EXTRACTION_FAILED")
  details?: object;     // Debug-Info (nur in Development)
}
```

**KI-Pipeline Retry:**
- Max 3 Versuche mit Exponential Backoff (1s → 2s → 4s)
- Bei endgültigem Fehler: Event als "pending_extraction" markiert, Retry-Queue
- Patient wird nicht blockiert — Erfassung immer möglich

### Frontend Architecture

**State Management:**
- React Server Components für initiales Laden (Dashboard, Feed, Arzt-Ansicht)
- Supabase Realtime-Subscription für Live-Updates (neue Review-Bubble im Chat)
- React Context nur für: Theme (Patient/Arzt), Auth-Session
- Kein externer State-Manager (kein Zustand, kein Redux)

**Routing-Strategie:**

```
src/app/
  ├── page.tsx                → Marketing-Seite (öffentlich, SSR, SEO)
  ├── (app)/                  → Authenticated Patient App
  │   ├── layout.tsx          → Auth-Check + Bottom-Tab-Bar + data-theme="patient"
  │   ├── page.tsx            → Erfassen (Chat-Screen, Default nach Login)
  │   ├── insights/           → Auswertung (Timeline, Ranking, Drill-Down)
  │   │   └── [symptom]/      → Symptom-Detail (Event-Liste)
  │   └── settings/           → Mehr (Sharing-Verwaltung, Audit-Log, Account)
  ├── share/
  │   ├── [token]/            → Token-Validierung → Cookie → Redirect
  │   └── dashboard/          → Arzt-Dashboard (Cookie-Auth, data-theme="doctor")
  │       └── [symptom]/      → Symptom-Drill-Down
  ├── auth/
  │   ├── login/              → Apple ID Login
  │   └── callback/           → OAuth Callback → Redirect zu /(app)/
  └── api/
      ├── ai/process/         → KI-Pipeline Trigger
      ├── share/pdf/          → PDF-Generierung (@react-pdf/renderer)
      └── webhooks/           → Supabase Webhooks
```

**Theme-Switching (serverseitig):**

```tsx
// (app)/layout.tsx → data-theme="patient"
// share/dashboard/layout.tsx → data-theme="doctor"
```

Kein Client-Side-Flash. Theme wird im Server Component gesetzt.

### Infrastructure & Deployment

**CI/CD Pipeline (GitHub Actions):**

```
Push/PR → Lint → Type-Check → Unit Tests (Vitest)
  → Integration Tests (Vitest + RTL)
  → E2E Tests (Playwright)
  → Deploy to Vercel (Preview für PR, Production für main)
```

**Environment Configuration:**

| Environment | Supabase | Vercel | Zweck |
|-------------|----------|--------|-------|
| Local | Supabase CLI (lokal) | `next dev` | Entwicklung |
| Preview | Supabase Dev-Projekt | Vercel Preview | PR-Review |
| Production | Supabase Prod-Projekt (EU) | Vercel Production | Live |

**Monitoring (MVP):**
- Vercel Analytics (Performance, Web Vitals)
- Vercel Logs (Serverless Function Debugging)
- Sentry (Error-Tracking, Free Tier: 5K Events/Monat)
- Supabase Dashboard (DB-Monitoring, Auth-Logs)

### KI-Pipeline Testing

| Ebene | Was | Tool | API-Calls |
|-------|-----|------|-----------|
| **Unit** | Prompt-Templates, Konfidenz-Berechnung, Response-Parsing | Vitest | Keine (Mocks) |
| **Integration** | Provider-Abstraktion, Retry-Logik, Error-Handling | Vitest | Gemockt (Fixtures) |
| **Contract/Smoke** | Echte API-Calls mit Test-Audio | Playwright/Script | Echte APIs, nur in CI bei Release |

**Test-Fixtures:**

```
src/lib/ai/__fixtures__/
  ├── audio/
  │   ├── rueckenschmerzen-schweizerdeutsch.webm
  │   └── kopfschmerzen-hochdeutsch.webm
  ├── transcripts/
  │   ├── rueckenschmerzen.json
  │   └── kopfschmerzen.json
  └── extractions/
      ├── rueckenschmerzen.json
      └── kopfschmerzen.json
```

### Decision Impact Analysis

**Implementation Sequence:**
1. Projekt-Initialisierung (Starter + Dependencies)
2. Supabase Setup (Schema, RLS, Auth mit Apple ID)
3. Theme-System (CSS Custom Properties, Route-Layouts)
4. KI-Pipeline Abstraktionsschicht + Fixtures
5. Core Capture Flow (InputBar → Upload → Pipeline → Realtime → Review)
6. Patienten-Auswertung (Timeline, Ranking)
7. Arzt-Sharing (Token-System, Dashboard, PDF)
8. Marketing-Seite
9. PWA (Service Worker, Web Push)
10. CI/CD Pipeline + Monitoring

**Cross-Component Dependencies:**

| Komponente | Hängt ab von |
|-----------|-------------|
| Chat-UI | Supabase Realtime, KI-Pipeline, Theme-System |
| KI-Pipeline | Supabase Storage (Audio), Whisper API, Claude API |
| Arzt-Dashboard | Sharing-Token-System, RLS, Theme-System |
| PDF-Export | Arzt-Dashboard-Daten, `@react-pdf/renderer` |
| Push-Notifications | Service Worker (Serwist), KI-Pipeline-Completion |
| Audit-Log | Sharing-Token-System, RLS (insert-only) |

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Kritische Konfliktpunkte identifiziert:** 28 Bereiche, in denen AI-Agents unterschiedliche Entscheidungen treffen könnten, gruppiert in 5 Kategorien.

### Naming Patterns

**Datenbank-Naming (PostgreSQL/Supabase):**

| Element | Convention | Beispiel |
|---------|-----------|---------|
| Tabellen | snake_case, Plural | `symptoms`, `sharing_links`, `audit_log` |
| Spalten | snake_case | `account_id`, `body_region`, `created_at` |
| Foreign Keys | `[referenzierte_tabelle_singular]_id` | `account_id`, `symptom_id` |
| Indizes | `idx_[tabelle]_[spalte(n)]` | `idx_symptoms_account_id`, `idx_sharing_links_token` |
| RLS Policies | `[tabelle]_[rolle]_[operation]` | `symptoms_patient_select`, `audit_log_system_insert` |

**API Naming:**

| Element | Convention | Beispiel |
|---------|-----------|---------|
| API Routes | kebab-case, Plural | `/api/ai/process`, `/api/share/pdf` |
| Query Params | camelCase | `?startDate=2026-01-01&symptomId=abc` |
| JSON Response Fields | camelCase | `{ bodyRegion, confidenceScore, createdAt }` |
| JSON → DB Mapping | camelCase → snake_case automatisch | Supabase Client handled das |

**Code Naming:**

| Element | Convention | Beispiel |
|---------|-----------|---------|
| React Components | PascalCase | `ChatBubble`, `InputBar`, `BottomTabBar` |
| Component-Dateien | kebab-case.tsx | `chat-bubble.tsx`, `input-bar.tsx` |
| Hooks | camelCase mit `use`-Prefix | `useSymptoms`, `useAudioRecorder` |
| Hook-Dateien | kebab-case.ts | `use-symptoms.ts`, `use-audio-recorder.ts` |
| Server Actions | camelCase, Verb-first | `confirmSymptom`, `createSharingLink`, `deleteAccount` |
| Action-Dateien | kebab-case.ts | `symptom-actions.ts`, `sharing-actions.ts` |
| Utilities | camelCase | `formatDate`, `calculateConfidence` |
| Utility-Dateien | kebab-case.ts | `date-utils.ts`, `confidence-calc.ts` |
| Types/Interfaces | PascalCase | `Symptom`, `SharingLink`, `ActionResult<T>` |
| Type-Dateien | kebab-case.ts | `symptom.ts`, `sharing.ts` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_AUDIO_DURATION`, `DEFAULT_TTL` |
| Env-Variablen | SCREAMING_SNAKE_CASE mit Prefix | `NEXT_PUBLIC_SUPABASE_URL`, `ANTHROPIC_API_KEY` |

**Test Naming:**

| Test-Ebene | Datei-Pattern | Beispiel |
|-----------|--------------|---------|
| Unit Test | `[modul].test.ts` | `extract.test.ts`, `confidence-calc.test.ts` |
| Integration Test | `[feature].integration.test.ts` | `capture-flow.integration.test.ts` |
| E2E Test | `[journey].spec.ts` | `symptom-capture.spec.ts`, `sharing-flow.spec.ts` |

### Structure Patterns

**Feature-basierte Organisation mit Shared Core:**

```
src/
  ├── app/                        → Next.js App Router (NUR Routing + Layouts)
  ├── components/
  │   ├── ui/                     → shadcn/ui Basis-Komponenten (generiert)
  │   ├── capture/                → ChatBubble, InputBar, AudioRecorder, ReviewBubble
  │   ├── insights/               → Timeline, SymptomRanking, DrillDown
  │   ├── sharing/                → ShareSheet, DoctorDashboard, PdfExport
  │   └── layout/                 → BottomTabBar, ThemeProvider, ErrorBoundary
  ├── lib/
  │   ├── db/                     → Supabase Abstraktionsschicht
  │   │   ├── client.ts           → Supabase Client Factory
  │   │   ├── symptoms.ts         → Symptom CRUD
  │   │   ├── sharing.ts          → Sharing CRUD
  │   │   └── audit.ts            → Audit-Log Insert
  │   ├── ai/                     → KI-Pipeline Abstraktionsschicht
  │   │   ├── transcribe.ts       → STT Interface
  │   │   ├── extract.ts          → Extraktion Interface
  │   │   └── providers/          → whisper.ts, claude.ts
  │   ├── actions/                → Server Actions (gruppiert nach Feature)
  │   │   ├── symptom-actions.ts
  │   │   ├── sharing-actions.ts
  │   │   └── account-actions.ts
  │   └── utils/                  → Shared Utilities
  ├── hooks/                      → Custom React Hooks
  ├── types/                      → Global TypeScript Types (Single Source of Truth)
  │   ├── database.ts             → Auto-generiert via `supabase gen types` — NIE manuell editieren
  │   ├── symptom.ts              → Zod-Schemas + abgeleitete Types
  │   ├── sharing.ts              → Zod-Schemas + abgeleitete Types
  │   └── common.ts               → ActionResult<T>, AppError, etc.
  └── __tests__/
      ├── factories/              → Test-Data-Factories
      │   ├── symptom.factory.ts
      │   ├── sharing.factory.ts
      │   └── user.factory.ts
      └── [feature].integration.test.ts
e2e/                              → E2E Tests (Playwright)
  └── [journey].spec.ts
```

**Regeln:**
- `src/app/` enthält NUR `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx` — keine Business-Logik
- Keine `index.ts` Barrel-Export-Dateien — direkte Imports auf die spezifische Datei (Tree-Shaking + AI-Agent-Lesbarkeit)
- Eine Komponente pro Datei, Dateiname = Komponentenname in kebab-case
- Tests: Unit/Integration in `src/__tests__/`, E2E in `e2e/`

**Import-Reihenfolge (verbindlich):**

```typescript
// 1. React / Next.js
import { useState } from 'react'
import { useRouter } from 'next/navigation'

// 2. Externe Libraries
import { z } from 'zod'

// 3. Interne Imports (@/*)
import { confirmSymptom } from '@/lib/actions/symptom-actions'
import type { Symptom } from '@/types/symptom'
import { useSymptoms } from '@/hooks/use-symptoms'

// 4. Relative Imports
import { ChatBubble } from './chat-bubble'
```

### Format Patterns

**Server Action Return Pattern (einheitlich für ALLE Actions):**

```typescript
// src/types/common.ts
type ActionSuccess<T> = { data: T; error: null }
type ActionError = { data: null; error: AppError }
type ActionResult<T> = ActionSuccess<T> | ActionError

type AppError = {
  error: string;        // Nutzer-freundliche Meldung (Deutsch)
  code: string;         // Maschinen-lesbarer Code (z.B. "AI_EXTRACTION_FAILED")
  details?: object;     // Debug-Info (nur in Development)
}
```

**API Route Response Format (für `/api/*` Endpunkte):**

```typescript
// Erfolg
Response.json({ data: result }, { status: 200 })

// Fehler
Response.json({ error: { error: 'Meldung', code: 'CODE', details?: {} } }, { status: 4xx|5xx })
```

**Zod-Schema als Single Source of Truth:**

```typescript
// src/types/symptom.ts — Schema + Type zusammen
import { z } from 'zod'

export const symptomInputSchema = z.object({
  transcript: z.string().min(1),
  audioUrl: z.string().url().optional(),
  photoUrl: z.string().url().optional(),
})

export type SymptomInput = z.infer<typeof symptomInputSchema>

// Wiederverwendung in Server Actions UND API Routes
```

**Datum/Zeit:**
- DB: `timestamptz` (PostgreSQL) — immer mit Zeitzone
- JSON/API: ISO 8601 String (`2026-03-01T14:30:00.000Z`)
- UI: Formatiert mit `Intl.DateTimeFormat('de-CH')` — keine Moment.js/date-fns

**Null vs. Undefined — klare Trennung:**

| Kontext | Verwendung | Beispiel |
|---------|-----------|---------|
| Daten aus Supabase | `null` | `symptom.side // null` (keine Seite angegeben) |
| Optionale Funktionsparameter | `undefined` | `function load(filter?: string)` |
| JSON Response | `null` (nie `undefined`) | `{ "photoUrl": null }` |
| React Props (optional) | `undefined` (via `?`) | `intensity?: number` |

**Regel:** Kein Mischen innerhalb desselben Kontexts. `null` kommt aus der DB, `undefined` aus TypeScript-Optionalität.

### Communication Patterns

**Supabase Realtime Channels:**

| Channel | Event | Payload | Trigger |
|---------|-------|---------|---------|
| `symptoms:{account_id}` | `INSERT` | Neues Symptom-Event | KI-Pipeline fertig |
| `symptoms:{account_id}` | `UPDATE` | Korrektur bestätigt | Patient bestätigt Review |
| `sharing:{sharing_link_id}` | `INSERT` | Zugriffs-Log | Arzt öffnet Dashboard |

**State-Update-Pattern (immutable):**

```typescript
// RICHTIG: Immutable Update
setSymptoms(prev => [...prev, newSymptom])

// FALSCH: Mutation
symptoms.push(newSymptom)
```

**Logging-Pattern:**

| Level | Verwendung | Beispiel |
|-------|-----------|---------|
| `error` | Unerwartete Fehler, API-Ausfälle | `KI-Pipeline fehlgeschlagen nach 3 Retries` |
| `warn` | Degraded Mode, Retry | `Whisper API Timeout, Retry 2/3` |
| `info` | Wichtige Business-Events | `Sharing-Link erstellt`, `Account gelöscht` |

Kein `console.log` in Production — nur `console.error`, `console.warn`, `console.info`. In Production via Sentry erfasst.

### Process Patterns

**Server Action Validierung (verbindlich):**

```typescript
export async function confirmSymptom(input: unknown): Promise<ActionResult<Symptom>> {
  // 1. Zod-Validierung ZUERST
  const parsed = symptomInputSchema.safeParse(input)
  if (!parsed.success) {
    return { data: null, error: { error: 'Ungültige Eingabe', code: 'VALIDATION_ERROR' } }
  }

  // 2. Auth-Check
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { data: null, error: { error: 'Nicht authentifiziert', code: 'AUTH_REQUIRED' } }
  }

  // 3. Erst jetzt DB-Operation
  const { data, error } = await supabase
    .from('symptoms')
    .insert({ ...parsed.data, account_id: user.id })
    .select()
    .single()

  if (error) {
    return { data: null, error: { error: 'Speichern fehlgeschlagen', code: 'DB_ERROR' } }
  }

  return { data, error: null }
}
```

**Reihenfolge in JEDER Server Action:** Zod → Auth → DB. Keine Ausnahme.

**Benannte Loading-States (kein generisches `isLoading`):**

| State-Name | Kontext | UI-Darstellung |
|-----------|---------|---------------|
| `isUploading` | Audio/Foto-Upload | Pulsierender Kreis in ChatBubble |
| `isProcessing` | KI-Pipeline läuft | "Celia denkt nach..." Typing-Indicator |
| `isGeneratingPdf` | PDF-Export | Progress-Text im ShareSheet |
| `isLoadingDashboard` | Arzt-Dashboard | Skeleton-Screens |
| `isConfirming` | Review-Bestätigung | Button-Spinner |

**Error-Boundary-Strategie:**

```
src/app/
  ├── error.tsx              → Globaler Fallback (Sentry Report + Neustart-Button)
  ├── (app)/
  │   ├── error.tsx          → App-Fehler (Auth-Redirect bei Session-Verlust)
  │   └── insights/
  │       └── error.tsx      → Feature-spezifisch (Daten konnten nicht geladen werden)
  └── share/
      └── error.tsx          → Sharing-Fehler (Link ungültig/abgelaufen)
```

**KI-Pipeline Retry:**
- Max 3 Versuche, Exponential Backoff (1s → 2s → 4s)
- Nach finalem Fehler: Event als `pending_extraction` markiert
- Retry-Queue verarbeitet Pending-Events bei nächstem Cron/Webhook

**Supabase Type-Generierung (Pflicht-Prozess):**

```bash
# Nach JEDER Migration ausführen:
npx supabase gen types typescript --project-id $PROJECT_ID > src/types/database.ts
# Generierte Datei committen — NIE manuell editieren
```

### Enforcement Guidelines

**Alle AI-Agents MÜSSEN:**

1. `ActionResult<T>` als Return-Type für JEDE Server Action verwenden
2. Zod-Validierung VOR Auth-Check VOR DB-Operation — keine Ausnahme
3. Benannte Loading-States verwenden, kein generisches `isLoading`
4. Import-Reihenfolge einhalten: React → Extern → @/* → Relativ
5. Keine `index.ts` Barrel-Exports erstellen
6. `null` für DB-Werte, `undefined` für optionale Parameter
7. Test-Naming: `.test.ts` (Unit/Integration), `.spec.ts` (E2E)
8. Test-Factories in `src/__tests__/factories/` für konsistente Test-Daten
9. `database.ts` NIE manuell editieren — nur via `supabase gen types`
10. Keine `console.log` — nur `console.error/warn/info` (via Sentry in Prod)

**Pattern-Enforcement:**
- ESLint-Regeln für Import-Reihenfolge (`eslint-plugin-import`)
- TypeScript strict mode erzwingt `null`/`undefined`-Handling
- PR-Review-Checkliste prüft Pattern-Compliance
- `supabase gen types` als Pre-Commit-Hook oder CI-Step

### Anti-Patterns

| Anti-Pattern | Warum problematisch | Stattdessen |
|-------------|--------------------|-----------|
| `isLoading` als einziger State | Unklar welcher Vorgang läuft, UX leidet | Benannte States: `isUploading`, `isProcessing` |
| Barrel Exports (`index.ts`) | Tree-Shaking-Probleme, unlesbar für AI-Agents | Direkte Imports auf spezifische Datei |
| Zod-Schema in Server Action definiert | Duplikation, inkonsistente Validierung | Schema in `src/types/`, importieren |
| `any` oder `as` Type-Casting | Type-Safety untergraben | Korrekte Types, Zod inference |
| Raw Supabase-Call in Komponente | Keine Abstraktion, Migration unmöglich | Über `src/lib/db/` oder Server Action |
| `console.log` in Production | Kein strukturiertes Logging | `console.error/warn/info` + Sentry |
| Manuelles Editieren von `database.ts` | Wird beim nächsten `gen types` überschrieben | Nur `supabase gen types` verwenden |
| `undefined` in JSON-Responses | JSON serialisiert `undefined` nicht | `null` für fehlende Werte in JSON |

## Project Structure & Boundaries

### Requirements → Architektur-Mapping

| FR-Bereich | Primärer Ort | Geteilte Komponenten |
|-----------|-------------|---------------------|
| **Symptom-Erfassung** (FR1-FR10) | `(app)/page.tsx`, `components/capture/`, `lib/ai/`, `lib/actions/symptom-actions.ts` | InputBar, ChatBubble, AudioRecorder |
| **KI-Verarbeitung** (FR11-FR15) | `api/ai/process/`, `lib/ai/providers/`, `lib/db/symptoms.ts` | Provider-Abstraktion, Retry-Queue |
| **Patienten-Ansicht** (FR16-FR20) | `(app)/insights/`, `components/insights/` | Timeline, SymptomRanking |
| **Arzt-Export** (FR21-FR33) | `share/`, `components/sharing/`, `api/share/pdf/` | DoctorDashboard, PdfExport |
| **Account & Auth** (FR34-FR36) | `auth/`, `lib/db/client.ts`, `middleware.ts` | Supabase Auth, Apple ID |
| **Daten-Souveränität** (FR37-FR42) | `lib/db/audit.ts`, `lib/actions/account-actions.ts`, `(app)/settings/` | AuditLog, AccountDeletion |
| **Marketing** (FR43-FR45) | `app/page.tsx` (Root), `public/` | SSR Marketing-Seite |

### Vollständige Projektstruktur

```
lds-symptom-tracker/
│
├── .github/
│   └── workflows/
│       ├── ci.yml                          → Lint → Types → Unit → Integration → E2E
│       └── release.yml                     → Production Deploy + Contract/Smoke Tests
│
├── .env.local                              → Lokale Env-Variablen (git-ignored)
├── .env.example                            → Template mit allen benötigten Variablen
├── .eslintrc.json                          → ESLint + eslint-plugin-import (Import-Reihenfolge)
├── .prettierrc                             → Prettier (semi: false, singleQuote: true, tabWidth: 2)
├── .gitignore
├── next.config.ts                          → Next.js 16 Konfiguration + Serwist PWA
├── tailwind.config.ts                      → Tailwind CSS 4 + Custom Theme Tokens
├── tsconfig.json                           → TypeScript strict
├── vitest.config.ts                        → Vitest Setup (jsdom, Pfad-Aliase, Coverage-Thresholds)
├── playwright.config.ts                    → Playwright Setup (Chromium, Mobile Viewport)
├── components.json                         → shadcn/ui Konfiguration
├── package.json
│
├── public/
│   ├── icons/                              → PWA Icons (192x192, 512x512)
│   └── og/                                 → Open Graph Images für Marketing-Seite
│
├── supabase/
│   ├── config.toml                         → Supabase CLI Konfiguration
│   ├── migrations/                         → SQL Migrations (chronologisch)
│   │   ├── 00001_initial_schema.sql        → Tabellen, RLS Policies
│   │   └── 00002_audit_log.sql             → Audit-Log Tabelle + Insert-Only Policy
│   └── seed.sql                            → Testdaten für lokale Entwicklung (getrennt von Test-Factories)
│
├── src/
│   ├── app/
│   │   ├── globals.css                     → Tailwind Imports + CSS Custom Properties (Themes)
│   │   ├── layout.tsx                      → Root Layout (HTML, Fonts, Metadata)
│   │   ├── page.tsx                        → Marketing-Seite (SSR, SEO, öffentlich)
│   │   ├── not-found.tsx                   → 404 Seite
│   │   ├── sw.ts                           → Service Worker Source (Serwist, wird kompiliert)
│   │   ├── manifest.ts                     → PWA Manifest via Next.js Metadata API
│   │   │
│   │   ├── (app)/                          → Patient App (authentifiziert)
│   │   │   ├── layout.tsx                  → Auth-Guard + BottomTabBar + data-theme="patient"
│   │   │   ├── page.tsx                    → Erfassen (Chat-Screen, Default nach Login)
│   │   │   ├── loading.tsx                 → App Loading Skeleton
│   │   │   ├── error.tsx                   → App Error Boundary
│   │   │   ├── insights/
│   │   │   │   ├── page.tsx                → Auswertung (Timeline + Ranking)
│   │   │   │   ├── loading.tsx             → Insights Skeleton
│   │   │   │   └── [symptom]/
│   │   │   │       └── page.tsx            → Symptom-Detail (Event-Liste)
│   │   │   └── settings/
│   │   │       └── page.tsx                → Mehr (Sharing-Verwaltung, Audit-Log, Account)
│   │   │
│   │   ├── share/
│   │   │   ├── [token]/
│   │   │   │   └── page.tsx                → Token-Validierung → Cookie → Redirect
│   │   │   ├── dashboard/
│   │   │   │   ├── layout.tsx              → Cookie-Auth-Check + data-theme="doctor"
│   │   │   │   ├── page.tsx                → Arzt-Dashboard (Übersicht)
│   │   │   │   ├── loading.tsx             → Dashboard Skeleton
│   │   │   │   ├── error.tsx               → Sharing Error (abgelaufen/ungültig)
│   │   │   │   └── [symptom]/
│   │   │   │       └── page.tsx            → Symptom-Drill-Down
│   │   │   └── expired/
│   │   │       └── page.tsx                → "Zugang abgelaufen" Seite
│   │   │
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   │   └── page.tsx                → Apple ID Login Button
│   │   │   └── callback/
│   │   │       └── route.ts                → OAuth Callback Handler
│   │   │
│   │   └── api/
│   │       ├── ai/
│   │       │   └── process/
│   │       │       └── route.ts            → KI-Pipeline: Audio → Whisper → Claude → DB
│   │       ├── share/
│   │       │   └── pdf/
│   │       │       └── route.ts            → PDF-Generierung (@react-pdf/renderer)
│   │
│   ├── components/
│   │   ├── ui/                             → shadcn/ui (generiert, nicht manuell editieren)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── drawer.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── slider.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── tooltip.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── skeleton.tsx
│   │   │   └── scroll-area.tsx
│   │   ├── capture/                        → Erfassungs-Feature
│   │   │   ├── chat-bubble.tsx             → Einzelne Chat-Nachricht (Patient/System)
│   │   │   ├── review-bubble.tsx           → KI-Ergebnis zur Bestätigung
│   │   │   ├── input-bar.tsx               → Mikrofon + Kamera + Text (immer sichtbar)
│   │   │   ├── audio-recorder.tsx          → MediaRecorder Wrapper
│   │   │   ├── photo-capture.tsx           → Kamera-Zugriff + Preview
│   │   │   └── chat-feed.tsx              → Scrollable Chat-Liste
│   │   ├── insights/                       → Auswertungs-Feature
│   │   │   ├── timeline.tsx                → Chronologische Symptom-Übersicht
│   │   │   ├── symptom-ranking.tsx         → Häufigkeits-Ranking
│   │   │   └── symptom-detail.tsx          → Event-Liste für ein Symptom
│   │   ├── sharing/                        → Arzt-Sharing-Feature
│   │   │   ├── share-sheet.tsx             → Sharing-Link erstellen/verwalten
│   │   │   ├── doctor-dashboard.tsx        → Arzt-Übersicht (Zusammenfassung)
│   │   │   ├── doctor-symptom-view.tsx     → Arzt Symptom-Detail
│   │   │   ├── audio-player.tsx            → Signed URL Audio-Streaming
│   │   │   └── pdf-button.tsx              → PDF-Export auslösen
│   │   └── layout/                         → Layout-Komponenten
│   │       ├── bottom-tab-bar.tsx          → 3-Tab Navigation (Erfassen, Auswertung, Mehr)
│   │       ├── marketing-header.tsx        → Marketing-Seite Header
│   │       └── error-boundary-fallback.tsx → Generischer Error-Fallback
│   │
│   ├── lib/
│   │   ├── db/                             → Supabase Abstraktionsschicht
│   │   │   ├── client.ts                   → createBrowserClient() + createServerClient() + createServiceClient()
│   │   │   ├── symptoms.ts                 → getSymptoms, insertSymptom, updateSymptom, deleteSymptom
│   │   │   ├── sharing.ts                  → createLink, validateToken, deactivateLink
│   │   │   ├── audit.ts                    → insertAuditEntry (append-only)
│   │   │   ├── media.ts                    → uploadAudio, uploadPhoto, getSignedUrl
│   │   │   └── corrections.ts             → getCorrections, insertCorrection
│   │   ├── ai/                             → KI-Pipeline Abstraktionsschicht
│   │   │   ├── transcribe.ts               → Interface: audio → transcript
│   │   │   ├── extract.ts                  → Interface: transcript + corrections → structured data
│   │   │   ├── summarize.ts                → Interface: symptoms[] → summary text (Arzt-Dashboard)
│   │   │   ├── pipeline.ts                 → Orchestrierung: transcribe → extract → save
│   │   │   ├── providers/
│   │   │   │   ├── whisper.ts              → OpenAI Whisper Implementation
│   │   │   │   └── claude.ts               → Anthropic Claude Sonnet (extract + summarize)
│   │   │   └── __fixtures__/               → KI-Pipeline Test-Fixtures
│   │   │       ├── audio/
│   │   │       │   ├── rueckenschmerzen-schweizerdeutsch.webm
│   │   │       │   └── kopfschmerzen-hochdeutsch.webm
│   │   │       ├── transcripts/
│   │   │       │   ├── rueckenschmerzen.json
│   │   │       │   └── kopfschmerzen.json
│   │   │       └── extractions/
│   │   │           ├── rueckenschmerzen.json
│   │   │           └── kopfschmerzen.json
│   │   ├── actions/                        → Server Actions
│   │   │   ├── symptom-actions.ts          → confirmSymptom, editSymptom, deleteSymptom
│   │   │   ├── sharing-actions.ts          → createSharingLink, revokeSharingLink
│   │   │   └── account-actions.ts          → deleteAccount, exportData
│   │   ├── utils/
│   │   │   ├── date-utils.ts               → formatDate, formatRelativeTime (Intl)
│   │   │   ├── crypto-utils.ts             → generateToken (UUID + HMAC)
│   │   │   └── constants.ts                → MAX_AUDIO_DURATION, DEFAULT_TTL, etc.
│   │   ├── pdf/
│   │   │   ├── symptom-report.tsx           → @react-pdf/renderer Dokument (serverseitig)
│   │   │   └── pdf-styles.ts               → PDF Stylesheet
│   │
│   ├── hooks/
│   │   ├── use-symptoms.ts                 → Supabase Realtime Subscription
│   │   ├── use-audio-recorder.ts           → MediaRecorder Hook
│   │   ├── use-sharing-session.ts          → Cookie-basierte Arzt-Session
│   │   ├── use-signed-url.ts              → Auto-Refresh Signed URLs
│   │   └── use-push-notifications.ts      → Permission-Request, Token-Registration, Push-Empfang
│   │
│   ├── types/
│   │   ├── database.ts                     → AUTO-GENERIERT via supabase gen types (NIE editieren!)
│   │   ├── symptom.ts                      → Zod-Schemas + Types (SymptomInput, Symptom, etc.)
│   │   ├── sharing.ts                      → Zod-Schemas + Types (SharingLink, SharingSession)
│   │   ├── ai.ts                           → TranscriptResult, ExtractionResult, MultiExtractionResult, PipelineResult
│   │   └── common.ts                       → ActionResult<T>, AppError, LoadingStates
│   │
│   ├── middleware.ts                        → Routing-basierte Auth (siehe Details unten)
│   │
│   └── __tests__/
│       ├── factories/                       → Test-Data-Factories
│       │   ├── symptom.factory.ts
│       │   ├── sharing.factory.ts
│       │   └── user.factory.ts
│       ├── setup.ts                         → Vitest Global Setup
│       ├── lib/
│       │   ├── ai/
│       │   │   ├── extract.test.ts
│       │   │   ├── transcribe.test.ts
│       │   │   └── pipeline.test.ts
│       │   ├── db/
│       │   │   ├── symptoms.test.ts
│       │   │   └── sharing.test.ts
│       │   └── actions/
│       │       ├── symptom-actions.test.ts
│       │       └── sharing-actions.test.ts
│       ├── components/
│       │   ├── capture/
│       │   │   ├── chat-bubble.test.tsx
│       │   │   └── input-bar.test.tsx
│       │   └── insights/
│       │       └── timeline.test.tsx
│       └── capture-flow.integration.test.ts
│
└── e2e/
    ├── symptom-capture.spec.ts              → Erfassung: Text → Review → Bestätigung
    ├── audio-capture.spec.ts                → Audio: Aufnahme → Upload → KI → Review
    ├── sharing-flow.spec.ts                 → Sharing: Link erstellen → Arzt öffnet → Dashboard
    ├── auth-flow.spec.ts                    → Login → App → Logout
    ├── fixtures/
    │   ├── test-audio.webm                  → Audio-Fixture für E2E
    │   └── mock-responses/
    │       ├── whisper-success.json          → Mocked Whisper Response
    │       └── claude-extraction.json        → Mocked Claude Response
    └── helpers/
        └── auth.ts                          → Login-Helper (Supabase Test-User)
```

### Supabase Client Factories

Drei verschiedene Clients für drei Kontexte:

| Client | Factory | Kontext | RLS |
|--------|---------|---------|-----|
| **Browser Client** | `createBrowserClient()` | Client Components (Realtime Subscriptions) | Ja, via Anon Key |
| **Server Client** | `createServerClient()` | Server Components + Server Actions (Cookie-based) | Ja, via User Session |
| **Service Client** | `createServiceClient()` | API Routes (KI-Pipeline, Webhooks) | Nein, Service Role Key bypassed RLS |

**Regel:** `createServiceClient()` nur in `src/app/api/` verwenden. Nie in Server Actions oder Components — dort immer `createServerClient()` für RLS-Schutz.

### Middleware-Strategie

```typescript
// src/middleware.ts — Zwei verschiedene Auth-Mechanismen
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/db/client'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // 1. Patient App: Supabase Auth Session prüfen
  if (path.startsWith('/(app)') || path.match(/^\/(?!share|auth|api)/)) {
    const supabase = createServerClient(/* cookies */)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
  }

  // 2. Arzt-Dashboard: Sharing-Cookie prüfen
  if (path.startsWith('/share/dashboard')) {
    const sharingSession = request.cookies.get('sharing_session')
    if (!sharingSession) {
      return NextResponse.redirect(new URL('/share/expired', request.url))
    }
    // Cookie-Validierung gegen DB in der Dashboard-Page (nicht Middleware)
  }

  // 3. Öffentlich: Marketing, /share/[token], /auth/* → durchlassen
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|og).*)']
}
```

### Architektonische Grenzen

**Boundary-Diagramm:**

```
┌──────────────────────────────────────────────────────────┐
│  Client (Browser)                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐ │
│  │ Patient App  │  │ Arzt Dash   │  │ Marketing        │ │
│  │ (app)/       │  │ share/dash  │  │ / (root)         │ │
│  └──────┬───────┘  └──────┬──────┘  └──────────────────┘ │
│         │                  │                               │
│  ┌──────▼──────────────────▼───────────────────────────┐  │
│  │              Supabase Realtime (WebSocket)           │  │
│  └─────────────────────────────────────────────────────┘  │
└──────────────────────────┬───────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────┐
│  Next.js Server (Vercel Serverless)                       │
│                                                           │
│  ┌────────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Server Actions  │  │ API Routes   │  │ Middleware    │  │
│  │ (lib/actions/)  │  │ (api/)       │  │ (Auth+Share) │  │
│  │ createServer    │  │ createService│  │              │  │
│  │ Client()        │  │ Client()     │  │              │  │
│  └───────┬────────┘  └──────┬───────┘  └──────────────┘  │
│          │                   │                             │
│  ┌───────▼───────────────────▼──────────────────────────┐ │
│  │        Abstraktionsschicht (lib/db/, lib/ai/)         │ │
│  └───────┬───────────────────┬──────────────────────────┘ │
└──────────┼───────────────────┼────────────────────────────┘
           │                   │
    ┌──────▼──────┐    ┌───────▼──────────┐
    │  Supabase   │    │  Externe APIs     │
    │  - PostgreSQL│    │  - Whisper (STT)  │
    │  - Auth     │    │  - Claude (LLM)   │
    │  - Storage  │    │  - Apple ID       │
    │  - Realtime │    │  - Web Push       │
    └─────────────┘    └──────────────────┘
```

**Komponenten-Grenzen:**

| Grenze | Regel | Durchsetzung |
|--------|-------|-------------|
| `components/` → `lib/` | Komponenten importieren NIE direkt aus `lib/db/` oder `lib/ai/` | Server Actions oder Hooks als Vermittler |
| `app/` → `components/` | Route-Dateien nur Layout + Composition, keine Logik | Business-Logik in `components/` oder `lib/` |
| `lib/ai/` → `lib/ai/providers/` | `pipeline.ts` nutzt nur Interfaces aus `transcribe.ts`/`extract.ts`. Extraktion gibt `MultiExtractionResult` zurück — Pipeline erstellt pro Eintrag ein eigenes `symptom_event`. | Provider-Dateien nie direkt importieren |
| `lib/db/` → Supabase | Einziger Ort für Supabase-Client-Calls | Kein `supabase.from()` ausserhalb von `lib/db/` |
| `types/` → überall | Types werden überall importiert, importieren aber NIE aus `lib/` oder `components/` | Keine zirkulären Dependencies |
| `api/` → `createServiceClient()` | Einziger Ort für Service Role Key | Server Actions nutzen `createServerClient()` |

**Daten-Grenzen:**

| Datenfluss | Von → Nach | Grenze |
|-----------|-----------|--------|
| Patient → DB | `components/capture/` → Server Action → `lib/db/symptoms.ts` → Supabase | RLS: `auth.uid() = account_id` |
| DB → Patient | Supabase Realtime → `hooks/use-symptoms.ts` → `components/capture/` | Channel: `symptoms:{account_id}` |
| Patient → Arzt | `lib/db/sharing.ts` → Token → Cookie → `share/dashboard/` | Zwei-Stufen-Token, TTL |
| Audio → KI | `lib/db/media.ts` → Supabase Storage → `api/ai/process/` → Whisper → Claude | Private Bucket, Service Client |
| Audit | Alle schreibenden Operationen → `lib/db/audit.ts` | Insert-only, kein Update/Delete |

### Datenfluss: Symptom-Erfassung (Hauptflow)

```
Patient spricht Audio
        │
        ▼
InputBar → AudioRecorder (MediaRecorder API)
        │
        ▼
Server Action: uploadAudio (createServerClient)
        │
        ▼
lib/db/media.ts → Supabase Storage (Private Bucket)
        │
        ▼
API Route: /api/ai/process (createServiceClient — bypassed RLS)
        │
        ▼
lib/ai/pipeline.ts
  ├── transcribe.ts → providers/whisper.ts → OpenAI API
  │       │
  │       ▼ Transcript
  ├── extract.ts → providers/claude.ts → Anthropic API
  │       │       (+ Korrekturen aus lib/db/corrections.ts)
  │       ▼ MultiExtractionResult (Array: 1..n Symptome/Medikamente)
  └── Pro Eintrag: symptom_event + extracted_data → INSERT in Supabase
      (Erstes Ergebnis aktualisiert bestehendes Event, weitere erzeugen neue Events)
              │
              ▼
Supabase Realtime → Channel symptoms:{account_id}
              │
              ▼
hooks/use-symptoms.ts → State Update
              │
              ▼
ReviewBubble erscheint im Chat → Patient bestätigt/korrigiert
              │
              ▼
Server Action: confirmSymptom (createServerClient + RLS)
              │
              ▼
lib/db/symptoms.ts → UPDATE + lib/db/audit.ts → INSERT
```

### Externe Integrationen

| Service | Ort im Code | Env-Variable | Fallback |
|---------|------------|-------------|---------|
| OpenAI Whisper | `lib/ai/providers/whisper.ts` | `OPENAI_API_KEY` | Text-Eingabe |
| Anthropic Claude | `lib/ai/providers/claude.ts` | `ANTHROPIC_API_KEY` | Retry-Queue |
| Apple ID (OAuth) | `auth/callback/route.ts` + Supabase Auth | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | — |
| Supabase | `lib/db/client.ts` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | — |
| Sentry | `next.config.ts` | `SENTRY_DSN` | Logging only |
| Web Push | `hooks/use-push-notifications.ts` | `NEXT_PUBLIC_VAPID_KEY`, `VAPID_PRIVATE_KEY` | In-App Notification |

### Env-Variablen

```bash
# .env.example

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# KI-Pipeline
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# PWA / Push
NEXT_PUBLIC_VAPID_KEY=
VAPID_PRIVATE_KEY=

# Sharing
SHARING_HMAC_SECRET=

# Monitoring
SENTRY_DSN=

# App
NEXT_PUBLIC_APP_URL=
```

### Test-Organisation

**Seed-Daten vs. Test-Factories — klare Trennung:**

| Kontext | Quelle | Zweck |
|---------|--------|-------|
| Lokale Entwicklung | `supabase/seed.sql` | Realistische Daten für `supabase start` |
| Unit/Integration Tests | `src/__tests__/factories/*.factory.ts` | Programmatische, isolierte Test-Daten |
| E2E Tests | `e2e/fixtures/` + `e2e/helpers/auth.ts` | Audio-Fixtures, Mock-Responses, Test-User Login |

**Coverage-Thresholds (vitest.config.ts):**

| Bereich | Lines | Branches | Functions |
|---------|-------|----------|-----------|
| `src/lib/` | 80% | 75% | 80% |
| `src/components/` | 60% | 50% | 60% |
| `src/hooks/` | 70% | 65% | 70% |

Enforced in CI via `vitest --coverage --reporter=json`.

### Tooling-Konfiguration

| Tool | Config-Datei | Zweck |
|------|-------------|-------|
| ESLint | `.eslintrc.json` | Code-Qualität + `eslint-plugin-import` (Import-Reihenfolge) |
| Prettier | `.prettierrc` | Formatierung: `semi: false`, `singleQuote: true`, `tabWidth: 2`, `trailingComma: "all"` |
| TypeScript | `tsconfig.json` | `strict: true`, `paths: { "@/*": ["./src/*"] }` |
| Vitest | `vitest.config.ts` | jsdom, Pfad-Aliase, Coverage-Thresholds |
| Playwright | `playwright.config.ts` | Chromium, Mobile Viewport (390x844 iPhone 14) |
| shadcn/ui | `components.json` | Stil: `new-york`, CSS Variables, Tailwind |
| Supabase | `supabase/config.toml` | Lokale DB, Auth, Storage Konfiguration |

## Architecture Validation Results

### Kohärenz-Validierung ✅

**Entscheidungs-Kompatibilität:**
Alle Architektur-Entscheidungen arbeiten konfliktfrei zusammen. Next.js 16 (App Router) + Supabase + shadcn/ui + Tailwind CSS 4 + Serwist + Vitest + Playwright — keine Versions- oder Integrationskonflikte. E-Mail-Versand erfolgt über die native Mail-App des Patienten (mailto:-Link), kein Backend-E-Mail-Service nötig.

**Pattern-Konsistenz:**
Implementation Patterns (Naming, Structure, Format, Communication, Process) sind vollständig auf den Stack abgestimmt. 10 Enforcement Guidelines + Anti-Patterns-Tabelle decken alle identifizierten Konfliktpunkte ab.

**Struktur-Alignment:**
Projektstruktur unterstützt alle architektonischen Entscheidungen. Boundaries (Komponenten → Server Actions → DB-Abstraktion → Supabase) sind klar definiert. Drei Supabase-Client-Factories, Middleware mit zwei Auth-Mechanismen, Provider-Abstraktion für KI — alles kohärent.

### Requirements Coverage ✅

**Functional Requirements (45/45):**

| Bereich | FRs | Status | Architektonische Abdeckung |
|---------|-----|--------|---------------------------|
| Symptom-Erfassung | FR1-FR10 | ✅ 10/10 | InputBar → AudioRecorder/PhotoCapture → Pipeline → Realtime → ReviewBubble |
| KI-Verarbeitung | FR11-FR15 | ✅ 5/5 | Claude Tool Use (Konfidenz), ReviewBubble (Korrektur), corrections.ts (Lernen) |
| Patienten-Ansicht | FR16-FR20 | ✅ 5/5 | (app)/insights/ (Timeline, Ranking), Server Actions (Deletion) |
| Arzt-Export | FR21-FR33 | ✅ 13/13 | Sharing-Token-System, native Mail-App mailto: (FR24), summarize.ts (FR27), @react-pdf/renderer |
| Account & Auth | FR34-FR36 | ✅ 3/3 | Supabase Auth + Apple ID, Pseudonymisierung |
| Daten-Souveränität | FR37-FR42 | ✅ 6/6 | RLS, Audit-Log (append-only), TTL, Soft-Delete + Cron |
| Marketing | FR43-FR45 | ✅ 3/3 | SSR Marketing-Seite, API-First (Server Actions + API Routes) |

**Non-Functional Requirements (25/25):**

| Kategorie | NFRs | Status | Architektonische Abdeckung |
|-----------|------|--------|---------------------------|
| Performance | NFR1-6 | ✅ 6/6 | Vercel Edge, Turbopack, Supabase, Pipeline <10s |
| Security | NFR7-13 | ✅ 7/7 | TLS + Encryption at Rest (Supabase), Pseudonymisierung, kryptographische Tokens, Signed URLs, Audit-Log, nDSG-konform, Soft-Delete + 30-Tage Cron |
| Reliability | NFR14-17 | ✅ 4/4 | Vercel + Supabase Managed (99.9%), automatische Backups |
| Integration | NFR18-22 | ✅ 5/5 | Whisper (STT), Claude (LLM), Apple ID (OAuth), Serwist (Web Push), native Mail-App (mailto:) |
| Scalability | NFR23-25 | ✅ 3/3 | Serverless (Vercel), Object Storage (Supabase), Pay-per-Use überall |

### Gap-Analyse — Geschlossen

Alle 3 ursprünglichen Gaps wurden durch Party Mode adressiert:

**G1 — E-Mail-Versand (FR24, NFR22): GESCHLOSSEN**
- **Lösung:** Native Mail-App des Patienten via `mailto:`-Link mit vorausgefülltem Entwurf
- **Pattern:** Client-seitig — kein Backend-E-Mail-Service nötig
- **Vorteile:** Patient ist Absender (Arzt erkennt sofort den Patienten), keine externe Abhängigkeit, keine Kosten, DSGVO-einfacher
- **Flow:** Patient generiert Sharing-Link → klickt "Per E-Mail senden" → `mailto:`-Link öffnet Mail-App mit vorausgefülltem Betreff, Link und Erklärungstext → Patient sendet selbst
- **Fallback:** Copy-to-Clipboard Button für manuelles Teilen
- **Testing:** E2E (mailto-Link korrekt generiert mit allen Parametern)

**G2 — KI-Zusammenfassung für Arzt (FR27): GESCHLOSSEN**
- **Interface:** `src/lib/ai/summarize.ts` — eigenes Interface, getrennt von extract.ts
- **Implementation:** `providers/claude.ts` implementiert sowohl extract als auch summarize
- **Caching:** Tabelle `sharing_summaries` mit `sharing_link_id`, `summary_text`, `generated_at`
- **Invalidierung:** Neues Symptom INSERT im Sharing-Zeitraum → `invalidated_at` gesetzt → nächster Dashboard-Besuch regeneriert
- **Performance:** Erster Besuch ~3s (Claude-Call), folgende Besuche <500ms (Cache)

**G3 — Backup-Löschung bei Account-Deletion (NFR13): GESCHLOSSEN**
- **Strategie:** Soft-Delete + Cron Hard-Delete
- **Implementation:** `deleted_at` Timestamp auf `accounts` Tabelle
- **RLS:** Policy filtert `deleted_at IS NULL` — gelöschte Accounts sofort unsichtbar
- **Cron:** Supabase Edge Function (wöchentlich) löscht Accounts mit `deleted_at < NOW() - 30 days` inkl. aller verknüpften Daten (Symptoms, Media, Sharing-Links, Corrections, Audit-Logs)
- **Backups:** Nach 30 Tagen sind alle Supabase Point-in-Time-Recovery Snapshots, die den Datensatz enthalten, rotiert

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Projektkontextanalyse durchgeführt (45 FRs, 25 NFRs gemappt)
- [x] Skalierung und Komplexität bewertet (Hoch, ~15 Komponenten)
- [x] Technische Constraints identifiziert (7 Constraints)
- [x] Cross-Cutting Concerns gemappt (7 Concerns)

**✅ Architektonische Entscheidungen**
- [x] 14 Entscheidungen dokumentiert mit Rationale (D1-D14)
- [x] Technology Stack vollständig spezifiziert mit Versionen
- [x] KI-Pipeline Stack definiert (Whisper + Claude + Summarize)
- [x] E-Mail-Service gewählt (Resend)
- [x] Integrationsmuster definiert (Hybrid: Server Actions + API Routes + Webhooks)

**✅ Implementation Patterns**
- [x] Naming Conventions (DB, API, Code, Tests — 4 Kategorien)
- [x] Structure Patterns (Feature-basiert, Import-Reihenfolge, kein Barrel Export)
- [x] Format Patterns (ActionResult<T>, Zod Single Source of Truth, Null/Undefined)
- [x] Communication Patterns (Realtime Channels, Immutable State, Logging)
- [x] Process Patterns (Zod→Auth→DB, benannte Loading-States, Error Boundaries)
- [x] 10 Enforcement Guidelines + 8 Anti-Patterns

**✅ Project Structure**
- [x] Vollständiger Verzeichnisbaum mit allen Dateien (~80 Dateien)
- [x] Requirements → Structure Mapping (7 FR-Bereiche → Verzeichnisse)
- [x] Architektonische Grenzen + ASCII Boundary-Diagramm
- [x] Datenfluss-Diagramm (Symptom-Erfassung Hauptflow)
- [x] Middleware-Strategie (Auth + Sharing Cookie)
- [x] 7 Externe Integrationen mit Env-Variablen
- [x] Test-Organisation (Seed vs. Factories vs. E2E Fixtures)
- [x] Coverage-Thresholds definiert

**✅ Validation**
- [x] Kohärenz aller Entscheidungen geprüft
- [x] 45/45 FRs architektonisch abgedeckt
- [x] 25/25 NFRs architektonisch abgedeckt
- [x] 3 Gaps identifiziert und geschlossen
- [x] Party Mode: 8 Verbesserungen integriert

### Architecture Readiness Assessment

**Gesamtstatus:** ✅ BEREIT FÜR IMPLEMENTATION

**Konfidenz:** Hoch — Alle 45 FRs und 25 NFRs sind architektonisch abgedeckt. Keine offenen Gaps.

**Stärken:**
- Klare Abstraktionsschichten ermöglichen Provider-Wechsel (KI, DB, E-Mail)
- Drei Supabase-Client-Factories für korrekte RLS-Handhabung in jedem Kontext
- Umfassende Test-Pyramide mit Fixtures, Factories und Coverage-Thresholds
- Zwei-Stufen-Token-Security für Sharing (nDSG-konform)
- 10 Enforcement Guidelines verhindern AI-Agent-Konflikte
- Asynchrone Patterns (KI-Pipeline, Summary-Cache) für optimale UX
- Soft-Delete + Cron für DSGVO/nDSG-konforme Account-Löschung

**Post-MVP Erweiterbarkeit:**
- AWS/SST Migration via Abstraktionsschicht möglich
- API-First ermöglicht native iOS/Apple Watch Clients
- Provider-Abstraktion erlaubt KI-Service-Wechsel

### Implementation Handoff

**AI-Agent-Richtlinien:**
1. Alle architektonischen Entscheidungen (D1-D14) exakt wie dokumentiert befolgen
2. Implementation Patterns konsistent über alle Komponenten anwenden
3. Projektstruktur und Boundaries respektieren
4. Bei Architektur-Fragen dieses Dokument als Single Source of Truth verwenden
5. Disclaimer-Text als Constant in `src/lib/utils/constants.ts` definieren (FR41)

**Erste Implementation-Priorität:**
Projekt-Initialisierung mit den dokumentierten Initialization Commands (Step 3), gefolgt von Supabase Schema + RLS Setup.
