import type { SupabaseClient } from '@supabase/supabase-js'

import { getSignedAudioUrl, getSignedPhotoUrl } from '@/lib/db/media'
import { toLocalDateKey } from '@/lib/utils/date'
import type {
  DayEventSummary,
  EventDetail,
  EventPhoto,
  ExtractedField,
  FeedEvent,
  MedicationRankingEntry,
  MonthlyCount,
  MonthTimeline,
  PaginatedFeed,
  SymptomRanking,
  SymptomRankingEntry,
  TimeRange,
} from '@/types/analytics'
import type { AppError } from '@/types/common'
import type { Database } from '@/types/database'

export type ExtractedDataRow = { field_name: string; value: string }
export type PhotoRow = { id: string }

export type TimelineRawRow = {
  id: string
  event_type: string
  occurred_at: string
  extracted_data: ExtractedDataRow[] | null
}

export type RawFeedRow = {
  id: string
  event_type: string
  occurred_at: string
  created_at: string
  ended_at: string | null
  raw_input: string | null
  audio_url: string | null
  extracted_data: ExtractedDataRow[] | null
  event_photos: PhotoRow[] | null
}

export function pivotExtractedData(rows: ExtractedDataRow[] | null): {
  symptomName: string | null
  bodyRegion: string | null
  side: string | null
  symptomType: string | null
  intensity: number | null
  medication: string | null
  dosage: string | null
} {
  if (!rows || rows.length === 0) {
    return {
      symptomName: null,
      bodyRegion: null,
      side: null,
      symptomType: null,
      intensity: null,
      medication: null,
      dosage: null,
    }
  }

  const map = new Map(rows.map((r) => [r.field_name, r.value]))
  const intensityRaw = map.get('intensity')

  return {
    symptomName: map.get('symptom_name') ?? null,
    bodyRegion: map.get('body_region') ?? null,
    side: map.get('side') ?? null,
    symptomType: map.get('symptom_type') ?? null,
    intensity:
      intensityRaw !== undefined ? parseFloat(intensityRaw) || null : null,
    medication: map.get('medication') ?? null,
    dosage: map.get('dosage') ?? null,
  }
}

export function mapRowToFeedEvent(row: RawFeedRow): FeedEvent {
  const extracted = pivotExtractedData(row.extracted_data)
  const eventType = row.event_type === 'medication' ? 'medication' : 'symptom'

  return {
    id: row.id,
    eventType,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
    endedAt: row.ended_at,
    rawInput: row.raw_input,
    ...extracted,
    photoCount: row.event_photos?.length ?? 0,
    hasAudio: row.audio_url !== null,
  }
}

export async function getChronologicalFeed(
  supabase: SupabaseClient<Database>,
  accountId: string,
  options?: { cursor?: string; limit?: number },
): Promise<PaginatedFeed> {
  const limit = options?.limit ?? 20
  const cursor = options?.cursor

  let query = supabase
    .from('symptom_events')
    .select(
      'id, event_type, occurred_at, created_at, ended_at, raw_input, audio_url, extracted_data(field_name, value), event_photos(id)',
    )
    .eq('account_id', accountId)
    .eq('status', 'confirmed')
    .is('deleted_at', null)
    .order('occurred_at', { ascending: false })

  if (cursor) {
    query = query.lt('occurred_at', cursor)
  }

  const { data, error } = await query.limit(limit)

  if (error || !data) {
    if (error) {
      console.error('[Insights] Feed-Abfrage fehlgeschlagen:', error.message)
    }
    return { events: [], nextCursor: null, hasMore: false }
  }

  const rows = data as unknown as RawFeedRow[]
  const events = rows.map(mapRowToFeedEvent)
  const lastEvent = rows[rows.length - 1]
  const nextCursor = lastEvent ? lastEvent.occurred_at : null
  const hasMore = rows.length === limit

  return { events, nextCursor, hasMore }
}

