import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCreateSharingLinkAction = vi.fn()

vi.mock('@/lib/actions/sharing-actions', () => ({
  createSharingLinkAction: (...args: unknown[]) =>
    mockCreateSharingLinkAction(...args),
  loadActiveSharingLinks: vi.fn().mockResolvedValue({ data: [], error: null }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockCreateSharingLinkAction.mockResolvedValue({ data: null, error: null })
})

describe('ShareSheet', () => {
  it('zeigt "Für Arzt teilen" Button', async () => {
    const { ShareSheet } = await import('@/components/sharing/share-sheet')
    render(<ShareSheet />)

    expect(
      screen.getByRole('button', { name: /Für Arzt teilen/i }),
    ).toBeInTheDocument()
  })

  it('Button hat korrektes aria-label', async () => {
    const { ShareSheet } = await import('@/components/sharing/share-sheet')
    render(<ShareSheet />)

    const button = screen.getByRole('button', { name: /Für Arzt teilen/i })
    expect(button).toHaveAttribute('aria-label', 'Daten für Arzt teilen')
  })

  it('zeigt E-Mail-Input nach Link-Generierung', async () => {
    mockCreateSharingLinkAction.mockResolvedValue({
      data: {
        id: 'link-1',
        shareUrl: 'https://app.example.com/share/abc',
        dateFrom: '2026-01-01',
        dateTo: '2026-03-15',
        expiresAt: '2099-01-01T00:00:00.000Z',
        isActive: true,
      },
      error: null,
    })

    const { ShareSheet } = await import('@/components/sharing/share-sheet')
    render(<ShareSheet />)

    // Sheet öffnen
    fireEvent.click(screen.getByRole('button', { name: /Für Arzt teilen/i }))

    // Zeitraum wählen
    const dateRangeSelect = screen.getByRole('combobox', {
      name: /Datenzeitraum/i,
    })
    fireEvent.change(dateRangeSelect, { target: { value: '1m' } })

    // Link generieren
    const generateButton = screen.getByRole('button', {
      name: /Link generieren/i,
    })
    fireEvent.click(generateButton)

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText('E-Mail des Arztes (optional)'),
      ).toBeInTheDocument()
    })
  })

  it('zeigt Validierungsfehler bei ungültiger E-Mail nach Blur', async () => {
    mockCreateSharingLinkAction.mockResolvedValue({
      data: {
        id: 'link-1',
        shareUrl: 'https://app.example.com/share/abc',
        dateFrom: '2026-01-01',
        dateTo: '2026-03-15',
        expiresAt: '2099-01-01T00:00:00.000Z',
        isActive: true,
      },
      error: null,
    })

    const { ShareSheet } = await import('@/components/sharing/share-sheet')
    render(<ShareSheet />)

    fireEvent.click(screen.getByRole('button', { name: /Für Arzt teilen/i }))

    const dateRangeSelect = screen.getByRole('combobox', {
      name: /Datenzeitraum/i,
    })
    fireEvent.change(dateRangeSelect, { target: { value: '3m' } })

    fireEvent.click(screen.getByRole('button', { name: /Link generieren/i }))

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText('E-Mail des Arztes (optional)'),
      ).toBeInTheDocument()
    })

    const emailInput = screen.getByPlaceholderText(
      'E-Mail des Arztes (optional)',
    )
    fireEvent.change(emailInput, { target: { value: 'keine-email' } })
    fireEvent.blur(emailInput)

    expect(
      screen.getByText('Bitte gültige E-Mail-Adresse eingeben'),
    ).toBeInTheDocument()
  })

  it('deaktiviert "Per E-Mail senden" bei ungültiger E-Mail', async () => {
    mockCreateSharingLinkAction.mockResolvedValue({
      data: {
        id: 'link-1',
        shareUrl: 'https://app.example.com/share/abc',
        dateFrom: '2026-01-01',
        dateTo: '2026-03-15',
        expiresAt: '2099-01-01T00:00:00.000Z',
        isActive: true,
      },
      error: null,
    })

    const { ShareSheet } = await import('@/components/sharing/share-sheet')
    render(<ShareSheet />)

    fireEvent.click(screen.getByRole('button', { name: /Für Arzt teilen/i }))

    const dateRangeSelect = screen.getByRole('combobox', {
      name: /Datenzeitraum/i,
    })
    fireEvent.change(dateRangeSelect, { target: { value: '1m' } })
    fireEvent.click(screen.getByRole('button', { name: /Link generieren/i }))

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText('E-Mail des Arztes (optional)'),
      ).toBeInTheDocument()
    })

    const emailInput = screen.getByPlaceholderText(
      'E-Mail des Arztes (optional)',
    )
    fireEvent.change(emailInput, { target: { value: 'abc' } })

    const sendButton = screen.getByRole('button', {
      name: /Per E-Mail senden/i,
    })
    expect(sendButton).toBeDisabled()
  })

  it('"Per E-Mail senden" ist aktiv wenn E-Mail leer', async () => {
    mockCreateSharingLinkAction.mockResolvedValue({
      data: {
        id: 'link-1',
        shareUrl: 'https://app.example.com/share/abc',
        dateFrom: '2026-01-01',
        dateTo: '2026-03-15',
        expiresAt: '2099-01-01T00:00:00.000Z',
        isActive: true,
      },
      error: null,
    })

    const { ShareSheet } = await import('@/components/sharing/share-sheet')
    render(<ShareSheet />)

    fireEvent.click(screen.getByRole('button', { name: /Für Arzt teilen/i }))

    const dateRangeSelect = screen.getByRole('combobox', {
      name: /Datenzeitraum/i,
    })
    fireEvent.change(dateRangeSelect, { target: { value: '1m' } })
    fireEvent.click(screen.getByRole('button', { name: /Link generieren/i }))

    await waitFor(() => {
      const sendButton = screen.getByRole('button', {
        name: /Per E-Mail senden/i,
      })
      expect(sendButton).not.toBeDisabled()
    })
  })

  it('verhindert Enter-Submit im E-Mail-Input', async () => {
    mockCreateSharingLinkAction.mockResolvedValue({
      data: {
        id: 'link-1',
        shareUrl: 'https://app.example.com/share/abc',
        dateFrom: '2026-01-01',
        dateTo: '2026-03-15',
        expiresAt: '2099-01-01T00:00:00.000Z',
        isActive: true,
      },
      error: null,
    })

    const { ShareSheet } = await import('@/components/sharing/share-sheet')
    render(<ShareSheet />)

    fireEvent.click(screen.getByRole('button', { name: /Für Arzt teilen/i }))

    const dateRangeSelect = screen.getByRole('combobox', {
      name: /Datenzeitraum/i,
    })
    fireEvent.change(dateRangeSelect, { target: { value: '1m' } })
    fireEvent.click(screen.getByRole('button', { name: /Link generieren/i }))

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText('E-Mail des Arztes (optional)'),
      ).toBeInTheDocument()
    })

    const emailInput = screen.getByPlaceholderText(
      'E-Mail des Arztes (optional)',
    )
    // Enter sollte keinen Submit auslösen — fireEvent gibt false zurück wenn preventDefault() aufgerufen wurde
    const event = fireEvent.keyDown(emailInput, { key: 'Enter', code: 'Enter' })
    expect(event).toBe(false)
  })
})
