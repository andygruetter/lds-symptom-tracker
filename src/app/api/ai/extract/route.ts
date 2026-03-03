import { NextResponse } from 'next/server'

import { runExtractionPipeline } from '@/lib/ai/pipeline'
import { createServiceClient } from '@/lib/db/client'
import { extractRequestSchema } from '@/types/ai'

export async function POST(request: Request) {
  // 0. Auth-Check: Interner Secret-Token
  const internalSecret = process.env.INTERNAL_API_SECRET
  if (!internalSecret) {
    console.warn(
      '[KI-Pipeline] INTERNAL_API_SECRET nicht gesetzt — API Route ist ungeschützt',
    )
  } else {
    const authHeader = request.headers.get('x-internal-secret')
    if (authHeader !== internalSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

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
    return NextResponse.json(
      { error: 'Ungültige Event-ID' },
      { status: 400 },
    )
  }

  // 2. Pipeline mit Service Client ausführen (RLS bypassed)
  const supabase = createServiceClient()

  try {
    console.log('[DEBUG extract] Starting pipeline for:', parsed.data.symptomEventId)
    await runExtractionPipeline(supabase, parsed.data.symptomEventId)
    console.log('[DEBUG extract] Pipeline completed successfully')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(
      '[KI-Pipeline] Extraction failed:',
      error instanceof Error ? error.message : error,
    )
    console.error('[DEBUG extract] Full error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Extraktion fehlgeschlagen', details: errorMessage },
      { status: 500 },
    )
  }
}
