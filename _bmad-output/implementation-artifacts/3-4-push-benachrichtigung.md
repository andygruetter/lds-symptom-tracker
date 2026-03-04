# Story 3.4: Push-Benachrichtigung nach KI-Verarbeitung

Status: done

## Story

As a Patient,
I want eine Push-Benachrichtigung erhalten wenn die KI-Extraktion abgeschlossen ist,
So that ich die Ergebnisse überprüfen kann, auch wenn ich die App verlassen habe (FR10).

## Acceptance Criteria

1. **Given** ein Symptom-Event wird asynchron verarbeitet (Transkription + Extraktion) **When** die KI-Verarbeitung abgeschlossen ist **Then** wird eine Web Push Notification an den Patienten gesendet (NFR21)
2. **And** die Notification enthält eine sinnvolle Nachricht (z.B. "Dein Symptom wurde verarbeitet — tippe zum Überprüfen")
3. **And** Tippen auf die Notification öffnet die App direkt bei der Review-Ansicht des Events
4. **And** der Push-Subscription-Flow wird beim ersten Aufruf des Erfassungs-Tabs angeboten (opt-in)
5. **And** der `use-push-notifications` Hook verwaltet Subscription und Permission
6. **And** Push funktioniert über den in Epic 1 eingerichteten Service Worker (Serwist)

## Tasks / Subtasks

