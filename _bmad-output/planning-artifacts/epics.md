---
stepsCompleted: [1, 2, 3, 4]
status: 'complete'
completedAt: '2026-03-02'
inputDocuments: ['_bmad-output/planning-artifacts/prd.md', '_bmad-output/planning-artifacts/architecture.md', '_bmad-output/planning-artifacts/ux-design-specification.md']
---

# lds-symptome-tracker - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for lds-symptome-tracker, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

**1. Symptom-Erfassung (FR1-FR10)**
- FR1: Patient kann ein Symptom per Spracheingabe erfassen
- FR2: Patient kann ein Symptom per Texteingabe erfassen
- FR3: Patient kann ein oder mehrere Fotos zu einem Symptom-Event anhängen
- FR4: Patient kann ein Medikamenten-Event per Sprache oder Text erfassen (Einnahme, vergessene Einnahme, Dosis, Grund)
- FR5: Patient kann ein aktives Symptom als beendet markieren (Dauer wird berechnet)
- FR6: System transkribiert Schweizerdeutsch-Spracheingabe ins Hochdeutsche
- FR7: System extrahiert automatisch strukturierte Daten aus der Eingabe (Symptombezeichnung, Körperregion, Seite, Art, Intensität)
- FR8: System unterscheidet zwischen Symptom-Events und Medikamenten-Events
- FR9: System zeigt nach Erfassung sofort eine Verarbeitungs-Bestätigung an
- FR10: System sendet Push-Benachrichtigung wenn die KI-Extraktion abgeschlossen ist

**2. KI-Verarbeitung & Lernen (FR11-FR15)**
- FR11: System fragt bei Konfidenz unter 70% gezielt nach (z.B. "Oberer oder unterer Rücken?")
- FR12: Patient kann extrahierte Daten nach Verarbeitung überprüfen und korrigieren
- FR13: System lernt aus Patienten-Korrekturen und verbessert die Erkennung für diesen Patienten über Zeit
- FR14: System baut ein persönliches Symptom-Vokabular pro Patient auf
- FR15: System zeigt einen Konfidenz-Score pro extrahiertem Datenpunkt (bestätigt vs. KI-extrahiert)

**3. Patienten-Ansicht (FR16-FR20)**
- FR16: Patient kann seine Symptom-Events in einem chronologischen Feed ansehen
- FR17: Patient kann eine Timeline-Ansicht über Monate einsehen
- FR18: Patient kann ein Symptom-Häufigkeits-Ranking mit Trendlinien einsehen
- FR19: Patient kann einzelne Events im Detail ansehen (inkl. Audio, Fotos, extrahierte Daten)
- FR20: Patient kann einzelne Events oder alle Daten löschen

**4. Arzt-Konsultations-Export (FR21-FR33)**
- FR21: Patient kann einen Sharing-Link für einen Arzt generieren
- FR22: Patient kann den Zeitraum für den Sharing-Link auswählen
- FR23: Patient kann die Zugriffsdauer des Sharing-Links festlegen
- FR24: Patient kann den Sharing-Link per E-Mail an den Arzt versenden
- FR25: Patient kann einen PDF-Report generieren und herunterladen/drucken
- FR26: Arzt kann über den Sharing-Link ohne Login auf das Dashboard zugreifen
- FR27: Arzt kann eine KI-generierte Zusammenfassung des Zeitraums einsehen
- FR28: Arzt kann die Timeline mit allen Events einsehen
- FR29: Arzt kann ein Symptom-Ranking mit Trendlinien einsehen
- FR30: Arzt kann in einzelne Events eintauchen (Drill-Down)
- FR31: Arzt kann Original-Audio-Aufnahmen im Drill-Down anhören (Stream, kein Download)
- FR32: Arzt kann Fotos im Drill-Down ansehen (Ansicht, kein Download)
- FR33: Arzt-Dashboard ist auf Handy, iPad und Desktop nutzbar (responsive)

**5. Account & Authentifizierung (FR34-FR36)**
- FR34: Nutzer kann sich mit Apple ID registrieren und anmelden
- FR35: Nutzer kann sofort nach Registrierung Symptome erfassen (kein Formular, kein Onboarding-Zwang)
- FR36: System speichert keine personenidentifizierenden Daten strukturiert — nur Account-ID

**6. Daten-Souveränität & Sicherheit (FR37-FR42)**
- FR37: System speichert alle Daten pseudonymisiert (nur Account-ID, keine Personenzuordnung)
- FR38: Patient kann im Audit-Log einsehen, wer wann auf seine Daten zugegriffen hat
- FR39: Sharing-Links erlöschen automatisch nach der festgelegten Zugriffsdauer
- FR40: Sharing-Links erlauben nur Ansicht/Stream, keinen Download von Audio oder Fotos
- FR41: System zeigt beim Onboarding und in der App einen Disclaimer an (kein Medizinprodukt)
- FR42: Patient kann seinen Account und alle Daten vollständig löschen

**7. Marketing & Plattform (FR43-FR45)**
- FR43: Öffentliche Marketing-Seite mit eingebettetem Demo-Video ist verfügbar
- FR44: Marketing-Seite enthält einen Registrierungs-Link zur App
- FR45: Backend stellt eine vollständige API bereit, über die alle Funktionen erreichbar sind (API-First)

### NonFunctional Requirements

**Performance (NFR1-NFR6)**
- NFR1: Erfassungsmodus: App-Start bis Mikrofon-Button bereit in < 3 Sekunden
- NFR2: KI-Extraktion (Transkription + Symptom-Extraktion) abgeschlossen in < 10 Sekunden nach Audio-Upload
- NFR3: Patienten-Dashboard mit 6 Monaten Daten lädt in < 2 Sekunden
- NFR4: PDF-Report-Generierung abgeschlossen in < 20 Sekunden
- NFR5: Arzt-Sharing-Dashboard lädt beim ersten Klick in < 3 Sekunden
- NFR6: Audio-Streaming im Drill-Down startet ohne spürbare Verzögerung (< 1 Sekunde)

**Security & Datenschutz (NFR7-NFR13)**
- NFR7: Alle Daten verschlüsselt bei Übertragung (TLS) und Speicherung (encryption at rest)
- NFR8: Keine personenidentifizierenden Daten strukturiert gespeichert — nur Account-ID als Referenz
- NFR9: Sharing-Links kryptographisch gesichert (nicht erratbar, nicht aufzählbar)
- NFR10: Audio- und Foto-Dateien nur per Stream/Ansicht zugänglich, kein direkter Download-Link
- NFR11: Audit-Log unveränderbar (append-only) — wer hat wann auf welche Daten zugegriffen
- NFR12: Schweizer nDSG-konform — Gesundheitsdaten als besonders schützenswerte Personendaten behandelt
- NFR13: Account-Löschung entfernt alle Daten vollständig und unwiderruflich (inkl. Audio, Fotos, Backups innerhalb von 30 Tagen)

