import { createServiceClient } from '@/lib/db/client'
import type { CachedSummary } from '@/types/summary'

/**
 * Lädt eine gecachte, gültige Summary für einen Sharing-Link.
 * Gibt null zurück wenn keine Summary existiert oder sie invalidiert wurde.
 */
export async function getCachedSummary(
  sharingLinkId: string,
): Promise<CachedSummary | null> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('sharing_summaries')
    .select('summary_text, generated_at, event_count')
    .eq('sharing_link_id', sharingLinkId)
    .is('invalidated_at', null)
    .single()

  if (error || !data) return null

  return {
    summaryText: data.summary_text,
    generatedAt: data.generated_at,
    eventCount: data.event_count,
  }
}

/**
 * Speichert oder aktualisiert eine Summary (UPSERT via ON CONFLICT).
 * Verhindert Race-Conditions bei gleichzeitigem Dashboard-Zugriff.
 */
export async function saveSummary(
  sharingLinkId: string,
  summaryText: string,
  eventCount: number,
): Promise<void> {
  const supabase = createServiceClient()
  const now = new Date().toISOString()

  const { error } = await supabase.from('sharing_summaries').upsert(
    {
      sharing_link_id: sharingLinkId,
      summary_text: summaryText,
      event_count: eventCount,
      generated_at: now,
      invalidated_at: null,
    },
    { onConflict: 'sharing_link_id' },
  )

  if (error) {
    console.error('[saveSummary] UPSERT fehlgeschlagen:', error.message)
  }
}

/**
 * Prüft ob die gecachte Summary noch aktuell ist.
 * Gibt true zurück wenn die Summary frisch ist (keine neuen Events seit generated_at).
 * Invalidiert die Summary automatisch wenn neue Events vorhanden sind.
 */
export async function checkSummaryFreshness(
  sharingLinkId: string,
  accountId: string,
  dateFrom: string,
  dateTo: string,
): Promise<boolean> {
  const supabase = createServiceClient()

  // Summary-Zeitstempel laden
  const { data: summaryData, error: summaryError } = await supabase
    .from('sharing_summaries')
    .select('generated_at, id')
    .eq('sharing_link_id', sharingLinkId)
    .is('invalidated_at', null)
    .single()

  if (summaryError || !summaryData) return false

  // Neuestes Event im Zeitraum ermitteln
  const { data: eventData, error: eventError } = await supabase
    .from('symptom_events')
    .select('created_at')
    .eq('account_id', accountId)
    .gte('occurred_at', dateFrom)
    .lte('occurred_at', dateTo)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (eventError || !eventData) return true // Keine Events → Summary ist frisch

  const latestEventAt = new Date(eventData.created_at)
  const generatedAt = new Date(summaryData.generated_at)

  if (latestEventAt <= generatedAt) return true

  // Neues Event → Summary invalidieren
  await supabase
    .from('sharing_summaries')
    .update({ invalidated_at: new Date().toISOString() })
    .eq('sharing_link_id', sharingLinkId)

  return false
}
