#!/usr/bin/env node
/**
 * Re-Extraktion Script
 *
 * Extrahiert alle Ereignisse mit Status 'extracted' (KI-verarbeitet, nicht manuell bestätigt)
 * neu mit der neusten Pipeline.
 *
 * Voraussetzungen:
 *   1. Dev-Server läuft:  npm run dev
 *   2. .env.local vorhanden mit SUPABASE_SERVICE_ROLE_KEY + INTERNAL_API_SECRET
 *
 * Verwendung:
 *   node --env-file=.env.local scripts/reextract-events.mjs --preview
 *   node --env-file=.env.local scripts/reextract-events.mjs --run
 *   node --env-file=.env.local scripts/reextract-events.mjs --run --include-confirmed
 *   node --env-file=.env.local scripts/reextract-events.mjs --run --retranscribe
 *
 * Optionen:
 *   --preview           Vorschau ohne Änderungen (Standard)
 *   --include-confirmed Auch bestätigte Ereignisse neu extrahieren (⚠️ überschreibt Korrekturen)
 *   --retranscribe      Spracheingaben auch neu transkribieren (sonst nur Re-Extraktion)
 *   --delay <ms>        Pause zwischen API-Calls (Standard: 2000ms)
 *   --base-url <url>    Server-URL (Standard: http://localhost:3000)
 */

import { createClient } from '@supabase/supabase-js'
import readline from 'readline'

// --- Argumente parsen ---
const args = process.argv.slice(2)
const DRY_RUN = !args.includes('--run')
const INCLUDE_CONFIRMED = args.includes('--include-confirmed')
const ALL_STATUSES = args.includes('--all')
const RETRANSCRIBE = args.includes('--retranscribe')

const delayIdx = args.indexOf('--delay')
const DELAY_MS = delayIdx !== -1 ? parseInt(args[delayIdx + 1], 10) : 2000

const urlIdx = args.indexOf('--base-url')
const BASE_URL =
  urlIdx !== -1
    ? args[urlIdx + 1]
    : (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')

// --- Validierung ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    '❌ NEXT_PUBLIC_SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlt.',
  )
  console.error(
    '   Starte mit: node --env-file=.env.local scripts/reextract-events.mjs',
  )
  process.exit(1)
}

if (!INTERNAL_SECRET) {
  console.warn('⚠️  INTERNAL_API_SECRET nicht gesetzt — API Route ungeschützt')
}

// --- Supabase Service Client (bypasses RLS) ---
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// --- Hilfsfunktionen ---
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim().toLowerCase())
    })
  })
}

function formatDate(iso) {
  return iso ? iso.slice(0, 16).replace('T', ' ') : '—'
}

function truncate(str, len) {
  if (!str) return ''
  return str.length > len ? str.slice(0, len) + '…' : str
}

