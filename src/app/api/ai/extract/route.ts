import { NextResponse } from 'next/server'

import { runExtractionPipeline } from '@/lib/ai/pipeline'
import { prepareRerun } from '@/lib/ai/rerun'
import { createServerClient, createServiceClient } from '@/lib/db/client'
import { extractRequestSchema } from '@/types/ai'

export async function POST(request: Request) {
  // 1. Parse und validiere Input
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Ungültiger Request-Body' },
      { status: 400 },
    )
  }

  const parsed = extractRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ungültige Event-ID' }, { status: 400 })
  }

  const { symptomEventId, mode } = parsed.data

  // 2. Auth: zwei Pfade
  // Pfad A: INTERNAL_API_SECRET Header → Service Client (interner Pipeline-Retry)
  // Pfad B: Kein Secret Header → Session-Auth mit Ownership-Check (manueller Re-Run)
  const internalSecret = process.env.INTERNAL_API_SECRET
  const authHeader = request.headers.get('x-internal-secret')

  if (!internalSecret) {
    // Legacy/Dev-Mode: kein Secret gesetzt → warnen aber fortfahren
    console.warn(
      '[KI-Pipeline] INTERNAL_API_SECRET nicht gesetzt — API Route ist ungeschützt',
    )
  } else if (authHeader === internalSecret) {
    // Pfad A: valides internes Secret → direkt weiter
  } else {
    // Pfad B: kein oder falsches Secret → Session-Auth
    const serverClient = await createServerClient()
    const {
      data: { user },
    } = await serverClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Ownership-Check
    const { data: event } = await serverClient
      .from('symptom_events')
      .select('account_id')
      .eq('id', symptomEventId)
      .single()

    if (!event) {
      return NextResponse.json(
        { error: 'Event nicht gefunden' },
        { status: 404 },
      )
    }

    if (event.account_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // 3. Service Client für Pipeline-Operationen (immer, RLS-bypass)
  const supabase = createServiceClient()

  // 4. Re-Run vorbereiten: Status-Reset + extracted_data-Cleanup
  try {
    await prepareRerun(supabase, symptomEventId, mode)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Ungültige Anfrage', details: errorMessage },
      { status: 400 },
    )
  }

  // 5. Pipeline ausführen
  try {
    console.info(
      '[extract] Starting pipeline for:',
      symptomEventId,
      'mode:',
      mode,
    )
    await runExtractionPipeline(supabase, symptomEventId)
    console.info('[extract] Pipeline completed successfully')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(
      '[KI-Pipeline] Extraction failed:',
      error instanceof Error ? error.message : error,
    )
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Extraktion fehlgeschlagen', details: errorMessage },
      { status: 500 },
    )
  }
}
