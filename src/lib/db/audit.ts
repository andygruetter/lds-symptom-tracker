import type { SupabaseClient } from '@supabase/supabase-js'

import { createServiceClient } from '@/lib/db/client'
import { hashIpAddress } from '@/lib/utils/crypto'
import type { AuditAction, AuditLogListItem } from '@/types/audit'
import type { Database, Json } from '@/types/database'

type DbClient = SupabaseClient<Database>

function extractIpAddress(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  )
}

/**
 * Schreibt einen Audit-Eintrag via Service-Client (bypassed RLS).
 * Arzt hat keine Supabase-Auth-Session → Service-Role notwendig.
 * Fehler werden geloggt aber NICHT weitergegeben (best-effort, AC#1).
 */
export async function insertAuditEntry(
  supabase: DbClient,
  params: {
    accountId: string
    sharingLinkId: string
    action: AuditAction
    ipAddressHash?: string | null
    metadata?: Record<string, unknown> | null
  },
): Promise<void> {
  const { error } = await supabase.from('audit_log').insert({
    account_id: params.accountId,
    sharing_link_id: params.sharingLinkId,
    action: params.action,
    ip_address_hash: params.ipAddressHash ?? null,
    metadata: (params.metadata as Json) ?? null,
  })

  if (error) {
    console.error('[insertAuditEntry] failed:', error.message)
  }
}

/**
 * Lädt alle Audit-Einträge eines Patienten inkl. Sharing-Link-Zeitraum.
 * Nutzt Server-Client mit RLS (Patient sieht nur eigene Einträge).
 * Sortierung: neueste zuerst (AC#3).
 */
export async function getAuditLogForPatient(
  supabase: DbClient,
  accountId: string,
): Promise<AuditLogListItem[]> {
  const { data, error } = await supabase
    .from('audit_log')
    .select(
      'id, action, accessed_at, sharing_link_id, sharing_links(date_from, date_to)',
    )
    .eq('account_id', accountId)
    .order('accessed_at', { ascending: false })

  if (error) {
    throw new Error(`[getAuditLogForPatient] ${error.message}`)
  }

  if (!data) {
    return []
  }

  return data.map((row) => {
    const link = row.sharing_links as {
      date_from: string
      date_to: string
    } | null
    const sharingLinkPeriod = link
      ? formatLinkPeriod(link.date_from, link.date_to)
      : '–'

    return {
      id: row.id,
      action: row.action as AuditAction,
      accessedAt: row.accessed_at,
      sharingLinkId: row.sharing_link_id,
      sharingLinkPeriod,
    }
  })
}

function formatLinkPeriod(dateFrom: string, dateTo: string): string {
  const from = new Date(dateFrom).toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
  })
  const to = new Date(dateTo).toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  return `${from} – ${to}`
}

/**
 * Zentraler Helper für Arzt-Zugriff-Logging (Route Handlers).
 * Extrahiert IP aus Request-Headers, hasht sie und schreibt den Audit-Eintrag.
 * Fehler blockieren den Arzt-Zugriff NICHT (best-effort, Dev Notes).
 */
export async function trackSharingAccess(
  request: Request,
  sharingLink: { id: string; accountId: string },
  action: AuditAction,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    const supabase = createServiceClient()
    const ip = extractIpAddress(request)

    await insertAuditEntry(supabase, {
      accountId: sharingLink.accountId,
      sharingLinkId: sharingLink.id,
      action,
      ipAddressHash: hashIpAddress(ip),
      metadata: metadata ?? null,
    })
  } catch (err) {
    console.error('[trackSharingAccess] unexpected error:', err)
  }
}

/**
 * Zentraler Helper für Arzt-Zugriff-Logging in Server Components (kein Request-Objekt).
 * Liest IP aus `next/headers`, hasht sie und schreibt den Audit-Eintrag.
 * Fehler blockieren den Arzt-Zugriff NICHT (best-effort, Dev Notes).
 */
export async function trackSharingAccessFromPage(
  sharingLink: { id: string; accountId: string },
  action: AuditAction,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    const { headers } = await import('next/headers')
    const headerStore = await headers()
    const ip =
      headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      headerStore.get('x-real-ip') ??
      'unknown'

    const supabase = createServiceClient()
    await insertAuditEntry(supabase, {
      accountId: sharingLink.accountId,
      sharingLinkId: sharingLink.id,
      action,
      ipAddressHash: hashIpAddress(ip),
      metadata: metadata ?? null,
    })
  } catch (err) {
    console.error('[trackSharingAccessFromPage] unexpected error:', err)
  }
}
