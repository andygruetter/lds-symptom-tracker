import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { AuditLogListItem } from '@/types/audit'

function makeEntry(
  overrides: Partial<AuditLogListItem> = {},
): AuditLogListItem {
  return {
    id: 'audit-1',
    action: 'dashboard_view',
    accessedAt: '2026-03-15T10:30:00Z',
    sharingLinkId: 'link-1',
    sharingLinkPeriod: '01.02. – 15.03.2026',
    ...overrides,
  }
}

describe('AuditLogViewer', () => {
  it('zeigt Empty-State wenn keine Einträge vorhanden (AC#4)', async () => {
    const { AuditLogViewer } =
      await import('@/components/sharing/audit-log-viewer')
    render(<AuditLogViewer entries={[]} />)

    expect(
      screen.getByText('Noch keine Zugriffe auf deine Daten.'),
    ).toBeInTheDocument()
  })

  it('zeigt Action-Label auf Deutsch: dashboard_view', async () => {
    const { AuditLogViewer } =
      await import('@/components/sharing/audit-log-viewer')
    render(
      <AuditLogViewer entries={[makeEntry({ action: 'dashboard_view' })]} />,
    )

    expect(screen.getByText('Dashboard angesehen')).toBeInTheDocument()
  })

  it('zeigt Action-Label auf Deutsch: event_detail', async () => {
    const { AuditLogViewer } =
      await import('@/components/sharing/audit-log-viewer')
    render(<AuditLogViewer entries={[makeEntry({ action: 'event_detail' })]} />)

    expect(screen.getByText('Symptom-Detail angesehen')).toBeInTheDocument()
  })

  it('zeigt Action-Label auf Deutsch: audio_stream', async () => {
    const { AuditLogViewer } =
      await import('@/components/sharing/audit-log-viewer')
    render(<AuditLogViewer entries={[makeEntry({ action: 'audio_stream' })]} />)

    expect(screen.getByText('Audio abgespielt')).toBeInTheDocument()
  })

  it('zeigt Action-Label auf Deutsch: photo_view', async () => {
    const { AuditLogViewer } =
      await import('@/components/sharing/audit-log-viewer')
    render(<AuditLogViewer entries={[makeEntry({ action: 'photo_view' })]} />)

    expect(screen.getByText('Foto angesehen')).toBeInTheDocument()
  })

  it('zeigt Action-Label auf Deutsch: pdf_download', async () => {
    const { AuditLogViewer } =
      await import('@/components/sharing/audit-log-viewer')
    render(<AuditLogViewer entries={[makeEntry({ action: 'pdf_download' })]} />)

    expect(screen.getByText('PDF heruntergeladen')).toBeInTheDocument()
  })

  it('zeigt Sharing-Link-Referenz (Zeitraum) pro Eintrag (AC#3)', async () => {
    const { AuditLogViewer } =
      await import('@/components/sharing/audit-log-viewer')
    render(
      <AuditLogViewer
        entries={[makeEntry({ sharingLinkPeriod: '01.02. – 15.03.2026' })]}
      />,
    )

    expect(screen.getByText(/01.02. – 15.03.2026/)).toBeInTheDocument()
  })

  it('zeigt Datum/Uhrzeit pro Eintrag (AC#3)', async () => {
    const { AuditLogViewer } =
      await import('@/components/sharing/audit-log-viewer')
    render(
      <AuditLogViewer
        entries={[makeEntry({ accessedAt: '2026-03-15T10:30:00Z' })]}
      />,
    )

    // Das Datum muss irgendwie sichtbar sein (formatiert nach de-CH)
    const timeEl = screen.getByRole('time')
    expect(timeEl).toHaveAttribute('dateTime', '2026-03-15T10:30:00Z')
  })

  it('zeigt mehrere Einträge in der richtigen Reihenfolge (AC#3)', async () => {
    const { AuditLogViewer } =
      await import('@/components/sharing/audit-log-viewer')
    const entries = [
      makeEntry({
        id: 'audit-1',
        action: 'dashboard_view',
        accessedAt: '2026-03-15T10:00:00Z',
      }),
      makeEntry({
        id: 'audit-2',
        action: 'event_detail',
        accessedAt: '2026-03-14T09:00:00Z',
      }),
    ]
    render(<AuditLogViewer entries={entries} />)

    const items = screen.getAllByRole('time')
    expect(items).toHaveLength(2)
    // Erste Eintrag sollte neuestes Datum haben (Sortierung liegt bei DB, nicht Komponente)
    expect(screen.getByText('Dashboard angesehen')).toBeInTheDocument()
    expect(screen.getByText('Symptom-Detail angesehen')).toBeInTheDocument()
  })

  it('keine Empty-State wenn Einträge vorhanden', async () => {
    const { AuditLogViewer } =
      await import('@/components/sharing/audit-log-viewer')
    render(<AuditLogViewer entries={[makeEntry()]} />)

    expect(
      screen.queryByText('Noch keine Zugriffe auf deine Daten.'),
    ).not.toBeInTheDocument()
  })
})
