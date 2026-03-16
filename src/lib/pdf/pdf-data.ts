import type { SupabaseClient } from '@supabase/supabase-js'

import { generateSummary } from '@/lib/ai/summarize'
import {
  getMonthlyTimelinesByRange,
  getSymptomRankingByAccount,
  groupExtractedBySymptomIndex,
  pivotExtractedData,
} from '@/lib/db/insights'
import type { Database } from '@/types/database'
import type { PdfEventDetail, PdfReportData } from '@/types/report'
import type { SummaryEventData } from '@/types/summary'

type DbClient = SupabaseClient<Database>

type RawEventRow = {
  id: string
  event_type: string
  occurred_at: string
  ended_at: string | null
  raw_input: string | null
  extracted_data:
    | { field_name: string; value: string; symptom_index: number | null }[]
    | null
  event_photos: { id: string; storage_path: string }[] | null
}

const MAX_PHOTOS = 50
const PHOTO_WIDTH = 150

/** Fetch a signed URL and convert to Base64 string (JPEG thumbnail) */
async function fetchPhotoAsBase64(
  supabase: DbClient,
  storagePath: string,
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from('photos')
      .createSignedUrl(storagePath, 900)

    if (error || !data?.signedUrl) return null

    const response = await fetch(data.signedUrl)
    if (!response.ok) return null

    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer).toString('base64')
  } catch {
    return null
  }
}

/** Load events with extracted data and photos for the PDF */
async function loadPdfEvents(
  supabase: DbClient,
  accountId: string,
  dateFrom: string,
  dateTo: string,
): Promise<PdfEventDetail[]> {
  const bufferStart = new Date(dateFrom)
  bufferStart.setDate(bufferStart.getDate() - 1)
  const bufferEnd = new Date(dateTo)
  bufferEnd.setDate(bufferEnd.getDate() + 1)

  const { data, error } = await supabase
    .from('symptom_events')
    .select(
      'id, event_type, occurred_at, ended_at, raw_input, extracted_data(field_name, value, symptom_index), event_photos(id, storage_path)',
    )
    .eq('account_id', accountId)
    .eq('status', 'confirmed')
    .is('deleted_at', null)
    .gte('occurred_at', bufferStart.toISOString())
    .lte('occurred_at', bufferEnd.toISOString())
    .order('occurred_at', { ascending: false })

  if (error || !data) return []

  const rows = data as unknown as RawEventRow[]

  // Collect all photo storage paths (max MAX_PHOTOS total)
  const photoTasks: Array<{
    eventId: string
    storagePath: string
  }> = []
  for (const row of rows) {
    if (!row.event_photos) continue
    for (const photo of row.event_photos) {
      if (photoTasks.length >= MAX_PHOTOS) break
      photoTasks.push({ eventId: row.id, storagePath: photo.storage_path })
    }
    if (photoTasks.length >= MAX_PHOTOS) break
  }

  // Fetch all photos in parallel
  const photoBase64Results = await Promise.all(
    photoTasks.map((t) => fetchPhotoAsBase64(supabase, t.storagePath)),
  )

  // Map photos back to event IDs
  const photosByEventId = new Map<string, string[]>()
  for (let i = 0; i < photoTasks.length; i++) {
    const b64 = photoBase64Results[i]
    if (!b64) continue
    const { eventId } = photoTasks[i]
    const existing = photosByEventId.get(eventId) ?? []
    existing.push(b64)
    photosByEventId.set(eventId, existing)
  }

  return rows.map((row): PdfEventDetail => {
    const extracted = pivotExtractedData(row.extracted_data)
    const eventType = row.event_type === 'medication' ? 'medication' : 'symptom'
    const symptoms =
      eventType === 'symptom'
        ? groupExtractedBySymptomIndex(row.extracted_data)
        : []

    return {
      id: row.id,
      eventType,
      occurredAt: row.occurred_at,
      endedAt: row.ended_at,
      symptomName: extracted.symptomName,
      medication: extracted.medication,
      bodyRegion: extracted.bodyRegion,
      side: extracted.side,
      intensity: extracted.intensity,
      rawInput: row.raw_input,
      symptoms,
      photoBase64: photosByEventId.get(row.id) ?? [],
    }
  })
}

