import { redirect } from 'next/navigation'

import { MorePageContent } from '@/components/more/more-page-content'
import { getAuditLogForPatient } from '@/lib/db/audit'
import { createServerClient } from '@/lib/db/client'
import { getAllSharingLinks } from '@/lib/db/sharing'
import type { AuditLogListItem } from '@/types/audit'

export default async function MorePage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const [linksResult, auditEntries] = await Promise.all([
    getAllSharingLinks(supabase, user.id),
    getAuditLogForPatient(supabase, user.id).catch(
      (err): AuditLogListItem[] => {
        console.error('[MorePage] Audit-Log laden fehlgeschlagen:', err)
        return []
      },
    ),
  ])

  return (
    <MorePageContent
      initialLinks={linksResult.data ?? []}
      initialAuditEntries={auditEntries}
    />
  )
}
