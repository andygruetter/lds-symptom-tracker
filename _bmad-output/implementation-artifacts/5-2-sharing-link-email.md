# Story 5.2: Sharing-Link per E-Mail versenden (native Mail-App)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Patient,
I want den Sharing-Link über meine eigene E-Mail-App an meinen Arzt versenden,
So that der Arzt sofort sieht von wem die Einladung kommt und ich die Kontrolle über den Versand behalte (FR24, NFR22).

## Acceptance Criteria

1. **Given** ein Sharing-Link wurde generiert (Share-Sheet zeigt Ergebnis-Schritt)
   **When** der Patient eine Arzt-E-Mail-Adresse im E-Mail-Input eingibt
   **Then** wird die Eingabe auf gültiges E-Mail-Format validiert (client-seitig, inline Fehlermeldung)
   **And** bei gültigem Format wird die E-Mail als `mailto:`-Empfänger übernommen

2. **Given** der Patient hat optional eine E-Mail eingegeben und klickt "Per E-Mail senden"
   **When** die native Mail-App des Geräts öffnet (via `mailto:`-Link)
   **Then** ist der Entwurf vorausgefüllt mit:
   - **An:** eingegebene E-Mail-Adresse (oder leer, wenn nicht angegeben)
   - **Betreff:** "Symptom-Daten — Sharing-Link"
   - **Body:** Begrüssung, Sharing-Link (klickbar), Zeitraum-Info (z.B. "Letzte 3 Monate: 15.12.2025 – 15.03.2026"), Zugriffsdauer-Hinweis (z.B. "Der Link ist 48 Stunden gültig."), Sicherheitshinweis
   **And** der Patient kann den Entwurf vor dem Versand frei anpassen (Empfänger, Text)

3. **Given** der Patient gibt eine E-Mail im Share-Sheet ein
   **When** der Sharing-Link erstellt wird (oder nachträglich ergänzt)
   **Then** wird die E-Mail-Adresse in der `sharing_links`-Tabelle als `recipient_email` gespeichert (optionales Feld)

4. **Given** der Patient navigiert zur Sharing-Links-Übersicht (Mehr-Seite)
   **When** aktive Links mit gespeicherter Empfänger-E-Mail existieren
   **Then** wird die Empfänger-E-Mail in jedem Eintrag angezeigt (z.B. "An: dr.mueller@spital.ch")
   **And** bei Links ohne E-Mail wird kein Empfänger-Hinweis angezeigt

5. **Given** der Patient im Share-Sheet
   **When** keine E-Mail eingegeben wird
   **Then** kann der Link trotzdem generiert und kopiert werden (Copy-Button funktioniert unabhängig)
   **And** der "Per E-Mail senden" Button öffnet die Mail-App ohne vorausgefüllten Empfänger

6. **Given** der Patient gibt eine ungültige E-Mail ein (z.B. "abc" oder "dr.mueller@")
   **When** das Feld den Fokus verliert (blur)
   **Then** wird eine Validierungsmeldung unter dem Feld angezeigt ("Bitte gültige E-Mail-Adresse eingeben")
   **And** der "Per E-Mail senden" Button bleibt deaktiviert bis das Format gültig ist oder das Feld geleert wird
   **And** der Copy-Button bleibt unabhängig davon aktiv

## Tasks / Subtasks

