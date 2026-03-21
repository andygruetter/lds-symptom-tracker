import type { SupabaseClient } from '@supabase/supabase-js'

import { createServiceClient } from '@/lib/db/client'
import {
  aggregateRankingFromRows,
  mapRowToFeedEvent,
  type RawFeedRow,
  type TimelineRawRow,
} from '@/lib/db/insights'
import { getSignedMediaUrl } from '@/lib/db/media'
import { generateSharingToken } from '@/lib/utils/crypto'
import { toLocalDateKey } from '@/lib/utils/date'
import type {
  EventDetail,
  EventPhoto,
  ExtractedField,
  FeedEvent,
  SymptomRanking,
} from '@/types/analytics'
import type { ActionResult } from '@/types/common'
import type { Database } from '@/types/database'
import type {
  AccessDuration,
  DateRange,
  SharedSymptomEvent,
  SharingLink,
  SharingLinkData,
  SharingLinkListItem,
  SharingLinkStatus,
} from '@/types/sharing'
import type { SummaryEventData } from '@/types/summary'

type DbClient = SupabaseClient<Database>

type SharingLinkRow = Database['public']['Tables']['sharing_links']['Row']

function computeDateRange(
  dateRange: DateRange,
  customFrom?: string,
  customTo?: string,
): { dateFrom: string; dateTo: string } {
  const today = new Date()
  const dateTo = toLocalDateKey(today)

  if (dateRange === 'custom') {
    return { dateFrom: customFrom ?? '', dateTo: customTo ?? '' }
  }

  const monthsBack: Record<Exclude<DateRange, 'custom'>, number> = {
    '1m': 1,
    '3m': 3,
    '6m': 6,
    '12m': 12,
  }

  const from = new Date(today)
  from.setMonth(
    from.getMonth() - monthsBack[dateRange as Exclude<DateRange, 'custom'>],
  )
  return { dateFrom: toLocalDateKey(from), dateTo }
}

function computeExpiresAt(accessDuration: AccessDuration): string {
  const now = new Date()
  const hoursMap: Record<AccessDuration, number> = {
    '24h': 24,
    '48h': 48,
    '7d': 168,
  }
  now.setHours(now.getHours() + hoursMap[accessDuration])
  return now.toISOString()
}

export function computeLinkStatus(
  expiresAt: string,
  revokedAt: string | null,
): SharingLinkStatus {
  if (revokedAt !== null) return 'revoked'
  if (new Date(expiresAt) <= new Date()) return 'expired'
  return 'active'
}

function buildShareUrl(token: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return `${appUrl}/share/${token}`
}

function rowToSharingLink(row: SharingLinkRow): SharingLink {
  const now = new Date()
  const isActive = new Date(row.expires_at) > now && row.revoked_at === null
  return {
    id: row.id,
    accountId: row.account_id,
    token: row.token,
    dateFrom: row.date_from,
    dateTo: row.date_to,
    expiresAt: row.expires_at,
    recipientEmail: row.recipient_email,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
    shareUrl: buildShareUrl(row.token),
    isActive,
  }
}

function rowToListItem(row: SharingLinkRow): SharingLinkListItem {
  const status = computeLinkStatus(row.expires_at, row.revoked_at)
  return {
    id: row.id,
    token: row.token,
    dateFrom: row.date_from,
    dateTo: row.date_to,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    shareUrl: buildShareUrl(row.token),
    isActive: status === 'active',
    recipientEmail: row.recipient_email,
    status,
    revokedAt: row.revoked_at,
  }
}

/**
 * Erstellt einen neuen Sharing-Link mit UNIQUE-Token-Retry-Logik.
 * Max. 3 Versuche bei theoretischer Token-Kollision.
 */