export async function getMonthlyTimeline(
  supabase: SupabaseClient<Database>,
  accountId: string,
  year: number,
  month: number,
): Promise<MonthTimeline> {
  // TIMEZONE-SAFE: +1 Tag Puffer an Monatsgrenzen
  const bufferStart = new Date(year, month - 1, 0) // Tag vor Monatsanfang
  const bufferEnd = new Date(year, month, 1) // Tag nach Monatsende
  const startISO = bufferStart.toISOString()
  const endISO = bufferEnd.toISOString()

  const { data, error } = await supabase
    .from('symptom_events')
    .select('id, event_type, occurred_at, extracted_data(field_name, value)')
    .eq('account_id', accountId)
    .eq('status', 'confirmed')
    .is('deleted_at', null)
    .gte('occurred_at', startISO)
    .lt('occurred_at', endISO)
    .order('occurred_at', { ascending: false })

  if (error || !data) {
    if (error) {
      console.error(
        '[Insights] Timeline-Abfrage fehlgeschlagen:',
        error.message,
      )
    }
    return buildEmptyTimeline(year, month)
  }

  const rows = data as unknown as TimelineRawRow[]

  // Aggregation in JS: Events dem korrekten lokalen Tag zuweisen
  const dayMap = new Map<
    string,
    {
      symptomCount: number
      medicationCount: number
      totalCount: number
      maxIntensity: number | null
    }
  >()

  for (const row of rows) {
    const dateKey = toLocalDateKey(new Date(row.occurred_at))
    // Puffer-Events die ausserhalb des Zielmonats fallen ignorieren
    const [rowYear, rowMonth] = dateKey.split('-').map(Number)
    if (rowYear !== year || rowMonth !== month) continue

    const existing = dayMap.get(dateKey) ?? {
      symptomCount: 0,
      medicationCount: 0,
      totalCount: 0,
      maxIntensity: null,
    }
    const isMedication = row.event_type === 'medication'

    existing.totalCount += 1
    if (isMedication) {
      existing.medicationCount += 1
    } else {
      existing.symptomCount += 1
    }

    // Intensität aus extracted_data
    const extracted = pivotExtractedData(row.extracted_data)
    if (extracted.intensity !== null) {
      existing.maxIntensity =
        existing.maxIntensity === null
          ? extracted.intensity
          : Math.max(existing.maxIntensity, extracted.intensity)
    }

    dayMap.set(dateKey, existing)
  }

  // Alle Tage des Monats auffüllen (auch leere Tage mit totalCount: 0)
  const daysInMonth = new Date(year, month, 0).getDate()
  const days: DayEventSummary[] = []
  let totalEvents = 0

  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const agg = dayMap.get(dateKey)
    if (agg) {
      days.push({ date: dateKey, ...agg })
      totalEvents += agg.totalCount
    } else {
      days.push({
        date: dateKey,
        symptomCount: 0,
        medicationCount: 0,
        totalCount: 0,
        maxIntensity: null,
      })
    }
  }

  return { year, month, days, totalEvents }
}

export function calculateTrend(
  monthlyCounts: MonthlyCount[],
): 'increasing' | 'stable' | 'decreasing' {
  if (monthlyCounts.length < 2) return 'stable'

  const n = monthlyCounts.length
  const xs = monthlyCounts.map((_, i) => i)
  const ys = monthlyCounts.map((m) => m.count)

  const sumX = xs.reduce((a, b) => a + b, 0)
  const sumY = ys.reduce((a, b) => a + b, 0)
  const sumXY = xs.reduce((acc, x, i) => acc + x * ys[i], 0)
  const sumXX = xs.reduce((acc, x) => acc + x * x, 0)

  const denom = n * sumXX - sumX * sumX
  if (denom === 0) return 'stable'

  const slope = (n * sumXY - sumX * sumY) / denom

  if (slope > 0.5) return 'increasing'
  if (slope < -0.5) return 'decreasing'
  return 'stable'
}

function getTimeRangeStart(timeRange: TimeRange): Date {
  const now = new Date()
  if (timeRange === '30d') {
    const d = new Date(now)
    d.setDate(d.getDate() - 30)
    return d
  }
  if (timeRange === '3m') {
    const d = new Date(now)
    d.setMonth(d.getMonth() - 3)
    d.setDate(1)
    return d
  }
  if (timeRange === '6m') {
    const d = new Date(now)
    d.setMonth(d.getMonth() - 6)
    d.setDate(1)
    return d
  }
  // 'all'
  return new Date('2020-01-01')
}

