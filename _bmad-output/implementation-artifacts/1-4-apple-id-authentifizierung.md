# Story 1.4: Apple ID Authentifizierung mit sofortigem Zugang

Status: done

## Story

As a Patient,
I want mich mit meiner Apple ID registrieren und anmelden können und sofort Symptome erfassen,
So that ich ohne Formulare oder Onboarding direkt loslegen kann.

## Acceptance Criteria

1. **Given** ein nicht-authentifizierter Nutzer öffnet die App **When** der Nutzer auf "Mit Apple ID anmelden" klickt **Then** wird der Apple OAuth2/OIDC-Flow gestartet (NFR20)
2. **And** nach erfolgreicher Authentifizierung wird automatisch ein Account in der `accounts`-Tabelle erstellt
3. **And** es werden keine personenidentifizierenden Daten strukturiert gespeichert — nur die Account-ID (FR36, FR37)
4. **And** der Nutzer wird direkt zum Erfassungs-Tab weitergeleitet (FR35)
5. **And** kein Onboarding-Formular oder Pflicht-Setup wird angezeigt
6. **And** die Middleware schützt `/(app)`-Routen — unauthentifizierte Nutzer werden zur Login-Seite umgeleitet

## Tasks / Subtasks

- [x] Task 1: Middleware mit Supabase-Client erstellen (AC: #6)
  - [x] `src/lib/supabase/middleware.ts` erstellen — Middleware-Helper mit `updateSession()`
  - [x] `src/middleware.ts` erstellen — Route Protection + Token-Refresh
  - [x] Matcher konfigurieren: alle Routen ausser `_next/static`, `_next/image`, `favicon.ico`, Bilder
  - [x] Patient-Routen schützen: `/(app)/*` → Redirect zu `/auth/login` wenn kein User
  - [x] Öffentliche Routen durchlassen: `/auth/*`, `/api/*`, `/share/*`
  - [x] Token-Refresh via `supabase.auth.getUser()` in Middleware
- [x] Task 2: Auth-Callback-Route erstellen (AC: #1, #2)
  - [x] `src/app/auth/callback/route.ts` erstellen
  - [x] `exchangeCodeForSession(code)` implementieren (PKCE-Flow)
  - [x] Erfolgs-Redirect zu `/` (Erfassungs-Tab)
  - [x] Fehler-Redirect zu `/auth/login?error=callback`
  - [x] `x-forwarded-host` Header für Produktion hinter Proxy berücksichtigen
  - [x] Sicherheits-Check: `next`-Parameter darf nur relative Pfade sein
- [x] Task 3: Login-Seite erstellen (AC: #1, #5)
  - [x] `src/app/auth/login/page.tsx` erstellen — Server Component
  - [x] Apple Sign-In Button als Client Component: `src/components/auth/apple-sign-in-button.tsx`
  - [x] `signInWithOAuth({ provider: 'apple' })` mit `redirectTo: /auth/callback`
  - [x] Patient-Theme (`data-theme="patient"`) auf Login-Layout
  - [x] Minimale UI: App-Name + Apple-Button, kein Formular, kein Onboarding
  - [x] Fehlermeldung inline anzeigen bei `?error=callback` Query-Parameter
- [x] Task 4: Sign-Out Server Action erstellen (AC: #1)
  - [x] `src/lib/actions/auth-actions.ts` erstellen
  - [x] `signOut()` Server Action mit `createServerClient()`
  - [x] Return-Type `ActionResult<null>` gemäss Pattern
  - [x] Redirect zu `/auth/login` nach Sign-Out
- [x] Task 5: Authenticated-User-Check für Server Components (AC: #6)
  - [x] `src/lib/auth/get-user.ts` erstellen — Helper-Funktion
  - [x] `getAuthUser()` nutzt `createServerClient()` + `supabase.auth.getUser()`
  - [x] Gibt `User | null` zurück (für Server Components)
- [x] Task 6: Supabase config.toml Apple Provider vorbereiten (AC: #1)
  - [x] `[auth.external.apple]` in `supabase/config.toml` aktivieren
  - [x] `secret = "env(SUPABASE_AUTH_EXTERNAL_APPLE_SECRET)"` konfigurieren
  - [x] `.env.local.example` um Apple-spezifische Vars ergänzen
- [x] Task 7: Tests (AC: #1-#6)
  - [x] Unit-Test: Middleware leitet unauthentifizierte Nutzer um
  - [x] Unit-Test: Middleware lässt authentifizierte Nutzer durch
  - [x] Unit-Test: Middleware lässt `/auth/*` Routen durch
  - [x] Unit-Test: Auth-Callback tauscht Code gegen Session
  - [x] Unit-Test: Sign-Out Action ruft `supabase.auth.signOut()` auf
  - [x] Unit-Test: Middleware lässt `/api/*` und `/share/*` durch
  - [x] Unit-Test: Callback validiert next-Parameter (nur relative Pfade)
  - [x] Unit-Test: Callback mit Fehler bei Exchange
  - [x] Unit-Test: Sign-Out gibt AppError bei Fehler zurück
  - [x] `npm run test` verifizieren — alle 31 Tests grün
- [x] Task 8: Build-Verifikation
  - [x] `npm run lint` fehlerfrei (0 Errors, 8 Warnings — non-null assertions)
  - [x] `npm run build` erfolgreich (6 Routes: 4 static, 2 dynamic + middleware)
  - [x] Keine TypeScript-Fehler

## Dev Notes

### Scope-Abgrenzung (KRITISCH)

Diese Story erstellt die Auth-Infrastruktur. Folgende Themen gehören NICHT in diese Story:
- **Arzt-Sharing-Auth (Sharing-Cookie)** → Epic 5 (wird in Middleware-Kommentaren als TODO markiert)
- **PWA-Setup** → Story 1.5 (PWA hat Probleme mit OAuth Redirects — nicht hier lösen)
- **Disclaimer-Anzeige** → Story 1.6
- **Account-Löschung** → Story 1.7
- **Realtime Subscriptions** → Epic 2
- **Apple JS SDK (Native Sign-In)** → Nicht nötig, Standard-OAuth reicht

### KRITISCH: Learnings aus Story 1.1 - 1.3

1. **ESLint erzwingt Import-Ordering** — Imports: `react` → `next` → externe Packages → `@/` lokale. Import-Groups mit Leerzeile trennen.
2. **Prettier-Config** — `semi: false`, `singleQuote: true`, `trailingComma: all`. Alle neuen Dateien müssen compliant sein.
3. **Test-Pattern** — Vitest + jsdom + @testing-library/react. Tests in `src/__tests__/`. Mock-Pattern für `@supabase/ssr`, `next/headers` bereits in `supabase-client.test.ts` etabliert.
4. **Verschachtelte `<main>` vermeiden** — Layout stellt `<main>` bereit, Page-Komponenten nutzen `<div>`.
5. **Keine `index.ts` Barrel-Exports** — Direkte Imports auf spezifische Dateien.
6. **Non-null Assertions für env vars** — Akzeptiert (Story 1.3 Pattern). App crasht früh wenn Env fehlt.
7. **ActionResult<T> Pattern** — Return-Type für ALLE Server Actions: `{ data: T, error: null } | { data: null, error: AppError }`

### Middleware-Pattern (KRITISCH — anders als client.ts!)

Die Middleware braucht einen **eigenen** Supabase-Client, der Request- UND Response-Cookies verwaltet. Dies unterscheidet sich vom `createServerClient()` in `client.ts` (der `next/headers` cookies nutzt).

**Warum?** Server Components können keine Cookies schreiben. Die Middleware:
1. Refreshed den Auth Token (durch `getUser()`)
2. Setzt den aktualisierten Token auf dem **Request** (für nachfolgende Server Components)
3. Setzt den aktualisierten Token auf der **Response** (für den Browser)

```typescript
// src/lib/supabase/middleware.ts — Separater Middleware-Helper
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // 1. Cookies auf dem Request setzen (für Server Components)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          // 2. Neues Response-Objekt mit aktualisierten Request-Cookies
          supabaseResponse = NextResponse.next({ request })
          // 3. Cookies auf der Response setzen (für den Browser)
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Token Refresh + User-Check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { user, supabaseResponse }
}
```

```typescript
// src/middleware.ts — Route Protection
import { NextResponse, type NextRequest } from 'next/server'

import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { user, supabaseResponse } = await updateSession(request)
  const path = request.nextUrl.pathname

  // Öffentliche Routen durchlassen
  if (
    path.startsWith('/auth') ||
    path.startsWith('/api') ||
    path.startsWith('/share')
  ) {
    return supabaseResponse
  }

  // Geschützte Routen: Redirect zu Login wenn kein User
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
```

### Auth-Callback-Route (PKCE-Flow)

`@supabase/ssr` nutzt automatisch PKCE. Der Callback tauscht den Auth-Code gegen Tokens:

```typescript
// src/app/auth/callback/route.ts
import { NextResponse } from 'next/server'

import { createServerClient } from '@/lib/db/client'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  let next = searchParams.get('next') ?? '/'

  if (!next.startsWith('/')) {
    next = '/'
  }

  if (code) {
    const supabase = await createServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=callback`)
}
```

### Login-Seite Design (UX-Spec)

**Minimalistisch gemäss UX-Spezifikation:**
- Patient-Theme (warme Farbtöne, `data-theme="patient"`)
- Kein Formular, kein Onboarding-Wizard
- Nur: App-Logo/Name + "Mit Apple ID anmelden" Button
- Fehler-Toast bei fehlgeschlagenem Callback
- Apple Sign-In Button: `signInWithOAuth({ provider: 'apple', options: { redirectTo } })`

**Post-Login:** Direkter Redirect zu `/` (Erfassungs-Tab mit Empty State)

### Apple Sign-In Button (Client Component)

```typescript
// src/components/auth/apple-sign-in-button.tsx
'use client'

import { createBrowserClient } from '@/lib/db/client'

export function AppleSignInButton() {
  const handleSignIn = async () => {
    const supabase = createBrowserClient()
    await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <button onClick={handleSignIn}>
      Mit Apple ID anmelden
    </button>
  )
}
```

**Styling:** Apple HIG erfordert spezifische Button-Styles (schwarzer Hintergrund, Apple-Logo, "Sign in with Apple" Text). Nutze CSS Custom Styles gemäss [Apple Design Resources](https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple).

### Sign-Out Action (Validation Pattern)

```typescript
// src/lib/actions/auth-actions.ts
'use server'

import { redirect } from 'next/navigation'

import { createServerClient } from '@/lib/db/client'
import type { ActionResult } from '@/types/common'

export async function signOut(): Promise<ActionResult<null>> {
  const supabase = await createServerClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    return {
      data: null,
      error: { error: 'Abmeldung fehlgeschlagen', code: 'SIGN_OUT_ERROR' },
    }
  }

  redirect('/auth/login')
}
```

### Auth-User Helper (Server Components)

```typescript
// src/lib/auth/get-user.ts
import { createServerClient } from '@/lib/db/client'

export async function getAuthUser() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}
```

**KRITISCH:** Immer `getUser()` verwenden, NIEMALS `getSession()` auf dem Server (Session kann gefälscht werden).

### Supabase config.toml Apple Setup

```toml
[auth.external.apple]
enabled = true
client_id = ""  # Services ID (nicht App ID!), z.B. "com.example.app.web"
secret = "env(SUPABASE_AUTH_EXTERNAL_APPLE_SECRET)"
redirect_uri = ""
url = ""
skip_nonce_check = false
email_optional = false
```

**Hinweis:** Die tatsächlichen Apple-Credentials werden erst beim Deployment konfiguriert. Lokal bleibt `client_id` leer — der OAuth-Flow funktioniert nur mit einem verbundenen Supabase-Projekt.

### Env-Variablen (zu ergänzen)

```bash
# Apple Sign-In (für Supabase Auth Provider)
# Apple Developer Console → Certificates, Identifiers & Profiles → Keys
SUPABASE_AUTH_EXTERNAL_APPLE_SECRET=  # .p8 Key → JWT Secret (rotiert alle 6 Monate!)
```

### PWA-Warnung (für Story 1.5 relevant)

OAuth-Redirects in PWA Standalone Mode auf iOS sind problematisch:
- iOS öffnet Safari statt in der PWA zu bleiben
- Workaround: `window.location.href` statt `window.open()`
- Detaillierte Lösung in Story 1.5

### getUser() vs getSession() vs getClaims()

| Methode | Wo nutzen | Performance | Sicherheit |
|---------|-----------|-------------|------------|
| `getUser()` | Server Actions, Server Components | Langsam (Netzwerk) | Hoch |
| `getClaims()` | Middleware (optional, schneller) | Schnell (lokal) | Mittel |
| `getSession()` | **NIEMALS auf Server** | — | Unsicher |

Für MVP nutzen wir `getUser()` überall (auch Middleware). `getClaims()` ist eine spätere Optimierung.

### Anti-Patterns (VERMEIDEN)

- **NICHT** `@supabase/auth-helpers-nextjs` verwenden — deprecated
- **NICHT** `getSession()` auf dem Server — nur `getUser()`
- **NICHT** `createServerClient()` aus `client.ts` in der Middleware — eigenen Client mit Request/Response-Cookies erstellen
- **NICHT** Apple-Credentials in Code committen — immer `env()` in config.toml
- **NICHT** `window.open()` für OAuth — `signInWithOAuth()` nutzt automatisch Redirect
- **NICHT** Namen vom Apple-User speichern — FR36/FR37 verbietet personenidentifizierende Daten
- **NICHT** `next`-Parameter ohne Validierung verwenden — Sicherheits-Check auf relative Pfade

### Project Structure Notes

Neue Dateien in dieser Story:
- `src/middleware.ts` — Route Protection + Token-Refresh
- `src/lib/supabase/middleware.ts` — Middleware-Helper mit `updateSession()`
- `src/app/auth/login/page.tsx` — Login-Seite (Server Component)
- `src/app/auth/callback/route.ts` — OAuth Callback Handler
- `src/components/auth/apple-sign-in-button.tsx` — Apple Sign-In Button (Client Component)
- `src/lib/actions/auth-actions.ts` — signOut Server Action
- `src/lib/auth/get-user.ts` — Server-Side User Helper
- `src/__tests__/middleware.test.ts` — Middleware Tests
- `src/__tests__/auth-callback.test.ts` — Callback Tests

Modifizierte Dateien:
- `supabase/config.toml` — Apple Provider aktivieren
- `.env.local.example` — Apple Secret Variable ergänzen

Bestehende Dateien die NICHT modifiziert werden:
- `src/lib/db/client.ts` — Bleibt unverändert (Middleware nutzt eigenen Client)
- `src/app/(app)/layout.tsx` — Bleibt unverändert (Middleware schützt bereits)
- `src/app/layout.tsx` — Bleibt unverändert

### References

- [Source: _bmad-output/planning-artifacts/architecture.md — Abschnitt "Authentication & Security"]
- [Source: _bmad-output/planning-artifacts/architecture.md — Abschnitt "Middleware-Strategie"]
- [Source: _bmad-output/planning-artifacts/architecture.md — Abschnitt "Supabase Client Factories"]
- [Source: _bmad-output/planning-artifacts/architecture.md — Abschnitt "Server Action Validierung"]
- [Source: _bmad-output/planning-artifacts/architecture.md — Abschnitt "Routing-Strategie"]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Journey 3: Onboarding]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Zero-Friction Principle]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Patient-Theme Design Tokens]
- [Source: _bmad-output/planning-artifacts/epics.md — Epic 1, Story 1.4]
- [Source: _bmad-output/implementation-artifacts/1-3-supabase-integration.md — Client-Factories, Cookie-API]
- [Source: Supabase Docs — Setting up Server-Side Auth for Next.js]
- [Source: Supabase Docs — Login with Apple]
- [Source: Supabase Docs — OAuth with PKCE Flow for SSR]
- [Source: Supabase Docs — Creating a Supabase Client for SSR]
- [Source: @supabase/ssr npm — v0.8.0 Middleware Cookie Pattern]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- ESLint: 0 Errors, 8 Warnings (non-null assertions für env vars in client.ts + middleware.ts)
- ESLint auto-fix: Import-Ordering in `middleware.ts` korrigiert (next/server vor @supabase/ssr)
- Build: Next.js 16 Deprecation-Warnung: `middleware` → `proxy` Convention. Middleware funktioniert noch korrekt. Migration zu `proxy` Convention bei nächstem Major-Update.
- Vite-Warnung: Duplicate key "pathname" in Mock behoben mit Object.defineProperty Pattern
- Tests: 32 total (12 neue), alle grün

### Completion Notes List
- Middleware nutzt eigenen Supabase-Client mit Request/Response-Cookies (NICHT createServerClient aus client.ts)
- Login-Seite: Minimalistisch gemäss UX-Spec — App-Name + Apple-Button, kein Formular
- Apple Sign-In Button: schwarzer Hintergrund mit Apple-Logo SVG, Loading-State + Error-State
- Auth-Callback: PKCE-Flow mit exchangeCodeForSession, Security-Check für next-Parameter
- Sign-Out: Server Action mit `Promise<{ data: null; error: AppError }>` (redirect wirft auf Erfolg)
- config.toml: Apple Provider enabled=true mit env() für Secret
- Next.js 16 deprecation: `middleware.ts` wird zu `proxy.ts` — funktioniert aber noch
- Code-Review Fixes: M1 Error-State sichtbar, M2 Auth-User von Login weggeleitet, M3 signOut Return-Type korrigiert

### File List
- `src/middleware.ts` — Route Protection (schützt alle Routen ausser /auth/*, /api/*, /share/*, leitet auth Users von /auth/login weg)
- `src/lib/supabase/middleware.ts` — Middleware-Helper mit updateSession() (eigener Supabase-Client)
- `src/app/auth/login/page.tsx` — Login-Seite (Server Component, Patient-Theme)
- `src/app/auth/callback/route.ts` — OAuth Callback Handler (PKCE exchangeCodeForSession)
- `src/components/auth/apple-sign-in-button.tsx` — Apple Sign-In Button (Client Component, Error-State)
- `src/lib/actions/auth-actions.ts` — signOut Server Action (redirect wirft auf Erfolg, AppError bei Fehler)
- `src/lib/auth/get-user.ts` — getAuthUser() Helper für Server Components
- `src/__tests__/middleware.test.ts` — 6 Middleware-Tests (auth redirect, public routes, auth user redirect)
- `src/__tests__/auth-callback.test.ts` — 6 Tests (callback + sign-out)
- `supabase/config.toml` — Apple Provider enabled
- `.env.local.example` — SUPABASE_AUTH_EXTERNAL_APPLE_SECRET ergänzt
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — Sprint-Tracking
