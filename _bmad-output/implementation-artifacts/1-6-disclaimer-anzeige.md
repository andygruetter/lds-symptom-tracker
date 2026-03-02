# Story 1.6: Disclaimer-Anzeige und Mehr-Seite

Status: done

## Story

As a Patient,
I want beim ersten App-Start einen Disclaimer sehen und diesen jederzeit in der App wiederfinden,
So that ich weiss, dass dies kein Medizinprodukt ist.

## Acceptance Criteria

1. **Given** ein neuer Nutzer öffnet die App zum ersten Mal nach Login **When** die App geladen wird **Then** wird ein Disclaimer-Dialog angezeigt ("Kein Medizinprodukt"-Hinweis) (FR41)
2. **And** der Disclaimer-Text ist als Constant definiert (nicht hardcoded in der UI)
3. **And** der Nutzer muss den Disclaimer bestätigen, bevor er die App nutzen kann
4. **And** unter dem "Mehr"-Tab ist der Disclaimer jederzeit einsehbar
5. **And** die "Mehr"-Seite zeigt auch eine Option "Account löschen" (Platzhalter für Story 1.7)

## Tasks / Subtasks

- [x] Task 1: Supabase-Migration — `disclaimer_accepted_at` Spalte (AC: #1, #3)
  - [x] `supabase/migrations/00002_disclaimer_acceptance.sql` erstellen
  - [x] Spalte `disclaimer_accepted_at TIMESTAMPTZ DEFAULT NULL` zu `accounts` hinzufügen
  - [x] Bestehende RLS-Policies prüfen (UPDATE-Policy muss `disclaimer_accepted_at` erlauben — ist bereits der Fall)
  - [x] Migration lokal anwenden via `supabase db reset` oder `supabase migration up`
- [x] Task 2: Disclaimer-Text als Constant definieren (AC: #2)
  - [x] `src/lib/constants/disclaimer.ts` erstellen
  - [x] `DISCLAIMER_TITLE` und `DISCLAIMER_SECTIONS` exportieren
  - [x] Abschnitte: Kein Medizinprodukt, Kein Ersatz für ärztliche Beratung, Keine Diagnose, Gesundheitsdaten (DSGVO/nDSG), Eigenverantwortung
  - [x] `DISCLAIMER_VERSION` als Constant (`'1.0'`) für zukünftige Versionierung
- [x] Task 3: Server Action — `acceptDisclaimer()` (AC: #3)
  - [x] `src/lib/actions/disclaimer-actions.ts` erstellen
  - [x] `acceptDisclaimer(): Promise<ActionResult<{ acceptedAt: string }>>` implementieren
  - [x] Auth-Check via `getUser()` (nicht getSession!)
  - [x] `accounts.disclaimer_accepted_at` auf aktuelle Zeit setzen
  - [x] `supabase.auth.updateUser({ data: { disclaimer_accepted: true } })` für schnellen Middleware-Check
  - [x] `revalidatePath('/', 'layout')` aufrufen
- [x] Task 4: Disclaimer-Seite erstellen (AC: #1, #3)
  - [x] `src/app/disclaimer/page.tsx` als Client Component erstellen
  - [x] Patient-Theme (`data-theme="patient"`)
  - [x] Vollbild-Layout mit Disclaimer-Text (scrollbar wenn nötig)
  - [x] "Ich habe den Hinweis gelesen und verstanden" Button (Primary-Style)
  - [x] Loading-State und Error-State
  - [x] Nach Akzeptanz: `router.push('/')` + `router.refresh()`
  - [x] Kein Close-Button, keine Möglichkeit zu überspringen
- [x] Task 5: Middleware erweitern — Disclaimer-Check (AC: #1, #3)
  - [x] `src/middleware.ts` erweitern
  - [x] `/disclaimer` zu öffentlichen Routen hinzufügen (nach Auth-Check aber vor Disclaimer-Check)
  - [x] Nach Auth-Check: `user.user_metadata?.disclaimer_accepted !== true` → Redirect zu `/disclaimer`
  - [x] Reihenfolge: Auth-Login-Redirect → Öffentliche Routen → Auth-Check → Disclaimer-Check → Normal
- [x] Task 6: Mehr-Seite implementieren (AC: #4, #5)
  - [x] `src/app/(app)/more/page.tsx` komplett neu implementieren
  - [x] Section "Rechtliches": "Disclaimer anzeigen" Button → öffnet Disclaimer-Dialog (shadcn Dialog)
  - [x] Section "Account": "Account löschen" als Platzhalter (disabled, Hinweis "Kommt bald" oder Link zu Story 1.7)
  - [x] Disclaimer-Dialog auf Mehr-Seite: Gleicher Text aus Constant, aber mit Close-Button (nicht blocking)
  - [x] Disclaimer-View-Komponente: `src/components/disclaimer/disclaimer-content.tsx` (wiederverwendbar)
- [x] Task 7: Tests (AC: #1-#5)
  - [x] Unit-Test: `disclaimer-actions.test.ts` — acceptDisclaimer() aktualisiert DB und user_metadata
  - [x] Unit-Test: `disclaimer-page.test.tsx` — Disclaimer-Seite zeigt Text und Button
  - [x] Unit-Test: `more-page.test.tsx` — Mehr-Seite zeigt Disclaimer-Link und Account-Löschen-Platzhalter
  - [x] Unit-Test: `middleware.test.ts` — Disclaimer-Redirect für neue User, Durchlass für akzeptierte User, `/disclaimer` Route öffentlich
  - [x] `npm run test` verifizieren — alle Tests grün
- [x] Task 8: Build-Verifikation
  - [x] `npm run lint` fehlerfrei (nur bestehende Warnings)
  - [x] `npm run build` erfolgreich (mit `--webpack` Flag)
  - [x] Keine TypeScript-Fehler
  - [x] Manuelle Prüfung: Neue Routen erreichbar

## Dev Notes

### Scope-Abgrenzung (KRITISCH)

Diese Story implementiert:
- Disclaimer als Blocking-Seite beim ersten Login
- Disclaimer-Text als Constant (wiederverwendbar)
- Server Action für Akzeptanz (DB + user_metadata)
- Middleware-Redirect für nicht-akzeptierte User
- Mehr-Seite mit Disclaimer-Link und Account-Löschen-Platzhalter

Gehört NICHT in diese Story:
- **Account-Löschung (Soft-Delete, Cron)** → Story 1.7
- **Marketing-Seite Disclaimer** → Story 7.1
- **Datenschutzerklärung / Privacy Policy** → Separates Dokument, nicht im MVP
- **Disclaimer-Versionierung mit Re-Akzeptanz** → Post-MVP Enhancement
- **middleware.ts → proxy.ts Migration** → Separates Refactoring (Next.js 16 Deprecation, funktioniert noch)
- **Scroll-to-Bottom-Gate** → Nice-to-have, nicht in ACs gefordert

### KRITISCH: Learnings aus Story 1.1 - 1.5

1. **ESLint erzwingt Import-Ordering** — Imports: `react` → `next` → externe Packages → `@/` lokale. Import-Groups mit Leerzeile trennen.
2. **Prettier-Config** — `semi: false`, `singleQuote: true`, `trailingComma: all`. Alle neuen Dateien müssen compliant sein.
3. **Test-Pattern** — Vitest + jsdom + @testing-library/react. Tests in `src/__tests__/`. Mock-Pattern für `@supabase/ssr`, `next/headers`, `next/navigation` bereits etabliert.
4. **Verschachtelte `<main>` vermeiden** — Layout stellt `<main>` bereit, Page-Komponenten nutzen `<div>`.
5. **Keine `index.ts` Barrel-Exports** — Direkte Imports auf spezifische Dateien.
6. **Non-null Assertions für env vars** — Akzeptiert (ESLint Warnings). App crasht früh wenn Env fehlt.
7. **ActionResult<T> Pattern** — Return-Type für Server Actions: `{ data: T, error: null } | { data: null, error: AppError }`. Definiert in `src/types/common.ts`.
8. **Middleware-Architektur** — `src/middleware.ts` nutzt `updateSession()` von `src/lib/supabase/middleware.ts`. Öffentliche Routen werden VOR dem Auth-Check geprüft. `user` Objekt enthält `user_metadata`.
9. **getAuthUser() Helper** — `src/lib/auth/get-user.ts` für Server Components. Nutzt `createServerClient()`.
10. **Client Component Pattern** — `'use client'` am Anfang, `useState` für Loading/Error, `useRouter` für Navigation.

### Architektur-Entscheidung: Dedicated Page vs. Modal

**Gewählt: Dedicated Page `/disclaimer`**

Begründung:
- Middleware-Redirect-Pattern wie bei `/auth/login` (konsistent)
- Saubere Trennung: Layout muss Disclaimer-Status nicht kennen
- Einfacher testbar (eigene Route = eigener Test)
- Rechtlich stärker (eigenständige Seite mit Timestamp)
- Kein Flash-of-Content: User sieht NIE die App bevor Disclaimer bestätigt

Der "Mehr"-Tab öffnet einen **nicht-blockierenden Dialog** (shadcn Dialog) zur erneuten Einsicht.

### Disclaimer-Check in Middleware (KRITISCH — Reihenfolge)

```typescript
// src/middleware.ts — NEUE Reihenfolge:
export async function middleware(request: NextRequest) {
  const { user, supabaseResponse } = await updateSession(request)
  const path = request.nextUrl.pathname

  // 1. Authentifizierte User von Login-Seite wegleiten
  if (path.startsWith('/auth/login') && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // 2. Öffentliche Routen durchlassen
  if (
    path.startsWith('/auth') ||
    path.startsWith('/api') ||
    path.startsWith('/share') ||
    path.startsWith('/~offline')
  ) {
    return supabaseResponse
  }

  // 3. Geschützte Routen: Redirect zu Login wenn kein User
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // 4. NEU: Disclaimer-Check (nach Auth, vor App-Zugriff)
  if (
    !path.startsWith('/disclaimer') &&
    user.user_metadata?.disclaimer_accepted !== true
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/disclaimer'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

**Warum `user.user_metadata` statt DB-Query?**
- `updateSession()` ruft bereits `supabase.auth.getUser()` auf → `user` Objekt enthält `user_metadata`
- Kein zusätzlicher DB-Call in der Middleware (Performance)
- `user_metadata` wird in `acceptDisclaimer()` Server Action gesetzt
- `accounts.disclaimer_accepted_at` ist das Audit-Trail (DB = Source of Truth)

### Hybrid-Storage-Pattern (KRITISCH)

```
┌──────────────────┐     ┌─────────────────────┐
│ user_metadata     │     │ accounts Tabelle     │
│ (JWT/Session)     │     │ (PostgreSQL)          │
├──────────────────┤     ├─────────────────────┤
│ disclaimer_       │     │ disclaimer_           │
│ accepted: true    │  ←  │ accepted_at: timestamp│
│                   │     │                       │
│ Zweck: Schneller  │     │ Zweck: Audit-Trail,   │
│ Middleware-Check   │     │ Source of Truth        │
└──────────────────┘     └─────────────────────┘
```

Die Server Action `acceptDisclaimer()` schreibt **beide**:
1. `accounts.disclaimer_accepted_at` = `new Date().toISOString()`
2. `supabase.auth.updateUser({ data: { disclaimer_accepted: true } })`

### Supabase-Migration

```sql
-- supabase/migrations/00002_disclaimer_acceptance.sql
ALTER TABLE public.accounts
  ADD COLUMN disclaimer_accepted_at TIMESTAMPTZ DEFAULT NULL;

-- Kein Index nötig: Primary Key (id) wird für WHERE-Clause genutzt
-- Bestehende UPDATE-Policy erlaubt bereits Änderungen an eigenen Rows
```

**NICHT** `disclaimer_version` als DB-Spalte — Versionierung ist Post-MVP. Ein einfacher `TIMESTAMPTZ` reicht.

### Server Action Pattern

```typescript
// src/lib/actions/disclaimer-actions.ts
'use server'

import { revalidatePath } from 'next/cache'

import { createServerClient } from '@/lib/db/client'
import type { ActionResult } from '@/types/common'

export async function acceptDisclaimer(): Promise<
  ActionResult<{ acceptedAt: string }>
> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      data: null,
      error: { error: 'Nicht authentifiziert', code: 'AUTH_REQUIRED' },
    }
  }

  const now = new Date().toISOString()

  // 1. Source of Truth: accounts Tabelle
  const { error: dbError } = await supabase
    .from('accounts')
    .update({ disclaimer_accepted_at: now })
    .eq('id', user.id)

  if (dbError) {
    return {
      data: null,
      error: { error: 'Speichern fehlgeschlagen', code: 'DB_ERROR' },
    }
  }

  // 2. Fast-Check: user_metadata für Middleware
  const { error: metaError } = await supabase.auth.updateUser({
    data: { disclaimer_accepted: true },
  })

  if (metaError) {
    // DB ist aktualisiert, metadata fehlgeschlagen — loggen aber nicht failen
    console.error('user_metadata update failed:', metaError.message)
  }

  revalidatePath('/', 'layout')

  return { data: { acceptedAt: now }, error: null }
}
```

### Disclaimer-Seite (Vollbild, Blocking)

```typescript
// src/app/disclaimer/page.tsx
'use client'

import { useState } from 'react'

import { useRouter } from 'next/navigation'

import { acceptDisclaimer } from '@/lib/actions/disclaimer-actions'
import {
  DISCLAIMER_SECTIONS,
  DISCLAIMER_TITLE,
} from '@/lib/constants/disclaimer'

export default function DisclaimerPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const router = useRouter()

  const handleAccept = async () => {
    setIsSubmitting(true)
    setErrorMessage(null)

    const result = await acceptDisclaimer()

    if (result.error) {
      setErrorMessage(result.error.error)
      setIsSubmitting(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div
      data-theme="patient"
      className="flex min-h-dvh flex-col bg-background px-4 py-8"
    >
      <div className="mx-auto w-full max-w-lg flex-1">
        <h1 className="mb-6 text-2xl font-semibold text-foreground">
          {DISCLAIMER_TITLE}
        </h1>

        <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          {DISCLAIMER_SECTIONS.map((section) => (
            <section key={section.heading}>
              <h2 className="mb-1 font-medium text-foreground">
                {section.heading}
              </h2>
              <p>{section.content}</p>
            </section>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-6 w-full max-w-lg">
        {errorMessage && (
          <p className="mb-3 text-center text-sm text-destructive">
            {errorMessage}
          </p>
        )}
        <button
          onClick={handleAccept}
          disabled={isSubmitting}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting
            ? 'Wird gespeichert...'
            : 'Ich habe den Hinweis gelesen und verstanden'}
        </button>
      </div>
    </div>
  )
}
```

### Mehr-Seite mit Disclaimer-Dialog

```typescript
// src/app/(app)/more/page.tsx
'use client'

import { useState } from 'react'

import { ChevronRight, FileText, Trash2 } from 'lucide-react'

import { DisclaimerContent } from '@/components/disclaimer/disclaimer-content'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function MorePage() {
  const [disclaimerOpen, setDisclaimerOpen] = useState(false)

  return (
    <div className="px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold text-foreground">Mehr</h1>

      {/* Rechtliches */}
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Rechtliches
        </h2>
        <div className="divide-y divide-border rounded-xl bg-card">
          <button
            onClick={() => setDisclaimerOpen(true)}
            className="flex min-h-11 w-full items-center justify-between px-4 py-3 text-left"
          >
            <span className="flex items-center gap-3">
              <FileText className="size-5 text-muted-foreground" />
              <span className="text-sm">Disclaimer anzeigen</span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>
        </div>
      </section>

      {/* Account */}
      <section>
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Account
        </h2>
        <div className="divide-y divide-border rounded-xl bg-card">
          <button
            disabled
            className="flex min-h-11 w-full items-center justify-between px-4 py-3 text-left opacity-50"
          >
            <span className="flex items-center gap-3">
              <Trash2 className="size-5 text-destructive" />
              <span className="text-sm text-destructive">Account löschen</span>
            </span>
            <span className="text-xs text-muted-foreground">Kommt bald</span>
          </button>
        </div>
      </section>

      {/* Disclaimer Dialog */}
      <Dialog open={disclaimerOpen} onOpenChange={setDisclaimerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disclaimer</DialogTitle>
          </DialogHeader>
          <DisclaimerContent />
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

### Wiederverwendbare Disclaimer-Content Komponente

```typescript
// src/components/disclaimer/disclaimer-content.tsx
import {
  DISCLAIMER_SECTIONS,
} from '@/lib/constants/disclaimer'

export function DisclaimerContent() {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
      {DISCLAIMER_SECTIONS.map((section) => (
        <section key={section.heading}>
          <h2 className="mb-1 font-medium text-foreground">
            {section.heading}
          </h2>
          <p>{section.content}</p>
        </section>
      ))}
    </div>
  )
}
```

### Disclaimer-Text Constant

```typescript
// src/lib/constants/disclaimer.ts
export const DISCLAIMER_VERSION = '1.0'

export const DISCLAIMER_TITLE = 'Wichtiger Hinweis'

export const DISCLAIMER_SECTIONS = [
  {
    heading: 'Kein Medizinprodukt',
    content:
      'Diese App ist kein Medizinprodukt im Sinne der EU-Medizinprodukteverordnung (MDR 2017/745) und kein zugelassenes Hilfsmittel.',
  },
  {
    heading: 'Kein Ersatz für ärztliche Beratung',
    content:
      'Die in dieser App erfassten Informationen dienen ausschliesslich der persönlichen Dokumentation von Symptomen. Sie ersetzen in keinem Fall eine professionelle medizinische Beratung, Diagnose oder Behandlung durch qualifiziertes Fachpersonal.',
  },
  {
    heading: 'Keine Diagnose oder Therapieempfehlung',
    content:
      'Diese App stellt keine Diagnosen, gibt keine Therapieempfehlungen und trifft keine medizinischen Entscheidungen. Wende dich bei gesundheitlichen Fragen oder Beschwerden immer an deine Ärztin oder deinen Arzt.',
  },
  {
    heading: 'Verarbeitung von Gesundheitsdaten',
    content:
      'Diese App verarbeitet Gesundheitsdaten, die gemäss der EU-Datenschutz-Grundverordnung (DSGVO, Art. 9) und dem Schweizer Datenschutzgesetz (nDSG) als besonders schützenswert gelten. Deine Daten werden verschlüsselt übertragen und gespeichert.',
  },
  {
    heading: 'Eigenverantwortung',
    content:
      'Die Nutzung dieser App erfolgt auf eigene Verantwortung. Der Anbieter übernimmt keine Haftung für Entscheidungen, die auf Grundlage der in der App erfassten oder dargestellten Informationen getroffen werden.',
  },
] as const
```

### shadcn/ui Dialog-Komponente

Die Dialog-Komponente (`src/components/ui/dialog.tsx`) ist bereits installiert (Story 1.2 shadcn-Init). Falls NICHT vorhanden:
```bash
npx shadcn@latest add dialog
```

Prüfe ob `src/components/ui/dialog.tsx` existiert. Falls ja, nutzen. Falls nein, hinzufügen.

### Anti-Patterns (VERMEIDEN)

- **NICHT** `user_metadata` als einzige Quelle verwenden — DB-Tabelle ist Source of Truth, `user_metadata` ist Cache für schnellen Middleware-Check
- **NICHT** `getSession()` im Server verwenden — nur `getUser()` (Supabase Security Best Practice)
- **NICHT** `middleware.ts` zu `proxy.ts` umbenennen — Migration ist separat (funktioniert noch in Next.js 16)
- **NICHT** Scroll-to-Bottom-Gate implementieren — nicht in ACs gefordert, Post-MVP Enhancement
- **NICHT** Disclaimer als Modal in `(app)/layout.tsx` — Dedicated Page ist sauberer (Middleware-Redirect-Pattern)
- **NICHT** `<main>` in der Disclaimer-Seite verwenden — liegt AUSSERHALB des `(app)/` Layouts, kein verschachteltes `<main>`
- **NICHT** Account-Löschung implementieren — nur Platzhalter (Story 1.7)
- **NICHT** `supabase.auth.admin.updateUserById()` verwenden — `auth.updateUser()` reicht (setzt eigenen user_metadata)
- **NICHT** Zod-Validation für `acceptDisclaimer()` — Funktion hat keine Input-Parameter, nur Auth-Check nötig

### Bestehende Dateien die modifiziert werden

- `src/middleware.ts` — Disclaimer-Check hinzufügen, `/disclaimer` Route
- `src/app/(app)/more/page.tsx` — Komplett neu implementiert (war nur Placeholder)

### Neue Dateien

- `supabase/migrations/00002_disclaimer_acceptance.sql` — DB-Migration
- `src/lib/constants/disclaimer.ts` — Disclaimer-Text als Constant
- `src/lib/actions/disclaimer-actions.ts` — acceptDisclaimer() Server Action
- `src/app/disclaimer/page.tsx` — Blocking Disclaimer-Seite
- `src/components/disclaimer/disclaimer-content.tsx` — Wiederverwendbare Disclaimer-Anzeige
- `src/__tests__/disclaimer-actions.test.ts` — Server Action Tests
- `src/__tests__/disclaimer-page.test.tsx` — Disclaimer-Seite Tests
- `src/__tests__/more-page.test.tsx` — Mehr-Seite Tests

### Project Structure Notes

- `/disclaimer` liegt AUSSERHALB von `(app)/` Route Group — kein Bottom-Tab-Bar, kein Auth-Layout
- `/disclaimer` ist geschützt (Auth-Check in Middleware) aber KEIN Disclaimer-Check (Bypass)
- `(app)/more/page.tsx` liegt INNERHALB von `(app)/` — hat Bottom-Tab-Bar und Patient-Theme
- `DisclaimerContent` Komponente wird in beiden Kontexten wiederverwendet

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Story 1.6: Disclaimer-Anzeige und Mehr-Seite, FR41]
- [Source: _bmad-output/planning-artifacts/architecture.md — ActionResult<T> Pattern, Server Actions]
- [Source: _bmad-output/planning-artifacts/architecture.md — Middleware-Architektur, Öffentliche Routen]
- [Source: _bmad-output/planning-artifacts/architecture.md — accounts-Tabelle, RLS-Policies]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Onboarding: Apple ID → Disclaimer → Erfassungsmodus]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Mehr-Tab: Zahnrad-Icon, Einstellungen, Account]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Touch-Targets min. 44px, Patient-Theme Farben]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Typography: Inter, Skala xs-2xl]
- [Source: _bmad-output/implementation-artifacts/1-5-pwa-setup.md — Middleware-Pattern, Build-Verifikation]
- [Source: _bmad-output/implementation-artifacts/1-4-apple-id-authentifizierung.md — Auth-Flow, getAuthUser(), signInWithOAuth]
- [Source: _bmad-output/implementation-artifacts/1-3-supabase-integration.md — Client-Factories, accounts-Tabelle, RLS]
- [Source: supabase/migrations/00001_initial_schema.sql — accounts-Tabelle, Trigger, Policies]
- [Source: Supabase Docs — auth.updateUser() für user_metadata]
- [Source: DSGVO Art. 9 — Verarbeitung besonderer Kategorien personenbezogener Daten]
- [Source: EU MDR 2017/745 — Medizinprodukteverordnung]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- ESLint: 0 Errors, 9 Warnings (bestehende non-null assertions aus Story 1.3/1.4)
- TypeScript: `disclaimer_accepted_at` nicht in DB-Typen — behoben durch Erweiterung von `src/types/database.ts`
- Build: Next.js 16 Webpack-Build erfolgreich. `/disclaimer` Route statisch gerendert. Middleware-Deprecation-Warnung bleibt.
- Tests: 58 total (13 neue: 4 Disclaimer-Actions, 3 Disclaimer-Page, 4 More-Page, 2 Middleware), alle grün

### Completion Notes List
- Supabase-Migration `00002_disclaimer_acceptance.sql` — `disclaimer_accepted_at` Spalte auf `accounts`
- Disclaimer-Text als Constant in `src/lib/constants/disclaimer.ts` — 5 Abschnitte (MDR, Beratung, Diagnose, DSGVO, Eigenverantwortung)
- Server Action `acceptDisclaimer()` — Hybrid-Storage: DB (Audit) + user_metadata (Fast-Check)
- Blocking Disclaimer-Seite unter `/disclaimer` — Patient-Theme, Vollbild, Accept-Button
- Middleware erweitert: Disclaimer-Check nach Auth-Check, `/disclaimer` Route durchgelassen
- Mehr-Seite komplett implementiert: Disclaimer-Dialog (shadcn), Account-Löschen-Platzhalter (disabled)
- Wiederverwendbare `DisclaimerContent` Komponente für Disclaimer-Seite und Mehr-Seite Dialog
- DB-Typen (`src/types/database.ts`) um `disclaimer_accepted_at` erweitert

### File List
- `supabase/migrations/00002_disclaimer_acceptance.sql` — DB-Migration
- `src/lib/constants/disclaimer.ts` — Disclaimer-Text Constants
- `src/lib/actions/disclaimer-actions.ts` — acceptDisclaimer() Server Action
- `src/app/disclaimer/page.tsx` — Blocking Disclaimer-Seite (Client Component)
- `src/components/disclaimer/disclaimer-content.tsx` — Wiederverwendbare Disclaimer-Anzeige
- `src/app/(app)/more/page.tsx` — Mehr-Seite (komplett neu, Client Component)
- `src/middleware.ts` — Disclaimer-Check hinzugefügt
- `src/types/database.ts` — disclaimer_accepted_at Spalte ergänzt
- `src/__tests__/disclaimer-actions.test.ts` — 4 Server Action Tests
- `src/__tests__/disclaimer-page.test.tsx` — 3 Disclaimer-Seite Tests
- `src/__tests__/more-page.test.tsx` — 4 Mehr-Seite Tests
- `src/__tests__/middleware.test.ts` — 2 neue Middleware Tests (Disclaimer-Redirect, /disclaimer durchlassen)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — Sprint-Tracking