export async function getSymptomRanking(
  supabase: SupabaseClient<Database>,
  accountId: string,
  timeRange: TimeRange,
): Promise<SymptomRanking> {
  const startDate = getTimeRangeStart(timeRange)
  // +1 Tag Puffer für Timezone-Safety
  const bufferStart = new Date(startDate)
  bufferStart.setDate(bufferStart.getDate() - 1)

  const { data, error } = await supabase
    .from('symptom_events')
    .select('id, event_type, occurred_at, extracted_data(field_name, value)')
    .eq('account_id', accountId)
    .eq('status', 'confirmed')
    .is('deleted_at', null)
    .gte('occurred_at', bufferStart.toISOString())
    .order('occurred_at', { ascending: false })

  if (error || !data) {
    if (error) {
      console.error('[Insights] Ranking-Abfrage fehlgeschlagen:', error.message)
    }
    return {
      symptoms: [],
      medications: [],
      timeRange,
      totalSymptomEvents: 0,
      totalMedicationEvents: 0,
    }
  }

  const rows = data as unknown as TimelineRawRow[]

  // Filter auf echten Zeitraum (Timezone-safe: lokale Zeit nutzen)
  const cutoffKey = toLocalDateKey(startDate)

  // Aggregation-Maps: symptomName/medication → monatliche Counts + Intensitäten
  const symptomMap = new Map<
    string,
    { monthlyCounts: Map<string, number>; intensities: number[] }
  >()
  const medicationMap = new Map<
    string,
    { monthlyCounts: Map<string, number> }
  >()

  for (const row of rows) {
    const localKey = toLocalDateKey(new Date(row.occurred_at))
    // Events vor dem Zeitraum verwerfen (Puffer-Events)
    if (localKey < cutoffKey) continue

    const extracted = pivotExtractedData(row.extracted_data)
    const isMedication = row.event_type === 'medication'
    const [yearStr, monthStr] = localKey.split('-')
    const year = parseInt(yearStr, 10)
    const month = parseInt(monthStr, 10)
    const monthKey = `${year}-${String(month).padStart(2, '0')}`

    if (isMedication) {
      const name = extracted.medication ?? 'Unbekannt'
      let entry = medicationMap.get(name)
      if (!entry) {
        entry = { monthlyCounts: new Map() }
        medicationMap.set(name, entry)
      }
      entry.monthlyCounts.set(
        monthKey,
        (entry.monthlyCounts.get(monthKey) ?? 0) + 1,
      )
    } else {
      const name = extracted.symptomName ?? 'Unbekannt'
      let entry = symptomMap.get(name)
      if (!entry) {
        entry = { monthlyCounts: new Map(), intensities: [] }
        symptomMap.set(name, entry)
      }
      entry.monthlyCounts.set(
        monthKey,
        (entry.monthlyCounts.get(monthKey) ?? 0) + 1,
      )
      if (extracted.intensity !== null) {
        entry.intensities.push(extracted.intensity)
      }
    }
  }

  function toSortedMonthlyCounts(
    countsMap: Map<string, number>,
  ): MonthlyCount[] {
    return Array.from(countsMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count]) => {
        const [y, m] = key.split('-').map(Number)
        return { year: y, month: m, count }
      })
  }

  const symptoms: SymptomRankingEntry[] = Array.from(symptomMap.entries())
    .map(([name, { monthlyCounts, intensities }]) => {
      const counts = toSortedMonthlyCounts(monthlyCounts)
      const totalCount = counts.reduce((s, c) => s + c.count, 0)
      const avgIntensity =
        intensities.length > 0
          ? intensities.reduce((s, v) => s + v, 0) / intensities.length
          : null
      return {
        name,
        totalCount,
        monthlyCounts: counts,
        trend: calculateTrend(counts),
        avgIntensity,
      }
    })
    .sort((a, b) => b.totalCount - a.totalCount || a.name.localeCompare(b.name))

  const medications: MedicationRankingEntry[] = Array.from(
    medicationMap.entries(),
  )
    .map(([name, { monthlyCounts }]) => {
      const counts = toSortedMonthlyCounts(monthlyCounts)
      const totalCount = counts.reduce((s, c) => s + c.count, 0)
      return {
        name,
        totalCount,
        monthlyCounts: counts,
        trend: calculateTrend(counts),
      }
    })
    .sort((a, b) => b.totalCount - a.totalCount || a.name.localeCompare(b.name))

  return {
    symptoms,
    medications,
    timeRange,
    totalSymptomEvents: symptoms.reduce((s, e) => s + e.totalCount, 0),
    totalMedicationEvents: medications.reduce((s, e) => s + e.totalCount, 0),
  }
}

/**
 * Symptom-Ranking mit expliziten Datumsgrenzen (für PDF/Service-Client).
 * Dependency-Injection: Supabase-Client als Parameter.
 */
