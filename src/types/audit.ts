import { z } from 'zod'

/** Erlaubte Aktions-Typen im Audit-Log */
export type AuditAction =
  | 'dashboard_view'
  | 'event_detail'
  | 'event_drill_down'
  | 'audio_stream'
  | 'photo_view'
  | 'pdf_download'

export const AuditActionSchema = z.enum([
  'dashboard_view',
  'event_detail',
  'event_drill_down',
  'audio_stream',
  'photo_view',
  'pdf_download',
])

export const InsertAuditEntrySchema = z.object({
  accountId: z.string().uuid(),
  sharingLinkId: z.string().uuid(),
  action: AuditActionSchema,
  ipAddressHash: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
})

export type InsertAuditEntryInput = z.infer<typeof InsertAuditEntrySchema>

/** Roher DB-Eintrag aus der audit_log-Tabelle */
export type AuditLogEntry = {
  id: string
  accountId: string
  sharingLinkId: string
  action: AuditAction
  accessedAt: string
  ipAddressHash: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

/** Für die UI aufgelöster Eintrag (mit Sharing-Link-Referenz) */
export type AuditLogListItem = {
  id: string
  action: AuditAction
  accessedAt: string
  sharingLinkId: string
  /** Zeitraum des Sharing-Links z.B. "01.02. – 01.03.2026" */
  sharingLinkPeriod: string
}

/** Deutsche Labels für Audit-Aktionen */
export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  dashboard_view: 'Dashboard angesehen',
  event_detail: 'Symptom-Detail angesehen',
  event_drill_down: 'Event-Detail angesehen (Drill-Down)',
  audio_stream: 'Audio abgespielt',
  photo_view: 'Foto angesehen',
  pdf_download: 'PDF heruntergeladen',
}