**Reliability & Verfügbarkeit (NFR14-NFR17)**
- NFR14: System 7x24 verfügbar, Verfügbarkeit ≥ 99.5%
- NFR15: Kleine Wartungsunterbrüche akzeptabel (< 30 Minuten, mit Vorankündigung)
- NFR16: Kein Datenverlust bei Systemausfall — erfasste Events und Uploads dürfen nicht verloren gehen
- NFR17: Tägliche automatische Backups der Datenbank und Medien-Dateien mit 30 Tagen Aufbewahrung

**Integration (NFR18-NFR22)**
- NFR18: Externe Speech-to-Text-API muss Schweizerdeutsch → Hochdeutsch-Übersetzung unterstützen
- NFR19: LLM-API für Symptom-Extraktion muss bei API-Ausfall graceful degraden (Erfassung trotzdem möglich, Extraktion wird nachgeholt)
- NFR20: Apple ID Login über Standard OAuth2/OIDC
- NFR21: Push-Benachrichtigungen über Web Push API (kein nativer Push)
- NFR22: E-Mail-Versand für Sharing-Links über native Mail-App des Patienten (mailto:-Link mit vorausgefülltem Entwurf)

**Scalability & Kosten (NFR23-NFR25)**
- NFR23: MVP-Architektur muss horizontal skalierbar sein — von 1 Patient auf 1000 ohne Architektur-Änderung
- NFR24: Medien-Speicher (Audio, Fotos) über Cloud Object Storage — unbegrenzt skalierbar
- NFR25: Infrastruktur und externe Services ausschliesslich pay-per-use

### Additional Requirements

**Aus der Architektur:**
- Starter Template: `create-next-app` + `shadcn/ui init` als Projektbasis (Epic 1, Story 1)
- Drei Supabase-Client-Factories: `createBrowserClient()`, `createServerClient()`, `createServiceClient()`
- Supabase Schema mit RLS-Policies: account_id-basiert + Sharing-Token-Policy
- KI-Pipeline: Whisper API (STT) + Claude Sonnet (Multi-Symptom-Extraktion + Zusammenfassung) mit Provider-Abstraktion in `src/lib/ai/`. Eine Eingabe kann mehrere Symptome/Medikamente enthalten — pro Eintrag wird ein separates `symptom_event` erstellt.
- E-Mail-Versand: Native Mail-App des Patienten via mailto:-Link (kein Backend-E-Mail-Service)
- Summary-Cache: `sharing_summaries` Tabelle für KI-Zusammenfassung im Arzt-Dashboard (Invalidierung bei neuen Symptomen)
- Soft-Delete + Cron: `deleted_at` auf accounts, wöchentlicher Hard-Delete nach 30 Tagen
- Middleware: Zwei Auth-Mechanismen (Supabase Session für Patient, Sharing-Cookie für Arzt)
- Zwei-Stufen-Token für Sharing: URL-Token → HttpOnly Cookie Session
- CI/CD: GitHub Actions (Lint → Types → Unit → Integration → E2E → Vercel Deploy)
- Monitoring: Sentry (Error-Tracking) + Vercel Analytics
- PWA: Serwist (`sw.ts` in `src/app/`), Web Push Notifications
- Server Action Pattern: Zod → Auth → DB, `ActionResult<T>` Return-Type
- PDF: `@react-pdf/renderer` (serverseitig in API Route)
- Test Infrastructure: Vitest + RTL + Playwright, Factories in `src/__tests__/factories/`, Coverage-Thresholds (lib: 80%, components: 60%, hooks: 70%)
- Auto-generierte Types: `supabase gen types typescript` → `src/types/database.ts`

**Aus der UX-Spezifikation:**
- Zwei Themes: Patient (Warm Terracotta `#C06A3C`) + Arzt (Professional Slate `#374955`) via CSS Custom Properties + `data-theme` Attribut
- Chat-as-Interface Pattern: ChatBubble, ReviewBubble, InputBar (immer sichtbar), ChatFeed
- Bottom-Tab-Bar: 3 Tabs (Erfassen, Auswertung, Mehr)
- Hold-to-Record Geste für Audio (WhatsApp-Pattern)
- Conversational Correction: Bei Konfidenz <70% gezielte Nachfrage mit Auswahloptionen
- Responsive Breakpoints: <640px (iPhone/Celia), 640-1024px (iPad/Arzt), >1024px (Desktop)
- Touch-Targets: Minimum 44x44px (Apple HIG)
- Font: Inter (Variable Font)
- Anti-Tagebuch UX: Keine Reminder, keine Streaks, keine Gamification, leerer Zustand = guter Tag
- Disclaimer: Statischer Text als Constant, angezeigt bei Onboarding + in App
- Konfidenz-Indikatoren: Hoch (≥85% Teal), Mittel (70-84% Amber), Niedrig (<70% Terracotta)
- Asynchroner Push-Review-Loop: Erfassung → Verarbeitung → Push → Review → Bestätigung
- Skeleton-Screens für Loading States (Dashboard, Insights)

### FR Coverage Map

| FR | Beschreibung | Epic |
|----|-------------|------|
| FR1 | Symptom per Spracheingabe erfassen | 3 |
| FR2 | Symptom per Texteingabe erfassen | 2 |
| FR3 | Fotos zu Symptom-Event anhängen | 3 |
| FR4 | Medikamenten-Event per Sprache/Text erfassen | 2 |
| FR5 | Aktives Symptom als beendet markieren | 2 |
| FR6 | Schweizerdeutsch-Transkription | 3 |
| FR7 | Strukturierte Daten extrahieren | 2 |
| FR8 | Symptom- vs. Medikamenten-Event unterscheiden | 2 |
| FR9 | Verarbeitungs-Bestätigung anzeigen | 2 |
| FR10 | Push-Benachrichtigung nach KI-Extraktion | 3 |
| FR11 | Nachfrage bei Konfidenz <70% | 2 |
| FR12 | Extrahierte Daten überprüfen und korrigieren | 2 |
| FR13 | Lernen aus Patienten-Korrekturen | 3 |
| FR14 | Persönliches Symptom-Vokabular | 3 |
| FR15 | Konfidenz-Score pro Datenpunkt | 2 |
| FR16 | Chronologischer Feed | 4 |
| FR17 | Timeline-Ansicht | 4 |
| FR18 | Symptom-Häufigkeits-Ranking | 4 |
| FR19 | Event-Detail-Ansicht | 4 |
| FR20 | Events/Daten löschen | 4 |
| FR21 | Sharing-Link generieren | 5 |
| FR22 | Zeitraum für Sharing-Link auswählen | 5 |
| FR23 | Zugriffsdauer festlegen | 5 |
| FR24 | Sharing-Link per E-Mail versenden | 5 |
| FR25 | PDF-Report generieren | 6 |
| FR26 | Arzt-Zugriff ohne Login | 5 |
| FR27 | KI-generierte Zusammenfassung | 6 |
| FR28 | Arzt-Timeline | 6 |
| FR29 | Arzt-Symptom-Ranking | 6 |
| FR30 | Arzt Drill-Down | 6 |
| FR31 | Audio-Stream im Drill-Down | 6 |
| FR32 | Foto-Ansicht im Drill-Down | 6 |
| FR33 | Arzt-Dashboard responsive | 6 |
| FR34 | Apple ID Registrierung/Login | 1 |
| FR35 | Sofort nach Registrierung Symptome erfassen | 1 |
| FR36 | Keine personenidentifizierenden Daten | 1 |
| FR37 | Pseudonymisierte Speicherung | 1 |
| FR38 | Audit-Log einsehen | 5 |
| FR39 | Sharing-Links erlöschen automatisch | 5 |
| FR40 | Sharing nur Ansicht/Stream | 5 |
| FR41 | Disclaimer anzeigen | 1 |
| FR42 | Account und Daten löschen | 1 |
| FR43 | Marketing-Seite mit Demo-Video | 7 |
| FR44 | Registrierungs-Link auf Marketing-Seite | 7 |
| FR45 | — | Architektur-Constraint (kein Epic) |