export async function createSharingLink(
  supabase: DbClient,
  accountId: string,
  params: {
    dateRange: DateRange
    accessDuration: AccessDuration
    customFrom?: string
    customTo?: string
    recipientEmail?: string
  },
): Promise<ActionResult<SharingLink>> {
  const { dateFrom, dateTo } = computeDateRange(
    params.dateRange,
    params.customFrom,
    params.customTo,
  )
  const expiresAt = computeExpiresAt(params.accessDuration)

  let lastError: string = 'Unbekannter Fehler'

  for (let attempt = 0; attempt < 3; attempt++) {
    let token: string
    try {
      token = generateSharingToken()
    } catch (err) {
      return {
        data: null,
        error: {
          error:
            err instanceof Error
              ? err.message
              : 'Token-Generierung fehlgeschlagen',
          code: 'TOKEN_ERROR',
        },
      }
    }

    const { data, error } = await supabase
      .from('sharing_links')
      .insert({
        account_id: accountId,
        token,
        date_from: dateFrom,
        date_to: dateTo,
        expires_at: expiresAt,
        recipient_email: params.recipientEmail || null,
      })
      .select()
      .single()

    if (!error && data) {
      return { data: rowToSharingLink(data), error: null }
    }

    // Bei UNIQUE-Constraint-Verletzung: erneut versuchen
    if (error?.code === '23505') {
      lastError = 'Token-Kollision, erneuter Versuch'
      continue
    }

    return {
      data: null,
      error: {
        error: error?.message ?? 'DB-Insert fehlgeschlagen',
        code: 'DB_ERROR',
      },
    }
  }

  return {
    data: null,
    error: { error: lastError, code: 'TOKEN_COLLISION' },
  }
}

/**
 * Lädt alle aktiven Sharing-Links eines Patienten.
 * Aktiv = nicht abgelaufen UND nicht revoziert.
 */
export async function getActiveSharingLinks(
  supabase: DbClient,
  accountId: string,
): Promise<ActionResult<SharingLinkListItem[]>> {
  const { data, error } = await supabase
    .from('sharing_links')
    .select('*')
    .eq('account_id', accountId)
    .gt('expires_at', new Date().toISOString())
    .is('revoked_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    return {
      data: null,
      error: { error: error.message, code: 'DB_ERROR' },
    }
  }

  return { data: (data ?? []).map(rowToListItem), error: null }
}

/**
 * Lädt ALLE Sharing-Links eines Patienten (aktiv + abgelaufen + widerrufen).
 * Sortierung: neueste zuerst.
 */
export async function getAllSharingLinks(
  supabase: DbClient,
  accountId: string,
): Promise<ActionResult<SharingLinkListItem[]>> {
  const { data, error } = await supabase
    .from('sharing_links')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })

  if (error) {
    return {
      data: null,
      error: { error: error.message, code: 'DB_ERROR' },
    }
  }

  return { data: (data ?? []).map(rowToListItem), error: null }
}

/**
 * Aktualisiert die Empfänger-E-Mail eines bestehenden Sharing-Links.
 */
export async function updateSharingLinkEmail(
  supabase: DbClient,
  accountId: string,
  linkId: string,
  recipientEmail: string | null,
): Promise<ActionResult<null>> {
  const { error } = await supabase
    .from('sharing_links')
    .update({ recipient_email: recipientEmail })
    .eq('id', linkId)
    .eq('account_id', accountId)

  if (error) {
    return {
      data: null,
      error: { error: error.message, code: 'DB_ERROR' },
    }
  }

  return { data: null, error: null }
}

/**
 * Validiert einen Sharing-Token (aus der URL).
 * Gibt SharingLinkData zurück wenn gültig (existiert, nicht abgelaufen, nicht widerrufen).
 * Verwendet Service Client — Arzt hat keine Auth-Session (RLS würde Query blocken).
 */
export async function validateSharingToken(
  token: string,
): Promise<SharingLinkData | null> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('sharing_links')
    .select('id, account_id, date_from, date_to, expires_at')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .is('revoked_at', null)
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    accountId: data.account_id,
    dateFrom: data.date_from,
    dateTo: data.date_to,
    expiresAt: data.expires_at,
  }
}

/**
 * Validiert einen Sharing-Link anhand seiner UUID (für Dashboard-Layout Deep Validation).
 * Prüft ob der Link noch gültig (nicht abgelaufen, nicht widerrufen).
 * Verwendet Service Client — Arzt hat keine Auth-Session.
 */
export async function validateSharingLinkById(
  linkId: string,
): Promise<SharingLinkData | null> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('sharing_links')
    .select('id, account_id, date_from, date_to, expires_at')
    .eq('id', linkId)
    .gt('expires_at', new Date().toISOString())
    .is('revoked_at', null)
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    accountId: data.account_id,
    dateFrom: data.date_from,
    dateTo: data.date_to,
    expiresAt: data.expires_at,
  }
}

/**
 * Lädt Symptom-Events für das Arzt-Dashboard (gefiltert nach Zeitraum + Soft-Delete).
 * Inkl. erstem symptom_name aus extracted_data für die Event-Liste.
 * Verwendet Service Client — Arzt hat keine Auth-Session (RLS würde Query blocken).
 *
 * @deprecated Superseded by {@link getSharedFeedEvents} which returns richer FeedEvent[] data.
 * This function is no longer used in any component. Consider removing in next cleanup.
 */
