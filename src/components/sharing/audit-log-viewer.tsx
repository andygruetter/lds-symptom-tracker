import { ClipboardList } from 'lucide-react'

import { AUDIT_ACTION_LABELS, type AuditLogListItem } from '@/types/audit'

function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface AuditLogViewerProps {
  entries: AuditLogListItem[]
}

export function AuditLogViewer({ entries }: AuditLogViewerProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
        <ClipboardList className="mb-3 size-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          Noch keine Zugriffe auf deine Daten.
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-border">
      {entries.map((entry) => (
        <div key={entry.id} className="px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {AUDIT_ACTION_LABELS[entry.action]}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Zeitraum: {entry.sharingLinkPeriod}
              </p>
            </div>
            <time
              dateTime={entry.accessedAt}
              className="shrink-0 text-xs text-muted-foreground"
            >
              {formatDateTime(entry.accessedAt)}
            </time>
          </div>
        </div>
      ))}
    </div>
  )
}