- [x] Task 1: DB-Migration für Push-Subscriptions (AC: #4, #5)
  - [x] `supabase/migrations/00010_push_subscriptions.sql` erstellen
  - [x] `push_subscriptions`-Tabelle: `id UUID PK DEFAULT gen_random_uuid()`, `account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE`, `endpoint TEXT NOT NULL`, `keys_auth TEXT NOT NULL`, `keys_p256dh TEXT NOT NULL`, `created_at TIMESTAMPTZ DEFAULT now()`
  - [x] UNIQUE Constraint auf `(account_id, endpoint)` — ein Device pro Subscription
  - [x] RLS-Policy: Patient verwaltet nur eigene Subscriptions
  - [x] Index auf `account_id` für schnelle Abfrage beim Notification-Versand
- [x] Task 2: VAPID-Keys und web-push Setup (AC: #1)
  - [x] `npm install web-push` (Types sind seit v3.6+ im Package enthalten — KEIN separates `@types/web-push` nötig)
  - [x] VAPID-Keys generieren: `npx web-push generate-vapid-keys`
  - [x] Env-Variablen: `NEXT_PUBLIC_VAPID_KEY` (Client), `VAPID_PRIVATE_KEY` (Server-only), `VAPID_SUBJECT` (mailto:)
  - [x] `.env.local.example` mit allen neuen Variablen dokumentieren
- [x] Task 3: Push-Subscription Server Actions (AC: #4, #5)
  - [x] `src/lib/actions/push-actions.ts` erstellen (`'use server'`)
  - [x] `subscribePush(input: unknown): Promise<ActionResult<void>>` — Subscription in DB speichern
  - [x] Input-Schema: `{ endpoint: string, keys: { auth: string, p256dh: string } }`
  - [x] Zod-Validierung → Auth-Check → Upsert (ON CONFLICT DO UPDATE)
  - [x] `unsubscribePush(input: unknown): Promise<ActionResult<void>>` — Subscription aus DB entfernen
  - [x] Input-Schema: `{ endpoint: string }`
- [x] Task 4: Push-Notification senden (Server-Utility) (AC: #1, #2)
  - [x] `src/lib/push/send-notification.ts` erstellen
  - [x] **WICHTIG**: `web-push` nutzt Node.js `crypto`-Module — funktioniert NICHT in Vercel Edge Runtime. Dateien die `web-push` importieren brauchen `export const runtime = 'nodejs'` (betrifft auch API-Routes die `sendPushNotification` aufrufen).
  - [x] `sendPushNotification(accountId: string, payload: PushPayload): Promise<void>`
  - [x] `PushPayload` Typ: `{ title: string, body: string, url?: string }`
  - [x] Alle Subscriptions des Users aus DB laden (`push_subscriptions` WHERE `account_id`)
  - [x] Für jede Subscription: `webpush.sendNotification(subscription, JSON.stringify(payload))`
  - [x] Error-Handling: 410 Gone → Subscription aus DB löschen (expired/revoked)
  - [x] `webpush.setVapidDetails()` einmalig beim Modul-Load
  - [x] Nutzt `createServiceClient()` (kein Auth-Context im Pipeline-Kontext)
- [x] Task 5: Pipeline-Integration (AC: #1, #2, #3)
  - [x] `src/lib/ai/pipeline.ts` erweitern
  - [x] Nach erfolgreicher Extraktion (`status: 'extracted'`): Push-Notification senden
  - [x] Payload: `{ title: 'Symptom verarbeitet', body: 'Dein Symptom wurde verarbeitet — tippe zum Überprüfen', url: '/' }`
  - [x] `sendPushNotification` als Fire-and-Forget (`.catch()` mit Error-Logging, Pipeline nicht blockieren)
  - [x] `account_id` aus dem `symptom_event` laden (bereits in Pipeline verfügbar)
  - [x] Kein Push bei `extraction_failed` oder `transcription_failed` — nur bei Erfolg
- [x] Task 6: `use-push-notifications` Hook (AC: #4, #5, #6)
  - [x] `src/hooks/use-push-notifications.ts` erstellen
  - [x] State: `permission: NotificationPermission` (`default` | `granted` | `denied`)
  - [x] State: `isSubscribed: boolean`
  - [x] `subscribe()`: Permission anfragen → `pushManager.subscribe()` → Server Action
  - [x] `unsubscribe()`: `subscription.unsubscribe()` → Server Action
  - [x] Init: Prüft bestehende Subscription (`pushManager.getSubscription()`)
  - [x] VAPID Public Key via `process.env.NEXT_PUBLIC_VAPID_KEY`
  - [x] `urlBase64ToUint8Array()` Helper für applicationServerKey
  - [x] Graceful Degradation: `'PushManager' in window` Check, `'serviceWorker' in navigator` Check
- [x] Task 7: Opt-in Banner/Prompt (AC: #4)
  - [x] `src/components/capture/push-opt-in.tsx` erstellen (Client Component)
  - [x] Erscheint nachdem der Patient sein erstes Symptom erfasst hat (kontextueller Opt-in, nicht sofort beim Tab-Besuch — Permission === `default`)
  - [x] Nicht-invasiver Banner am oberen Bildschirmrand (nicht Modal)
  - [x] Text: "Benachrichtigungen aktivieren, um über verarbeitete Symptome informiert zu werden?"
  - [x] Buttons: "Aktivieren" (Primary) + "Später" (Muted)
  - [x] "Später" → Banner für diese Session ausblenden (`sessionStorage`)
  - [x] "Aktivieren" → `subscribe()` aufrufen
  - [x] Wenn Permission === `denied`: Banner nicht anzeigen (Browser hat blockiert)
  - [x] Wenn Permission === `granted` && subscribed: Banner nicht anzeigen
- [x] Task 8: Service Worker Push-Handler verifizieren (AC: #3, #6)
  - [x] `src/app/sw.ts` — bestehender Push-Handler aus Story 1.5 verifizieren
  - [x] Push-Event: Payload parsen → `showNotification()` (bereits implementiert)
  - [x] NotificationClick: `clients.openWindow(url)` (bereits implementiert)
  - [x] Testen: Notification-Click öffnet korrekte URL (`/` für Erfassungs-Tab)
  - [x] Optional: Tag-basierte Notification-Deduplizierung (`tag: 'symptom-processed'`)
- [x] Task 9: Tests (AC: #1-#6)
  - [x] `src/__tests__/lib/push/send-notification.test.ts` — webpush.sendNotification Mock, 410 Cleanup, Multi-Subscription
  - [x] `src/__tests__/hooks/use-push-notifications.test.ts` — Permission-States, Subscribe/Unsubscribe, Graceful Degradation
  - [x] `src/__tests__/components/push-opt-in.test.tsx` — Banner-Anzeige-Logik, Aktivieren, Später
  - [x] `src/__tests__/lib/ai/pipeline.test.ts` — Erweitert: Push nach Extraktion, kein Push bei Fehler
  - [x] `src/__tests__/push-actions.test.ts` — Subscribe/Unsubscribe Server Actions
  - [x] **Browser API Mocking-Strategie**: `vi.stubGlobal('Notification', { permission: 'default', requestPermission: vi.fn() })`, `navigator.serviceWorker.ready` Mock mit `pushManager.subscribe()` / `pushManager.getSubscription()`. Für `use-push-notifications.test.ts` und `push-opt-in.test.tsx` zwingend nötig, da `Notification`, `PushManager` und `ServiceWorkerRegistration` in jsdom nicht existieren.
  - [x] Bestehende Tests dürfen NICHT brechen
  - [x] `npm run test` verifizieren
- [x] Task 10: Build-Verifikation
  - [x] `npm run lint` fehlerfrei
  - [x] `npm run build` erfolgreich

## Dev Notes

### Scope-Abgrenzung (KRITISCH)

Diese Story implementiert:
- Web Push Subscription-Flow (opt-in Banner)
- Server-seitiger Push-Versand nach KI-Verarbeitung
- `push_subscriptions`-Tabelle in Supabase
- `use-push-notifications` Hook für Client-seitige Verwaltung
- Pipeline-Integration (Push nach erfolgreicher Extraktion)

Gehört NICHT in diese Story:
- **Push bei Symptom-Erinnerungen (Scheduling)** → Post-MVP
- **Push-Einstellungen (Frequenz, Stille Zeiten)** → Post-MVP
- **Rich Notifications (Bilder, Action-Buttons)** → Post-MVP Enhancement
- **Push für andere Events (Sharing, Account)** → Spätere Stories
- **Firebase Cloud Messaging** → Nicht gewählt, Web Push API direkt

### Abhängigkeiten

- **Story 1.5**: Serwist Service Worker mit Push-Event-Handler (bereits implementiert als Stub)
- **Story 2.2**: KI-Extraktion Pipeline (bereits implementiert)
- **Story 3.2**: Transkription in Pipeline (optional — Push funktioniert nach jeder erfolgreichen Extraktion)

### Bestehender Service Worker Push-Handler (Story 1.5)

`src/app/sw.ts` hat bereits:
```typescript
self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json() as { title?: string, body?: string, url?: string }
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'LDS Tracker', {
      body: data.body ?? '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url ?? '/' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data as { url?: string })?.url ?? '/'
  event.waitUntil(self.clients.openWindow(url))
})
```

Dieser Handler muss nur verifiziert werden — keine Änderung nötig.

### Web Push Architektur

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Browser     │     │   Server     │     │  Push Service │
│              │     │              │     │  (Google/     │
│ PushManager   │────▶│ /api/ai/     │────▶│  Apple/       │
│ .subscribe()  │     │ extract      │     │  Mozilla)     │
│              │     │              │     │              │
│ ServiceWorker │◀────│ web-push     │◀────│              │
│ push event    │     │ .sendNotif() │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
```

1. Client subscribed via `PushManager.subscribe()` → Subscription an Server
2. Pipeline verarbeitet Event → `sendPushNotification(accountId, payload)`
3. `web-push` sendet an Push-Service-Endpoint (in Subscription enthalten)
4. Push-Service leitet an Service Worker → `showNotification()`

### VAPID-Keys Setup

```bash
# Einmalig generieren (Projekt-Setup)
npx web-push generate-vapid-keys

# .env.local
NEXT_PUBLIC_VAPID_KEY=BDk... # Client-seitig (für PushManager.subscribe)
VAPID_PRIVATE_KEY=xyz...            # Server-only (für web-push.sendNotification)
VAPID_SUBJECT=mailto:app@example.com
```

### Push-Payload Format (zwischen Server und Service Worker)

```typescript
interface PushPayload {
  title: string       // "Symptom verarbeitet"
  body: string        // "Dein Symptom wurde verarbeitet — tippe zum Überprüfen"
  url?: string        // "/" (Erfassungs-Tab)
}
```

### applicationServerKey Helper

```typescript
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)))
}
```

### iOS Safari Einschränkungen

- Web Push funktioniert auf iOS nur in **installierten PWAs** (Home Screen)
- Standard Safari Browser unterstützt KEIN Web Push
- Permission-Prompt wird beim ersten `subscribe()`-Call angezeigt
- Permission wird NICHT persistent gespeichert (bei PWA-Neustart erneut nötig)
- Graceful Degradation: Wenn kein Push möglich → App funktioniert normal, User sieht Ergebnisse beim nächsten App-Öffnen

### Pipeline Fire-and-Forget Pattern

```typescript
// In pipeline.ts, nach erfolgreicher Extraktion:
sendPushNotification(event.account_id, {
  title: 'Symptom verarbeitet',
  body: 'Dein Symptom wurde verarbeitet — tippe zum Überprüfen',
  url: '/',
}).catch((err) => {
  console.error('[Push] Notification fehlgeschlagen:', err)
})
```

**Wichtig**: Push darf die Pipeline NICHT blockieren oder fehlschlagen lassen. Immer `.catch()`.

### Anti-Patterns (VERMEIDEN)

- **NICHT** Push-Permission beim App-Start anfragen — erst nach erstem erfassten Symptom (kontextueller opt-in)
- **NICHT** VAPID_PRIVATE_KEY im Client exponieren — nur `NEXT_PUBLIC_VAPID_KEY` ist Client-seitig
- **NICHT** Push synchron in Pipeline aufrufen — immer Fire-and-Forget
- **NICHT** Push bei fehlgeschlagener Extraktion senden — nur bei Erfolg
- **NICHT** `webpush.sendNotification` Result awaiten in Pipeline — `.catch()` reicht
- **NICHT** Firebase/FCM verwenden — Web Push API direkt (weniger Abhängigkeiten)
- **NICHT** Subscription in localStorage speichern — DB ist Source-of-Truth

### Neue Dateien

- `src/lib/push/send-notification.ts` — Server-seitiger Push-Versand
- `src/lib/actions/push-actions.ts` — Subscribe/Unsubscribe Server Actions
- `src/hooks/use-push-notifications.ts` — Client-seitiger Push-Hook
- `src/components/capture/push-opt-in.tsx` — Opt-in Banner
- `supabase/migrations/00010_push_subscriptions.sql`
- `src/__tests__/lib/push/send-notification.test.ts`
- `src/__tests__/hooks/use-push-notifications.test.ts`
- `src/__tests__/components/push-opt-in.test.tsx`
- `src/__tests__/push-actions.test.ts`

### Modifizierte Dateien

- `src/lib/ai/pipeline.ts` — Push nach Extraktion
- `src/app/(app)/page.tsx` — PushOptIn-Banner einbinden
- `src/types/database.ts` — Regeneriert nach Migration
- `package.json` / `package-lock.json` — `web-push` Dependency
- `src/__tests__/lib/ai/pipeline.test.ts` — Push-Tests

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 3, Story 3.4]
- [Source: _bmad-output/planning-artifacts/prd.md — FR10, NFR21]
- [Source: _bmad-output/planning-artifacts/architecture.md — Web Push API, Serwist Service Worker]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Push-Review-Loop, Notification Text]
- [Source: _bmad-output/implementation-artifacts/3-1-hold-to-record.md — sw.ts Push-Stub]
- [Source: MDN Web Docs — Push API, PushManager.subscribe()]
- [Source: web-push npm — sendNotification, setVapidDetails]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Build-Fehler: `web-push` hat keine eingebauten Types trotz Story-Spec v3.6+ Behauptung → `@types/web-push` installiert
- Build-Fehler: `webpush.setVapidDetails()` beim Modul-Load crasht Build wenn VAPID-Keys ungültig → Lazy Init mit `ensureVapidConfigured()`
- TypeScript-Fehler: `Uint8Array<ArrayBufferLike>` inkompatibel mit `BufferSource` für `applicationServerKey` → `.buffer as ArrayBuffer`
- Lint-Fehler: `react-hooks/set-state-in-effect` bei synchronem `setIsLoading(false)` → State-Init basierend auf `isSupported`, `useRef` für init-guard

### Completion Notes List

- Task 1: DB-Migration `00010_push_subscriptions.sql` erstellt mit RLS (insert/select/update/delete), UNIQUE constraint, Index
- Task 2: `web-push` v3.6.7 + `@types/web-push` installiert, `.env.local.example` um `VAPID_SUBJECT` erweitert
- Task 3: `push-actions.ts` mit `subscribePush`/`unsubscribePush` Server Actions, Zod-Validierung, Auth-Check, Upsert
- Task 4: `send-notification.ts` mit lazy VAPID-Config, Multi-Subscription Push, 410 Gone Cleanup, Fire-and-Forget
- Task 5: Pipeline-Integration — Push nach `status: 'extracted'` als Fire-and-Forget (`.catch()`)
- Task 6: `use-push-notifications` Hook — Permission-Management, Subscribe/Unsubscribe, Graceful Degradation
- Task 7: `push-opt-in.tsx` — Kontextueller Banner nach erstem Event, "Aktivieren"/"Später", Session-Dismiss
- Task 8: Service Worker verifiziert — Push + NotificationClick Handler korrekt (Story 1.5)
- Task 9: 47 neue Tests (5 Dateien) — alle bestehen, 357 Tests gesamt, 0 Regressionen
- Task 10: `npm run lint` 0 neue Errors, `npm run build` erfolgreich

### File List

New:
- supabase/migrations/00010_push_subscriptions.sql
- src/lib/push/send-notification.ts
- src/lib/actions/push-actions.ts
- src/hooks/use-push-notifications.ts
- src/components/capture/push-opt-in.tsx
- src/__tests__/lib/push/send-notification.test.ts
- src/__tests__/hooks/use-push-notifications.test.ts
- src/__tests__/components/push-opt-in.test.tsx
- src/__tests__/push-actions.test.ts

Modified:
- src/lib/ai/pipeline.ts
- src/app/(app)/page.tsx
- src/types/database.ts
- src/__tests__/lib/ai/pipeline.test.ts
- .env.local.example
- package.json
- package-lock.json

## Change Log

- 2026-03-03: Story 3.4 erstellt — Web Push Notification nach KI-Verarbeitung mit VAPID, web-push SDK, Opt-in Banner, Pipeline-Integration
- 2026-03-03: Party-Mode Review — 4 Findings eingearbeitet: (1) @types/web-push entfernt (Types seit v3.6+ inkludiert), (2) Edge Runtime Warnung für web-push/Node.js crypto, (3) Opt-in Trigger kontextuell nach erstem Event statt Tab-Besuch, (4) Browser API Mocking-Strategie für Tests dokumentiert
- 2026-03-03: Implementierung abgeschlossen — 10 Tasks, 47 neue Tests, alle 357 Tests bestehen, Build erfolgreich
- 2026-03-04: Code Review — 4 Fixes: (H1) UPDATE RLS-Policy für Upsert, (M1) try/catch in subscribe(), (M2) unsubscribePush Error-Handling, (M3) Loading-State + disabled Buttons im Opt-in Banner