**Abdeckung: 44/44 FRs auf Epics verteilt** (FR45 ist ein Architektur-Constraint, kein Feature)

## Epic List

## Epic 1: Projekt-Setup & Authentifizierung

**Ziel:** Lauffähige Projektbasis mit Auth, DB-Schema, PWA-Grundgerüst und Compliance-Basics
**FRs:** FR34, FR35, FR36, FR37, FR41, FR42
**Architektur:** `create-next-app` + `shadcn/ui init`, Supabase-Client-Factories, RLS-Policies, PWA-Setup (Serwist), Soft-Delete + Cron
**UX:** Patient-Theme, Bottom-Tab-Bar Grundstruktur, Disclaimer-Constant, Inter Font

### Story 1.1: Next.js-Projekt initialisieren mit Tooling und Test-Infrastruktur

As a Entwickler,
I want ein konfiguriertes Next.js-Projekt mit TypeScript, Tailwind CSS 4, shadcn/ui, ESLint/Prettier und Vitest,
So that alle weiteren Stories auf einer konsistenten, lauffähigen und testbaren Projektbasis aufbauen können.

**Acceptance Criteria:**

**Given** ein leeres Repository
**When** das Projekt-Setup ausgeführt wird
**Then** existiert ein Next.js 16 App-Router-Projekt mit TypeScript strict, Tailwind CSS 4, shadcn/ui init
**And** ESLint + Prettier sind konfiguriert gemäss Architektur (Import-Ordering, no barrel exports)
**And** Vitest ist konfiguriert mit jsdom, @testing-library/react und @testing-library/jest-dom
**And** ein Beispiel-Test existiert und läuft erfolgreich (`npm run test`)
**And** `npm run dev` startet die App fehlerfrei
**And** `npm run build` erzeugt einen erfolgreichen Production-Build

### Story 1.2: Theme-Setup, Font und Layout-Grundstruktur

As a Entwickler,
I want die zwei Themes (Patient/Arzt), den Standard-Font und die Bottom-Tab-Bar einrichten,
So that die visuelle Basis für alle UI-Komponenten steht.

**Acceptance Criteria:**

**Given** das initialisierte Projekt aus Story 1.1
**When** das Theme-Setup konfiguriert wird
**Then** das Patient-Theme (Warm Terracotta `#C06A3C`) ist als CSS Custom Properties mit `data-theme="patient"` eingerichtet
**And** das Arzt-Theme (Professional Slate `#374955`) ist als `data-theme="doctor"` vorbereitet
**And** Inter (Variable Font) ist als Standard-Font konfiguriert
**And** die Bottom-Tab-Bar Grundstruktur (3 Tabs: Erfassen, Auswertung, Mehr) ist als Layout-Komponente vorhanden
**And** Touch-Targets in der Tab-Bar sind mindestens 44x44px (Apple HIG)
**And** ein Test für das Theme-Switching existiert

### Story 1.3: Supabase-Integration mit Client-Factories und Basis-Schema

As a Entwickler,
I want Supabase als Backend mit drei Client-Factories und dem Basis-DB-Schema,
So that Auth, Datenbankzugriff und RLS-Policies für alle weiteren Features bereitstehen.

**Acceptance Criteria:**

**Given** das initialisierte Projekt aus Story 1.1
**When** die Supabase-Integration konfiguriert wird
**Then** existieren drei Client-Factories: `createBrowserClient()`, `createServerClient()`, `createServiceClient()`
**And** die `accounts`-Tabelle existiert mit `id`, `created_at`, `deleted_at` (Soft-Delete)
**And** RLS-Policies sind aktiviert: Nutzer sehen nur eigene Daten (`account_id = auth.uid()`)
**And** Umgebungsvariablen (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) sind in `.env.local.example` dokumentiert
**And** auto-generierte Types via `supabase gen types typescript` → `src/types/database.ts` sind eingerichtet
**And** ein Test für die Client-Factory-Erstellung existiert

### Story 1.4: Apple ID Authentifizierung mit sofortigem Zugang
As a Patient,
I want mich mit meiner Apple ID registrieren und anmelden können und sofort Symptome erfassen,
So that ich ohne Formulare oder Onboarding direkt loslegen kann.

**Acceptance Criteria:**

**Given** ein nicht-authentifizierter Nutzer öffnet die App
**When** der Nutzer auf "Mit Apple ID anmelden" klickt
**Then** wird der Apple OAuth2/OIDC-Flow gestartet (NFR20)
**And** nach erfolgreicher Authentifizierung wird automatisch ein Account in der `accounts`-Tabelle erstellt
**And** es werden keine personenidentifizierenden Daten strukturiert gespeichert — nur die Account-ID (FR36, FR37)
**And** der Nutzer wird direkt zum Erfassungs-Tab weitergeleitet (FR35)
**And** kein Onboarding-Formular oder Pflicht-Setup wird angezeigt
**And** die Middleware schützt `/(app)`-Routen — unauthentifizierte Nutzer werden zur Login-Seite umgeleitet

### Story 1.5: PWA-Setup mit Service Worker und Manifest
As a Patient,
I want die App als PWA auf meinem Home-Screen installieren können,
So that ich sie wie eine native App nutzen kann.

**Acceptance Criteria:**

**Given** die laufende App im Browser
**When** der Nutzer die App besucht
**Then** ist ein Web App Manifest mit Name, Icons und Theme-Color vorhanden
**And** Serwist ist konfiguriert mit `sw.ts` in `src/app/`
**And** der Service Worker registriert sich erfolgreich
**And** die App ist als "installierbar" im Browser erkennbar (Add to Home Screen)
**And** Offline-Fallback zeigt eine freundliche Meldung an
**And** der Service Worker ist für Push-Notifications vorbereitet (Event-Listener registriert, Push-Handling-Stub vorhanden)

### Story 1.6: Disclaimer-Anzeige und Mehr-Seite
As a Patient,
I want beim ersten App-Start einen Disclaimer sehen und diesen jederzeit in der App wiederfinden,
So that ich weiss, dass dies kein Medizinprodukt ist.

**Acceptance Criteria:**