export async function getSymptomRankingByAccount(
  supabase: SupabaseClient<Database>,
  accountId: string,
  dateFrom: string,
  dateTo: string,
): Promise<SymptomRanking> {
  // +1 Tag Puffer für Timezone-Safety
  const bufferStart = new Date(dateFrom)
  bufferStart.setDate(bufferStart.getDate() - 1)
  const bufferEnd = new Date(dateTo)
  bufferEnd.setDate(bufferEnd.getDate() + 1)

  const { data, error } = await supabase
    .from('symptom_events')
    .select('id, event_type, occurred_at, extracted_data(field_name, value)')
    .eq('account_id', accountId)
    .eq('status', 'confirmed')
    .is('deleted_at', null)
    .gte('occurred_at', bufferStart.toISOString())
    .lte('occurred_at', bufferEnd.toISOString())
    .order('occurred_at', { ascending: false })

  if (error || !data) {
    if (error) {
      console.error(
        '[Insights] RankingByAccount-Abfrage fehlgeschlagen:',
        error.message,
      )
    }
    return {
      symptoms: [],
      medications: [],
      timeRange: '30d',
      totalSymptomEvents: 0,
      totalMedicationEvents: 0,
    }
  }

  const rows = data as unknown as TimelineRawRow[]
  const cutoffKey = dateFrom
  const endKey = dateTo

  const symptomMap = new Map<
    string,
    { monthlyCounts: Map<string, number>; intensities: number[] }
  >()
  const medicationMap = new Map<
    string,
    { monthlyCounts: Map<string, number> }
  >()

  for (const row of rows) {
    const localKey = toLocalDateKey(new Date(row.occurred_at))
    if (localKey < cutoffKey || localKey > endKey) continue

    const extracted = pivotExtractedData(row.extracted_data)
    const isMedication = row.event_type === 'medication'
    const [yearStr, monthStr] = localKey.split('-')
    const monthKey = `${yearStr}-${monthStr}`

    if (isMedication) {
      const name = extracted.medication ?? 'Unbekannt'
      let entry = medicationMap.get(name)
      if (!entry) {
        entry = { monthlyCounts: new Map() }
        medicationMap.set(name, entry)
      }
      entry.monthlyCounts.set(
        monthKey,
        (entry.monthlyCounts.get(monthKey) ?? 0) + 1,
      )
    } else {
      const name = extracted.symptomName ?? 'Unbekannt'
      let entry = symptomMap.get(name)
      if (!entry) {
        entry = { monthlyCounts: new Map(), intensities: [] }
        symptomMap.set(name, entry)
      }
      entry.monthlyCounts.set(
        monthKey,
        (entry.monthlyCounts.get(monthKey) ?? 0) + 1,
      )
      if (extracted.intensity !== null) {
        entry.intensities.push(extracted.intensity)
      }
    }
  }

  function toSortedMonthlyCountsByAccount(
    countsMap: Map<string, number>,
  ): MonthlyCount[] {
    return Array.from(countsMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count]) => {
        const [y, m] = key.split('-').map(Number)
        return { year: y, month: m, count }
      })
  }

  const symptoms: SymptomRankingEntry[] = Array.from(symptomMap.entries())
    .map(([name, { monthlyCounts, intensities }]) => {
      const counts = toSortedMonthlyCountsByAccount(monthlyCounts)
      const totalCount = counts.reduce((s, c) => s + c.count, 0)
      const avgIntensity =
        intensities.length > 0
          ? intensities.reduce((s, v) => s + v, 0) / intensities.length
          : null
      return {
        name,
        totalCount,
        monthlyCounts: counts,
        trend: calculateTrend(counts),
        avgIntensity,
      }
    })
    .sort((a, b) => b.totalCount - a.totalCount || a.name.localeCompare(b.name))

  const medications: MedicationRankingEntry[] = Array.from(
    medicationMap.entries(),
  )
    .map(([name, { monthlyCounts }]) => {
      const counts = toSortedMonthlyCountsByAccount(monthlyCounts)
      const totalCount = counts.reduce((s, c) => s + c.count, 0)
      return {
        name,
        totalCount,
        monthlyCounts: counts,
        trend: calculateTrend(counts),
      }
    })
    .sort((a, b) => b.totalCount - a.totalCount || a.name.localeCompare(b.name))

  return {
    symptoms,
    medications,
    timeRange: '30d',
    totalSymptomEvents: symptoms.reduce((s, e) => s + e.totalCount, 0),
    totalMedicationEvents: medications.reduce((s, e) => s + e.totalCount, 0),
  }
}

/**
 * Monatliche Timelines für einen Datumsbereich (für PDF/Service-Client).
 * Gibt eine Timeline pro Monat im Zeitraum dateFrom–dateTo zurück.
 */
