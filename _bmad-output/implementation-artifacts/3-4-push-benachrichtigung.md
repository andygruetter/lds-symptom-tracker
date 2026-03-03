# Story 3.4: Push-Benachrichtigung nach KI-Verarbeitung

Status: ready-for-dev

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

- [ ] Task 1: DB-Migration für Push-Subscriptions (AC: #4, #5)
  - [ ] `supabase/migrations/00010_push_subscriptions.sql` erstellen
  - [ ] `push_subscriptions`-Tabelle: `id UUID PK DEFAULT gen_random_uuid()`, `account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE`, `endpoint TEXT NOT NULL`, `keys_auth TEXT NOT NULL`, `keys_p256dh TEXT NOT NULL`, `created_at TIMESTAMPTZ DEFAULT now()`
  - [ ] UNIQUE Constraint auf `(account_id, endpoint)` — ein Device pro Subscription
  - [ ] RLS-Policy: Patient verwaltet nur eigene Subscriptions
  - [ ] Index auf `account_id` für schnelle Abfrage beim Notification-Versand
- [ ] Task 2: VAPID-Keys und web-push Setup (AC: #1)
  - [ ] `npm install web-push` (Types sind seit v3.6+ im Package enthalten — KEIN separates `@types/web-push` nötig)
  - [ ] VAPID-Keys generieren: `npx web-push generate-vapid-keys`
  - [ ] Env-Variablen: `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (Client), `VAPID_PRIVATE_KEY` (Server-only), `VAPID_SUBJECT` (mailto:)
  - [ ] `.env.local.example` mit allen neuen Variablen dokumentieren
- [ ] Task 3: Push-Subscription Server Actions (AC: #4, #5)
  - [ ] `src/lib/actions/push-actions.ts` erstellen (`'use server'`)
  - [ ] `subscribePush(input: unknown): Promise<ActionResult<void>>` — Subscription in DB speichern
  - [ ] Input-Schema: `{ endpoint: string, keys: { auth: string, p256dh: string } }`
  - [ ] Zod-Validierung → Auth-Check → Upsert (ON CONFLICT DO UPDATE)
  - [ ] `unsubscribePush(input: unknown): Promise<ActionResult<void>>` — Subscription aus DB entfernen
  - [ ] Input-Schema: `{ endpoint: string }`
- [ ] Task 4: Push-Notification senden (Server-Utility) (AC: #1, #2)
  - [ ] `src/lib/push/send-notification.ts` erstellen
  - [ ] **WICHTIG**: `web-push` nutzt Node.js `crypto`-Module — funktioniert NICHT in Vercel Edge Runtime. Dateien die `web-push` importieren brauchen `export const runtime = 'nodejs'` (betrifft auch API-Routes die `sendPushNotification` aufrufen).
  - [ ] `sendPushNotification(accountId: string, payload: PushPayload): Promise<void>`
  - [ ] `PushPayload` Typ: `{ title: string, body: string, url?: string }`
  - [ ] Alle Subscriptions des Users aus DB laden (`push_subscriptions` WHERE `account_id`)
  - [ ] Für jede Subscription: `webpush.sendNotification(subscription, JSON.stringify(payload))`
  - [ ] Error-Handling: 410 Gone → Subscription aus DB löschen (expired/revoked)
  - [ ] `webpush.setVapidDetails()` einmalig beim Modul-Load
  - [ ] Nutzt `createServiceClient()` (kein Auth-Context im Pipeline-Kontext)
- [ ] Task 5: Pipeline-Integration (AC: #1, #2, #3)
  - [ ] `src/lib/ai/pipeline.ts` erweitern
  - [ ] Nach erfolgreicher Extraktion (`status: 'extracted'`): Push-Notification senden
  - [ ] Payload: `{ title: 'Symptom verarbeitet', body: 'Dein Symptom wurde verarbeitet — tippe zum Überprüfen', url: '/' }`
  - [ ] `sendPushNotification` als Fire-and-Forget (`.catch()` mit Error-Logging, Pipeline nicht blockieren)
  - [ ] `account_id` aus dem `symptom_event` laden (bereits in Pipeline verfügbar)
  - [ ] Kein Push bei `extraction_failed` oder `transcription_failed` — nur bei Erfolg
- [ ] Task 6: `use-push-notifications` Hook (AC: #4, #5, #6)
  - [ ] `src/hooks/use-push-notifications.ts` erstellen
  - [ ] State: `permission: NotificationPermission` (`default` | `granted` | `denied`)
  - [ ] State: `isSubscribed: boolean`
  - [ ] `subscribe()`: Permission anfragen → `pushManager.subscribe()` → Server Action
  - [ ] `unsubscribe()`: `subscription.unsubscribe()` → Server Action
  - [ ] Init: Prüft bestehende Subscription (`pushManager.getSubscription()`)
  - [ ] VAPID Public Key via `process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY`
  - [ ] `urlBase64ToUint8Array()` Helper für applicationServerKey
  - [ ] Graceful Degradation: `'PushManager' in window` Check, `'serviceWorker' in navigator` Check
- [ ] Task 7: Opt-in Banner/Prompt (AC: #4)
  - [ ] `src/components/capture/push-opt-in.tsx` erstellen (Client Component)
  - [ ] Erscheint nachdem der Patient sein erstes Symptom erfasst hat (kontextueller Opt-in, nicht sofort beim Tab-Besuch — Permission === `default`)
  - [ ] Nicht-invasiver Banner am oberen Bildschirmrand (nicht Modal)
  - [ ] Text: "Benachrichtigungen aktivieren, um über verarbeitete Symptome informiert zu werden?"
  - [ ] Buttons: "Aktivieren" (Primary) + "Später" (Muted)
  - [ ] "Später" → Banner für diese Session ausblenden (`sessionStorage`)
  - [ ] "Aktivieren" → `subscribe()` aufrufen
  - [ ] Wenn Permission === `denied`: Banner nicht anzeigen (Browser hat blockiert)
  - [ ] Wenn Permission === `granted` && subscribed: Banner nicht anzeigen
- [ ] Task 8: Service Worker Push-Handler verifizieren (AC: #3, #6)
  - [ ] `src/app/sw.ts` — bestehender Push-Handler aus Story 1.5 verifizieren
  - [ ] Push-Event: Payload parsen → `showNotification()` (bereits implementiert)
  - [ ] NotificationClick: `clients.openWindow(url)` (bereits implementiert)
  - [ ] Testen: Notification-Click öffnet korrekte URL (`/` für Erfassungs-Tab)
  - [ ] Optional: Tag-basierte Notification-Deduplizierung (`tag: 'symptom-processed'`)
- [ ] Task 9: Tests (AC: #1-#6)
  - [ ] `src/__tests__/lib/push/send-notification.test.ts` — webpush.sendNotification Mock, 410 Cleanup, Multi-Subscription
  - [ ] `src/__tests__/hooks/use-push-notifications.test.ts` — Permission-States, Subscribe/Unsubscribe, Graceful Degradation
  - [ ] `src/__tests__/components/push-opt-in.test.tsx` — Banner-Anzeige-Logik, Aktivieren, Später
  - [ ] `src/__tests__/lib/ai/pipeline.test.ts` — Erweitert: Push nach Extraktion, kein Push bei Fehler
  - [ ] `src/__tests__/push-actions.test.ts` — Subscribe/Unsubscribe Server Actions
  - [ ] **Browser API Mocking-Strategie**: `vi.stubGlobal('Notification', { permission: 'default', requestPermission: vi.fn() })`, `navigator.serviceWorker.ready` Mock mit `pushManager.subscribe()` / `pushManager.getSubscription()`. Für `use-push-notifications.test.ts` und `push-opt-in.test.tsx` zwingend nötig, da `Notification`, `PushManager` und `ServiceWorkerRegistration` in jsdom nicht existieren.
  - [ ] Bestehende Tests dürfen NICHT brechen
  - [ ] `npm run test` verifizieren
- [ ] Task 10: Build-Verifikation
  - [ ] `npm run lint` fehlerfrei
  - [ ] `npm run build` erfolgreich

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
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BDk... # Client-seitig (für PushManager.subscribe)
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
- **NICHT** VAPID_PRIVATE_KEY im Client exponieren — nur `NEXT_PUBLIC_VAPID_PUBLIC_KEY` ist Client-seitig
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

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

## Change Log

- 2026-03-03: Story 3.4 erstellt — Web Push Notification nach KI-Verarbeitung mit VAPID, web-push SDK, Opt-in Banner, Pipeline-Integration
- 2026-03-03: Party-Mode Review — 4 Findings eingearbeitet: (1) @types/web-push entfernt (Types seit v3.6+ inkludiert), (2) Edge Runtime Warnung für web-push/Node.js crypto, (3) Opt-in Trigger kontextuell nach erstem Event statt Tab-Besuch, (4) Browser API Mocking-Strategie für Tests dokumentiert
