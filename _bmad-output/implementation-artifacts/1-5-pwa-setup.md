# Story 1.5: PWA-Setup mit Service Worker und Manifest

Status: done

## Story

As a Patient,
I want die App als PWA auf meinem Home-Screen installieren können,
So that ich sie wie eine native App nutzen kann.

## Acceptance Criteria

1. **Given** die laufende App im Browser **When** der Nutzer die App besucht **Then** ist ein Web App Manifest mit Name, Icons und Theme-Color vorhanden
2. **And** Serwist ist konfiguriert mit `sw.ts` in `src/app/`
3. **And** der Service Worker registriert sich erfolgreich
4. **And** die App ist als "installierbar" im Browser erkennbar (Add to Home Screen)
5. **And** Offline-Fallback zeigt eine freundliche Meldung an
6. **And** der Service Worker ist für Push-Notifications vorbereitet (Event-Listener registriert, Push-Handling-Stub vorhanden)

## Tasks / Subtasks

- [x] Task 1: Serwist installieren und next.config.ts konfigurieren (AC: #2, #3)
  - [x] `npm install @serwist/next` (Runtime-Dependency)
  - [x] `npm install -D serwist` (Dev-Dependency für SW-Typen und Worker-Utilities)
  - [x] `next.config.ts` mit `withSerwist()` Wrapper konfigurieren (`swSrc: "src/app/sw.ts"`, `swDest: "public/sw.js"`)
  - [x] Build-Script in `package.json` auf `next build --webpack` ändern (Serwist benötigt Webpack-Plugin)
  - [x] Dev-Script bleibt `next dev --turbopack` (Serwist zeigt Warnung, unterdrücken via `.env`)
  - [x] `.env.local.example` um `SERWIST_SUPPRESS_TURBOPACK_WARNING=1` ergänzen
  - [x] `.gitignore` um `public/sw.js` und `public/serwist-*.js` ergänzen (generierte Dateien)
- [x] Task 2: Web App Manifest erstellen (AC: #1, #4)
  - [x] `src/app/manifest.ts` erstellen mit `MetadataRoute.Manifest` Return-Type
  - [x] Name: "LDS Symptom Tracker", Short Name: "LDS Tracker"
  - [x] `start_url: "/"`
  - [x] `display: "standalone"`
  - [x] `theme_color: "#C06A3C"` (Patient-Theme Primary — Hex, nicht OKLCh)
  - [x] `background_color: "#F5EDE6"` (Patient-Theme Background — Hex)
  - [x] `orientation: "portrait"`
  - [x] Icons: `[{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }, { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }]`
  - [x] Beschreibung: "Symptom-Tracking für Patienten mit seltenen Erkrankungen"
- [x] Task 3: PWA-Icons erstellen (AC: #1)
  - [x] `public/icons/` Verzeichnis erstellen
  - [x] Placeholder-Icons generieren: `icon-192.png` (192x192) und `icon-512.png` (512x512)
  - [x] Einfaches, generiertes SVG-zu-PNG (Terracotta-Kreis mit "LDS" Text) oder einfarbiger Placeholder
  - [x] Apple Touch Icon: `public/icons/apple-touch-icon.png` (180x180)
- [x] Task 4: Service Worker erstellen (AC: #2, #3, #6)
  - [x] `src/app/sw.ts` erstellen
  - [x] Serwist-Instanz mit `precacheEntries: self.__SW_MANIFEST` konfigurieren
  - [x] `skipWaiting: true`, `clientsClaim: true`, `navigationPreload: true`
  - [x] `runtimeCaching: defaultCache` von `@serwist/next/worker`
  - [x] Offline-Fallback-URL konfigurieren: `/~offline`
  - [x] Push-Notification Event-Listener registrieren (Stub):
    - `push` Event: Notification anzeigen mit Payload-Daten
    - `notificationclick` Event: App öffnen / zu URL navigieren
  - [x] `serwist.addEventListeners()` aufrufen
- [x] Task 5: Offline-Fallback-Seite erstellen (AC: #5)
  - [x] `src/app/~offline/page.tsx` erstellen (Serwist-Konvention für Offline-Fallback)
  - [x] Patient-Theme (`data-theme="patient"`)
  - [x] Freundliche Meldung: "Keine Internetverbindung. Bitte überprüfe deine Verbindung und versuche es erneut."
  - [x] Einfaches UI: zentriert, Wifi-Off-Icon (Lucide), Retry-Button
  - [x] Kein Auth-Check nötig (öffentliche Route)
- [x] Task 6: iOS-spezifische Meta-Tags und Safe Areas (AC: #4)
  - [x] `src/app/layout.tsx` erweitern:
    - `<meta name="apple-mobile-web-app-capable" content="yes" />`
    - `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />`
    - `<meta name="apple-mobile-web-app-title" content="LDS Tracker" />`
    - `<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />`
    - `viewport` meta um `viewport-fit=cover` ergänzen (falls nicht vorhanden)
  - [x] `src/app/globals.css` um Safe-Area-Padding erweitern: `env(safe-area-inset-bottom)` für Bottom-Tab-Bar
  - [x] `/auth/*` Route in Middleware als öffentlich belassen (bereits erledigt in Story 1.4)
  - [x] `/~offline` Route in Middleware als öffentlich hinzufügen
- [x] Task 7: OAuth-Redirect-Fix für PWA Standalone Mode (AC: #4)
  - [x] `src/components/auth/apple-sign-in-button.tsx` anpassen:
    - Standalone-Modus erkennen: `window.matchMedia('(display-mode: standalone)').matches`
    - Im Standalone-Modus: `window.location.href` für OAuth-Redirect verwenden statt Supabase-Default
  - [x] Supabase `signInWithOAuth` mit `skipBrowserRedirect: true` + manueller `window.location.href` im Standalone-Modus
- [x] Task 8: Tests (AC: #1-#6)
  - [x] Unit-Test: `manifest.ts` gibt korrektes Manifest-Objekt zurück (name, icons, theme_color, display)
  - [x] Unit-Test: Offline-Seite rendert korrekt mit Fehlermeldung
  - [x] Unit-Test: Middleware lässt `/~offline` Route durch (öffentliche Route)
  - [x] `npm run test` verifizieren — alle Tests grün
- [x] Task 9: Build-Verifikation
  - [x] `npm run lint` fehlerfrei
  - [x] `npm run build` erfolgreich (mit `--webpack` Flag)
  - [x] Service Worker `public/sw.js` wird generiert
  - [x] Manifest unter `/_next/...` oder `/manifest.webmanifest` erreichbar
  - [x] Keine TypeScript-Fehler

## Dev Notes

### Scope-Abgrenzung (KRITISCH)

Diese Story erstellt die PWA-Infrastruktur. Folgende Themen gehören NICHT in diese Story:
- **Push-Notification-Logik (Subscription, Server-Send)** → Epic 3, Story 3.4
- **Offline-Daten-Caching** → Kein Offline-Modus im MVP (PRD-Constraint). Nur Offline-Fallback-Seite.
- **iOS Install-Prompt-Banner** → Nicht in MVP (kein `beforeinstallprompt` auf iOS). Kann später als Enhancement kommen.
- **VAPID-Key-Generierung / Push-Server** → Epic 3. Hier nur SW Event-Listener-Stubs.
- **App-Icon Design (finales Design)** → Placeholder-Icons reichen. Finale Icons werden separat erstellt.
- **Disclaimer-Anzeige** → Story 1.6
- **Account-Löschung** → Story 1.7

### KRITISCH: Learnings aus Story 1.1 - 1.4

1. **ESLint erzwingt Import-Ordering** — Imports: `react` → `next` → externe Packages → `@/` lokale. Import-Groups mit Leerzeile trennen.
2. **Prettier-Config** — `semi: false`, `singleQuote: true`, `trailingComma: all`. Alle neuen Dateien müssen compliant sein.
3. **Test-Pattern** — Vitest + jsdom + @testing-library/react. Tests in `src/__tests__/`. Mock-Pattern für `@supabase/ssr`, `next/headers` bereits in Story 1.3/1.4 etabliert.
4. **Verschachtelte `<main>` vermeiden** — Layout stellt `<main>` bereit, Page-Komponenten nutzen `<div>`.
5. **Keine `index.ts` Barrel-Exports** — Direkte Imports auf spezifische Dateien.
6. **Non-null Assertions für env vars** — Akzeptiert (ESLint Warnings). App crasht früh wenn Env fehlt.
7. **ActionResult<T> Pattern** — Return-Type für Server Actions: `{ data: T, error: null } | { data: null, error: AppError }`
8. **Middleware-Architektur** — `src/middleware.ts` nutzt `updateSession()` von `src/lib/supabase/middleware.ts`. Öffentliche Routen werden VOR dem Auth-Check geprüft. `~/offline` muss dort hinzugefügt werden.
9. **Apple Sign-In Button** — `src/components/auth/apple-sign-in-button.tsx` ist Client Component mit `useState` für Loading und Error. OAuth via `signInWithOAuth({ provider: 'apple' })`.
10. **Next.js 16 Deprecation** — `middleware.ts` wird zu `proxy.ts` Convention. Funktioniert noch, Migration bei nächstem Update.

### Serwist-Setup (KRITISCH — Turbopack-Inkompatibilität)

**Problem:** Serwist (`@serwist/next`) basiert auf einem Webpack-Plugin. Next.js 16 nutzt Turbopack als Default-Bundler. Turbopack unterstützt KEINE Webpack-Plugins.

**Lösung:** Zwei verschiedene Bundler für Dev und Build:
```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build --webpack"
  }
}
```

**Alternative `@serwist/turbopack`:** Existiert (v9.5.5), ist aber weniger erprobt (~900 Downloads/Woche vs ~35.000 für `@serwist/next`). Für MVP die stabile Variante wählen.

**Turbopack-Warnung unterdrücken:**
```bash
# .env (nicht .env.local — soll für alle gelten)
SERWIST_SUPPRESS_TURBOPACK_WARNING=1
```

### next.config.ts Pattern

```typescript
import withSerwistInit from '@serwist/next'

import type { NextConfig } from 'next'

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
})

const nextConfig: NextConfig = {
  /* config options here */
}

export default withSerwist(nextConfig)
```

### Service Worker (src/app/sw.ts)

```typescript
import { defaultCache } from '@serwist/next/worker'
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import { Serwist } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: '/~offline',
        matcher({ request }) {
          return request.destination === 'document'
        },
      },
    ],
  },
})

// Push-Notification Event-Listener (Stub für Epic 3)
self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'LDS Tracker', {
      body: data.body ?? '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url ?? '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  event.waitUntil(self.clients.openWindow(url))
})

serwist.addEventListeners()
```

### Web App Manifest (src/app/manifest.ts)

```typescript
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LDS Symptom Tracker',
    short_name: 'LDS Tracker',
    description: 'Symptom-Tracking für Patienten mit seltenen Erkrankungen',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    theme_color: '#C06A3C',
    background_color: '#F5EDE6',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
```

### OAuth-Redirect-Fix für PWA Standalone Mode (KRITISCH)

**Problem:** Wenn die PWA vom Home Screen gestartet wird (Standalone Mode), öffnet iOS Safari in einem separaten Browser-Kontext für OAuth-Redirects. Session/Cookies werden NICHT zwischen Standalone-PWA und Safari geteilt.

**Lösung:** Im Standalone-Modus `skipBrowserRedirect: true` setzen und manuell via `window.location.href` redirecten:

```typescript
const isStandalone = window.matchMedia('(display-mode: standalone)').matches

if (isStandalone) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      skipBrowserRedirect: true,
    },
  })
  if (data?.url) {
    window.location.href = data.url
  }
} else {
  // Normaler Browser-Flow (wie bisher)
  await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })
}
```

**Warum `window.location.href`?** Supabase `signInWithOAuth()` nutzt intern `window.open()` oder Redirect. `window.open()` öffnet in Safari statt in der PWA. `window.location.href` bleibt im selben Kontext.

### Offline-Fallback-Seite

Die Route `~offline` (mit Tilde) ist Serwist-Konvention. Muss in der Middleware als öffentliche Route durchgelassen werden.

```typescript
// src/middleware.ts — Neue öffentliche Route hinzufügen
if (
  path.startsWith('/auth') ||
  path.startsWith('/api') ||
  path.startsWith('/share') ||
  path.startsWith('/~offline')
) {
  return supabaseResponse
}
```

### iOS Meta Tags

```tsx
// src/app/layout.tsx — Im <head> oder via metadata export
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="LDS Tracker" />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
```

Next.js 16 Metadata API Alternative:
```typescript
export const metadata: Metadata = {
  // ... existing
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'LDS Tracker',
  },
  other: {
    'apple-touch-icon': '/icons/apple-touch-icon.png',
  },
}
```

### Safe Area CSS

```css
/* In globals.css — Bottom-Tab-Bar und InputBar brauchen Safe-Area-Padding */
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
```

Die bestehende `bottom-tab-bar.tsx` nutzt `fixed bottom-0`. Dort `pb-[env(safe-area-inset-bottom)]` ergänzen oder die CSS-Klasse verwenden.

### .gitignore Ergänzungen

```gitignore
# Serwist generated Service Worker
public/sw.js
public/sw.js.map
public/serwist-*.js
public/serwist-*.js.map
```

### Anti-Patterns (VERMEIDEN)

- **NICHT** `next-pwa` oder `@ducanh2912/next-pwa` verwenden — deprecated/unmaintained. Serwist ist der Nachfolger.
- **NICHT** `@serwist/turbopack` verwenden — weniger erprobt, `@serwist/next` ist die stabile Wahl.
- **NICHT** Offline-Daten-Caching implementieren — MVP hat kein Offline-Modus (PRD-Constraint).
- **NICHT** VAPID-Keys generieren oder Push-Server aufsetzen — kommt in Epic 3. Nur SW Event-Listener-Stubs.
- **NICHT** `window.open()` für OAuth im Standalone-Modus — iOS öffnet Safari statt PWA.
- **NICHT** `manifest.json` als statische Datei in `public/` — Next.js Metadata API über `manifest.ts` nutzen.
- **NICHT** den Dev-Script ändern — `next dev --turbopack` bleibt, nur Build wechselt zu `--webpack`.
- **NICHT** `beforeinstallprompt` Event erwarten — existiert nicht auf iOS. Kein automatischer Install-Prompt.
- **NICHT** Icons als SVG im Manifest — PNG erforderlich für PWA-Icons.

### Bestehende Dateien die modifiziert werden

- `next.config.ts` — Serwist-Wrapper hinzufügen
- `package.json` — Build-Script `--webpack`, neue Dependencies
- `src/app/layout.tsx` — Apple Meta Tags, viewport-fit
- `src/app/globals.css` — Safe-Area CSS-Klasse
- `src/middleware.ts` — `/~offline` als öffentliche Route
- `src/components/auth/apple-sign-in-button.tsx` — Standalone-Mode OAuth-Fix
- `.env.local.example` — VAPID-Keys (leer), Serwist-Warnung
- `.gitignore` — Generierte SW-Dateien

### Neue Dateien

- `src/app/manifest.ts` — PWA Manifest (Next.js Metadata API)
- `src/app/sw.ts` — Service Worker Source (Serwist)
- `src/app/~offline/page.tsx` — Offline-Fallback-Seite
- `public/icons/icon-192.png` — PWA Icon 192x192
- `public/icons/icon-512.png` — PWA Icon 512x512
- `public/icons/apple-touch-icon.png` — Apple Touch Icon 180x180
- `src/__tests__/manifest.test.ts` — Manifest-Tests
- `src/__tests__/offline-page.test.tsx` — Offline-Page-Tests

### References

- [Source: _bmad-output/planning-artifacts/architecture.md — Abschnitt "PWA Manifest via Next.js Metadata API"]
- [Source: _bmad-output/planning-artifacts/architecture.md — Abschnitt "Service Worker Source (Serwist)"]
- [Source: _bmad-output/planning-artifacts/architecture.md — Abschnitt "Technical Constraints — Kein Offline-Modus im MVP"]
- [Source: _bmad-output/planning-artifacts/architecture.md — Abschnitt "Cross-Cutting Concerns — Push-Notifications"]
- [Source: _bmad-output/planning-artifacts/architecture.md — Abschnitt "Initialization Commands — npm install serwist"]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Abschnitt "Platform Strategy — PWA-Capabilities"]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Abschnitt "Effortless Interactions — App-Start <3s"]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Abschnitt "Safe-Area — env(safe-area-inset-bottom)"]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Abschnitt "Patient-Theme — Warm Terracotta"]
- [Source: _bmad-output/planning-artifacts/epics.md — Epic 1, Story 1.5]
- [Source: _bmad-output/implementation-artifacts/1-4-apple-id-authentifizierung.md — PWA-Warnung für OAuth-Redirects]
- [Source: Next.js Official PWA Guide — https://nextjs.org/docs/app/guides/progressive-web-apps]
- [Source: Serwist Documentation — https://serwist.pages.dev/docs/next/getting-started]
- [Source: @serwist/next npm v9.5.4]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- ESLint: 0 Errors, 8 Warnings (non-null assertions — bestehend aus Story 1.3/1.4)
- ESLint auto-fix: Import-Ordering in `next.config.ts` korrigiert (Leerzeile zwischen @serwist/next und next entfernt)
- TypeScript: `ServiceWorkerGlobalScope` nicht erkannt — behoben mit `/// <reference lib="webworker" />` Triple-Slash-Referenz in `sw.ts`
- Build: Serwist bundelt SW erfolgreich als `/sw.js` (43KB). Next.js 16 Webpack-Build. Middleware-Deprecation-Warnung bleibt.
- Tests: 45 total (13 neue: 4 Manifest, 3 Offline-Page, 1 Middleware, 5 AppleSignInButton), alle grün
- Serwist v9.5.6 installiert (via @serwist/next, beinhaltet serwist als Transitive-Dependency)
- PWA Icons: Generiert via macOS qlmanage + sips (Placeholder: Terracotta-Rechteck mit "LDS" Text)

### Completion Notes List
- Serwist v9.5.6 mit @serwist/next Webpack-Plugin — Dev bleibt Turbopack, Build nutzt --webpack
- Manifest via Next.js Metadata API (`manifest.ts`) — generiert unter `/manifest.webmanifest`
- Service Worker mit Precaching, Runtime-Caching (defaultCache), Offline-Fallback auf `/~offline`
- Push-Notification Event-Listener als Stubs (push + notificationclick) — volle Implementierung in Epic 3
- Offline-Fallback-Seite: Client Component mit WifiOff-Icon, Retry-Button, Patient-Theme
- iOS Meta-Tags via Next.js Metadata API: appleWebApp, viewport-fit: cover, apple-touch-icon
- Safe-Area CSS-Klasse `.safe-area-bottom` für iPhone Home-Indicator
- OAuth Standalone-Fix: `skipBrowserRedirect: true` + `window.location.href` im PWA-Modus
- Middleware erweitert: `/~offline` als öffentliche Route
- Placeholder-Icons: 192x192, 512x512, 180x180 (Apple Touch Icon)

### File List
- `next.config.ts` — Serwist withSerwist() Wrapper konfiguriert
- `package.json` — Build-Script auf `--webpack`, @serwist/next + serwist Dependencies
- `src/app/manifest.ts` — PWA Manifest (Next.js Metadata API)
- `src/app/sw.ts` — Service Worker (Serwist, Precaching, Push-Stubs, Offline-Fallback)
- `src/app/~offline/page.tsx` — Offline-Fallback-Seite (Client Component)
- `src/app/layout.tsx` — Apple Web App Meta-Tags, viewport-fit: cover, apple-touch-icon
- `src/app/globals.css` — Safe-Area CSS-Klasse `.safe-area-bottom`
- `src/middleware.ts` — `/~offline` als öffentliche Route
- `src/components/auth/apple-sign-in-button.tsx` — Standalone-Mode OAuth-Fix
- `public/icons/icon-192.png` — PWA Icon 192x192 (Placeholder)
- `public/icons/icon-512.png` — PWA Icon 512x512 (Placeholder)
- `public/icons/apple-touch-icon.png` — Apple Touch Icon 180x180 (Placeholder)
- `src/__tests__/manifest.test.ts` — 4 Manifest-Tests
- `src/__tests__/offline-page.test.tsx` — 3 Offline-Page-Tests
- `src/__tests__/apple-sign-in-button.test.tsx` — 5 AppleSignInButton-Tests (Standalone OAuth)
- `src/__tests__/middleware.test.ts` — 1 neuer Test (/~offline Route)
- `.gitignore` — Serwist-generierte Dateien
- `.env.local.example` — SERWIST_SUPPRESS_TURBOPACK_WARNING
- `package-lock.json` — Aktualisierte Lock-Datei (neue Dependencies)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — Sprint-Tracking
