# Story 1.7: Account- und Daten-Löschung

Status: review

## Story

As a Patient,
I want meinen Account und alle zugehörigen Daten vollständig löschen können,
So that ich die Kontrolle über meine Gesundheitsdaten behalte (FR42, NFR13).

## Acceptance Criteria

1. **Given** ein authentifizierter Patient auf der "Mehr"-Seite **When** der Patient "Account löschen" auswählt **Then** wird ein Bestätigungs-Dialog mit klarer Warnung angezeigt
2. **And** nach Bestätigung wird `deleted_at` auf dem Account gesetzt (Soft-Delete)
3. **And** der Patient wird ausgeloggt und zur Login-Seite weitergeleitet
4. **And** innerhalb von 30 Tagen werden alle Daten (DB-Einträge, Audio, Fotos) durch den wöchentlichen Cron-Job unwiderruflich gelöscht (NFR13)
5. **And** ein erneuter Login mit der gleichen Apple ID erstellt einen neuen, leeren Account

## Tasks / Subtasks

- [x]Task 1: Server Action — `deleteAccount()` (AC: #2, #3)
  - [x]`src/lib/actions/account-actions.ts` erstellen
  - [x]`deleteAccount(): Promise<ActionResult<null>>` implementieren
  - [x]Auth-Check via `supabase.auth.getUser()` (nicht getSession!)
  - [x]`accounts.deleted_at` auf aktuelle Zeit setzen via `createServerClient()` (RLS-geschützt)
  - [x]`supabase.auth.signOut()` aufrufen nach erfolgreichem Soft-Delete
  - [x]`redirect('/auth/login')` am Ende (throws — normales Verhalten)
  - [x]Error-Handling: AUTH_REQUIRED, DELETE_FAILED
  - [x]Reihenfolge KRITISCH: 1) DB soft-delete → 2) Sign-out → 3) Redirect