export async function getMonthlyTimelinesByRange(
  supabase: SupabaseClient<Database>,
  accountId: string,
  dateFrom: string,
  dateTo: string,
): Promise<MonthTimeline[]> {
  const from = new Date(dateFrom)
  const to = new Date(dateTo)

  const months: Array<{ year: number; month: number }> = []
  const current = new Date(from.getFullYear(), from.getMonth(), 1)

  while (current <= to) {
    months.push({ year: current.getFullYear(), month: current.getMonth() + 1 })
    current.setMonth(current.getMonth() + 1)
  }

  const timelines = await Promise.all(
    months.map(({ year, month }) =>
      getMonthlyTimeline(supabase, accountId, year, month),
    ),
  )

  return timelines
}

export async function getSymptomEvents(
  supabase: SupabaseClient<Database>,
  accountId: string,
  symptomName: string,
  timeRange: TimeRange,
  limit = 5,
): Promise<FeedEvent[]> {
  const startDate = getTimeRangeStart(timeRange)
  const bufferStart = new Date(startDate)
  bufferStart.setDate(bufferStart.getDate() - 1)

  const { data, error } = await supabase
    .from('symptom_events')
    .select(
      'id, event_type, occurred_at, created_at, ended_at, raw_input, audio_url, extracted_data(field_name, value), event_photos(id)',
    )
    .eq('account_id', accountId)
    .eq('status', 'confirmed')
    .is('deleted_at', null)
    .gte('occurred_at', bufferStart.toISOString())
    .order('occurred_at', { ascending: false })

  if (error || !data) {
    if (error) {
      console.error(
        '[Insights] Symptom-Events-Abfrage fehlgeschlagen:',
        error.message,
      )
    }
    return []
  }

  const cutoffKey = toLocalDateKey(startDate)
  const rows = data as unknown as RawFeedRow[]

  const filtered = rows.filter((row) => {
    const localKey = toLocalDateKey(new Date(row.occurred_at))
    if (localKey < cutoffKey) return false
    const extracted = pivotExtractedData(row.extracted_data)
    // symptomName can be a symptom name or medication name
    // Check symptom_name for symptoms and medication for medications
    const isMed = row.event_type === 'medication'
    if (isMed) {
      return extracted.medication === symptomName
    } else {
      return extracted.symptomName === symptomName
    }
  })

  return filtered.slice(0, limit).map(mapRowToFeedEvent)
}

export async function getEventDetail(
  supabase: SupabaseClient<Database>,
  eventId: string,
  accountId: string,
): Promise<EventDetail | null> {
  const { data: event, error: eventError } = await supabase
    .from('symptom_events')
    .select('*')
    .eq('id', eventId)
    .eq('account_id', accountId)
    .eq('status', 'confirmed')
    .is('deleted_at', null)
    .single()

  if (eventError || !event) {
    return null
  }

  const [{ data: extractedRows }, { data: photoRows }] = await Promise.all([
    supabase
      .from('extracted_data')
      .select('field_name, value, confidence, confirmed, symptom_index')
      .eq('symptom_event_id', eventId),
    supabase
      .from('event_photos')
      .select('id, storage_path')
      .eq('symptom_event_id', eventId)
      .order('created_at', { ascending: true }),
  ])

  // Generate signed URL for audio (serverseitig)
  let audioUrl: string | null = null
  if (event.audio_url) {
    try {
      audioUrl = await getSignedAudioUrl(supabase, event.audio_url)
    } catch {
      audioUrl = null
    }
  }

  // Generate signed URLs for photos using Promise.allSettled
  const photos: EventPhoto[] = []
  if (photoRows && photoRows.length > 0) {
    const results = await Promise.allSettled(
      photoRows.map((p) => getSignedPhotoUrl(supabase, p.storage_path)),
    )
    for (let i = 0; i < photoRows.length; i++) {
      const result = results[i]
      if (result.status === 'fulfilled') {
        photos.push({ id: photoRows[i].id, signedUrl: result.value })
      }
    }
  }

  const extractedFields: ExtractedField[] = (extractedRows ?? []).map((r) => ({
    fieldName: r.field_name,
    value: r.value,
    confidence: r.confidence,
    confirmed: r.confirmed ?? false,
    symptomIndex: r.symptom_index ?? 0,
  }))

  const eventType = event.event_type === 'medication' ? 'medication' : 'symptom'

  // Resolve symptomName / medication from extracted fields
  const fieldMap = new Map(extractedFields.map((f) => [f.fieldName, f.value]))
  const symptomName = fieldMap.get('symptom_name') ?? null
  const medication = fieldMap.get('medication') ?? null

  return {
    id: event.id,
    eventType,
    occurredAt: event.occurred_at,
    createdAt: event.created_at,
    endedAt: event.ended_at,
    rawInput: event.raw_input,
    audioUrl,
    extractedFields,
    photos,
    symptomName,
    medication,
  }
}