**Given** ein neuer Nutzer öffnet die App zum ersten Mal nach Login
**When** die App geladen wird
**Then** wird ein Disclaimer-Dialog angezeigt ("Kein Medizinprodukt"-Hinweis) (FR41)
**And** der Disclaimer-Text ist als Constant definiert (nicht hardcoded in der UI)
**And** der Nutzer muss den Disclaimer bestätigen, bevor er die App nutzen kann
**And** unter dem "Mehr"-Tab ist der Disclaimer jederzeit einsehbar
**And** die "Mehr"-Seite zeigt auch eine Option "Account löschen" (Platzhalter für Story 1.7)

### Story 1.7: Account- und Daten-Löschung
As a Patient,
I want meinen Account und alle zugehörigen Daten vollständig löschen können,
So that ich die Kontrolle über meine Gesundheitsdaten behalte (FR42, NFR13).

**Acceptance Criteria:**

**Given** ein authentifizierter Patient auf der "Mehr"-Seite
**When** der Patient "Account löschen" auswählt
**Then** wird ein Bestätigungs-Dialog mit klarer Warnung angezeigt
**And** nach Bestätigung wird `deleted_at` auf dem Account gesetzt (Soft-Delete)
**And** der Patient wird ausgeloggt und zur Login-Seite weitergeleitet
**And** innerhalb von 30 Tagen werden alle Daten (DB-Einträge, Audio, Fotos) durch den wöchentlichen Cron-Job unwiderruflich gelöscht (NFR13)
**And** ein erneuter Login mit der gleichen Apple ID erstellt einen neuen, leeren Account

---

## Epic 2: Text-Erfassung & KI-Extraktion

**Ziel:** Kern-Erfassungsfluss per Text mit vollständiger KI-Pipeline (Extraktion, Klassifikation, Review)
**FRs:** FR2, FR4, FR5, FR7, FR8, FR9, FR11, FR12, FR15
**Architektur:** KI-Pipeline (Claude Sonnet für Extraktion), Provider-Abstraktion `src/lib/ai/`, Server Action Pattern (Zod→Auth→DB), ActionResult<T>
**UX:** Chat-as-Interface (ChatBubble, ReviewBubble, InputBar, ChatFeed), Konfidenz-Indikatoren, Conversational Correction

### Story 2.1: Chat-UI mit Text-Eingabe und ChatFeed

As a Patient,
I want Symptome in einem Chat-Interface per Textnachricht erfassen,
So that die Erfassung sich natürlich und schnell anfühlt wie eine Messenger-App (FR2).

**Acceptance Criteria:**

**Given** ein authentifizierter Patient auf dem Erfassungs-Tab
**When** der Patient eine Textnachricht eingibt und absendet
**Then** wird die Nachricht als ChatBubble im ChatFeed angezeigt
**And** die InputBar ist immer am unteren Bildschirmrand sichtbar
**And** der ChatFeed scrollt automatisch zur neuesten Nachricht
**And** die `symptom_events`-Tabelle wird erstellt mit `id`, `account_id`, `event_type`, `raw_input`, `status`, `created_at`, `ended_at`
**And** die Textnachricht wird als `symptom_event` mit `status: 'pending'` in der DB gespeichert
**And** eine Verarbeitungs-Bestätigung (System-Bubble) wird sofort angezeigt (FR9)
**And** Touch-Targets sind mindestens 44x44px (Apple HIG)
**And** der App-Start bis InputBar bereit ist < 3 Sekunden (NFR1)

### Story 2.2: KI-Extraktion und Klassifikation mit Provider-Abstraktion
As a System,
I want strukturierte Daten aus Freitext-Eingaben extrahieren, automatisch zwischen Symptom- und Medikamenten-Events unterscheiden, und mehrere Symptome/Medikamente aus einer Eingabe separat erkennen,
So that die unstrukturierte Eingabe in medizinisch verwertbare, korrekt klassifizierte Daten umgewandelt wird (FR7, FR8).

**Acceptance Criteria:**

**Given** ein `symptom_event` mit `status: 'pending'` existiert
**When** die KI-Extraktion ausgelöst wird
**Then** wird die Provider-Abstraktion in `src/lib/ai/` genutzt (Claude Sonnet als Standard-Provider)
**And** die Extraktion gibt ein `MultiExtractionResult` (Array) zurück — ein Eintrag pro erkanntes Symptom/Medikament
**And** das erste Ergebnis aktualisiert das bestehende `symptom_event`, weitere Ergebnisse erzeugen neue `symptom_events`
**And** die `extracted_data`-Tabelle wird pro Event befüllt mit `symptom_event_id`, `field_name`, `value`, `confidence`, `confirmed`
**And** das `event_type`-Feld wird pro Event korrekt auf `'symptom'` oder `'medication'` gesetzt (FR8)
**And** bei Symptom-Events: extrahierte Felder umfassen Symptombezeichnung, Körperregion, Seite (links/rechts/beidseits), Art, Intensität (1-10)
**And** bei Medikamenten-Events: extrahierte Felder umfassen Medikamentenname, Einnahme/vergessen, Dosis, Grund (FR4)
**And** jedes extrahierte Feld hat einen Konfidenz-Score (0-100%)
**And** der `symptom_event`-Status wird auf `'extracted'` gesetzt
**And** die Extraktion ist innerhalb von < 10 Sekunden abgeschlossen (gemessen vom Server Action Start bis `status: 'extracted'` in der DB, NFR2)
**And** bei API-Ausfall wird der Event-Status auf `'extraction_failed'` gesetzt und kann nachgeholt werden (NFR19)
**And** Server Action folgt dem Zod→Auth→DB Pattern mit `ActionResult<T>`
**And** die ChatBubble zeigt visuell unterschiedliche Styles für Symptom- vs. Medikamenten-Events
**And** bei Multi-Symptom-Eingaben (z.B. "Kopfschmerzen und Nackenschmerzen") werden separate ReviewBubbles pro Symptom angezeigt

### Story 2.3: Review-Ansicht mit Konfidenz-Indikatoren
As a Patient,
I want die KI-extrahierten Daten überprüfen und den Konfidenz-Score jedes Feldes sehen,
So that ich die Qualität der Extraktion einschätzen und bei Bedarf korrigieren kann (FR12, FR15).

**Acceptance Criteria:**

**Given** ein `symptom_event` mit Status `'extracted'`
**When** die Review-Ansicht angezeigt wird
**Then** werden alle extrahierten Felder in einer ReviewBubble im ChatFeed dargestellt
**And** jedes Feld zeigt einen Konfidenz-Indikator: Hoch (≥85% Teal), Mittel (70-84% Amber), Niedrig (<70% Terracotta)
**And** der Patient kann jedes Feld antippen um es zu bearbeiten/korrigieren
**And** bestätigte Felder werden als `confirmed: true` markiert
**And** korrigierte Felder werden mit dem neuen Wert und `confirmed: true` gespeichert
**And** nach Bestätigung wird der Event-Status auf `'confirmed'` gesetzt
**And** Korrekturen werden in einer `corrections`-Tabelle protokolliert (Basis für FR13 in Epic 3)

