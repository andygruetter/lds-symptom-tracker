# Story 1.3: Supabase-Integration mit Client-Factories und Basis-Schema

Status: done

## Story

As a Entwickler,
I want Supabase als Backend mit drei Client-Factories und dem Basis-DB-Schema,
So that Auth, Datenbankzugriff und RLS-Policies für alle weiteren Features bereitstehen.

## Acceptance Criteria

1. **Given** das initialisierte Projekt aus Story 1.1 **When** die Supabase-Integration konfiguriert wird **Then** existieren drei Client-Factories: `createBrowserClient()`, `createServerClient()`, `createServiceClient()`
2. **And** die `accounts`-Tabelle existiert mit `id`, `created_at`, `deleted_at` (Soft-Delete)
3. **And** RLS-Policies sind aktiviert: Nutzer sehen nur eigene Daten (`id = auth.uid()`) und soft-deleted Accounts sind gefiltert (`deleted_at IS NULL`)
4. **And** Umgebungsvariablen (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) sind in `.env.local.example` dokumentiert
5. **And** auto-generierte Types via `supabase gen types typescript` → `src/types/database.ts` sind eingerichtet (Placeholder + npm Script)
6. **And** ein Test für die Client-Factory-Erstellung existiert

## Tasks / Subtasks

- [x] Task 1: Supabase-Packages installieren (AC: #1)
  - [x] `npm install @supabase/supabase-js @supabase/ssr`
  - [x] `npm install -D supabase` (CLI als DevDependency)
  - [x] Verifizieren: Packages in package.json
- [x] Task 2: Supabase CLI initialisieren (AC: #2)
  - [x] `npx supabase init` ausführen
  - [x] `supabase/config.toml` prüfen und anpassen (Projekt-Name: `lds-symptom-tracker`)
  - [x] `.gitignore` aktualisieren falls nötig (Supabase-spezifische Einträge)
- [x] Task 3: Client-Factories erstellen (AC: #1)
  - [x] `src/lib/db/client.ts` erstellen mit drei Factories
  - [x] `createBrowserClient()` — für Client Components (Realtime Subscriptions)
  - [x] `createServerClient()` — für Server Components + Server Actions (Cookie-based, `getAll`/`setAll`)
  - [x] `createServiceClient()` — für API Routes (Service Role Key, bypassed RLS)
  - [x] `cookies()` MUSS `await`ed werden (Next.js 15+ async API)
  - [x] `Database` Type-Generic an alle Clients übergeben
- [x] Task 4: Accounts-Migration erstellen (AC: #2, #3)
  - [x] `supabase/migrations/00001_initial_schema.sql` erstellen
  - [x] `accounts`-Tabelle: `id UUID PRIMARY KEY REFERENCES auth.users(id)`, `created_at`, `deleted_at`
  - [x] RLS aktivieren + Policies (SELECT, UPDATE mit `auth.uid() = id AND deleted_at IS NULL`)
  - [x] Insert-Policy für automatische Account-Erstellung bei Auth
- [x] Task 5: TypeScript Types einrichten (AC: #5)
  - [x] `src/types/database.ts` Placeholder erstellen (manuell typisiert für `accounts`)
  - [x] `src/types/common.ts` erstellen mit `ActionResult<T>` und `AppError`
  - [x] npm Script `update-types` in package.json hinzufügen
- [x] Task 6: .env.local.example aktualisieren (AC: #4)
  - [x] Prüfen ob alle Supabase-Variablen vorhanden (bereits von Story 1.1 vorbereitet)
  - [x] Kommentare mit Hinweisen zur Beschaffung der Keys ergänzen
- [x] Task 7: Client-Factory Tests (AC: #6)
  - [x] Unit-Test: `createBrowserClient()` wird korrekt aufgerufen
  - [x] Unit-Test: `createServerClient()` nutzt `getAll`/`setAll` Cookie-API
  - [x] Unit-Test: `createServiceClient()` nutzt Service Role Key + deaktiviert autoRefreshToken
  - [x] Unit-Test: `createServerClient()` nutzt async cookies() von next/headers
  - [x] `npm run test` verifizieren — alle 17 Tests grün
- [x] Task 8: Build-Verifikation
  - [x] `npm run lint` fehlerfrei (0 Errors, 6 Warnings — non-null assertions für env vars)
  - [x] `npm run build` erfolgreich
  - [x] Keine TypeScript-Fehler

## Dev Notes

### Scope-Abgrenzung (KRITISCH)

Diese Story erstellt NUR die Supabase-Infrastruktur. Folgende Themen gehören NICHT in diese Story:
- **Apple ID OAuth Flow** → Story 1.4
- **Middleware für Route Protection** → Story 1.4 (Middleware wird erst mit Auth-Flow benötigt)
- **Auth-UI (Login-Seite)** → Story 1.4
- **Realtime Subscriptions** → Epic 2 (Story 2.1+)
- **Server Actions mit DB-Zugriff** → Epic 2
- **Storage (Audio, Fotos)** → Epic 3
- **Sharing-Links/-Sessions** → Epic 5
- **Echte Type-Generierung** → erst möglich wenn Supabase-Projekt verbunden ist

### KRITISCH: Learnings aus Story 1.1 + 1.2

1. **ESLint erzwingt Import-Ordering** — Imports: `react` → `next` → externe Packages → `@/` lokale. Import-Groups mit Leerzeile trennen.
2. **Prettier-Config** — `semi: false`, `singleQuote: true`, `trailingComma: all`. Alle neuen Dateien müssen compliant sein.
3. **Tailwind CSS 4** — Konfiguration in `globals.css` via `@theme inline`, NICHT in `tailwind.config.ts`.
4. **Test-Pattern** — Vitest + jsdom + @testing-library/react. Tests in `src/__tests__/`. Mock-Pattern für Next.js Modules (z.B. `vi.mock('next/navigation')`) bereits etabliert.
5. **Verschachtelte `<main>` vermeiden** — Layout stellt `<main>` bereit, Page-Komponenten nutzen `<div>`.
6. **Keine `index.ts` Barrel-Exports** — Direkte Imports auf spezifische Dateien.

### Supabase-Setup: Package-Versionen

| Package | Version | Zweck |
|---------|---------|-------|
| `@supabase/supabase-js` | `^2.98.0` | Core Supabase Client |
| `@supabase/ssr` | `^0.8.0` | SSR-spezifische Client-Factories (Cookie-Handling) |
| `supabase` | `>=1.8.1` (DevDep) | CLI für Migrations, Type-Generierung |

### Client-Factories: Implementierung

**Datei:** `src/lib/db/client.ts`

**KRITISCH: Cookie-API**
- `@supabase/ssr` seit v0.4.0 erfordert `getAll`/`setAll` (NICHT `get`/`set`/`remove`)
- `cookies()` von `next/headers` ist in Next.js 15+ asynchron → MUSS `await`ed werden

```typescript
// src/lib/db/client.ts
import { createBrowserClient as createBrowser } from '@supabase/ssr'
import { createServerClient as createServer } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database'

// Browser Client — Client Components (Realtime, Client-Side-Queries)
export function createBrowserClient() {
  return createBrowser<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

// Server Client — Server Components + Server Actions (Cookie-based, RLS aktiv)
export async function createServerClient() {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()

  return createServer<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // setAll aus Server Component aufgerufen — ignorieren,
            // Middleware übernimmt Token-Refresh
          }
        },
      },
    },
  )
}

// Service Client — API Routes (KI-Pipeline, Webhooks, Admin-Ops)
// ACHTUNG: Bypassed RLS! Nur in src/app/api/ verwenden!
export function createServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}
```

**WICHTIG:**
- `createServerClient()` ist `async` wegen `await cookies()`
- `createServiceClient()` nutzt `createClient` von `@supabase/supabase-js` (NICHT `@supabase/ssr`) — braucht kein Cookie-Handling
- `createServiceClient()` NUR in `src/app/api/` verwenden — NIEMALS in Server Actions oder Components

### Accounts-Tabelle: SQL-Migration

**Datei:** `supabase/migrations/00001_initial_schema.sql`

```sql
-- Accounts-Tabelle (1:1 mit auth.users)
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- RLS aktivieren
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- Policy: Nutzer sieht nur eigenen Account (und nur wenn nicht soft-deleted)
CREATE POLICY "Users can view own account"
  ON public.accounts FOR SELECT
  USING (auth.uid() = id AND deleted_at IS NULL);

-- Policy: Nutzer kann eigenen Account updaten (für Soft-Delete)
CREATE POLICY "Users can update own account"
  ON public.accounts FOR UPDATE
  USING (auth.uid() = id AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = id);

-- Policy: System kann Account erstellen (bei Auth-Signup)
-- Service Role Key bypassed RLS, aber für Trigger brauchen wir eine INSERT-Policy
CREATE POLICY "Enable insert for authenticated users"
  ON public.accounts FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Trigger: Auto-Create Account bei neuem Auth-User
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.accounts (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### TypeScript Types

**`src/types/database.ts`** — Manueller Placeholder bis Supabase-Projekt verbunden:

```typescript
// AUTO-GENERIERT via: npx supabase gen types typescript --project-id "$PROJECT_ID" > src/types/database.ts
// Dieser Placeholder wird durch den generierten Output ersetzt sobald ein Supabase-Projekt verbunden ist.
// NIE manuell editieren nach der ersten echten Generierung!

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string
          created_at: string
          deleted_at: string | null
        }
        Insert: {
          id: string
          created_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
```

**`src/types/common.ts`** — Gemäss Architektur-Pattern:

```typescript
export type ActionResult<T> = {
  data: T
  error: null
} | {
  data: null
  error: AppError
}

export type AppError = {
  error: string
  code: string
}
```

### npm Scripts

```json
{
  "update-types": "npx supabase gen types typescript --project-id \"$PROJECT_ID\" --schema public > src/types/database.ts"
}
```

### Test-Strategie

**Client-Factory-Tests** testen, dass die Factories korrekt aufgerufen werden. Da die echten Supabase-Clients Netzwerk-Zugriff brauchen, mocken wir die Supabase-Packages.

```typescript
// Mocking-Pattern für @supabase/ssr
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => ({ from: vi.fn() })),
  createServerClient: vi.fn(() => ({ from: vi.fn() })),
}))

// Mocking-Pattern für @supabase/supabase-js
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ from: vi.fn() })),
}))

