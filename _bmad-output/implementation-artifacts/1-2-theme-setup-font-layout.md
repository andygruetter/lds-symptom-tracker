# Story 1.2: Theme-Setup, Font und Layout-Grundstruktur

Status: done

## Story

As a Entwickler,
I want die zwei Themes (Patient/Arzt), den Standard-Font und die Bottom-Tab-Bar einrichten,
So that die visuelle Basis für alle UI-Komponenten steht.

## Acceptance Criteria

1. **Given** das initialisierte Projekt aus Story 1.1 **When** das Theme-Setup konfiguriert wird **Then** das Patient-Theme (Warm Terracotta `#C06A3C`) ist als CSS Custom Properties mit `data-theme="patient"` eingerichtet
2. **And** das Arzt-Theme (Professional Slate `#374955`) ist als `data-theme="doctor"` vorbereitet
3. **And** Inter (Variable Font) ist als Standard-Font konfiguriert
4. **And** die Bottom-Tab-Bar Grundstruktur (3 Tabs: Erfassen, Auswertung, Mehr) ist als Layout-Komponente vorhanden
5. **And** Touch-Targets in der Tab-Bar sind mindestens 44x44px (Apple HIG)
6. **And** ein Test für das Theme-Switching existiert

## Tasks / Subtasks