export async function getSharedSymptomEvents(
  accountId: string,
  dateFrom: string,
  dateTo: string,
): Promise<SharedSymptomEvent[]> {
  const supabase = createServiceClient()

  // +1 Tag Puffer für Timezone-Safety (bewährter Pattern aus insights.ts/ranking)
  const bufferStart = new Date(dateFrom)
  bufferStart.setDate(bufferStart.getDate() - 1)
  const bufferEnd = new Date(dateTo)
  bufferEnd.setDate(bufferEnd.getDate() + 1)

  const { data, error } = await supabase
    .from('symptom_events')
    .select(
      'id, event_type, occurred_at, ended_at, raw_input, audio_url, status, extracted_data(field_name, value)',
    )
    .eq('account_id', accountId)
    .eq('status', 'confirmed')
    .gte('occurred_at', bufferStart.toISOString())
    .lt('occurred_at', bufferEnd.toISOString())
    .is('deleted_at', null)
    .order('occurred_at', { ascending: false })

  if (error || !data) return []

  return data.map((row) => {
    const extractedData = Array.isArray(row.extracted_data)
      ? (row.extracted_data as { field_name: string; value: string }[])
      : []
    const symptomName =
      extractedData.find((f) => f.field_name === 'symptom_name')?.value ?? null
    const medication =
      extractedData.find((f) => f.field_name === 'medication')?.value ?? null

    return {
      id: row.id,
      eventType: row.event_type,
      occurredAt: row.occurred_at,
      endedAt: row.ended_at,
      rawInput: row.raw_input,
      audioUrl: row.audio_url,
      status: row.status,
      symptomName: row.event_type === 'medication' ? medication : symptomName,
    }
  })
}

/**
 * Lädt alle Events mit extrahierten Daten für die Arzt-Timeline.
 * JOIN mit extracted_data + event_photos — liefert vollständige FeedEvent[].
 * Verwendet Service Client — Arzt hat keine Auth-Session.
 */
export async function getSharedFeedEvents(
  accountId: string,
  dateFrom: string,
  dateTo: string,
): Promise<FeedEvent[]> {
  const supabase = createServiceClient()

  // +1 Tag Puffer für Timezone-Safety (bewährter Pattern aus insights.ts/ranking)
  const bufferStart = new Date(dateFrom)
  bufferStart.setDate(bufferStart.getDate() - 1)
  const bufferEnd = new Date(dateTo)
  bufferEnd.setDate(bufferEnd.getDate() + 1)

  const { data, error } = await supabase
    .from('symptom_events')
    .select(
      'id, event_type, occurred_at, created_at, ended_at, raw_input, audio_url, extracted_data(field_name, value, symptom_index), event_photos(id)',
    )
    .eq('account_id', accountId)
    .eq('status', 'confirmed')
    .is('deleted_at', null)
    .gte('occurred_at', bufferStart.toISOString())
    .lt('occurred_at', bufferEnd.toISOString())
    .order('occurred_at', { ascending: false })

  if (error || !data) {
    if (error) {
      console.error(
        '[Sharing] Feed-Events-Abfrage fehlgeschlagen:',
        error.message,
      )
    }
    return []
  }

  const rows = data as unknown as RawFeedRow[]
  return rows.map(mapRowToFeedEvent)
}

/**
 * Lädt Events mit extrahierten Daten für die KI-Summary-Generierung.
 * JOIN mit extracted_data — liefert alle Felder pro Event.
 * Sortierung: occurred_at ASC (chronologisch für Summary-Kontext).
 * Verwendet Service Client — Arzt hat keine Auth-Session.
 */
