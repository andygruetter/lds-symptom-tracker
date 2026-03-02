# Story 1.1: Next.js-Projekt initialisieren mit Tooling und Test-Infrastruktur

Status: done

## Story

As a Entwickler,
I want ein konfiguriertes Next.js-Projekt mit TypeScript, Tailwind CSS 4, shadcn/ui, ESLint/Prettier und Vitest,
So that alle weiteren Stories auf einer konsistenten, lauffähigen und testbaren Projektbasis aufbauen können.

## Acceptance Criteria

1. **Given** ein leeres Repository **When** das Projekt-Setup ausgeführt wird **Then** existiert ein Next.js 16 App-Router-Projekt mit TypeScript strict, Tailwind CSS 4, shadcn/ui init
2. **And** ESLint + Prettier sind konfiguriert gemäss Architektur (Import-Ordering, no barrel exports)
3. **And** Vitest ist konfiguriert mit jsdom, @testing-library/react und @testing-library/jest-dom
4. **And** ein Beispiel-Test existiert und läuft erfolgreich (`npm run test`)
5. **And** `npm run dev` startet die App fehlerfrei
6. **And** `npm run build` erzeugt einen erfolgreichen Production-Build

## Tasks / Subtasks

- [x] Task 1: Next.js-Projekt erstellen (AC: #1)
  - [x] `npx create-next-app@latest` mit --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack
  - [x] TypeScript strict mode in tsconfig.json verifizieren
  - [x] Tailwind CSS 4 Konfiguration verifizieren
  - [x] Verzeichnisstruktur gemäss Architektur anlegen (siehe File Structure)
- [x] Task 2: shadcn/ui initialisieren (AC: #1)
  - [x] `npx shadcn@latest init` ausführen (Style: new-york, CSS Variables: yes)
  - [x] components.json verifizieren
  - [x] Basis-Komponenten installieren: Button, Card, Dialog, Sonner (Toast deprecated), Tabs, Skeleton, ScrollArea
- [x] Task 3: ESLint + Prettier konfigurieren (AC: #2)
  - [x] eslint-plugin-import installieren und Import-Ordering konfigurieren
  - [x] .prettierrc erstellen (semi: false, singleQuote: true, tabWidth: 2, trailingComma: all)
  - [x] ESLint-Regeln: no console.log, no any type casting
  - [x] `npm run lint` läuft fehlerfrei
- [x] Task 4: Vitest + Testing Library konfigurieren (AC: #3)
  - [x] vitest, @testing-library/react, @testing-library/jest-dom, jsdom installieren
  - [x] vitest.config.ts erstellen (jsdom, Pfad-Aliase @/*, Coverage-Thresholds)
  - [x] src/__tests__/setup.ts erstellen (jest-dom matchers importieren)
  - [x] Playwright-Config erstellen (iPhone 14, Desktop Chrome)
  - [x] npm scripts: "test", "test:coverage", "test:e2e" in package.json
- [x] Task 5: Beispiel-Test erstellen (AC: #4)
  - [x] Einfachen Unit-Test in src/__tests__/ erstellen
  - [x] `npm run test` verifizieren — Test läuft erfolgreich
- [x] Task 6: Build-Verifikation (AC: #5, #6)
  - [x] `npm run dev` startet fehlerfrei mit Turbopack
  - [x] `npm run build` erzeugt erfolgreichen Production-Build
  - [x] .env.local.example mit allen benötigten Variablen erstellen
- [x] Task 7: Verzeichnisstruktur vorbereiten
  - [x] src/components/ui/ (shadcn — bereits durch init)
  - [x] src/components/capture/ (leer, für Epic 2)
  - [x] src/components/insights/ (leer, für Epic 4)
  - [x] src/components/sharing/ (leer, für Epic 5)
  - [x] src/components/layout/ (leer, für Story 1.2)
  - [x] src/lib/db/ (leer, für Story 1.3)
  - [x] src/lib/ai/ (leer, für Epic 2)
  - [x] src/lib/actions/ (leer, für Epic 2)
  - [x] src/lib/utils/ (shadcn utils.ts bereits vorhanden)
  - [x] src/hooks/ (leer, für spätere Stories)
  - [x] src/types/ (leer, für Story 1.3 database.ts)
  - [x] src/__tests__/factories/ (leer, für spätere Tests)
  - [x] e2e/ (leer, für E2E-Tests)

## Dev Notes

### Scope-Abgrenzung (KRITISCH)

Diese Story erstellt NUR die Projektbasis. Folgende Themen gehören NICHT in diese Story:
- **Theme-Setup, Font, Layout** → Story 1.2
- **Supabase-Integration** → Story 1.3
- **Apple ID Auth** → Story 1.4
- **PWA/Service Worker** → Story 1.5
- **Keine Domain-Logik, keine UI-Komponenten, keine API-Routes**

### Exakte Versionen

| Paket | Version | Typ |
|-------|---------|-----|
| next | 16 | prod |
| react | 19 | prod |
| react-dom | 19 | prod |
| typescript | 5 | dev |
| tailwindcss | 4 | dev |
| vitest | latest | dev |
| @testing-library/react | latest | dev |
| @testing-library/jest-dom | latest | dev |
| jsdom | latest | dev |
| @playwright/test | latest | dev |
| eslint-plugin-import | latest | dev |
| prettier | latest | dev |

**NICHT installieren in dieser Story** (kommt in späteren Stories):
- @supabase/supabase-js, @supabase/ssr (Story 1.3)
- serwist (Story 1.5)
- @anthropic-ai/sdk, openai (Epic 2/3)
- @react-pdf/renderer (Epic 6)
- zod, uuid (Story 1.3+)

### Projekt-Setup-Befehle

```bash
# 1. Next.js Projekt erstellen
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --turbopack

# 2. shadcn/ui initialisieren
npx shadcn@latest init

# 3. Basis-Komponenten installieren
npx shadcn@latest add button card dialog toast tabs skeleton scroll-area

# 4. Code-Qualität
npm install -D eslint-plugin-import prettier

# 5. Test-Infrastruktur
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @playwright/test
```

### ESLint-Konfiguration

**Import-Reihenfolge (MANDATORY):**
```typescript
// 1. React / Next.js
import { useState } from 'react'
import { useRouter } from 'next/navigation'

// 2. Externe Libraries
import { z } from 'zod'

// 3. Interne Imports (@/*)
import { confirmSymptom } from '@/lib/actions/symptom-actions'
import type { Symptom } from '@/types/symptom'

// 4. Relative Imports
import { ChatBubble } from './chat-bubble'
```

**Verbotene Patterns:**
- NO barrel exports (`index.ts` Dateien die re-exportieren)
- NO `console.log` — nur `console.error`, `console.warn`, `console.info`
- NO `any` Type oder `as` Type Casting
- NO `null` vs `undefined` Vermischung: `null` für DB-Werte, `undefined` für optionale Parameter

### Prettier-Konfiguration

```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "all"
}
```

### Vitest-Konfiguration

**vitest.config.ts:**
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    globals: true,
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    coverage: {
      provider: 'v8',
      thresholds: {
        'src/lib/': { lines: 80, branches: 75, functions: 80 },
        'src/components/': { lines: 60, branches: 50, functions: 60 },
        'src/hooks/': { lines: 70, branches: 65, functions: 70 },
      },
    },
  },
})
```

**src/__tests__/setup.ts:**
```typescript
import '@testing-library/jest-dom/vitest'
```

**Test-Namenskonventionen:**
- Unit/Integration: `[module].test.ts` (z.B. `extract.test.ts`)
- E2E: `[journey].spec.ts` (z.B. `symptom-capture.spec.ts`)

### Playwright-Konfiguration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:3000',
  },
  projects: [
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 14'] },
    },
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
```

### Environment Variables (.env.local.example)

```bash
# Supabase (Story 1.3)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# KI-Pipeline (Epic 2/3)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# PWA / Push (Story 1.5)
NEXT_PUBLIC_VAPID_KEY=
VAPID_PRIVATE_KEY=

# Sharing (Epic 5)
SHARING_HMAC_SECRET=

# Monitoring (optional)
SENTRY_DSN=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### npm Scripts (package.json)

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test"
  }
}
```

### Project Structure Notes

**Verzeichnisstruktur gemäss Architektur:**

```
src/
├── app/
│   ├── globals.css           → Tailwind Imports (Themes kommen in Story 1.2)
│   ├── layout.tsx            → Root Layout (Font kommt in Story 1.2)
│   ├── page.tsx              → Placeholder-Seite
│   └── not-found.tsx         → 404 Seite
├── components/
│   ├── ui/                   → shadcn/ui (generiert durch init + add)
│   ├── capture/              → (leer — Epic 2)
│   ├── insights/             → (leer — Epic 4)
│   ├── sharing/              → (leer — Epic 5)
│   └── layout/               → (leer — Story 1.2)
├── lib/
│   ├── db/                   → (leer — Story 1.3)
│   ├── ai/                   → (leer — Epic 2)
│   ├── actions/              → (leer — Epic 2)
│   └── utils/                → shadcn cn() utility
├── hooks/                    → (leer)
├── types/                    → (leer — Story 1.3 database.ts)
├── middleware.ts             → (leer/Placeholder — Story 1.4)
└── __tests__/
    ├── setup.ts              → jest-dom Setup
    ├── factories/            → (leer)
    └── example.test.ts       → Beispiel-Test
```

**Leere Verzeichnisse:** `.gitkeep`-Dateien einfügen damit Git die leeren Ordner trackt.

### Anti-Patterns (VERMEIDEN)

- **NICHT** alle npm-Pakete auf einmal installieren — nur was diese Story braucht
- **NICHT** Supabase, AI-Pakete oder PWA-Pakete installieren
- **NICHT** Themes/Farben konfigurieren (kommt in Story 1.2)
- **NICHT** Authentifizierung oder Middleware-Logik einbauen
- **NICHT** Domain-spezifische Komponenten erstellen
- **NICHT** barrel exports (index.ts) für die leeren Verzeichnisse erstellen

### References

- [Source: _bmad-output/planning-artifacts/architecture.md — Abschnitt "Projekt-Initialisierung"]
- [Source: _bmad-output/planning-artifacts/architecture.md — Abschnitt "Code-Qualität & Konventionen"]
- [Source: _bmad-output/planning-artifacts/architecture.md — Abschnitt "Test-Pyramide"]
- [Source: _bmad-output/planning-artifacts/epics.md — Epic 1, Story 1.1]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- create-next-app benötigt leeres Verzeichnis → Workaround via /tmp und Kopie
- `toast` shadcn-Komponente ist deprecated → `sonner` verwendet
- `next lint` funktioniert nicht in Next.js 16 → `eslint .` direkt verwendet

### Completion Notes List
- Alle 6 Acceptance Criteria erfüllt
- Next.js 16.1.6, React 19.2.3, TypeScript 5 strict, Tailwind CSS 4
- shadcn/ui new-york style mit 7 Basis-Komponenten (Sonner statt Toast)
- ESLint 9 flat config mit Import-Ordering, no-console, no-explicit-any
- Prettier: semi: false, singleQuote: true, tabWidth: 2, trailingComma: all
- Vitest 4.0.18 mit jsdom, @testing-library/react, @testing-library/jest-dom
- Playwright mit iPhone 14 + Desktop Chrome Projekten
- 1 Beispiel-Test (Home Page render) läuft erfolgreich
- Dev-Server (Turbopack) und Production-Build fehlerfrei
- Verzeichnisstruktur mit .gitkeep-Dateien für leere Ordner

### File List
- package.json (npm scripts, dependencies)
- package-lock.json (npm lock file)
- tsconfig.json (TypeScript strict, @/* alias)
- eslint.config.mjs (ESLint 9 flat config mit Import-Ordering)
- .prettierrc (Prettier-Konfiguration)
- .prettierignore (ignorierte Dateien/Ordner)
- .gitignore (merged: BMAD + Next.js + Playwright patterns)
- postcss.config.mjs (Tailwind CSS 4)
- next.config.ts (Next.js Konfiguration)
- components.json (shadcn/ui Konfiguration)
- vitest.config.ts (Vitest mit jsdom, Coverage-Thresholds)
- playwright.config.ts (E2E-Test-Konfiguration)
- .env.local.example (Environment-Variablen-Vorlage)
- src/app/layout.tsx (Root Layout, lang="de")
- src/app/page.tsx (Placeholder Home Page)
- src/app/not-found.tsx (404 Seite)
- src/app/globals.css (Tailwind CSS 4 + shadcn/ui CSS Variables)
- src/app/favicon.ico (Default, wird in Story 1.2 ersetzt)
- src/lib/utils.ts (shadcn cn() Utility)
- src/components/ui/button.tsx (shadcn)
- src/components/ui/card.tsx (shadcn)
- src/components/ui/dialog.tsx (shadcn)
- src/components/ui/sonner.tsx (shadcn, ersetzt deprecated toast)
- src/components/ui/tabs.tsx (shadcn)
- src/components/ui/skeleton.tsx (shadcn)
- src/components/ui/scroll-area.tsx (shadcn)
- src/__tests__/setup.ts (jest-dom Vitest Setup)
- src/__tests__/example.test.tsx (Beispiel-Test)
- src/__tests__/factories/.gitkeep
- src/components/capture/.gitkeep
- src/components/insights/.gitkeep
- src/components/sharing/.gitkeep
- src/components/layout/.gitkeep
- src/lib/db/.gitkeep
- src/lib/ai/.gitkeep
- src/lib/actions/.gitkeep
- src/hooks/.gitkeep
- src/types/.gitkeep
- e2e/.gitkeep
- public/.gitkeep

### Senior Developer Review (AI)

**Reviewer:** Andy (Code Review Agent) — 2026-03-02
**Ergebnis:** Approved with fixes applied

**Fixes Applied (6):**
- H1: `.gitignore` um `!.env.local.example` Ausnahme ergänzt
- H2: `globals.css` — Geist-Font-Variablen durch System-Font-Stacks ersetzt
- M1: Task 7 Subtasks korrekt auf [x] gesetzt
- M2: 5 Default-SVGs aus `public/` gelöscht, `.gitkeep` hinzugefügt
- M3: File List um `package-lock.json`, `favicon.ico`, `public/.gitkeep` ergänzt
- M4: Awareness-Note: `sonner.tsx` benötigt ThemeProvider aus Story 1.2

**Verbleibende LOW Issues (akzeptiert):**
- L1: `sonner.tsx` enthält `as` Type Cast (shadcn-generierter Code)
- L2: Architecture-Spec referenziert `.eslintrc.json` statt `eslint.config.mjs` (ESLint 9)
- L3: Story Dev Notes zeigen `next lint` statt `eslint .` (Referenz-Material, nicht aktualisiert)
