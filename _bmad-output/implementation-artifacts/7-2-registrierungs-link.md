# Story 7.2: Registrierungs-Link zur App

Status: in-progress

## Story

As a potenzieller Nutzer,
I want von der Marketing-Seite direkt zur App-Registrierung gelangen,
So that ich mich ohne Umwege registrieren und loslegen kann (FR44).

## Acceptance Criteria

1. **Given** ein Besucher auf der Marketing-Seite
   **When** der Besucher den Registrierungs-/Start-Button klickt
   **Then** wird er zur App-Login-Seite `/auth/login` weitergeleitet

2. **Given** die Marketing-Seite
   **When** der Besucher die Seite sieht
   **Then** ist der CTA-Button prominent platziert (Above the Fold + am Seitenende)

3. **Given** die Marketing-Seite
   **When** der Besucher den Disclaimer-Bereich sieht
   **Then** wird der Hinweis "Kein Medizinprodukt" sichtbar angezeigt

4. **Given** die Marketing-Seite
   **When** der CTA-Button angezeigt wird
   **Then** ist der Call-to-Action klar und einladend formuliert

## Tasks / Subtasks

- [ ] Task 1: CTA-Buttons mit Link zu `/auth/login` (AC: #1, #2, #4)
  - [ ] 1.1 Hero-CTA (Above the Fold)
  - [ ] 1.2 Footer-CTA (am Seitenende)
- [ ] Task 2: Disclaimer sichtbar auf Marketing-Seite (AC: #3)

## Dev Notes

- Wird zusammen mit Story 7.1 implementiert (gleiche Seite)
- CTA verlinkt auf `/auth/login` (bestehende Login-Seite mit Apple Sign In)