### Story 2.4: Conversational Correction bei niedriger Konfidenz
As a Patient,
I want bei unsicheren Extraktionen eine gezielte Nachfrage erhalten statt selbst alle Felder prüfen zu müssen,
So that die Erfassung schneller und genauer wird (FR11).

**Acceptance Criteria:**

**Given** ein extrahiertes Feld hat eine Konfidenz unter 70%
**When** die Review-Ansicht aufgebaut wird
**Then** zeigt das System eine gezielte Nachfrage als ChatBubble (z.B. "Oberer oder unterer Rücken?")
**And** Auswahloptionen werden als tippbare Chips/Buttons angezeigt
**And** der Patient kann eine Option auswählen oder eine freie Textantwort geben
**And** die Antwort aktualisiert das extrahierte Feld und setzt `confirmed: true`
**And** mehrere unsichere Felder werden sequentiell nachgefragt (nicht alle gleichzeitig)

### Story 2.5: Symptom beenden und Dauer berechnen
As a Patient,
I want ein aktives Symptom als beendet markieren können,
So that die Dauer meiner Symptome automatisch berechnet und dokumentiert wird (FR5).

**Acceptance Criteria:**

**Given** ein bestätigter Symptom-Event existiert ohne `ended_at`
**When** der Patient das Symptom als beendet markiert (über ChatFeed oder spezifische Aktion)
**Then** wird `ended_at` auf dem Event gesetzt
**And** die Dauer wird berechnet (`ended_at - created_at`) und angezeigt
**And** eine Bestätigungs-Bubble zeigt "Symptom beendet — Dauer: X Stunden/Minuten"
**And** beendete Symptome sind im ChatFeed als abgeschlossen erkennbar (visueller Indikator)

---

## Epic 3: Sprach-Erfassung & Foto-Dokumentation

**Ziel:** Audio-Erfassung mit Schweizerdeutsch-Transkription, Foto-Upload, Push-Notifications und KI-Lernfähigkeit
**FRs:** FR1, FR3, FR6, FR10, FR13, FR14
**Architektur:** Whisper API (STT), Supabase Storage (Private Buckets, Signed URLs), Web Push API, Serwist Service Worker
**UX:** Hold-to-Record Geste (WhatsApp-Pattern), Foto-Anhang-UI, Asynchroner Push-Review-Loop

### Story 3.1: Hold-to-Record Audio-Erfassung

As a Patient,
I want ein Symptom per Spracheingabe mit einer Hold-to-Record Geste erfassen,
So that ich Symptome schnell und freihändig dokumentieren kann (FR1).

**Acceptance Criteria:**

**Given** ein authentifizierter Patient auf dem Erfassungs-Tab
**When** der Patient den Mikrofon-Button gedrückt hält (Hold-to-Record, WhatsApp-Pattern)
**Then** beginnt die Audio-Aufnahme mit visuellem Feedback (Pulsierender Indikator, Aufnahmedauer)
**And** beim Loslassen wird die Aufnahme gestoppt
**And** die Audio-Datei wird in Supabase Storage (Private Bucket) hochgeladen
**And** ein `symptom_event` mit `event_type: 'voice'` und `status: 'pending'` wird erstellt
**And** die `audio_url` wird als Signed URL referenziert (kein direkter Download-Link, NFR10)
**And** eine Verarbeitungs-Bestätigung (System-Bubble) erscheint sofort im ChatFeed (FR9)
**And** ein expliziter Cancel-Button neben dem Hold-to-Record ermöglicht den Abbruch der Aufnahme

### Story 3.2: Schweizerdeutsch-Transkription via Whisper API

As a System,
I want Schweizerdeutsche Spracheingaben ins Hochdeutsche transkribieren,
So that die KI-Extraktion auf standardisiertem Deutsch arbeiten kann (FR6).

**Acceptance Criteria:**

**Given** ein Audio-Event mit `status: 'pending'` existiert in Supabase Storage
**When** die Transkription gestartet wird
**Then** wird die Audio-Datei an die Whisper API gesendet mit Schweizerdeutsch-Konfiguration (NFR18)
**And** die hochdeutsche Transkription wird im `raw_input`-Feld des Events gespeichert
**And** der Event-Status wird auf `'transcribed'` gesetzt
**And** die Transkription wird als ChatBubble im Feed angezeigt
**And** anschliessend wird automatisch die KI-Extraktion aus Epic 2 (Story 2.2) ausgelöst
**And** Transkription + Extraktion zusammen < 10 Sekunden (NFR2)
**And** bei Whisper-API-Ausfall wird der Status auf `'transcription_failed'` gesetzt und kann nachgeholt werden

### Story 3.3: Foto-Upload zu Symptom-Events

As a Patient,
I want ein oder mehrere Fotos zu einem Symptom-Event anhängen,
So that visuelle Informationen (z.B. Hautausschlag, Schwellung) dokumentiert werden (FR3).

**Acceptance Criteria:**

**Given** ein authentifizierter Patient im Erfassungs-Tab
**When** der Patient das Foto-Icon in der InputBar antippt
**Then** kann der Patient ein Foto aufnehmen (Kamera) oder aus der Galerie wählen
**And** mehrere Fotos können zu einem Event hinzugefügt werden
**And** Fotos werden in Supabase Storage (Private Bucket) hochgeladen
**And** die `event_photos`-Tabelle wird erstellt mit `id`, `symptom_event_id`, `storage_path`, `created_at`
**And** Fotos sind nur per Signed URL zugänglich (kein direkter Download, NFR10)
**And** eine Vorschau der angehängten Fotos wird im ChatFeed angezeigt
**And** Fotos können vor dem Absenden entfernt werden

### Story 3.4: Push-Benachrichtigung nach KI-Verarbeitung

As a Patient,
I want eine Push-Benachrichtigung erhalten wenn die KI-Extraktion abgeschlossen ist,
So that ich die Ergebnisse überprüfen kann, auch wenn ich die App verlassen habe (FR10).

**Acceptance Criteria:**

**Given** ein Symptom-Event wird asynchron verarbeitet (Transkription + Extraktion)
**When** die KI-Verarbeitung abgeschlossen ist
**Then** wird eine Web Push Notification an den Patienten gesendet (NFR21)
**And** die Notification enthält eine sinnvolle Nachricht (z.B. "Dein Symptom wurde verarbeitet — tippe zum Überprüfen")
**And** Tippen auf die Notification öffnet die App direkt bei der Review-Ansicht des Events
**And** der Push-Subscription-Flow wird beim ersten Aufruf des Erfassungs-Tabs angeboten (opt-in)
**And** der `use-push-notifications` Hook verwaltet Subscription und Permission
**And** Push funktioniert über den in Epic 1 eingerichteten Service Worker (Serwist)

### Story 3.5: KI-Lernen aus Patienten-Korrekturen

As a System,
I want aus den Korrekturen des Patienten lernen und die Erkennungsqualität über Zeit verbessern,
So that wiederkehrende Symptome des Patienten schneller und genauer erkannt werden (FR13).

**Acceptance Criteria:**