- [x]Task 2: Bestätigungs-Dialog Komponente (AC: #1)
  - [x]`src/components/account/delete-account-dialog.tsx` erstellen (Client Component)
  - [x]shadcn AlertDialog verwenden (role="alertdialog" für destruktive Aktionen) — falls nicht installiert: `npx shadcn@latest add alert-dialog`
  - [x]Titel: "Account löschen?"
  - [x]Warntext: 30-Tage-Frist betonen, unwiderruflich
  - [x]"Ja, Account löschen" Button (Destructive-Variante)
  - [x]"Abbrechen" Button (Outline)
  - [x]Loading-State: `isDeletingAccount` (Named, nicht generisch)
  - [x]Error-State: Inline-Fehlermeldung unter Buttons
- [x]Task 3: Mehr-Seite aktualisieren (AC: #1)
  - [x]`src/app/(app)/more/page.tsx` modifizieren
  - [x]"Account löschen" Button enablen (aktuell `disabled` mit "Kommt bald")
  - [x]`DeleteAccountDialog` integrieren — Button öffnet Dialog
  - [x]`disabled`, `opacity-50` und "Kommt bald" entfernen
  - [x]WICHTIG: Nur Account-Section ändern, Disclaimer-Section NICHT anfassen
- [x]Task 4: Supabase-Migration — pg_cron Hard-Delete (AC: #4, #5)
  - [x]`supabase/migrations/00003_hard_delete_cron.sql` erstellen
  - [x]`pg_cron` Extension aktivieren (`CREATE EXTENSION IF NOT EXISTS`)
  - [x]SQL-Funktion `cleanup_deleted_accounts()` erstellen (SECURITY DEFINER)
  - [x]Löscht `auth.users` Rows wo `accounts.deleted_at < NOW() - INTERVAL '30 days'`
  - [x]CASCADE auf `accounts.id REFERENCES auth.users(id) ON DELETE CASCADE` löscht automatisch die accounts-Zeile
  - [x]Wöchentlicher Cron-Job: `cron.schedule('cleanup-deleted-accounts', '0 3 * * 0', ...)` (Sonntag 03:00 UTC)
  - [x]Kommentar: Storage-Cleanup (Audio/Fotos) kommt wenn Epic 3 implementiert ist
- [x]Task 5: Tests (AC: #1-#5)
  - [x]Unit-Test: `src/__tests__/account-actions.test.ts` — deleteAccount() setzt deleted_at, ruft signOut auf, redirected
  - [x]Unit-Test: `src/__tests__/delete-account-dialog.test.tsx` — Dialog zeigt Warnung, Buttons, Loading-State, Error-State
  - [x]Unit-Test: `src/__tests__/more-page.test.tsx` — Update: Button enabled, öffnet Dialog
  - [x]`npm run test` verifizieren — alle Tests grün
- [x]Task 6: Build-Verifikation
  - [x]`npm run lint` fehlerfrei (nur bestehende Warnings)
  - [x]`npm run build` erfolgreich
  - [x]Keine TypeScript-Fehler

## Dev Notes

### Scope-Abgrenzung (KRITISCH)

Diese Story implementiert:
- Soft-Delete: `accounts.deleted_at = now()` + Sign-Out
- Bestätigungs-Dialog mit klarer Warnung auf der Mehr-Seite
- pg_cron Migration für automatische Hard-Delete nach 30 Tagen
- Hard-Delete via `DELETE FROM auth.users` → CASCADE löscht accounts-Zeile

Gehört NICHT in diese Story:
- **Supabase Storage Cleanup (Audio, Fotos)** → Erst relevant wenn Epic 3 (Sprach-Erfassung & Foto) implementiert ist. Die `cleanup_deleted_accounts()` Funktion wird dann erweitert.
- **Apple Sign In Token Revocation** → Apple empfiehlt Token-Widerruf bei Account-Löschung. Erfordert REST API Call zu Apple. Post-MVP Enhancement.
- **Account-Reaktivierung während 30-Tage-Frist** → Wenn gelöschter User sich erneut anmeldet, sieht er nichts (RLS filtert). Kein expliziter "Reaktivierungs"-Flow.
- **E-Mail-Bestätigung der Löschung** → Kein E-Mail-Service konfiguriert im MVP.
- **Daten-Export vor Löschung** → Post-MVP Feature.
- **Audit-Log-Eintrag für Löschung** → Erst relevant wenn `audit_log` Tabelle existiert (Epic 5).
- **Countdown-Anzeige "Account wird in X Tagen gelöscht"** → Post-MVP Enhancement.
- **middleware.ts → proxy.ts Migration** → Separates Refactoring.

### KRITISCH: Learnings aus Story 1.1 - 1.6

1. **ESLint erzwingt Import-Ordering** — Imports: `react` → `next` → externe Packages → `@/` lokale. Import-Groups mit Leerzeile trennen.
2. **Prettier-Config** — `semi: false`, `singleQuote: true`, `trailingComma: all`. Alle neuen Dateien müssen compliant sein.
3. **Test-Pattern** — Vitest + jsdom + @testing-library/react. Tests in `src/__tests__/`. Mock-Pattern für `@supabase/ssr`, `next/headers`, `next/navigation` bereits etabliert.
4. **Verschachtelte `<main>` vermeiden** — Layout stellt `<main>` bereit, Page-Komponenten nutzen `<div>`.
5. **Keine `index.ts` Barrel-Exports** — Direkte Imports auf spezifische Dateien.
6. **Non-null Assertions für env vars** — Akzeptiert (ESLint Warnings). App crasht früh wenn Env fehlt.
7. **ActionResult<T> Pattern** — Return-Type für Server Actions: `{ data: T, error: null } | { data: null, error: AppError }`. Definiert in `src/types/common.ts`.
8. **Middleware-Architektur** — `src/middleware.ts` nutzt `updateSession()`. Öffentliche Routen VOR Auth-Check. Disclaimer-Check NACH Auth-Check.
9. **getAuthUser() Helper** — `src/lib/auth/get-user.ts` für Server Components. Nutzt `createServerClient()`.
10. **Client Component Pattern** — `'use client'` am Anfang, `useState` für Loading/Error, `useRouter` für Navigation.
11. **Named Loading States** — Nie generisch `isLoading`, immer spezifisch: `isSubmitting`, `isDeletingAccount`.
12. **DisclaimerContent Reusable Component** — Pattern für wiederverwendbare Komponenten: Prop für Varianten (z.B. `headingLevel`).
13. **Dialog Accessibility** — DialogDescription immer mitgeben (Radix a11y Warning vermeiden).
14. **fireEvent statt userEvent** — `@testing-library/user-event` ist NICHT installiert. Nur `fireEvent` aus `@testing-library/react` verwenden.
15. **`redirect()` in Server Actions** — Throws intern, daher NACH Error-Handling platzieren. In Tests mit Mock abfangen: `throw new Error('REDIRECT:...')`.
16. **shadcn Button Varianten** — `variant="destructive"` für Löschen-Aktionen: `bg-destructive text-white`.

### Abhängigkeit: Story 1.6 (ABGESCHLOSSEN ✅)

Story 1.6 hat erstellt:
- Die "Mehr"-Seite (`src/app/(app)/more/page.tsx`) mit Sections "Rechtliches" und "Account"
- Einen **disabled** "Account löschen" Platzhalter mit `Trash2`-Icon, `text-destructive`, `opacity-50`, "Kommt bald"
- Den Disclaimer-Dialog und die DisclaimerContent-Komponente
- `DialogDescription` für Accessibility

Story 1.7 ersetzt NUR den disabled Platzhalter durch den funktionalen Delete-Button + Dialog. Der Rest der Mehr-Seite (Disclaimer-Section) wird NICHT verändert.

### Architektur-Entscheidung: Zwei-Phasen-Löschung

**Gewählt: Soft-Delete + Verzögertes Hard-Delete via pg_cron**

```
Phase 1 (Sofort — Server Action):
  User klickt "Account löschen" → Bestätigung im AlertDialog
  → deleteAccount(): accounts.deleted_at = NOW()
  → supabase.auth.signOut()
  → redirect('/auth/login')

Phase 2 (Nach 30 Tagen — pg_cron):
  Wöchentlicher Job (Sonntag 03:00 UTC)
  → DELETE FROM auth.users WHERE id IN (
      SELECT id FROM accounts WHERE deleted_at < NOW() - INTERVAL '30 days'
    )
  → CASCADE: accounts-Zeile + alle abhängigen Daten automatisch gelöscht
```

**Begründung:**
- DSGVO Art. 17: Löschung "ohne unangemessene Verzögerung" — 30 Tage ist akzeptable Frist
- Apple App Store Guideline 5.1.1: In-App Account-Löschung erforderlich
- Supabase PITR: Backups rotieren nach 30 Tagen automatisch
- NFR13: "unwiderruflich" nach 30 Tagen garantiert

### Datenbank-Schema (Bestehend — KEINE neuen Spalten nötig!)

```sql
-- supabase/migrations/00001_initial_schema.sql (BESTEHEND)
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ DEFAULT NULL  -- ← BEREITS VORHANDEN für Soft-Delete
);

-- RLS-Policies filtern BEREITS auf deleted_at IS NULL:
CREATE POLICY "Users can view own account"
  ON public.accounts FOR SELECT
  USING (auth.uid() = id AND deleted_at IS NULL);

CREATE POLICY "Users can update own account"
  ON public.accounts FOR UPDATE
  USING (auth.uid() = id AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = id);
```

**WICHTIG:** `deleted_at` existiert seit Story 1.3. Die RLS-Policies filtern bereits `deleted_at IS NULL`. Das Setzen von `deleted_at` macht den Account sofort unsichtbar via RLS. Keine Schema-Änderung an der accounts-Tabelle nötig.

**CASCADE-Verhalten:** `ON DELETE CASCADE` auf `accounts.id REFERENCES auth.users(id)` bedeutet: Wenn `auth.users` gelöscht wird, wird `accounts`-Zeile automatisch mit gelöscht. Der pg_cron Job muss nur `auth.users` löschen — CASCADE erledigt den Rest.

### Server Action Pattern (KRITISCH)

```typescript
// src/lib/actions/account-actions.ts
'use server'

import { redirect } from 'next/navigation'

import { createServerClient } from '@/lib/db/client'
import type { ActionResult } from '@/types/common'

export async function deleteAccount(): Promise<ActionResult<null>> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      data: null,
      error: { error: 'Nicht authentifiziert', code: 'AUTH_REQUIRED' },
    }
  }

  // Soft-Delete: deleted_at setzen (RLS macht Account sofort unsichtbar)
  const { error: dbError } = await supabase
    .from('accounts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', user.id)

  if (dbError) {
    return {
      data: null,
      error: { error: 'Löschung fehlgeschlagen', code: 'DELETE_FAILED' },
    }
  }

  // Session beenden
  await supabase.auth.signOut()

  // Redirect zu Login (throws — normales Verhalten)
  redirect('/auth/login')
}
```

**Kein `createServiceClient()` nötig:** Die Server Action nutzt `createServerClient()` mit User-Session. Das Setzen von `deleted_at` ist durch die UPDATE RLS-Policy erlaubt (`auth.uid() = id AND deleted_at IS NULL`). Admin-Operationen (`DELETE FROM auth.users`) werden NUR im pg_cron Job ausgeführt (SECURITY DEFINER).

**Warum kein `auth.admin.deleteUser()` in der Server Action?**
- Braucht Service Role Key → soll nur in API-Routen verwendet werden (Architecture: "Only use in `src/app/api/`")
- CASCADE würde accounts-Zeile sofort löschen → kein Soft-Delete-Audit-Trail
- pg_cron Job übernimmt die endgültige Auth-Löschung nach 30 Tagen

### Bestätigungs-Dialog (KRITISCH — UX-Pattern)

**Komponente:** AlertDialog (nicht regulärer Dialog) für destruktive Bestätigungen.

```bash
# Falls AlertDialog NICHT installiert:
npx shadcn@latest add alert-dialog
```

**Prüfe ob `src/components/ui/alert-dialog.tsx` existiert.** Falls ja, nutzen. Falls nein, installieren.

**Dialog-Text (Deutsch):**
- Titel: "Account löschen?"
- Beschreibung: "Dein Account und alle zugehörigen Daten werden innerhalb von 30 Tagen unwiderruflich gelöscht. Du wirst sofort abgemeldet."
- Primär-Button: "Ja, Account löschen" (variant="destructive")
- Sekundär-Button: "Abbrechen" (variant="outline")
- Loading-Text: "Account wird gelöscht..."

**Props-Interface:**
```typescript
interface DeleteAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}
```

### Mehr-Seite Modifikation (Bestehendes Layout)

Aktueller Code in `src/app/(app)/more/page.tsx` (Account-Section, Zeile ~43-59):

```typescript
{/* Account */}
<section>
  <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
    Account
  </h2>
  <div className="divide-y divide-border rounded-xl bg-card">
    <button
      disabled  // ← ENTFERNEN
      className="flex min-h-11 w-full items-center justify-between px-4 py-3 text-left opacity-50"
      // ← opacity-50 ENTFERNEN, onClick HINZUFÜGEN
    >
      <span className="flex items-center gap-3">
        <Trash2 className="size-5 text-destructive" />
        <span className="text-sm text-destructive">Account löschen</span>
      </span>
      <span className="text-xs text-muted-foreground">Kommt bald</span>
      // ← "Kommt bald" ERSETZEN durch ChevronRight
    </button>
  </div>
</section>
```

**Zu ändern:**
1. `disabled` entfernen
2. `opacity-50` entfernen
3. "Kommt bald" → `<ChevronRight className="size-4 text-muted-foreground" />` (Konsistenz mit Disclaimer-Button)
4. `onClick={() => setDeleteOpen(true)}` hinzufügen
5. `<DeleteAccountDialog open={deleteOpen} onOpenChange={setDeleteOpen} />` rendern
6. `useState(false)` für `deleteOpen` State hinzufügen

### pg_cron Migration (Hard-Delete nach 30 Tagen)

```sql
-- supabase/migrations/00003_hard_delete_cron.sql

-- pg_cron Extension aktivieren (auf Supabase Pro-Plan standardmässig verfügbar)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Cleanup-Funktion für abgelaufene Soft-Deletes
-- SECURITY DEFINER: Läuft mit Rechten des Erstellers (postgres), nicht des Aufrufers
-- Nötig weil DELETE FROM auth.users Admin-Rechte braucht
CREATE OR REPLACE FUNCTION public.cleanup_deleted_accounts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Lösche auth.users Rows → CASCADE löscht accounts automatisch
  -- Wenn in späteren Epics Media/Storage hinzukommt, hier erweitern
  DELETE FROM auth.users
  WHERE id IN (
    SELECT id FROM public.accounts
    WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - INTERVAL '30 days'
  );
END;
$$;

-- Wöchentlicher Cron-Job: Sonntag 03:00 UTC
SELECT cron.schedule(
  'cleanup-deleted-accounts',
  '0 3 * * 0',
  'SELECT public.cleanup_deleted_accounts()'
);
```

**SECURITY DEFINER + `SET search_path`:** Best Practice um SQL-Injection über search_path zu verhindern.

**HINWEIS für Entwickler:** Der pg_cron Job kann auf dem lokalen Supabase CLI nicht getestet werden (pg_cron ist nur auf gehosteten Instanzen verfügbar). Die Migration-Datei ist korrekt, aber `supabase db reset` könnte fehlschlagen wenn pg_cron nicht verfügbar ist. In dem Fall die cron-Befehle auskommentieren und manuell auf dem gehosteten Projekt ausführen.

### Re-Login nach Soft-Delete (AC #5 — Edge Case)

**Szenario:** User löscht Account → innerhalb von 30 Tagen versucht Login mit gleicher Apple ID.

**Was passiert:**
1. Apple ID OAuth erfolgreich (auth.users existiert noch)
2. Session wird erstellt, Middleware lässt durch
3. RLS filtert accounts-Zeile (deleted_at IS NOT NULL) → kein sichtbarer Account
4. Disclaimer-Check: Kein Account mit `disclaimer_accepted_at` → Redirect zu `/disclaimer`
5. User sieht Disclaimer-Seite, kann akzeptieren → aber accounts UPDATE schlägt fehl (RLS: `deleted_at IS NULL`)

**Behandlung:** Kein expliziter Re-Login-Flow im MVP. Der User steckt effektiv in einem Limbo bis zum Hard-Delete. Dies ist akzeptables Verhalten — User wurde klar über die Konsequenzen informiert.

**Nach Hard-Delete (30+ Tage):**
1. auth.users wurde gelöscht → Login erstellt NEUEN auth.users Record
2. `handle_new_user()` Trigger erstellt neue accounts-Zeile
3. Disclaimer-Flow startet von vorne → vollständig neuer Account ✅

### Anti-Patterns (VERMEIDEN)

- **NICHT** `createServiceClient()` in der Server Action verwenden — nur `createServerClient()` (RLS muss gelten)
- **NICHT** `auth.admin.deleteUser()` in der Server Action — nur im pg_cron Job (SECURITY DEFINER)
- **NICHT** generisches `isLoading` — immer `isDeletingAccount` verwenden
- **NICHT** Account-Reaktivierung implementieren — nicht in ACs gefordert
- **NICHT** Apple Token Revocation — Post-MVP (erfordert Apple REST API)
- **NICHT** Dialog als fullscreen Modal — klein, zentriert, Kontext sichtbar (UX-Spec)
- **NICHT** `supabase.auth.signOut()` VOR dem DB-Update aufrufen — erst Soft-Delete, dann Sign-Out
- **NICHT** `<main>` in Komponenten — Layout stellt `<main>` bereit
- **NICHT** `@testing-library/user-event` importieren — nicht installiert, nur `fireEvent` verwenden
- **NICHT** regulären `Dialog` für destruktive Aktionen — `AlertDialog` verwenden (role="alertdialog")

### Bestehende Dateien die modifiziert werden

- `src/app/(app)/more/page.tsx` — Delete-Button enablen, Dialog integrieren
- `src/__tests__/more-page.test.tsx` — Update: Button enabled, "Kommt bald" weg, Dialog-Test

### Neue Dateien

- `src/lib/actions/account-actions.ts` — deleteAccount() Server Action
- `src/components/account/delete-account-dialog.tsx` — Bestätigungs-AlertDialog
- `supabase/migrations/00003_hard_delete_cron.sql` — pg_cron Hard-Delete
- `src/__tests__/account-actions.test.ts` — Server Action Tests
- `src/__tests__/delete-account-dialog.test.tsx` — Dialog Tests

### Test-Pattern (KRITISCH — aus Story 1.4 + 1.6 gelernt)

**Server Action Test (account-actions.test.ts):**
```typescript
// Mock-Pattern wie disclaimer-actions.test.ts:
// 1. mockGetUser, mockEq, mockSignOut als top-level vi.fn()
// 2. vi.mock('@/lib/db/client') mit Promise.resolve chain
// 3. vi.mock('next/navigation') mit redirect mock der throws
// 4. vi.mock('next/headers') für cookies
// 5. vi.stubEnv() für Supabase URLs

// Redirect-Test-Pattern (aus auth-callback.test.ts):
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
}))

// Tests:
// - AUTH_REQUIRED wenn kein User
// - Setzt deleted_at bei Erfolg (.update().eq() chain mocken)
// - Ruft signOut() auf nach DB-Update
// - Ruft redirect('/auth/login') auf (catch REDIRECT: Error)
// - DELETE_FAILED bei DB-Error
// - signOut wird NICHT aufgerufen bei DB-Error
```

**Dialog Test (delete-account-dialog.test.tsx):**
```typescript
// Nutze fireEvent (NICHT userEvent — nicht installiert!)
// Mock deleteAccount Server Action
// Tests:
// - Dialog zeigt Titel "Account löschen?"
// - Dialog zeigt Warntext mit "30 Tagen"
// - "Abbrechen" schliesst Dialog (onOpenChange(false))
// - "Ja, Account löschen" ruft deleteAccount() auf
// - Loading-State: Button zeigt "Account wird gelöscht..."
// - Error-State: Zeigt Fehlermeldung
```

**Existing more-page.test.tsx Updates:**
```typescript
// Bestehende Tests anpassen:
// - "zeigt Account-Löschen-Platzhalter (disabled)" → Button ist NICHT mehr disabled, "Kommt bald" existiert nicht
// - Neuer Test: Button öffnet DeleteAccountDialog
```

### Project Structure Notes

- `src/components/account/` — Neues Verzeichnis für Account-bezogene Komponenten
- `DeleteAccountDialog` ist Client Component (interaktiv, State)
- Server Action `deleteAccount()` liegt neben `disclaimer-actions.ts` und `auth-actions.ts`
- pg_cron Migration folgt dem numerischen Pattern: `00003_*`
- AlertDialog eventuell neu zu installieren (`npx shadcn@latest add alert-dialog`)

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Story 1.7: Account- und Daten-Löschung, FR42, NFR13]
- [Source: _bmad-output/planning-artifacts/architecture.md — Soft-Delete + Cron Pattern, accounts ON DELETE CASCADE]
- [Source: _bmad-output/planning-artifacts/architecture.md — ActionResult<T> Pattern, Server Actions]
- [Source: _bmad-output/planning-artifacts/architecture.md — createServerClient vs createServiceClient, RLS Policies]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Destructive Actions hinter Bestätigungs-Dialog]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Named Loading States, Touch-Targets min. 44px]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Mehr-Tab: Account-Section, Dialog-Pattern]
- [Source: _bmad-output/planning-artifacts/prd.md — FR42: Account + Daten-Löschung]
- [Source: _bmad-output/planning-artifacts/prd.md — NFR13: 30-Tage Unwiderrufliche Löschung]
- [Source: _bmad-output/implementation-artifacts/1-6-disclaimer-anzeige.md — Server Action Pattern, Dialog Pattern, Test Pattern]
- [Source: _bmad-output/implementation-artifacts/1-4-apple-id-authentifizierung.md — signOut() Action, redirect Pattern]
- [Source: _bmad-output/implementation-artifacts/1-3-supabase-integration.md — accounts-Tabelle, RLS, Client Factories]
- [Source: supabase/migrations/00001_initial_schema.sql — accounts Schema, ON DELETE CASCADE, handle_new_user Trigger]
- [Source: Supabase Docs — pg_cron Extension, cron.schedule()]
- [Source: Supabase Docs — SECURITY DEFINER, SET search_path]
- [Source: DSGVO Art. 17 — Recht auf Löschung, 30-Tage-Frist]
- [Source: Apple App Store Review Guidelines 5.1.1 — In-App Account-Löschung]
- [Source: Schweizer nDSG Art. 14-15 — Recht auf Löschung besonders schützenswerter Daten]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- shadcn AlertDialog Installation erforderte manuellen "No"-Input für button.tsx Overwrite
- alert-dialog.tsx Import-Order musste nach Installation gefixed werden (ESLint import/order)

