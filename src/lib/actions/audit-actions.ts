'use server'

import { getAuditLogForPatient } from '@/lib/db/audit'
import { createServerClient } from '@/lib/db/client'
import type { AuditLogListItem } from '@/types/audit'
import type { ActionResult } from '@/types/common'

/**
 * Lädt das Audit-Log für den aktuell angemeldeten Patienten.
 * Auth → DB (RLS) → Liste sortiert nach accessed_at DESC.
 */
export async function loadAuditLog(): Promise<
  ActionResult<AuditLogListItem[]>
> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      data: null,
      error: { error: 'Nicht authentifiziert', code: 'AUTH_REQUIRED' },
    }
  }

  try {
    const entries = await getAuditLogForPatient(supabase, user.id)
    return { data: entries, error: null }
  } catch (err) {
    console.error('[loadAuditLog]', err)
    return {
      data: null,
      error: {
        error: 'Zugriffsprotokolle konnten nicht geladen werden',
        code: 'AUDIT_LOAD_FAILED',
      },
    }
  }
}