function buildEmptyTimeline(year: number, month: number): MonthTimeline {
  const daysInMonth = new Date(year, month, 0).getDate()
  const days: DayEventSummary[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    days.push({
      date: dateKey,
      symptomCount: 0,
      medicationCount: 0,
      totalCount: 0,
      maxIntensity: null,
    })
  }
  return { year, month, days, totalEvents: 0 }
}

export async function getDayEvents(
  supabase: SupabaseClient<Database>,
  accountId: string,
  dateKey: string,
): Promise<FeedEvent[]> {
  // dateKey = 'YYYY-MM-DD' (lokaler Datumsschlüssel)
  // Tagesanfang und -ende mit 1-Tag-Puffer, dann in JS filtern
  const [year, month, day] = dateKey.split('-').map(Number)
  const bufferStart = new Date(year, month - 1, day - 1)
  const bufferEnd = new Date(year, month - 1, day + 1)
  const startISO = bufferStart.toISOString()
  const endISO = bufferEnd.toISOString()

  const { data, error } = await supabase
    .from('symptom_events')
    .select(
      'id, event_type, occurred_at, created_at, ended_at, raw_input, audio_url, extracted_data(field_name, value), event_photos(id)',
    )
    .eq('account_id', accountId)
    .eq('status', 'confirmed')
    .is('deleted_at', null)
    .gte('occurred_at', startISO)
    .lt('occurred_at', endISO)
    .order('occurred_at', { ascending: false })

  if (error || !data) {
    if (error) {
      console.error('[Insights] Tages-Abfrage fehlgeschlagen:', error.message)
    }
    return []
  }

  const rows = data as unknown as RawFeedRow[]
  return rows
    .filter((row) => toLocalDateKey(new Date(row.occurred_at)) === dateKey)
    .map(mapRowToFeedEvent)
}

export async function softDeleteEvent(
  supabase: SupabaseClient<Database>,
  eventId: string,
  accountId: string,
): Promise<{ error: AppError | null }> {
  // Pre-check: verify event exists and belongs to user
  // (SELECT policy requires deleted_at IS NULL, so we check before updating)
  const { data: exists } = await supabase
    .from('symptom_events')
    .select('id')
    .eq('id', eventId)
    .eq('account_id', accountId)
    .is('deleted_at', null)
    .single()

  if (!exists) {
    return { error: { error: 'Event nicht gefunden', code: 'NOT_FOUND' } }
  }

  // Update without .select() — RLS SELECT policy blocks reading soft-deleted rows
  const { error } = await supabase
    .from('symptom_events')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', eventId)
    .eq('account_id', accountId)
    .is('deleted_at', null)

  if (error) {
    console.error('[Insights] Event soft-delete fehlgeschlagen:', error.message)
    return {
      error: { error: 'Löschung fehlgeschlagen', code: 'DELETE_FAILED' },
    }
  }

  return { error: null }
}

export async function softDeleteAllEvents(
  supabase: SupabaseClient<Database>,
  accountId: string,
): Promise<{ deletedCount: number; error: AppError | null }> {
  // Count matching events before update
  // (SELECT policy requires deleted_at IS NULL, so we count before soft-deleting)
  const { data: events } = await supabase
    .from('symptom_events')
    .select('id')
    .eq('account_id', accountId)
    .is('deleted_at', null)

  const count = events?.length ?? 0

  if (count === 0) {
    return { deletedCount: 0, error: null }
  }

  // Update without .select() — RLS SELECT policy blocks reading soft-deleted rows
  const { error } = await supabase
    .from('symptom_events')
    .update({ deleted_at: new Date().toISOString() })
    .eq('account_id', accountId)
    .is('deleted_at', null)

  if (error) {
    console.error(
      '[Insights] Alle Events soft-delete fehlgeschlagen:',
      error.message,
    )
    return {
      deletedCount: 0,
      error: { error: 'Löschung fehlgeschlagen', code: 'DELETE_FAILED' },
    }
  }

  return { deletedCount: count, error: null }
}