**Given** Korrekturdaten in der `corrections`-Tabelle (aus Story 2.4) existieren
**When** eine neue Extraktion für denselben Patienten durchgeführt wird
**Then** werden bisherige Korrekturen als Kontext an die KI-Pipeline übergeben
**And** die Konfidenz für bereits korrigierte Muster steigt bei wiederholtem Auftreten
**And** die Korrektur-Historie pro Patient ist abrufbar (für Prompt-Enrichment)
**And** maximal die letzten 50 Korrekturen werden berücksichtigt (Performance-Limit)

### Story 3.6: Persönliches Symptom-Vokabular

As a Patient,
I want dass das System mein persönliches Symptom-Vokabular aufbaut und erkennt,
So that meine individuellen Beschreibungen (z.B. "Stächä" für stechender Schmerz) korrekt zugeordnet werden (FR14).

**Acceptance Criteria:**

**Given** ein Patient hat mehrfach bestimmte Begriffe verwendet und bestätigt/korrigiert
**When** das System das Vokabular aktualisiert
**Then** wird die `patient_vocabulary`-Tabelle erstellt mit `account_id`, `patient_term`, `mapped_term`, `usage_count`
**And** bei neuen Eingaben werden erkannte Vokabular-Begriffe automatisch zugeordnet
**And** das Vokabular wird bei der Extraktion als zusätzlicher Kontext mitgegeben
**And** der Patient kann sein Vokabular unter "Mehr" einsehen (Read-only)

---

## Epic 4: Patienten-Auswertung

**Ziel:** Dashboard mit chronologischem Feed, Timeline, Ranking und Detail-Ansicht für den Patienten
**FRs:** FR16, FR17, FR18, FR19, FR20
**Architektur:** Server Components für Dashboard, Skeleton-Screens, DB-Queries mit account_id-basiertem RLS
**UX:** Bottom-Tab "Auswertung", Skeleton-Screens für Loading States, Anti-Tagebuch (leerer Zustand = guter Tag)

### Story 4.1: Chronologischer Symptom-Feed

As a Patient,
I want meine erfassten Symptom-Events in einem chronologischen Feed ansehen,
So that ich einen schnellen Überblick über meine Gesundheitshistorie bekomme (FR16).

**Acceptance Criteria:**

**Given** ein authentifizierter Patient wechselt zum "Auswertung"-Tab
**When** der Feed geladen wird
**Then** werden alle bestätigten Events chronologisch sortiert angezeigt (neueste zuerst)
**And** jeder Eintrag zeigt: Datum/Uhrzeit, Symptombezeichnung, Event-Typ (Symptom/Medikament), Intensität
**And** Symptom- und Medikamenten-Events sind visuell unterscheidbar
**And** ein Skeleton-Screen wird während des Ladens angezeigt
**And** bei leerem Zustand wird eine freundliche Nachricht angezeigt ("Kein Eintrag — ein guter Tag!", Anti-Tagebuch UX)
**And** der Feed lädt mit 6 Monaten Daten in < 2 Sekunden (NFR3)
**And** Infinite Scroll oder Pagination für ältere Einträge

### Story 4.2: Timeline-Ansicht über Monate

As a Patient,
I want eine visuelle Timeline-Ansicht meiner Symptome über mehrere Monate,
So that ich Muster und Häufungen zeitlich erkennen kann (FR17).

**Acceptance Criteria:**

**Given** ein Patient auf dem Auswertung-Tab
**When** der Patient die Timeline-Ansicht auswählt
**Then** wird eine monatliche Übersicht der Events dargestellt
**And** jeder Monat zeigt die Anzahl und Verteilung der Events visuell (z.B. Balken oder Punkte pro Tag)
**And** der Patient kann zwischen Monaten navigieren (vor/zurück)
**And** Tippen auf einen Tag zeigt die Events dieses Tages
**And** ein Skeleton-Screen wird während des Ladens angezeigt
**And** der aktuelle Monat wird als Standard angezeigt

### Story 4.3: Symptom-Häufigkeits-Ranking mit Trendlinien

As a Patient,
I want ein Ranking meiner häufigsten Symptome mit Trendlinien sehen,
So that ich verstehe welche Symptome zunehmen oder abnehmen (FR18).

**Acceptance Criteria:**

**Given** ein Patient auf dem Auswertung-Tab
**When** der Patient die Ranking-Ansicht auswählt
**Then** werden Symptome nach Häufigkeit absteigend sortiert angezeigt
**And** jedes Symptom zeigt die Gesamtanzahl und eine Trendlinie (monatliche Aggregation, 3 Datenpunkte)
**And** Trendlinien zeigen ob ein Symptom zunimmt (↑), abnimmt (↓) oder stabil bleibt (→) basierend auf linearer Regression über die 3 Monatswerte
**And** der Zeitraum ist filterbar (letzte 30 Tage, 3 Monate, 6 Monate, alle)
**And** Medikamenten-Events sind separat vom Symptom-Ranking darstellbar
**And** ein Skeleton-Screen wird während des Ladens angezeigt

### Story 4.4: Event-Detail-Ansicht

As a Patient,
I want einzelne Symptom-Events im Detail ansehen können, inklusive Audio, Fotos und extrahierte Daten,
So that ich alle erfassten Informationen zu einem Event nachvollziehen kann (FR19).

**Acceptance Criteria:**

**Given** ein Patient tippt auf einen Event im Feed, der Timeline oder dem Ranking
**When** die Detail-Ansicht geöffnet wird
**Then** werden alle extrahierten Felder mit Konfidenz-Indikatoren angezeigt
**And** falls vorhanden: die Original-Audio-Aufnahme ist abspielbar (Signed URL, Stream)
**And** falls vorhanden: angehängte Fotos werden in einer Galerie-Ansicht dargestellt
**And** die Transkription (bei Spracheingabe) wird angezeigt
**And** Datum, Uhrzeit, Dauer (wenn beendet) und Event-Typ sind sichtbar
**And** ein Zurück-Button führt zur vorherigen Ansicht

### Story 4.5: Events und Daten löschen

As a Patient,
I want einzelne Events oder alle meine Daten löschen können,
So that ich volle Kontrolle über meine gespeicherten Gesundheitsdaten habe (FR20).

**Acceptance Criteria:**

**Given** ein Patient in der Event-Detail-Ansicht oder im Feed
**When** der Patient "Event löschen" auswählt
**Then** wird ein Bestätigungs-Dialog angezeigt
**And** nach Bestätigung wird der Event und alle zugehörigen Daten (Audio, Fotos, extrahierte Daten) gelöscht
**And** der Feed aktualisiert sich sofort
**And** unter "Mehr" kann der Patient auch "Alle Daten löschen" wählen (löscht alle Events, behält Account)
**And** auch bei "Alle Daten löschen" wird ein Bestätigungs-Dialog mit Warnung angezeigt

---

## Epic 5: Sharing-System & Daten-Souveränität

