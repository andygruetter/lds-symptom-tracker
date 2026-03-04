# LDS Symptom Tracker

Ereignisbasierte Web-App zur Symptomerfassung für Patienten mit seltenen Erkrankungen. Patienten beschreiben Symptome per Sprache oder Text — KI extrahiert automatisch strukturierte medizinische Daten (Bezeichnung, Körperregion, Seite, Art, Intensität). Über Monate entsteht eine differenzierte Symptomgeschichte als objektive Entscheidungsgrundlage für die Spezialisten-Konsultation.

## Kernkonzept

- **Anti-Tagebuch-Prinzip:** Event-basiert statt pflichtbasiert. Keine Eingabe = guter Tag.
- **Sprache → Struktur in 10 Sekunden:** Patient spricht frei (auch Schweizerdeutsch), KI erzeugt strukturierte Daten.
- **Bidirektionaler Nutzen:** Auffällige Muster → frühzeitiges Handeln. Unauffälliger Verlauf → Vermeidung unnötiger Eingriffe.
- **Null Hürde für Ärzte:** Sharing-Link statt Portal. Kein Account, kein Login, kein System.
- **Lernendes System:** Jede Patienten-Korrektur verbessert die Erkennung.

## Tech Stack

| Technologie                    | Zweck                               |
| ------------------------------ | ----------------------------------- |
| **Next.js 16** (App Router)    | Framework, SSR, API Routes          |
| **React 19**                   | UI mit Server Components            |
| **TypeScript**                 | Type-Safety                         |
| **Tailwind CSS 4 + shadcn/ui** | Styling & UI-Komponenten            |
| **Supabase**                   | PostgreSQL, Auth, Storage, Realtime |
| **Serwist**                    | PWA / Service Worker                |
| **Vitest + Playwright**        | Unit-/E2E-Tests                     |
| **Vercel**                     | Deployment (Pay-per-Use, EU Edge)   |

## Voraussetzungen

- Node.js >= 18
- npm oder pnpm
- Supabase-Projekt (für Auth & Datenbank)
- Apple Developer Account (für Apple ID Auth)

## Setup

```bash
# Dependencies installieren
npm install

# Umgebungsvariablen konfigurieren
cp .env.example .env.local
# .env.local mit Supabase- und Auth-Credentials ausfüllen

# Entwicklungsserver starten
npm run dev
```

Die App läuft unter [http://localhost:3000](http://localhost:3000).

## Scripts

| Befehl                  | Beschreibung                   |
| ----------------------- | ------------------------------ |
| `npm run dev`           | Entwicklungsserver (Turbopack) |
| `npm run build`         | Produktions-Build              |
| `npm run start`         | Produktions-Server             |
| `npm run lint`          | ESLint ausführen               |
| `npm run format`        | Prettier formatieren           |
| `npm run test`          | Unit-Tests (Vitest)            |
| `npm run test:watch`    | Tests im Watch-Modus           |
| `npm run test:coverage` | Tests mit Coverage-Report      |
| `npm run test:e2e`      | E2E-Tests (Playwright)         |

## Projektstruktur

```
src/
├── app/                  # Next.js App Router
│   ├── (app)/            # Authentifizierte App-Routen
│   ├── auth/             # OAuth Callback
│   ├── disclaimer/       # Disclaimer-Seite
│   └── ~offline/         # PWA Offline-Fallback
├── components/           # React-Komponenten
│   └── ui/               # shadcn/ui-Komponenten
├── lib/                  # Utilities & Konfiguration
│   └── supabase/         # Supabase Client-Factories
├── styles/               # Theme-Konfiguration
└── types/                # TypeScript-Typen
```

## CI/CD

GitHub Actions Pipeline (`.github/workflows/ci.yml`) läuft auf `push` (main) und Pull Requests:

| Job               | Beschreibung                                                        |
| ----------------- | ------------------------------------------------------------------- |
| **lint-and-test** | ESLint, Prettier-Check, Vitest Unit-Tests                           |
| **build**         | Next.js Produktions-Build                                           |
| **e2e**           | Playwright E2E-Tests (Chromium), startet nach lint-and-test + build |

Benötigte GitHub Secrets: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `INTERNAL_API_SECRET`

## Status

Das Projekt befindet sich in aktiver Entwicklung (MVP / Pilot-Phase). Aktuell implementiert:

- Projekt-Setup mit Next.js, TypeScript, Tailwind, shadcn/ui
- Theme-System (Patient & Arzt) mit Custom Fonts
- Apple ID Authentifizierung
- Supabase-Integration (Client, Server, Middleware)
- PWA mit Service Worker und Offline-Fallback
- Disclaimer-Anzeige und Mehr-Seite
- CI-Pipeline mit GitHub Actions (Lint, Tests, Build, E2E)

## Lizenz

Proprietär — Alle Rechte vorbehalten.