### Completion Notes List

- Task 1: Server Action `deleteAccount()` implementiert mit Auth-Check, Soft-Delete, signOut, redirect. 6 Tests grün.
- Task 2: `DeleteAccountDialog` mit AlertDialog, Warnung, Loading-State (`isDeletingAccount`), Error-State. 6 Tests grün.
- Task 3: Mehr-Seite aktualisiert — Button enabled, "Kommt bald" entfernt, DeleteAccountDialog integriert. 7 Tests grün.
- Task 4: pg_cron Migration `00003_hard_delete_cron.sql` mit SECURITY DEFINER Funktion und wöchentlichem Cron-Job.
- Task 5: Alle Tests grün (74 total, 12 neu + 2 aktualisiert in more-page).
- Task 6: Build erfolgreich, keine neuen ESLint-Errors.

### File List

Neue Dateien:
- `src/lib/actions/account-actions.ts` — deleteAccount() Server Action
- `src/components/account/delete-account-dialog.tsx` — Bestätigungs-AlertDialog
- `src/components/ui/alert-dialog.tsx` — shadcn AlertDialog (installiert via npx shadcn)
- `supabase/migrations/00003_hard_delete_cron.sql` — pg_cron Hard-Delete Migration
- `src/__tests__/account-actions.test.ts` — 6 Tests für Server Action
- `src/__tests__/delete-account-dialog.test.tsx` — 6 Tests für Dialog

Modifizierte Dateien:
- `src/app/(app)/more/page.tsx` — Delete-Button enabled, Dialog integriert
- `src/__tests__/more-page.test.tsx` — Tests aktualisiert (Button enabled, Dialog-Test)

## Change Log

- 2026-03-02: Story 1.7 implementiert — Account- und Daten-Löschung mit Soft-Delete, AlertDialog, pg_cron Migration