async function checkServerRunning() {
  try {
    // POST ohne Body → 400 Bad Request = Server läuft
    const res = await fetch(`${BASE_URL}/api/ai/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      signal: AbortSignal.timeout(5000),
    })
    return res.status !== 404 // 400 oder 401 = Server läuft
  } catch {
    return false
  }
}

// --- Hauptlogik ---
async function main() {
  console.log()
  console.log('╔══════════════════════════════════════╗')
  console.log('║   Ereignis Re-Extraktion Script       ║')
  console.log('╚══════════════════════════════════════╝')
  console.log()

  if (DRY_RUN) {
    console.log('👁️  VORSCHAU — keine Änderungen werden vorgenommen\n')
  }
  if (INCLUDE_CONFIRMED) {
    console.log(
      '⚠️  --include-confirmed: Auch bestätigte Ereignisse werden neu extrahiert.',
    )
    console.log('   Manuelle Korrekturen werden dadurch ÜBERSCHRIEBEN!\n')
  }
  if (RETRANSCRIBE) {
    console.log(
      '⚠️  --retranscribe: Spracheingaben werden auch neu transkribiert.\n',
    )
  }

  // 1. Ereignisse laden
  const ALL_KNOWN_STATUSES = [
    'pending',
    'transcribed',
    'extracted',
    'confirmed',
    'extraction_failed',
    'transcription_failed',
  ]
  const statuses = ALL_STATUSES
    ? ALL_KNOWN_STATUSES
    : INCLUDE_CONFIRMED
      ? ['extracted', 'confirmed']
      : ['extracted']

  let query = supabase
    .from('symptom_events')
    .select('id, event_type, status, raw_input, created_at, account_id')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (!ALL_STATUSES) {
    query = query.in('status', statuses)
  }

  const { data: events, error } = await query

  if (error) {
    console.error('❌ Fehler beim Laden der Ereignisse:', error.message)
    process.exit(1)
  }

  if (!events || events.length === 0) {
    console.log('✅ Keine Ereignisse zum Re-Extrahieren gefunden.')
    process.exit(0)
  }

  // 2. Statistiken
  const byType = {}
  const byStatus = {}
  for (const e of events) {
    byType[e.event_type] = (byType[e.event_type] ?? 0) + 1
    byStatus[e.status] = (byStatus[e.status] ?? 0) + 1
  }

  console.log(`📊 Gefundene Ereignisse: ${events.length}`)
  console.log(
    '   Nach Typ:    ' +
      Object.entries(byType)
        .map(([t, n]) => `${t}: ${n}`)
        .join(', '),
  )
  console.log(
    '   Nach Status: ' +
      Object.entries(byStatus)
        .map(([s, n]) => `${s}: ${n}`)
        .join(', '),
  )
  console.log()

  // 3. Vorschau-Tabelle (letzte 10 Ereignisse)
  const preview = events.slice(0, 10)
  console.log('Neueste Ereignisse (max. 10):')
  console.log('─'.repeat(80))
  console.log('  Typ        Status      Datum             Inhalt')
  console.log('─'.repeat(80))
  for (const e of preview) {
    const content = e.raw_input ? truncate(e.raw_input, 35) : '(Spracheingabe)'
    console.log(
      `  ${e.event_type.padEnd(10)} ${e.status.padEnd(11)} ${formatDate(e.created_at)}   ${content}`,
    )
  }
  if (events.length > 10) {
    console.log(`  ... und ${events.length - 10} weitere`)
  }
  console.log('─'.repeat(80))
  console.log()

  if (DRY_RUN) {
    console.log(
      'ℹ️  Vorschau beendet. Starte mit --run um die Re-Extraktion auszuführen.',
    )
    process.exit(0)
  }

  // 4. Bestätigung
  const answer = await askQuestion(
    `Sollen ${events.length} Ereignisse neu extrahiert werden? (ja/nein): `,
  )
  if (answer !== 'ja' && answer !== 'j') {
    console.log('Abgebrochen.')
    process.exit(0)
  }
  console.log()

  // 5. Server prüfen
  console.log(`🔌 Prüfe Server auf ${BASE_URL}...`)
  const serverRunning = await checkServerRunning()
  if (!serverRunning) {
    console.error(`❌ Server nicht erreichbar auf ${BASE_URL}`)
    console.error('   Starte den Dev-Server: npm run dev')
    process.exit(1)
  }
  console.log('✅ Server erreichbar\n')

  // 6. Re-Extraktion
  let successCount = 0
  let failedCount = 0
  const failures = []

  for (let i = 0; i < events.length; i++) {
    const event = events[i]
    const prefix = `[${String(i + 1).padStart(String(events.length).length)}/${events.length}]`

    // Status zurücksetzen
    // - Spracheingabe mit vorhandenem raw_input + kein --retranscribe → 'transcribed' (überspringt Transkription)
    // - Alles andere → 'pending'
    const isVoiceWithTranscript =
      event.event_type === 'voice' && event.raw_input?.trim()
    const newStatus =
      isVoiceWithTranscript && !RETRANSCRIBE ? 'transcribed' : 'pending'

    const { error: resetError } = await supabase
      .from('symptom_events')
      .update({ status: newStatus })
      .eq('id', event.id)

    if (resetError) {
      console.error(
        `${prefix} ❌ Status-Reset fehlgeschlagen: ${resetError.message}`,
      )
      failedCount++
      failures.push({
        id: event.id,
        reason: `Status-Reset: ${resetError.message}`,
      })
      continue
    }

    // Pipeline triggern
    try {
      const res = await fetch(`${BASE_URL}/api/ai/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': INTERNAL_SECRET ?? '',
        },
        body: JSON.stringify({ symptomEventId: event.id }),
        signal: AbortSignal.timeout(60_000), // 60s Timeout pro Event
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(
          `HTTP ${res.status}: ${body.details ?? body.error ?? res.statusText}`,
        )
      }

      const typeInfo =
        event.event_type === 'voice'
          ? isVoiceWithTranscript && !RETRANSCRIBE
            ? '🎙️ (nur Re-Extraktion)'
            : '🎙️ (inkl. Transkription)'
          : '📝'
      console.log(
        `${prefix} ✅ ${typeInfo} ${formatDate(event.created_at)} | ${event.id.slice(0, 8)}…`,
      )
      successCount++
    } catch (err) {
      const reason = err.message ?? String(err)
      console.error(`${prefix} ❌ ${formatDate(event.created_at)} | ${reason}`)
      failedCount++
      failures.push({ id: event.id, reason })
    }

    // Rate Limiting zwischen API-Calls
    if (i < events.length - 1) {
      await sleep(DELAY_MS)
    }
  }

  // 7. Zusammenfassung
  console.log()
  console.log('╔══════════════════════════════════════╗')
  console.log('║   Abgeschlossen                       ║')
  console.log('╚══════════════════════════════════════╝')
  console.log(`✅ Erfolgreich:   ${successCount}`)
  console.log(`❌ Fehlgeschlagen: ${failedCount}`)

  if (failures.length > 0) {
    console.log('\nFehlgeschlagene Ereignisse:')
    for (const f of failures) {
      console.log(`  ${f.id} — ${f.reason}`)
    }
  }

  process.exit(failedCount > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('\n❌ Unerwarteter Fehler:', err.message ?? err)
  process.exit(1)
})
