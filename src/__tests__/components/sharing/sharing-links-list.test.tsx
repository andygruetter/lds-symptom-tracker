import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const mockRevokeSharingLinkAction = vi.fn()
vi.mock('@/lib/actions/sharing-actions', () => ({
  createSharingLinkAction: vi.fn(),
  revokeSharingLinkAction: (...args: unknown[]) =>
    mockRevokeSharingLinkAction(...args),
}))

function makeLink(
  overrides: Partial<{
    id: string
    token: string
    status: 'active' | 'expired' | 'revoked'
    isActive: boolean
    revokedAt: string | null
    expiresAt: string
    createdAt: string
    recipientEmail: string | null
  }> = {},
) {
  const status = overrides.status ?? 'active'
  return {
    id: 'link-1',
    token: 'a'.repeat(64),
    dateFrom: '2026-02-15',
    dateTo: '2026-03-15',
    expiresAt: '2099-01-01T00:00:00.000Z',
    createdAt: '2026-03-15T10:00:00.000Z',
    shareUrl: 'https://app.example.com/share/' + 'a'.repeat(64),
    isActive: status === 'active',
    recipientEmail: null,
    revokedAt: null,
    ...overrides,
    status,
  }
}

describe('SharingLinksList', () => {
  it('zeigt Empty-State wenn keine Links vorhanden', async () => {
    const { SharingLinksList } =
      await import('@/components/sharing/sharing-links-list')
    render(<SharingLinksList links={[]} />)

    expect(screen.getByText(/Noch keine Links geteilt/)).toBeInTheDocument()
    expect(screen.getByText(/Vor dem nächsten Arzttermin/)).toBeInTheDocument()
  })

  it('zeigt aktive Links mit Zeitraum und Ablaufdatum', async () => {
    const { SharingLinksList } =
      await import('@/components/sharing/sharing-links-list')
    render(<SharingLinksList links={[makeLink({ status: 'active' })]} />)

    // Datumsbereich als zusammenhängender Text (von – bis)
    expect(screen.getByText(/15\.02\.2026 – 15\.03\.2026/)).toBeInTheDocument()
    expect(screen.getByText('Aktiv')).toBeInTheDocument()
  })

  it('zeigt Status-Badge "Aktiv" für aktive Links', async () => {
    const { SharingLinksList } =
      await import('@/components/sharing/sharing-links-list')
    render(<SharingLinksList links={[makeLink({ status: 'active' })]} />)

    expect(screen.getByText('Aktiv')).toBeInTheDocument()
  })

  it('zeigt Status-Badge "Abgelaufen" für abgelaufene Links', async () => {
    const { SharingLinksList } =
      await import('@/components/sharing/sharing-links-list')
    render(
      <SharingLinksList
        links={[
          makeLink({
            status: 'expired',
            expiresAt: '2020-01-01T00:00:00.000Z',
          }),
        ]}
      />,
    )

    expect(screen.getByText('Abgelaufen')).toBeInTheDocument()
  })

  it('zeigt Status-Badge "Widerrufen" für widerrufene Links', async () => {
    const { SharingLinksList } =
      await import('@/components/sharing/sharing-links-list')
    render(
      <SharingLinksList
        links={[
          makeLink({
            status: 'revoked',
            revokedAt: '2026-03-10T08:00:00.000Z',
          }),
        ]}
      />,
    )

    expect(screen.getByText('Widerrufen')).toBeInTheDocument()
  })

  it('zeigt Copy-Button und Widerruf-Button für aktive Links', async () => {
    const { SharingLinksList } =
      await import('@/components/sharing/sharing-links-list')
    render(<SharingLinksList links={[makeLink({ status: 'active' })]} />)

    expect(
      screen.getByRole('button', { name: 'Link kopieren' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Link widerrufen' }),
    ).toBeInTheDocument()
  })

  it('zeigt keinen Widerruf-Button für abgelaufene Links', async () => {
    const { SharingLinksList } =
      await import('@/components/sharing/sharing-links-list')
    render(
      <SharingLinksList
        links={[
          makeLink({
            status: 'expired',
            expiresAt: '2020-01-01T00:00:00.000Z',
          }),
        ]}
      />,
    )

    expect(
      screen.queryByRole('button', { name: 'Link widerrufen' }),
    ).not.toBeInTheDocument()
  })

  it('zeigt keinen Widerruf-Button für widerrufene Links', async () => {
    const { SharingLinksList } =
      await import('@/components/sharing/sharing-links-list')
    render(
      <SharingLinksList
        links={[
          makeLink({
            status: 'revoked',
            revokedAt: '2026-03-10T08:00:00.000Z',
          }),
        ]}
      />,
    )

    expect(
      screen.queryByRole('button', { name: 'Link widerrufen' }),
    ).not.toBeInTheDocument()
  })

  it('zeigt AlertDialog Bestätigungsdialog beim Widerruf', async () => {
    const { SharingLinksList } =
      await import('@/components/sharing/sharing-links-list')
    render(<SharingLinksList links={[makeLink({ status: 'active' })]} />)

    const revokeButton = screen.getByRole('button', { name: 'Link widerrufen' })
    fireEvent.click(revokeButton)

    await waitFor(() => {
      expect(screen.getByText('Link wirklich widerrufen?')).toBeInTheDocument()
    })
    expect(
      screen.getByText(/Der Arzt kann danach nicht mehr/),
    ).toBeInTheDocument()
  })

  it('ruft revokeSharingLinkAction auf nach Bestätigung', async () => {
    mockRevokeSharingLinkAction.mockResolvedValue({ data: null, error: null })

    const { SharingLinksList } =
      await import('@/components/sharing/sharing-links-list')
    render(
      <SharingLinksList
        links={[makeLink({ id: 'link-42', status: 'active' })]}
      />,
    )

    // Widerruf-Button klicken
    fireEvent.click(screen.getByRole('button', { name: 'Link widerrufen' }))

    // Bestätigung im Dialog
    await waitFor(() => screen.getByText('Link wirklich widerrufen?'))
    const confirmButton = screen.getByRole('button', { name: 'Widerrufen' })
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockRevokeSharingLinkAction).toHaveBeenCalledWith('link-42')
    })
  })

  it('zeigt Empfänger-E-Mail wenn vorhanden', async () => {
    const { SharingLinksList } =
      await import('@/components/sharing/sharing-links-list')
    render(
      <SharingLinksList
        links={[makeLink({ recipientEmail: 'dr.mueller@spital.ch' })]}
      />,
    )

    expect(screen.getByText('An: dr.mueller@spital.ch')).toBeInTheDocument()
  })

  it('zeigt keine E-Mail-Anzeige wenn recipientEmail null', async () => {
    const { SharingLinksList } =
      await import('@/components/sharing/sharing-links-list')
    render(<SharingLinksList links={[makeLink({ recipientEmail: null })]} />)

    expect(screen.queryByText(/^An:/)).not.toBeInTheDocument()
  })

  it('sortiert aktive Links vor abgelaufenen', async () => {
    const { SharingLinksList } =
      await import('@/components/sharing/sharing-links-list')
    const links = [
      makeLink({
        id: 'link-expired',
        token: 'b'.repeat(64),
        status: 'expired',
        expiresAt: '2020-01-01T00:00:00.000Z',
        createdAt: '2026-01-01T00:00:00.000Z',
      }),
      makeLink({
        id: 'link-active',
        token: 'a'.repeat(64),
        status: 'active',
        createdAt: '2026-02-01T00:00:00.000Z',
      }),
    ]
    render(<SharingLinksList links={links} />)

    const badges = screen.getAllByText(/Aktiv|Abgelaufen/)
    expect(badges[0]).toHaveTextContent('Aktiv')
    expect(badges[1]).toHaveTextContent('Abgelaufen')
  })
})