export async function getSharedEventsForSummary(
  accountId: string,
  dateFrom: string,
  dateTo: string,
): Promise<SummaryEventData[]> {
  const supabase = createServiceClient()

  // +1 Tag Puffer für Timezone-Safety (bewährter Pattern aus insights.ts/ranking)
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
    .gte('occurred_at', bufferStart.toISOString())
    .lt('occurred_at', bufferEnd.toISOString())
    .is('deleted_at', null)
    .order('occurred_at', { ascending: true })

  if (error || !data) return []

  return data.map((row) => ({
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

/**
 * Lädt Symptom-Ranking für das Arzt-Dashboard (gefiltert nach Zeitraum).
 * Aggregiert Symptome und Medikamente nach Häufigkeit mit Trend-Berechnung.
 * Verwendet Service Client — Arzt hat keine Auth-Session (RLS-Bypass).
 */
export async function getSharedSymptomRanking(
  accountId: string,
  dateFrom: string,
  dateTo: string,
): Promise<SymptomRanking> {
  const supabase = createServiceClient()

  // +1 Tag Puffer für Timezone-Safety (bewährter Pattern aus insights.ts)
  const bufferStart = new Date(dateFrom)
  bufferStart.setDate(bufferStart.getDate() - 1)
  const bufferEnd = new Date(dateTo)
  bufferEnd.setDate(bufferEnd.getDate() + 1)

  const { data, error } = await supabase
    .from('symptom_events')
    .select(
      'id, event_type, occurred_at, extracted_data(field_name, value, symptom_index)',
    )
    .eq('account_id', accountId)
    .eq('status', 'confirmed')
    .is('deleted_at', null)
    .gte('occurred_at', bufferStart.toISOString())
    .lt('occurred_at', bufferEnd.toISOString())
    .order('occurred_at', { ascending: false })

  if (error || !data) {
    if (error) {
      console.error('[Sharing] Ranking-Abfrage fehlgeschlagen:', error.message)
    }
    return {
      symptoms: [],
      medications: [],
      timeRange: 'all',
      totalSymptomEvents: 0,
      totalMedicationEvents: 0,
    }
  }

  const rows = data as unknown as TimelineRawRow[]
  const result = aggregateRankingFromRows(rows, dateFrom, dateTo)
  return { ...result, timeRange: 'all' }
}

/**
 * Lädt ein einzelnes Event mit allen Details für den Arzt-Drill-Down (Story 6.4).
 * Validiert account_id + Zeitraum + Soft-Delete + status='confirmed'.
 * Gibt signed URLs für Audio und Fotos zurück (15min TTL).
 * Verwendet Service Client — Arzt hat keine Auth-Session (RLS würde Query blocken).
 */
export async function getSharedEventDetail(
  accountId: string,
  eventId: string,
  dateFrom: string,
  dateTo: string,
): Promise<EventDetail | null> {
  const supabase = createServiceClient()

  // +1 Tag Puffer für Timezone-Safety (bewährter Pattern aus insights.ts/ranking)
  const bufferStart = new Date(dateFrom)
  bufferStart.setDate(bufferStart.getDate() - 1)
  const bufferEnd = new Date(dateTo)
  bufferEnd.setDate(bufferEnd.getDate() + 1)

  const { data: event, error: eventError } = await supabase
    .from('symptom_events')
    .select(
      'id, account_id, event_type, occurred_at, created_at, ended_at, raw_input, audio_url, status, deleted_at',
    )
    .eq('id', eventId)
    .eq('account_id', accountId)
    .gte('occurred_at', bufferStart.toISOString())
    .lt('occurred_at', bufferEnd.toISOString())
    .is('deleted_at', null)
    .eq('status', 'confirmed')
    .single()

  if (eventError || !event) {
    if (eventError) {
      console.error(
        '[Sharing] Event-Detail-Abfrage fehlgeschlagen:',
        eventError.message,
      )
    }
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

  // Signed URL für Audio via Service Client (getSignedMediaUrl verwendet createServiceClient intern)
  let audioUrl: string | null = null
  if (event.audio_url) {
    try {
      audioUrl = await getSignedMediaUrl(event.audio_url, 'audio')
    } catch {
      audioUrl = null
    }
  }

  // Signed URLs für Fotos via Promise.allSettled (resilient)
  const photos: EventPhoto[] = []
  if (photoRows && photoRows.length > 0) {
    const results = await Promise.allSettled(
      photoRows.map((p) => getSignedMediaUrl(p.storage_path, 'photos')),
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
  }
}

/**
 * Revoziert einen Sharing-Link (Soft-Revoke).
 * Vorbereitung für Story 5.4.
 */
export async function revokeSharingLink(
  supabase: DbClient,
  accountId: string,
  linkId: string,
): Promise<ActionResult<null>> {
  const { data, error } = await supabase
    .from('sharing_links')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', linkId)
    .eq('account_id', accountId)
    .is('revoked_at', null)
    .select('id')

  if (error) {
    return {
      data: null,
      error: { error: error.message, code: 'DB_ERROR' },
    }
  }

  if (!data || data.length === 0) {
    return {
      data: null,
      error: {
        error: 'Link ist bereits widerrufen oder nicht vorhanden',
        code: 'LINK_NOT_ACTIVE',
      },
    }
  }

  return { data: null, error: null }
}