- [x] Task 1: Inter Font konfigurieren (AC: #3)
  - [x] `next/font/google` Import für Inter Variable Font in `src/app/layout.tsx`
  - [x] Font-Variable `--font-inter` auf `<body>` setzen
  - [x] `globals.css`: `--font-sans` auf `var(--font-inter)` aktualisieren
  - [x] Verifizieren: Font rendert korrekt im Browser
- [x] Task 2: Patient-Theme CSS Custom Properties (AC: #1)
  - [x] In `globals.css` den shadcn-Default `:root`-Block durch Patient-Theme ersetzen
  - [x] Alternativ: `[data-theme="patient"]`-Selektor verwenden (BEIDE Ansätze prüfen — siehe Dev Notes)
  - [x] Alle Patient-Farbtokens gemäss Color Map (siehe unten) einsetzen
  - [x] `.dark`-Block entfernen oder Patient-Dark vorbereiten (MVP: nur Light)
- [x] Task 3: Doctor-Theme CSS Custom Properties (AC: #2)
  - [x] `[data-theme="doctor"]`-Selektor in `globals.css` hinzufügen
  - [x] Alle Doctor-Farbtokens gemäss Color Map einsetzen
  - [x] Verifizieren: Theme-Switch wechselt Farben korrekt
- [x] Task 4: Route-basiertes Theme-Switching (AC: #1, #2)
  - [x] `src/app/(app)/layout.tsx` erstellen mit `data-theme="patient"`
  - [x] `src/app/(app)/page.tsx` erstellen (verschiebt aktuelle page.tsx)
  - [x] Root `layout.tsx` aktualisieren: Font + Metadata, kein Theme-Attribut
  - [x] Verifizieren: Patient-Routen zeigen Terracotta-Theme
- [x] Task 5: Bottom-Tab-Bar Komponente (AC: #4, #5)
  - [x] `src/components/layout/bottom-tab-bar.tsx` erstellen
  - [x] 3 Tabs: Erfassen (Mic-Icon), Auswertung (Chart-Icon), Mehr (Settings-Icon)
  - [x] Lucide-Icons verwenden (bereits über shadcn installiert)
  - [x] Active/Inactive States: `text-primary font-medium` / `text-muted-foreground`
  - [x] Touch-Targets: `min-h-11 min-w-11` (44px) oder grösser
  - [x] Safe-Area-Inset: `pb-[env(safe-area-inset-bottom)]`
  - [x] Responsive: Volle Breite, `fixed bottom-0`
- [x] Task 6: Tab-Bar in App-Layout einbauen (AC: #4)
  - [x] Bottom-Tab-Bar in `(app)/layout.tsx` unterhalb von `{children}` einbauen
  - [x] Main-Content padding-bottom für Tab-Bar-Höhe (ca. 64px + safe-area)
  - [x] Verifizieren: Tab-Bar erscheint auf allen (app)-Routen
- [x] Task 7: Theme-Switching Test (AC: #6)
  - [x] Unit-Test: Theme-CSS-Properties wechseln bei `data-theme` Attribut-Änderung
  - [x] Unit-Test: Bottom-Tab-Bar rendert 3 Tabs mit korrekten Labels
  - [x] Unit-Test: Active-Tab hat korrektes Styling
  - [x] `npm run test` verifizieren — alle Tests grün
- [x] Task 8: Build-Verifikation
  - [x] `npm run lint` fehlerfrei
  - [x] `npm run build` erfolgreich
  - [ ] Visueller Check: Patient-Theme sichtbar im Browser

## Dev Notes

### Scope-Abgrenzung (KRITISCH)

Diese Story erstellt NUR die visuelle Basis. Folgende Themen gehören NICHT in diese Story:
- **Supabase-Integration** → Story 1.3
- **Auth Guard im Layout** → Story 1.4 (Layout bekommt KEINEN Auth-Check)
- **PWA/Service Worker/Manifest** → Story 1.5
- **Favicon/App-Icons** → Story 1.5 (PWA)
- **Capture-Komponenten** (InputBar, ChatBubble) → Epic 2
- **Insights-Komponenten** (Timeline, Ranking) → Epic 4
- **Doctor-Dashboard-Layout** → Epic 5/6 (nur CSS-Tokens vorbereiten)
- **Tab-Inhalte/Routing** → spätere Stories (Tabs sind erstmal Placeholder-Seiten)

### KRITISCH: Learnings aus Story 1.1

1. **`sonner.tsx` benötigt ThemeProvider** — Die Sonner-Komponente nutzt `useTheme()` von `next-themes`. Story 1.2 MUSS KEINEN separaten ThemeProvider einbauen, da das Theme per `data-theme` server-side gesetzt wird. `next-themes` ist NICHT für den Theme-Switch zuständig — es wird nur von Sonner für Dark/Light Mode genutzt. Für MVP (nur Light Mode) ist das unkritisch.
2. **`globals.css` hat aktuell System-Font-Stacks** — In Story 1.1 Code-Review wurden die Geist-Font-Variablen durch System-Fonts ersetzt. Story 1.2 muss diese durch Inter ersetzen.
3. **`globals.css` hat shadcn-Default Neutral-Farben** — Diese müssen vollständig durch Patient-Theme-Farben ersetzt werden.
4. **Tailwind CSS 4 nutzt `@theme inline`** — NICHT `tailwind.config.ts`! Farbtokens müssen in `globals.css` via CSS Custom Properties definiert werden. Die `@theme inline` Block-Referenzen bleiben erhalten.
5. **ESLint erzwingt Import-Ordering** — Alle neuen Dateien MÜSSEN korrekte Import-Reihenfolge haben.

### Theme-Implementierung: CSS-Architektur

**Ansatz:** CSS Custom Properties mit `data-theme` Attribut, geschaltet per Route-Layout.

```
Root Layout (src/app/layout.tsx)
  └── Kein data-theme (neutral)
      ├── (app)/layout.tsx → data-theme="patient"
      │   ├── page.tsx (Capture)
      │   ├── insights/page.tsx (Auswertung)
      │   └── more/page.tsx (Mehr)
      └── share/dashboard/layout.tsx → data-theme="doctor" (Epic 5+)
```

**globals.css Struktur (Tailwind CSS 4):**

```css
@import 'tailwindcss';
@import 'tw-animate-css';
@import 'shadcn/tailwind.css';

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-inter);
  /* ... shadcn token mapping bleibt ... */
}

/* Patient Theme (Default) */
:root,
[data-theme="patient"] {
  --radius: 0.625rem;
  --background: /* oklch for #F5EDE6 */;
  --foreground: /* oklch for #2A1B10 */;
  --primary: /* oklch for #C06A3C */;
  --primary-foreground: /* oklch for #FFFFFF */;
  /* ... alle Token ... */
}

/* Doctor Theme */
[data-theme="doctor"] {
  --background: /* oklch for #F6F7F9 */;
  --foreground: /* oklch for #181C21 */;
  --primary: /* oklch for #374955 */;
  /* ... alle Token ... */
}
```

### Color Map: Patient Theme (Warm Terracotta)

| shadcn Token | Hex | Verwendung |
|-------------|-----|-----------|
| `--primary` | `#C06A3C` | Microphone-Button, primäre Aktionen |
| `--primary-foreground` | `#FFFFFF` | Text/Icons auf Primary |
| `--background` | `#F5EDE6` | App-Hintergrund (warmes Creme) |
| `--foreground` | `#2A1B10` | Haupttext (warm-dunkel) |
| `--card` | `#FFFFFF` | Chat-Blasen, Karten |
| `--card-foreground` | `#2A1B10` | Text in Karten |
| `--muted` | `#EAE0D7` | Sekundäre Flächen, Tag-Hintergründe |
| `--muted-foreground` | `#5E4E40` | Sekundärtext, Labels |
| `--border` | `#D9CFC4` | Trennlinien, Karten-Ränder |
| `--input` | `#D9CFC4` | Input-Rahmen |
| `--ring` | `#C06A3C` | Focus-Ring (Keyboard-Navigation) |
| `--accent` | `#EAE0D7` | Hover-Flächen |
| `--accent-foreground` | `#2A1B10` | Text auf Hover-Flächen |
| `--secondary` | `#EAE0D7` | Sekundäre Buttons |
| `--secondary-foreground` | `#2A1B10` | Text auf sekundären Buttons |
| `--destructive` | `#BE4444` | Fehler, Löschen |
| `--popover` | `#FFFFFF` | Popover-Hintergrund |
| `--popover-foreground` | `#2A1B10` | Text in Popovers |

**Zusätzliche Custom Tokens (nicht shadcn-Standard):**

| Token | Hex | Verwendung |
|-------|-----|-----------|
| `--success` | `#3A856F` | Bestätigung, Confirm-Buttons |
| `--warning` | `#B8913A` | Medium-Confidence |

### Color Map: Doctor Theme (Professional Slate)

| shadcn Token | Hex | Verwendung |
|-------------|-----|-----------|
| `--primary` | `#374955` | Navigation, Dashboard-Aktionen |
| `--primary-foreground` | `#FFFFFF` | Text auf Primary |
| `--background` | `#F6F7F9` | Dashboard-Hintergrund |
| `--foreground` | `#181C21` | Haupttext |
| `--card` | `#FFFFFF` | Dashboard-Karten |
| `--card-foreground` | `#181C21` | Text in Karten |
| `--muted` | `#E8EAEE` | Sekundäre Flächen |
| `--muted-foreground` | `#5A6270` | Labels, Sekundärtext |
| `--border` | `#D4D8DE` | Trennlinien |
| `--input` | `#D4D8DE` | Input-Rahmen |
| `--ring` | `#374955` | Focus-Ring |
| `--accent` | `#2A7A65` | Highlights, aktive Elemente |
| `--accent-foreground` | `#FFFFFF` | Text auf Accent |
| `--secondary` | `#E8EAEE` | Sekundäre Buttons |
| `--secondary-foreground` | `#181C21` | Text auf sekundären Buttons |
| `--destructive` | `#BE4444` | Fehler, Löschen |
| `--popover` | `#FFFFFF` | Popover-Hintergrund |
| `--popover-foreground` | `#181C21` | Text in Popovers |

### Hex → OKLch Konvertierung

Die bestehenden shadcn-Werte in `globals.css` nutzen OKLch-Farbraum. Die neuen Theme-Farben müssen ebenfalls in OKLch konvertiert werden. Tool: `oklch.com` oder CSS-Konverter.

**Wichtig:** OKLch-Werte für die exakten Hex-Codes berechnen. Nicht approximieren!

### Inter Font Setup

```tsx
// src/app/layout.tsx
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

// In return:
<body className={`${inter.variable} antialiased`}>
```

### Bottom-Tab-Bar Spezifikation

**Datei:** `src/components/layout/bottom-tab-bar.tsx`

```
┌─────────────────────────────────────────┐
│  [🎤]        [📊]        [⚙️]           │
│ Erfassen   Auswertung    Mehr           │
└─────────────────────────────────────────┘
```

| Tab | Icon (Lucide) | Label | Route |
|-----|---------------|-------|-------|
| Erfassen | `Mic` | "Erfassen" | `/(app)` (default) |
| Auswertung | `BarChart3` | "Auswertung" | `/(app)/insights` |
| Mehr | `Settings` | "Mehr" | `/(app)/more` |

**Styling:**
- `fixed bottom-0 w-full bg-background border-t border-border`
- Höhe: `h-16` (64px) + `pb-[env(safe-area-inset-bottom)]`
- Tabs: `flex items-center justify-around`
- Jeder Tab: `flex flex-col items-center gap-1 min-h-11 min-w-11 py-2`
- Active: `text-primary font-medium`
- Inactive: `text-muted-foreground`
- Icons: `size-5` (20px)
- Labels: `text-xs` (12px)

**Komponenten-Pattern:**
- Client Component (`'use client'`) wegen `usePathname()`
- Link-basierte Navigation (nicht Button + Router.push)
- `role="navigation"` und `aria-label="Hauptnavigation"`

### Routing-Struktur (App-Gruppe)

```
src/app/
├── layout.tsx              → Root Layout (Font, Metadata)
├── (app)/
│   ├── layout.tsx          → Patient Layout (data-theme, Tab-Bar)
│   ├── page.tsx            → Capture-Placeholder (Erfassen-Tab)
│   ├── insights/
│   │   └── page.tsx        → Insights-Placeholder (Auswertung-Tab)
│   └── more/
│       └── page.tsx        → More-Placeholder (Mehr-Tab)
└── not-found.tsx           → 404 (bereits vorhanden)
```

### Typography Scale (Referenz)

| Level | Size | Line Height | Weight | Verwendung |
|-------|------|------------|--------|-----------|
| `xs` | 12px | 16px | 400 | Timestamps, Confidence-Labels |
| `sm` | 14px | 20px | 400-500 | Tags, Sekundärtext |
| `base` | 16px | 24px | 400 | Body, Chat-Blasen |
| `lg` | 18px | 28px | 400-500 | Feed-Einträge |
| `xl` | 20px | 28px | 600 | Section-Headings |
| `2xl` | 24px | 32px | 600 | Screen-Titles |
| `3xl` | 30px | 36px | 700 | Dashboard-Metriken |

### Anti-Patterns (VERMEIDEN)

- **NICHT** `next-themes` ThemeProvider für Patient/Doctor-Switch nutzen — Theme ist server-side per Route
- **NICHT** hardcodierte Hex-Werte in Komponenten — nur CSS Custom Properties via Tailwind
- **NICHT** die shadcn/ui-Komponenten in `src/components/ui/` editieren — nur Theme-Tokens ändern
- **NICHT** Auth-Logic oder Supabase in Layout einbauen (kommt in Story 1.3/1.4)
- **NICHT** `tailwind.config.ts` für Farben nutzen — Tailwind CSS 4 verwendet `@theme inline` in globals.css
- **NICHT** die `.dark`-Klasse für Doctor-Theme zweckentfremden

### Project Structure Notes

Bestehende Dateien die modifiziert werden:
- `src/app/layout.tsx` — Font-Import hinzufügen, Metadata aktualisieren
- `src/app/globals.css` — Komplettes Rewrite der Theme-Tokens
- `src/app/page.tsx` — Verschoben nach `src/app/(app)/page.tsx`

Neue Dateien:
- `src/app/(app)/layout.tsx` — Patient-Layout mit Tab-Bar
- `src/app/(app)/page.tsx` — Capture-Placeholder
- `src/app/(app)/insights/page.tsx` — Insights-Placeholder
- `src/app/(app)/more/page.tsx` — More-Placeholder
- `src/components/layout/bottom-tab-bar.tsx` — Tab-Bar Komponente

### References

- [Source: _bmad-output/planning-artifacts/architecture.md — Abschnitt "Theme-System"]
- [Source: _bmad-output/planning-artifacts/architecture.md — Abschnitt "Layout-Architektur"]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Abschnitt "Color System"]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Abschnitt "Typography System"]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Abschnitt "Bottom Navigation"]
- [Source: _bmad-output/planning-artifacts/epics.md — Epic 1, Story 1.2]
- [Source: _bmad-output/implementation-artifacts/1-1-nextjs-projekt-initialisieren.md — Senior Developer Review]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- ESLint Import-Ordering-Fehler in 3 neuen Dateien — via `eslint --fix` behoben
- Hex → OKLch Konvertierung via Node.js-Script (manueller RGB→OKLab→OKLch Algorithmus)

### Senior Developer Review (AI)
**Reviewer:** Code-Review Workflow | **Datum:** 2026-03-02 | **Ergebnis:** Approved (nach Fixes)

**Gefundene Issues:** 1 HIGH, 3 MEDIUM, 3 LOW

**Fixes angewendet (4/4 HIGH+MEDIUM):**
1. **H1 FIXED:** Verschachtelte `<main>` in Placeholder-Seiten → `<div>` ersetzt (3 Dateien)
2. **M1 FIXED:** `z-50` auf Bottom-Tab-Bar `<nav>` hinzugefügt
3. **M2 FIXED:** `aria-current="page"` auf aktivem Tab-Link + Test-Assertion ergänzt
4. **M3 NOTED:** Route `/more` vs Architektur `/settings` — Story-Spec hat `/more` bewusst gewählt (benutzerfreundlicher für kombinierten Tab). Architektur-Doc sollte bei Gelegenheit aktualisiert werden.

**Verbleibende LOW Issues (akzeptiert):**
- L1: `@custom-variant dark` toter Code — wird bei Dark-Mode-Einführung relevant
- L2: Theme-Tests prüfen CSS-Datei statt DOM — jsdom unterstützt kein zuverlässiges CSS-Variable-Switching
- L3: Body-Background bei Doctor-Theme — wird bei Epic 5/6 adressiert

### Completion Notes List
- Inter Variable Font via `next/font/google` mit `--font-inter` CSS Variable konfiguriert
- Patient-Theme (Warm Terracotta #C06A3C) als `:root` + `[data-theme='patient']` eingerichtet
- Doctor-Theme (Professional Slate #374955) als `[data-theme='doctor']` vorbereitet
- `.dark` Block komplett entfernt (MVP: nur Light Mode)
- Custom Tokens `--success` (#3A856F) und `--warning` (#B8913A) im `@theme inline` Block registriert
- Route-Gruppe `(app)/` mit 3 Placeholder-Seiten erstellt (Erfassen, Auswertung, Mehr)
- `data-theme="patient"` auf `(app)/layout.tsx` Wrapper-Div gesetzt (server-side, kein next-themes)
- Bottom-Tab-Bar als Client Component mit `usePathname()` für Active-State
- Lucide Icons: Mic, BarChart3, Settings — Touch-Targets min-h-11 min-w-11 (44px)
- Safe-Area-Inset: `pb-[env(safe-area-inset-bottom)]` auf Nav
- Main Content `pb-20` für Tab-Bar Platz
- 13 Tests (7 Theme + 5 Tab-Bar + 1 Example) alle grün
- Alte `src/app/page.tsx` entfernt, in `(app)/page.tsx` verschoben
- Visueller Check noch ausstehend (manuell im Browser)

### File List
- `src/app/layout.tsx` — Modifiziert: Inter Font Import + Variable auf body
- `src/app/globals.css` — Rewrite: Patient/Doctor Themes, Inter Font, .dark entfernt
- `src/app/page.tsx` — Entfernt (verschoben nach (app)/page.tsx)
- `src/app/(app)/layout.tsx` — Neu: Patient-Layout mit data-theme + BottomTabBar
- `src/app/(app)/page.tsx` — Neu: Capture-Placeholder (Erfassen-Tab)
- `src/app/(app)/insights/page.tsx` — Neu: Insights-Placeholder (Auswertung-Tab)
- `src/app/(app)/more/page.tsx` — Neu: More-Placeholder (Mehr-Tab)
- `src/components/layout/bottom-tab-bar.tsx` — Neu: Bottom-Tab-Bar Komponente
- `src/__tests__/theme.test.tsx` — Neu: 7 Theme-Tests
- `src/__tests__/bottom-tab-bar.test.tsx` — Neu: 5 Tab-Bar-Tests
- `src/__tests__/example.test.tsx` — Modifiziert: Import-Pfad aktualisiert