**Ziel:** Komplettes Sharing-System mit Link-Generierung, E-Mail-Versand, Zugriffskontrolle und Audit-Log
**FRs:** FR21, FR22, FR23, FR24, FR26, FR38, FR39, FR40
**Architektur:** Zwei-Stufen-Token (URL-Token → HttpOnly Cookie), Middleware (Sharing-Cookie), native Mail-App (mailto:), Audit-Log (append-only), DB-Migrationen für sharing_links + audit_log
**UX:** Sharing-Dialog mit Zeitraum/Dauer-Auswahl, E-Mail-Eingabe

### Story 5.1: Sharing-Link generieren mit Zeitraum und Zugriffsdauer

As a Patient,
I want einen Sharing-Link für meinen Arzt generieren und dabei Zeitraum und Zugriffsdauer festlegen,
So that mein Arzt nur die relevanten Daten für einen begrenzten Zeitraum sehen kann (FR21, FR22, FR23).

**Acceptance Criteria:**

**Given** ein authentifizierter Patient auf der Auswertung- oder Mehr-Seite
**When** der Patient "Für Arzt teilen" auswählt
**Then** öffnet sich ein Sharing-Dialog
**And** der Patient kann den Datenzeitraum auswählen (z.B. letzte 30 Tage, 3 Monate, 6 Monate, individuell)
**And** der Patient kann die Zugriffsdauer festlegen (z.B. 24h, 7 Tage, 30 Tage)
**And** die `sharing_links`-Tabelle wird erstellt mit `id`, `account_id`, `token`, `date_from`, `date_to`, `expires_at`, `created_at`
**And** der Token ist kryptographisch sicher generiert (nicht erratbar, nicht aufzählbar, NFR9)
**And** der generierte Link wird angezeigt und ist kopierbar
**And** der Patient sieht eine Übersicht seiner aktiven Sharing-Links unter "Mehr"

### Story 5.2: Sharing-Link per E-Mail versenden (native Mail-App)

As a Patient,
I want den Sharing-Link über meine eigene E-Mail-App an meinen Arzt versenden,
So that der Arzt sofort sieht von wem die Einladung kommt und ich die Kontrolle über den Versand behalte (FR24).

**Acceptance Criteria:**

**Given** ein Sharing-Link wurde in Story 5.1 generiert
**When** der Patient "Per E-Mail senden" auswählt
**Then** öffnet sich die Standard-Mail-App des Geräts (via `mailto:`-Link)
**And** der E-Mail-Entwurf ist automatisch vorausgefüllt mit: Betreff, Sharing-Link, Zeitraum-Info und Hinweis zur Zugriffsdauer
**And** der Patient kann den Entwurf vor dem Versand anpassen (Empfänger, Text)
**And** der Patient versendet die E-Mail selbst über seine private E-Mail-Adresse
**And** der Arzt erkennt den Absender als seinen Patienten
**And** optional kann der Patient den Link auch manuell kopieren (Copy-to-Clipboard Button als Alternative)

### Story 5.3: Arzt-Zugriff über Sharing-Link (Zwei-Stufen-Token)

As a Arzt,
I want über den Sharing-Link ohne Login auf das Patienten-Dashboard zugreifen,
So that ich die Daten meines Patienten ohne eigenen Account einsehen kann (FR26).

**Acceptance Criteria:**

**Given** ein Arzt klickt auf einen gültigen Sharing-Link
**When** der Link aufgerufen wird
**Then** wird der URL-Token validiert (Existenz, nicht abgelaufen)
**And** ein HttpOnly Cookie wird gesetzt mit `SameSite=Strict` und `Secure` (Zwei-Stufen-Token, Session, NFR7/NFR9)
**And** der Arzt wird zum Arzt-Dashboard weitergeleitet
**And** die Middleware erkennt den Sharing-Cookie und gewährt Zugriff auf die Sharing-Routen
**And** bei ungültigem oder abgelaufenem Token wird eine freundliche Fehlerseite angezeigt
**And** Audio und Fotos sind nur per Stream/Ansicht zugänglich, kein Download (FR40, NFR10)

### Story 5.4: Automatisches Ablaufen von Sharing-Links

As a System,
I want Sharing-Links nach der festgelegten Zugriffsdauer automatisch ungültig machen,
So that der Datenzugriff zeitlich begrenzt ist und die Daten-Souveränität gewahrt bleibt (FR39).

**Acceptance Criteria:**

**Given** ein Sharing-Link mit gesetzter `expires_at`
**When** die Zugriffsdauer abgelaufen ist
**Then** wird der Zugriff über den Link verweigert
**And** der Arzt sieht eine Meldung "Dieser Link ist abgelaufen"
**And** die Middleware prüft `expires_at` bei jedem Request
**And** der Patient kann unter "Mehr" abgelaufene Links sehen und aktive Links vorzeitig widerrufen
**And** abgelaufene Links werden nicht aus der DB gelöscht (Audit-Trail)

### Story 5.5: Audit-Log für Datenzugriffe

As a Patient,
I want im Audit-Log einsehen wer wann auf meine Daten zugegriffen hat,
So that ich volle Transparenz über den Zugriff auf meine Gesundheitsdaten habe (FR38, NFR11).

**Acceptance Criteria:**

**Given** ein Arzt greift über einen Sharing-Link auf Patientendaten zu
**When** der Zugriff stattfindet
**Then** wird ein Eintrag im `audit_log` erstellt (append-only, NFR11)
**And** der Eintrag enthält: `sharing_link_id`, `accessed_at`, `ip_address` (gehasht), `action` (z.B. 'dashboard_view', 'event_detail', 'audio_stream')
**And** die `audit_log`-Tabelle ist unveränderbar (INSERT only, kein UPDATE/DELETE via RLS)
**And** der Patient kann unter "Mehr" → "Zugriffsprotokolle" seine Audit-Logs einsehen
**And** jeder Eintrag zeigt: Datum/Uhrzeit, Sharing-Link-Referenz, Art des Zugriffs

---

## Epic 6: Arzt-Dashboard & PDF-Export

**Ziel:** Vollständiges Arzt-Dashboard mit KI-Zusammenfassung, Timeline, Ranking, Drill-Down und PDF-Export
**FRs:** FR25, FR27, FR28, FR29, FR30, FR31, FR32, FR33
**Architektur:** Arzt-Theme (Professional Slate), Summary-Cache (`sharing_summaries`), `@react-pdf/renderer`, Audio-Streaming (Signed URLs), Middleware (Sharing-Cookie Auth)
**UX:** Arzt-Theme, Responsive Layout (Handy/iPad/Desktop), Drill-Down mit Audio-Player und Foto-Viewer

### Story 6.1: Arzt-Dashboard Layout mit Theme und KI-Zusammenfassung

As a Arzt,
I want eine KI-generierte Zusammenfassung des Patientenzeitraums auf dem Dashboard sehen,
So that ich schnell einen Überblick über den Zustand meines Patienten bekomme (FR27).

**Acceptance Criteria:**

**Given** ein Arzt hat über einen gültigen Sharing-Link Zugriff
**When** das Arzt-Dashboard geladen wird
**Then** wird das Arzt-Theme (Professional Slate `#374955`) via `data-theme="doctor"` aktiviert
**And** eine KI-generierte Zusammenfassung des Zeitraums wird prominent angezeigt
**And** die Zusammenfassung wird in `sharing_summaries` gecacht (Invalidierung bei neuen Symptomen im Zeitraum)
**And** bei erster Generierung wird ein Loading-State angezeigt
**And** das Dashboard lädt beim ersten Klick in < 3 Sekunden (NFR5)
**And** das Layout ist responsive: Handy, iPad und Desktop (FR33)