- [x] Task 1: DB-Migration `recipient_email` Spalte (AC: #3, #4)
  - [x] 1.1 Migration erstellen: `supabase migration new story-5-2_sharing_email`
  - [x] 1.2 `ALTER TABLE sharing_links ADD COLUMN recipient_email TEXT NULL`
  - [x] 1.3 Keine neue RLS-Policy nötig — bestehende Patient-CRUD-Policies von Story 5.1 decken das Feld ab
  - [x] 1.4 TypeScript-Types in `src/types/database.ts` aktualisieren (`supabase gen types typescript`)
- [x] Task 2: Types & Schema erweitern (AC: #1, #3, #6)
  - [x] 2.1 `src/types/sharing.ts` — `CreateSharingLinkSchema` um `recipientEmail: z.string().email().optional().or(z.literal(''))` erweitern
  - [x] 2.2 `SharingLink` Type um `recipientEmail?: string | null` erweitern
  - [x] 2.3 `SharingLinkListItem` Type um `recipientEmail?: string | null` erweitern
  - [x] 2.4 E-Mail-Validierungs-Hilfsfunktion exportieren für Client-seitige Nutzung
- [x] Task 3: DB-Layer Update (AC: #3)
  - [x] 3.1 `src/lib/db/sharing.ts` — `createSharingLink()` Parameter erweitern um `recipientEmail?: string`
  - [x] 3.2 INSERT-Query um `recipient_email` erweitern
  - [x] 3.3 `getActiveSharingLinks()` SELECT um `recipient_email` erweitern
- [x] Task 4: Server Action Update (AC: #3)
  - [x] 4.1 `src/lib/actions/sharing-actions.ts` — `createSharingLink` Action erweitern: optionale E-Mail als Parameter
  - [x] 4.2 Zod-Validierung für optionales E-Mail-Format (leerer String = null)
- [x] Task 5: Share-Sheet E-Mail-Input (AC: #1, #2, #5, #6)
  - [x] 5.1 shadcn `Input`-Komponente installieren (`npx shadcn@latest add input`) falls noch nicht vorhanden
  - [x] 5.2 E-Mail-Input-Feld in `share-sheet.tsx` im Ergebnis-Schritt (nach Link-Anzeige, vor Buttons)
  - [x] 5.3 Placeholder: "E-Mail des Arztes (optional)"
  - [x] 5.4 Client-seitige Validierung bei Blur mit Inline-Fehlermeldung
  - [x] 5.5 E-Mail-State an `createSharingLink` Action übergeben
  - [x] 5.6 Kein Enter-Submit im E-Mail-Input (UX-Richtlinie: `onKeyDown` preventDefault für Enter)
- [x] Task 6: mailto:-Link Builder (AC: #2, #5)
  - [x] 6.1 `src/lib/utils/sharing-email.ts` — `buildMailtoLink()` Hilfsfunktion
  - [x] 6.2 Parameter: `{ recipientEmail?: string, sharingUrl: string, dateFrom: string, dateTo: string, accessDuration: string }`
  - [x] 6.3 Korrekte URL-Encodierung aller mailto:-Parameter (`encodeURIComponent`)
  - [x] 6.4 Body-Template (deutsch):
    ```
    Guten Tag

    Ich teile meine Symptom-Daten mit Ihnen über folgenden Link:

    {sharingUrl}

    Zeitraum: {dateFrom} – {dateTo}
    Der Link ist {accessDuration} gültig.

    Bitte beachten Sie: Der Zugang erlischt automatisch nach Ablauf der Zugriffsdauer. Die Daten sind nur zur Ansicht verfügbar (kein Download).

    Freundliche Grüsse
    ```
  - [x] 6.5 "Per E-Mail senden" Button nutzt `window.location.href = buildMailtoLink(...)` (iOS Safari + Desktop kompatibel)
  - [x] 6.6 Button deaktiviert wenn E-Mail-Validierung fehlschlägt (aber nicht wenn Feld leer — leer = erlaubt)
- [x] Task 7: Sharing-Links-Liste E-Mail-Anzeige (AC: #4)
  - [x] 7.1 `sharing-links-list.tsx` — Empfänger-E-Mail in jedem Eintrag anzeigen
  - [x] 7.2 Anzeige-Format: "An: dr.mueller@spital.ch" (truncated bei langen Adressen)
  - [x] 7.3 Wenn keine E-Mail: Feld wird nicht angezeigt (kein leerer Platzhalter)
- [x] Task 8: Tests (alle ACs)
  - [x] 8.1 Unit: `buildMailtoLink()` — mit/ohne Empfänger, korrekte Encodierung, Sonderzeichen
  - [x] 8.2 Unit: Zod-Schema Validierung — gültige E-Mail, ungültige E-Mail, leerer String, undefined
  - [x] 8.3 Unit: Server Action mit E-Mail, ohne E-Mail, mit ungültiger E-Mail (Rejection)
  - [x] 8.4 Component: Share-Sheet E-Mail-Input Interaktion (Eingabe, Blur-Validierung, leeres Feld)
  - [x] 8.5 Component: Sharing-Links-Liste mit/ohne E-Mail-Anzeige

## Dev Notes

### Abhängigkeit: Story 5.1 MUSS zuerst implementiert sein

Diese Story baut vollständig auf Story 5.1 auf. Folgende Dateien und Strukturen aus Story 5.1 werden vorausgesetzt:

```
src/
  components/sharing/
    share-sheet.tsx          → Bottom-Sheet (existiert aus 5.1)
    sharing-links-list.tsx   → Liste aktiver Links (existiert aus 5.1)
  lib/
    db/sharing.ts            → createSharingLink(), getActiveSharingLinks()
    actions/sharing-actions.ts → Server Actions
    utils/crypto.ts          → generateSharingToken()
  types/
    sharing.ts               → CreateSharingLinkSchema, SharingLink, SharingLinkListItem
```

DB-Tabelle `sharing_links` (aus 5.1):
- `id` (UUID PK), `account_id` (FK), `token` (TEXT UNIQUE), `date_from` (DATE), `date_to` (DATE), `expires_at` (TIMESTAMPTZ), `created_at` (TIMESTAMPTZ)

**WICHTIG:** Falls Story 5.1 noch nicht implementiert ist wenn du diese Story startest → STOP, Story 5.1 zuerst implementieren.

### Architektur-Kontext (NFR22: Native Mail-App)

Das Sharing-System nutzt die **native Mail-App des Patienten** für den E-Mail-Versand (NFR22). Keine Server-seitige E-Mail-Versendung. Vorteile:

1. **Absender-Identität:** Der Arzt erkennt den Patienten anhand der privaten E-Mail-Adresse
2. **Datenschutz:** Kein E-Mail-Service nötig, keine E-Mail-Adressen bei Dritten
3. **Kosten:** Keine Infrastruktur für E-Mail-Versand (NFR25: pay-per-use only)
4. **Kontrolle:** Patient sieht und bearbeitet den Entwurf vor dem Versand

**Technische Umsetzung:** `mailto:`-Link via `window.location.href` (nicht `window.open` — Popup-Blocker auf iOS).

### UX-Design: E-Mail-Input im Share-Sheet

Aus der UX-Spezifikation (Journey 4 — Konsultations-Vorbereitung):

**Flow-Erweiterung im Ergebnis-Schritt des Share-Sheets:**
```
[Link anzeigen + Copy-Button]
[E-Mail-Input: "E-Mail des Arztes (optional)"]
[Per E-Mail senden] [Link kopieren]
```

- **Position:** Im Ergebnis-Schritt (Schritt 3), zwischen Link-Anzeige und Action-Buttons
- **Optional:** E-Mail ist NICHT Pflichtfeld — Patient kann Link auch nur kopieren
- **Validierung:** Client-seitig bei Blur, keine Server-Roundtrip-Validierung
- **Kein Enter-Submit:** `onKeyDown` preventDefault für Enter-Taste im Input (UX-Richtlinie)
- **Touch-Target:** Input-Feld und Buttons mindestens 44px (iOS-Richtlinie)
- **Pattern 3:** Bottom-Sheet für sekundäre Aktionen (konsistent mit iOS)

### mailto:-Link Spezifikation

**Format:**
```
mailto:{recipientEmail}?subject={encodedSubject}&body={encodedBody}
```

**Betreff:** `Symptom-Daten — Sharing-Link`

**Body-Template (deutsch):**
```
Guten Tag

Ich teile meine Symptom-Daten mit Ihnen über folgenden Link:

{NEXT_PUBLIC_APP_URL}/share/{token}

Zeitraum: {dateFrom} – {dateTo}
Der Link ist {accessDuration} gültig.

Bitte beachten Sie: Der Zugang erlischt automatisch nach Ablauf
der Zugriffsdauer. Die Daten sind nur zur Ansicht verfügbar
(kein Download).

Freundliche Grüsse
```

**Encoding-Regeln:**
- `encodeURIComponent()` für Subject und Body
- Zeilenumbrüche als `%0A` (nicht `%0D%0A`)
- Kein HTML im Body (rein Text)
- Umlaute werden korrekt via UTF-8 encodiert

**Fallback ohne E-Mail:**
```
mailto:?subject={encodedSubject}&body={encodedBody}
```
→ Mail-App öffnet ohne Empfänger, Patient gibt manuell ein.

### DB-Migration: `recipient_email` Spalte

```sql
-- Story 5.2: E-Mail-Versand für Sharing-Links
ALTER TABLE sharing_links ADD COLUMN recipient_email TEXT NULL;

COMMENT ON COLUMN sharing_links.recipient_email IS 'Optionale E-Mail-Adresse des Empfängers (Arzt). Wird für die Sharing-Übersicht und mailto:-Vorbefüllung genutzt.';
```

- **Nullable:** E-Mail ist optional — viele Links werden nur per Copy-Button geteilt
- **Kein Index:** Keine Suche nach E-Mail nötig (nur für Anzeige)
- **Kein UNIQUE:** Derselbe Arzt kann mehrere Links erhalten
- **Keine RLS-Änderung:** Bestehende `sharing_links_patient_select/insert` Policies von Story 5.1 greifen automatisch

### RLS-Policy Checklist (bei DB-Änderungen)

- [x] SELECT-Policy: Vorhanden aus Story 5.1 (`auth.uid() = account_id`) — deckt neues Feld ab
- [x] INSERT-Policy: Vorhanden aus Story 5.1 — neues Feld wird automatisch eingeschlossen
- [ ] UPDATE-Policy: Nicht nötig in dieser Story (E-Mail wird bei Erstellung gesetzt)
- [x] DELETE-Policy: KEINE — wie in Story 5.1 (Audit-Trail)
- [x] Neue Spalte ist nullable → kein Breaking Change für bestehende Daten

### Migrations-Konvention

- Dateiname: `XXXXX_story-5-2_sharing_email.sql`
- Generierung: `supabase migration new story-5-2_sharing_email`

### Project Structure Notes

**Neue Dateien:**
```
src/
  lib/
    utils/
      sharing-email.ts       → buildMailtoLink() Hilfsfunktion
```

**Geänderte Dateien (alle aus Story 5.1 stammend):**
```
src/
  components/sharing/
    share-sheet.tsx           → E-Mail-Input-Feld hinzufügen
    sharing-links-list.tsx    → Empfänger-E-Mail anzeigen
  lib/
    db/sharing.ts             → recipient_email Parameter
    actions/sharing-actions.ts → E-Mail in Action
  types/
    sharing.ts                → Schema + Types erweitern
    database.ts               → Supabase Gen (automatisch)
supabase/migrations/
  XXXXX_story-5-2_sharing_email.sql
```

### Established Code Patterns (aus Story 5.1 / Epic 4)

| Pattern | Wo anwenden | Referenz |
|---------|-------------|----------|
| `ActionResult<T>` | Server Action Erweiterung | `src/types/common.ts` |
| Zod → Auth → DB | `sharing-actions.ts` Erweiterung | `insights-actions.ts` |
| `useTransition` | Button-Loading beim E-Mail-Senden | `symptom-feed.tsx` |
| shadcn `Input` | E-Mail-Eingabefeld | shadcn/ui Komponente |
| Inline-Validierung (Blur) | E-Mail-Format prüfen | Zod `.email()` client-seitig |
| `encodeURIComponent` | mailto:-Link Builder | Standard Web API |

### Technische Stack-Details

| Technologie | Version | Verwendung in dieser Story |
|-------------|---------|---------------------------|
| Next.js | 16.1.6 | App Router, Server Actions |
| @supabase/supabase-js | ^2.98.0 | DB Client, Spalte hinzufügen |
| shadcn/ui (Input) | latest | E-Mail-Input-Feld |
| zod | ^4.3.6 | E-Mail-Validierung (`.email()`) |
| vitest | ^4.0.18 | Unit/Component Tests |
| TypeScript | ^5 | Type-Safety |

### Bekannte Einschränkungen & Edge Cases

1. **iOS Safari mailto:-Limit:** Body ist auf ~2000 Zeichen begrenzt. Unser Template bleibt deutlich darunter (~400 Zeichen).
2. **Desktop-Browser ohne Mail-App:** `window.location.href = "mailto:..."` hat keinen Effekt wenn keine Mail-App konfiguriert ist → kein Fehler, aber keine Aktion. Copy-Button als Fallback reicht.
3. **Encoded Umlaute:** Schweizer Sonderzeichen (ä, ö, ü, é, è) müssen korrekt UTF-8-encodiert werden → `encodeURIComponent` handhabt das automatisch.
4. **Mehrere Links an denselben Arzt:** Erlaubt. Kein UNIQUE-Constraint auf `recipient_email`.

### Abgrenzung (Out of Scope)

- **NICHT** in dieser Story: Server-seitiger E-Mail-Versand (z.B. via SendGrid, Resend)
- **NICHT** in dieser Story: E-Mail-Adressbuch / Autovervollständigung
- **NICHT** in dieser Story: Bestätigung ob E-Mail wirklich gesendet wurde (native App — kein Callback)
- **NICHT** in dieser Story: Token-Validierung und Cookie-Session (Story 5.3)
- **NICHT** in dieser Story: Link-Ablauf/Revoke UI (Story 5.4)
- **NICHT** in dieser Story: Audit-Log Einträge (Story 5.5)

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 5, Story 5.2]
- [Source: _bmad-output/planning-artifacts/prd.md — FR24 (E-Mail-Versand), NFR22 (native Mail-App, mailto:)]
- [Source: _bmad-output/planning-artifacts/architecture.md — D3 Sharing-Security, Sharing-Flow Zwei-Stufen-Token]
- [Source: _bmad-output/planning-artifacts/architecture.md — NFR22: "E-Mail-Versand über native Mail-App (mailto:-Link mit vorausgefülltem Entwurf)"]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Journey 4: Konsultations-Vorbereitung, Line 813-842]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Pattern 3: Bottom-Sheet für sekundäre Aktionen]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Component: Select (Sharing-Sheet), Input (E-Mail)]
- [Source: _bmad-output/implementation-artifacts/5-1-sharing-link-generieren.md — mailto:-Link Vorbereitung (Story 5.2), Dev Notes]
- [Source: _bmad-output/implementation-artifacts/5-1-sharing-link-generieren.md — Established Code Patterns, Project Structure]
- [Source: src/types/common.ts — ActionResult<T> Pattern]
- [Source: src/lib/db/client.ts — Supabase Client Factories]
- [Source: src/lib/actions/insights-actions.ts — Server Actions Pattern (Zod → Auth → DB)]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Task 1 war bereits durch Story 5.1 vorbereitet: `recipient_email`-Spalte in Migration und `database.ts` Types bereits vorhanden.
- Task 2.2 (`SharingLink.recipientEmail`) war ebenfalls bereits in Story 5.1 implementiert.
- `Input`-Komponente als leichtgewichtige Custom-Komponente erstellt (gleicher Stil wie bestehende shadcn-Komponenten im Projekt).
- `buildMailtoLink()` nutzt `window.location.href` (nicht `window.open`) für iOS Safari Kompatibilität.
- E-Mail-Button ist nur bei ungültiger E-Mail deaktiviert (leer = erlaubt, da E-Mail optional).
- Alle 556 Tests bestehen, keine Regressionen.

### File List

- `src/types/sharing.ts` (geändert) — Schema + Types erweitert, `isValidEmail` + `emailSchema` exportiert
- `src/lib/db/sharing.ts` (geändert) — `createSharingLink` + `rowToListItem` um `recipientEmail` erweitert
- `src/lib/actions/sharing-actions.ts` (geändert) — `createSharingLinkAction` übergibt `recipientEmail`
- `src/lib/utils/sharing-email.ts` (neu) — `buildMailtoLink()` Hilfsfunktion
- `src/components/ui/input.tsx` (neu) — Input UI-Komponente
- `src/components/sharing/share-sheet.tsx` (geändert) — E-Mail-Input, Blur-Validierung, mailto:-Button
- `src/components/sharing/sharing-links-list.tsx` (geändert) — Empfänger-E-Mail Anzeige
- `src/__tests__/lib/utils/sharing-email.test.ts` (neu) — Unit-Tests buildMailtoLink
- `src/__tests__/actions/sharing-actions.test.ts` (geändert) — E-Mail Tests ergänzt
- `src/__tests__/components/sharing/share-sheet.test.tsx` (geändert) — E-Mail-Input Tests
- `src/__tests__/components/sharing/sharing-links-list.test.tsx` (geändert) — E-Mail-Anzeige Tests
- `src/types/database.ts` (geändert) — Supabase Gen Types mit recipient_email Spalte

## Change Log

- 2026-03-15: Story 5.2 implementiert — E-Mail-Versand via native Mail-App (mailto:-Link)
- 2026-03-15: Code Review Fixes — AC#3: updateSharingLinkEmailAction hinzugefügt (E-Mail nachträglich in DB speichern), AC#2: Datumsformat DD.MM.YYYY im mailto-Body, Tests korrigiert, trim() bei E-Mail-Input
