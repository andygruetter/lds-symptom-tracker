# Story 7.1: Marketing-Landingpage mit Demo-Video

Status: done

## Story

As a potenzieller Nutzer,
I want auf einer öffentlichen Seite erfahren was die App bietet und ein Demo-Video sehen,
So that ich entscheiden kann ob die App für mich relevant ist (FR43).

## Acceptance Criteria

1. **Given** ein Besucher öffnet die Marketing-URL `/marketing`
   **When** die Seite geladen wird
   **Then** wird eine ansprechende Landingpage angezeigt mit App-Beschreibung und Nutzenversprechen
   **And** die Seite nutzt das Patient-Theme (warme Farben, einladend)

2. **Given** die Marketing-Seite ist geladen
   **When** der Besucher den Video-Bereich sieht
   **Then** ist ein Demo-Video-Platzhalter vorhanden (Video-Embed-Bereich)
   **And** der Platzhalter zeigt einen klaren Hinweis dass das Demo-Video folgt

3. **Given** die Marketing-Seite
   **When** ein Suchmaschinen-Crawler die Seite besucht
   **Then** sind Meta-Tags (title, description), Open Graph Tags und strukturierte Daten vorhanden
   **And** die Seite wird als statische Route gerendert (optimale Performance)

4. **Given** die Marketing-Seite
   **When** auf verschiedenen Geräten angezeigt
   **Then** ist die Seite vollständig responsive (Handy, Tablet, Desktop)

5. **Given** die Marketing-Seite
   **When** ein nicht-authentifizierter Besucher sie aufruft
   **Then** ist kein Login oder Auth erforderlich
   **And** die Proxy-Middleware lässt `/marketing` ohne Redirect durch

## Tasks / Subtasks

- [ ] Task 1: Proxy-Route `/marketing` als öffentlich konfigurieren (AC: #5)
- [ ] Task 2: Marketing-Landingpage erstellen (AC: #1, #2, #3, #4)
  - [ ] 2.1 `src/app/marketing/page.tsx` mit statischem Rendering
  - [ ] 2.2 SEO-Metadata: title, description, Open Graph, strukturierte Daten (JSON-LD)
  - [ ] 2.3 Hero-Section mit CTA-Button
  - [ ] 2.4 Feature-Section: Anti-Tagebuch, 10-Sekunden-Erfassung, Arzt-Sharing
  - [ ] 2.5 Demo-Video-Platzhalter
  - [ ] 2.6 Disclaimer-Hinweis
  - [ ] 2.7 Responsive Layout (mobile-first)

## Dev Notes

- Route: `/marketing` (öffentlich, kein Auth)
- Design-System: shadcn/ui, Inter Font, Patient-Theme Farben
- Statisches Rendering (kein `'use client'` nötig)
- Demo-Video: Platzhalter für späteres YouTube/Vimeo-Embed