### Story 6.2: Arzt-Timeline mit allen Events

As a Arzt,
I want die Timeline mit allen Symptom- und Medikamenten-Events des Patienten einsehen,
So that ich den zeitlichen Verlauf der Beschwerden nachvollziehen kann (FR28).

**Acceptance Criteria:**

**Given** ein Arzt auf dem Dashboard
**When** die Timeline-Ansicht angezeigt wird
**Then** werden alle Events im gewählten Zeitraum chronologisch dargestellt
**And** Symptom-Events und Medikamenten-Events sind visuell unterscheidbar
**And** jeder Event zeigt: Datum, Symptombezeichnung, Intensität, Dauer (wenn beendet)
**And** die Timeline nutzt dieselbe Datenquelle wie die Patienten-Timeline (gleiche Queries, anderes Theme)
**And** ein Skeleton-Screen wird während des Ladens angezeigt

### Story 6.3: Arzt-Symptom-Ranking mit Trendlinien

As a Arzt,
I want ein Symptom-Ranking mit Trendlinien sehen,
So that ich die häufigsten und sich verändernden Beschwerden des Patienten identifizieren kann (FR29).

**Acceptance Criteria:**

**Given** ein Arzt auf dem Dashboard
**When** die Ranking-Ansicht angezeigt wird
**Then** werden Symptome nach Häufigkeit im Sharing-Zeitraum sortiert
**And** Trendlinien zeigen den Verlauf (zunehmend/abnehmend/stabil)
**And** das Ranking nutzt das Arzt-Theme (Professional Slate)
**And** die Darstellung ist responsive (Tabelle auf Desktop, Karten auf Handy)

### Story 6.4: Arzt Drill-Down mit Audio-Stream und Foto-Ansicht

As a Arzt,
I want in einzelne Events eintauchen und Original-Audio sowie Fotos ansehen können,
So that ich die Patientenangaben im Detail nachvollziehen kann (FR30, FR31, FR32).

**Acceptance Criteria:**

**Given** ein Arzt tippt auf einen Event in der Timeline oder im Ranking
**When** die Detail-Ansicht (Drill-Down) geöffnet wird
**Then** werden alle extrahierten Felder mit Konfidenz-Indikatoren angezeigt
**And** Original-Audio-Aufnahmen sind per Stream abspielbar (Signed URL, < 1 Sekunde Start, NFR6)
**And** Audio kann nicht heruntergeladen werden (Stream only, FR31, NFR10)
**And** Fotos werden in einer Galerie-Ansicht dargestellt (FR32)
**And** Fotos können nicht heruntergeladen werden (Ansicht only, NFR10)
**And** die Transkription wird neben dem Audio-Player angezeigt
**And** ein Zurück-Button führt zur vorherigen Ansicht

### Story 6.5: PDF-Report generieren und herunterladen

As a Patient,
I want einen PDF-Report meiner Symptom-Daten generieren und herunterladen oder drucken können,
So that ich eine physische Zusammenfassung für den Arztbesuch mitnehmen kann (FR25).

**Acceptance Criteria:**

**Given** ein authentifizierter Patient über `/app/export/pdf` oder ein Arzt über `/share/pdf?token=...`
**When** der Nutzer "PDF-Report erstellen" auswählt
**Then** wird ein PDF mit `@react-pdf/renderer` serverseitig generiert (API Route, shared Render-Logik mit zwei Auth-Entry-Points)
**And** der Report enthält: Zusammenfassung, Timeline, Symptom-Ranking, Event-Details
**And** der Zeitraum ist wählbar (wie beim Sharing-Link)
**And** die Generierung ist in < 20 Sekunden abgeschlossen (NFR4)
**And** der PDF kann heruntergeladen oder direkt gedruckt werden
**And** der PDF enthält keine Audio-Dateien (nur Transkriptionen) und Foto-Thumbnails

---

## Epic 7: Marketing-Seite

**Ziel:** Öffentliche Landingpage mit Demo-Video und Registrierungs-Link
**FRs:** FR43, FR44
**Architektur:** Statische Route in Next.js, SEO-optimiert, kein Auth erforderlich
**UX:** Einfache Landingpage, responsive

### Story 7.1: Marketing-Landingpage mit Demo-Video

As a potenzieller Nutzer,
I want auf einer öffentlichen Seite erfahren was die App bietet und ein Demo-Video sehen,
So that ich entscheiden kann ob die App für mich relevant ist (FR43).

**Acceptance Criteria:**

**Given** ein Besucher öffnet die Marketing-URL
**When** die Seite geladen wird
**Then** wird eine ansprechende Landingpage angezeigt mit App-Beschreibung und Nutzenversprechen
**And** ein eingebettetes Demo-Video ist direkt auf der Seite abspielbar
**And** die Seite ist SEO-optimiert (Meta-Tags, Open Graph, strukturierte Daten)
**And** die Seite ist vollständig responsive (Handy, Tablet, Desktop)
**And** kein Login oder Auth ist erforderlich
**And** die Seite wird als statische Route in Next.js gerendert (optimale Performance)

### Story 7.2: Registrierungs-Link zur App

As a potenzieller Nutzer,
I want von der Marketing-Seite direkt zur App-Registrierung gelangen,
So that ich mich ohne Umwege registrieren und loslegen kann (FR44).

**Acceptance Criteria:**

**Given** ein Besucher auf der Marketing-Seite
**When** der Besucher den Registrierungs-/Start-Button klickt
**Then** wird er zur App-Login-Seite weitergeleitet
**And** der Button ist prominent platziert (Above the Fold + am Seitenende)
**And** der Disclaimer ("Kein Medizinprodukt") wird auf der Marketing-Seite sichtbar angezeigt
**And** der Call-to-Action ist klar und einladend formuliert

---

### Epic-Abhängigkeiten

```
Epic 1 ──→ Epic 2 ──→ Epic 3
              │
              ▼
           Epic 4
              │
              ▼
           Epic 5 ──→ Epic 6

Epic 7 (unabhängig)
```

### NFR-Zuordnung

| NFR-Gruppe | Primär-Epic | Sekundär |
|-----------|-------------|----------|
| Performance (NFR1-6) | Epic 2 (NFR1-2), Epic 4 (NFR3), Epic 6 (NFR4-6) | — |
| Security (NFR7-13) | Epic 1 (NFR7-8, NFR12-13), Epic 5 (NFR9-11) | Alle Epics |
| Reliability (NFR14-17) | Epic 1 (NFR14-17) | — |
| Integration (NFR18-22) | Epic 1 (NFR20), Epic 3 (NFR18, NFR21), Epic 5 (NFR22) | Epic 2 (NFR19) |
| Scalability (NFR23-25) | Epic 1 (NFR23-25) | — |