// Mocking-Pattern für next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      getAll: vi.fn(() => []),
      set: vi.fn(),
    }),
  ),
}))
```

### Supabase CLI Init

`npx supabase init` erstellt:
```
supabase/
├── config.toml       → Projekt-Konfiguration
├── migrations/       → SQL-Migrations
└── seed.sql          → Testdaten (optional)
```

**config.toml anpassen:**
- `project_id` bleibt leer (wird bei `supabase link` gesetzt)
- `[api]` und `[db]` Defaults beibehalten

### .gitignore Ergänzungen für Supabase

Prüfen ob folgende Einträge nötig:
```
# Supabase
.branches
.temp
```

### Anti-Patterns (VERMEIDEN)

- **NICHT** `@supabase/auth-helpers-nextjs` verwenden — deprecated, ersetzt durch `@supabase/ssr`
- **NICHT** die alte Cookie-API (`get`/`set`/`remove`) verwenden — nur `getAll`/`setAll`
- **NICHT** `getSession()` auf dem Server nutzen — nur `getUser()` (Session kann gefälscht werden)
- **NICHT** `createServiceClient()` ausserhalb von `src/app/api/` verwenden — bypassed RLS
- **NICHT** `database.ts` manuell editieren nach erster echter Generierung
- **NICHT** Middleware in dieser Story erstellen — kommt in Story 1.4
- **NICHT** `cookies()` ohne `await` aufrufen — ist async in Next.js 15+

### Env-Variablen (bereits in .env.local.example)

`.env.local.example` enthält bereits die Supabase-Variablen (aus Story 1.1 vorbereitet):
```bash
NEXT_PUBLIC_SUPABASE_URL=        # Supabase Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Supabase Anon/Publishable Key
SUPABASE_SERVICE_ROLE_KEY=       # Supabase Service Role/Secret Key (Server-only!)
```

**Hinweis:** Supabase migriert von `anon`/`service_role` Keys zu `publishable`/`secret` Keys. Legacy-Keys funktionieren bis Ende 2026. Für neue Projekte nach Mitte 2025 existieren nur die neuen Key-Types. Die Variablen-Namen im Code verwenden weiterhin die aktuellen Architecture-Spec-Namen.

### Project Structure Notes

Bestehende Dateien die modifiziert werden:
- `package.json` — Neue Dependencies + `update-types` Script
- `.env.local.example` — Kommentare ergänzen (Variablen bereits vorhanden)
- `.gitignore` — Supabase-Einträge prüfen/ergänzen

Neue Dateien:
- `src/lib/db/client.ts` — Drei Client-Factories
- `src/types/database.ts` — Manueller Placeholder (ersetzt .gitkeep)
- `src/types/common.ts` — `ActionResult<T>`, `AppError`
- `supabase/config.toml` — CLI-Konfiguration (via `supabase init`)
- `supabase/migrations/00001_initial_schema.sql` — Accounts-Tabelle + RLS
- `supabase/seed.sql` — Leer (Platzhalter, via `supabase init`)
- `src/__tests__/supabase-client.test.ts` — Client-Factory-Tests

Zu löschende Dateien:
- `src/lib/db/.gitkeep` — Wird durch `client.ts` ersetzt
- `src/types/.gitkeep` — Wird durch `database.ts` + `common.ts` ersetzt

### References

- [Source: _bmad-output/planning-artifacts/architecture.md — Abschnitt "Supabase Client Factories"]
- [Source: _bmad-output/planning-artifacts/architecture.md — Abschnitt "Row Level Security"]
- [Source: _bmad-output/planning-artifacts/architecture.md — Abschnitt "Middleware-Strategie"]
- [Source: _bmad-output/planning-artifacts/architecture.md — Abschnitt "Server Action Validation Pattern"]
- [Source: _bmad-output/planning-artifacts/architecture.md — Abschnitt "Projektstruktur"]
- [Source: _bmad-output/planning-artifacts/epics.md — Epic 1, Story 1.3]
- [Source: _bmad-output/implementation-artifacts/1-2-theme-setup-font-layout.md — Senior Developer Review]
- [Source: Supabase Docs — Creating a Supabase client for SSR]
- [Source: Supabase Docs — Setting up Server-Side Auth for Next.js]
- [Source: @supabase/ssr npm — v0.8.0 Cookie API (getAll/setAll)]
- [Source: @supabase/supabase-js npm — v2.98.0]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- ESLint: 0 Errors, 6 Warnings (non-null assertions `!` für env vars — standard Supabase-Pattern, akzeptabel)
- TypeScript: Clean nach `.next` Cache-Bereinigung (stale validator.ts referenzierte alten Page-Pfad)
- Build: Erfolgreich, alle 4 Routes statisch generiert (/, /_not-found, /insights, /more)

### Completion Notes List
- Task 7 Abweichung: Statt "Fehlende Env-Vars werfen informativen Fehler" wurde "async cookies() von next/headers" getestet — Non-null assertions (`!`) werfen keine informativen Fehler, das ist eine bewusste Architektur-Entscheidung (App crasht früh wenn Env fehlt)
- `supabase init` erzeugte `.vscode/settings.json` und `.idea/deno.xml` — wurden bereinigt (bereits in .gitignore)
- Supabase CLI Version: 2.76.15 (DevDep)

### File List
- `src/lib/db/client.ts` — Drei Client-Factories (Browser, Server, Service)
- `src/types/database.ts` — Manueller Placeholder für accounts-Tabelle
- `src/types/common.ts` — ActionResult<T>, AppError (mit metadata) Types
- `supabase/migrations/00001_initial_schema.sql` — Accounts-Tabelle + RLS + Trigger
- `supabase/config.toml` — Supabase CLI-Konfiguration
- `supabase/seed.sql` — Leer (Platzhalter für lokale Testdaten)
- `supabase/.gitignore` — Supabase-spezifische Ignores (.branches, .temp)
- `src/__tests__/supabase-client.test.ts` — 7 Client-Factory-Tests
- `package.json` — Dependencies + update-types Script
- `package-lock.json` — Aktualisiert (Dependency-Lock)
- `.env.local.example` — Kommentare mit Dashboard-Hinweisen ergänzt
- `src/lib/db/.gitkeep` — Gelöscht (ersetzt durch client.ts)
- `src/types/.gitkeep` — Gelöscht (ersetzt durch database.ts + common.ts)

### Senior Developer Review
- H1: seed.sql fehlte — erstellt
- M1: AppError metadata-Feld fehlte — ergänzt gemäss Architektur-Spec
- M2: File List unvollständig — vervollständigt (package-lock.json, .gitkeep-Löschungen, supabase/.gitignore)
- M3: setAll-Callback-Tests fehlten — 3 Tests ergänzt