/** Load events formatted for AI summary generation */
async function loadSummaryEvents(
  supabase: DbClient,
  accountId: string,
  dateFrom: string,
  dateTo: string,
): Promise<SummaryEventData[]> {
  const bufferStart = new Date(dateFrom)
  bufferStart.setDate(bufferStart.getDate() - 1)
  const bufferEnd = new Date(dateTo)
  bufferEnd.setDate(bufferEnd.getDate() + 1)

  const { data, error } = await supabase
    .from('symptom_events')
    .select(
      'id, event_type, occurred_at, ended_at, raw_input, extracted_data(field_name, value, confidence)',
    )
    .eq('account_id', accountId)
    .eq('status', 'confirmed')
    .is('deleted_at', null)
    .gte('occurred_at', bufferStart.toISOString())
    .lte('occurred_at', bufferEnd.toISOString())
    .order('occurred_at', { ascending: true })

  if (error || !data) return []

  return (
    data as unknown as Array<{
      id: string
      event_type: string
      occurred_at: string
      ended_at: string | null
      raw_input: string | null
      extracted_data: Array<{
        field_name: string
        value: string
        confidence: number
      }> | null
    }>
  ).map((row) => ({
    id: row.id,
    eventType: row.event_type,
    occurredAt: row.occurred_at,
    endedAt: row.ended_at,
    rawInput: row.raw_input,
    extractedFields: Array.isArray(row.extracted_data)
      ? row.extracted_data.map((f) => ({
          fieldName: f.field_name,
          value: f.value,
          confidence: f.confidence,
        }))
      : [],
  }))
}

/** Fallback summary when AI fails */
function buildStatisticalSummary(
  events: PdfEventDetail[],
  dateFrom: string,
  dateTo: string,
): string {
  const symptomEvents = events.filter((e) => e.eventType === 'symptom')
  const medEvents = events.filter((e) => e.eventType === 'medication')
  const fromStr = new Date(dateFrom).toLocaleDateString('de-CH')
  const toStr = new Date(dateTo).toLocaleDateString('de-CH')

  if (events.length === 0) {
    return `Im Zeitraum ${fromStr} bis ${toStr} wurden keine Symptom-Events erfasst.`
  }

  const symptomCounts = new Map<string, number>()
  for (const e of symptomEvents) {
    const name = e.symptomName ?? 'Unbekannt'
    symptomCounts.set(name, (symptomCounts.get(name) ?? 0) + 1)
  }
  const topSymptom = Array.from(symptomCounts.entries()).sort(
    ([, a], [, b]) => b - a,
  )[0]

  return [
    `Im Zeitraum ${fromStr} bis ${toStr} wurden insgesamt ${events.length} Events erfasst`,
    `(${symptomEvents.length} Symptome, ${medEvents.length} Medikamenten-Einnahmen).`,
    topSymptom
      ? `Das häufigste Symptom war "${topSymptom[0]}" (${topSymptom[1]}x).`
      : '',
  ]
    .filter(Boolean)
    .join(' ')
}

/**
 * Aggregiert alle Daten für den PDF-Report.
 */
export async function aggregatePdfData(
  supabase: DbClient,
  accountId: string,
  dateFrom: string,
  dateTo: string,
): Promise<PdfReportData> {
  // Load all data in parallel
  const [rankingResult, timelines, events, summaryEvents] = await Promise.all([
    getSymptomRankingByAccount(supabase, accountId, dateFrom, dateTo),
    getMonthlyTimelinesByRange(supabase, accountId, dateFrom, dateTo),
    loadPdfEvents(supabase, accountId, dateFrom, dateTo),
    loadSummaryEvents(supabase, accountId, dateFrom, dateTo),
  ])

  // Generate AI summary with fallback
  let summary: string
  try {
    summary = await generateSummary(summaryEvents)
  } catch (err) {
    console.error('[PDF] KI-Summary fehlgeschlagen, Fallback nutzen:', err)
    summary = buildStatisticalSummary(events, dateFrom, dateTo)
  }

  // Only include months with events for cleaner timeline
  const nonEmptyTimelines = timelines.filter((t) => t.totalEvents > 0)

  return {
    summary,
    ranking: rankingResult.symptoms,
    timeline: nonEmptyTimelines.length > 0 ? nonEmptyTimelines : timelines,
    events,
    metadata: {
      dateFrom,
      dateTo,
      generatedAt: new Date().toISOString(),
      totalEvents: events.length,
    },
  }
}

// Re-export for convenience
export { PHOTO_WIDTH }
