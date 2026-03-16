import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PdfDownloadButton } from '@/components/sharing/pdf-download-button'

// Mock global fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock URL blob methods
global.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/fake-url')
global.URL.revokeObjectURL = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
})

describe('PdfDownloadButton', () => {
  it('rendert den Button mit korrektem Label', () => {
    render(
      <PdfDownloadButton
        dateFrom="2026-02-01"
        dateTo="2026-02-28"
        variant="doctor"
      />,
    )
    expect(screen.getByRole('button', { name: /PDF-Report/i })).toBeDefined()
  })

  it('deaktiviert den Button während Generierung', async () => {
    let resolveDownload!: () => void
    mockFetch.mockReturnValue(
      new Promise((resolve) => {
        resolveDownload = () =>
          resolve({
            ok: true,
            blob: () => Promise.resolve(new Blob()),
          })
      }),
    )

    render(
      <PdfDownloadButton
        dateFrom="2026-02-01"
        dateTo="2026-02-28"
        variant="doctor"
      />,
    )

    const button = screen.getByRole('button', { name: /PDF-Report/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(button).toHaveProperty('disabled', true)
    })

    resolveDownload()
  })

  it('zeigt Lade-Text während Generierung', async () => {
    let resolveDownload!: () => void
    mockFetch.mockReturnValue(
      new Promise((resolve) => {
        resolveDownload = () =>
          resolve({
            ok: true,
            blob: () => Promise.resolve(new Blob()),
          })
      }),
    )

    render(
      <PdfDownloadButton
        dateFrom="2026-02-01"
        dateTo="2026-02-28"
        variant="patient"
      />,
    )

    const button = screen.getByRole('button', { name: /PDF-Report/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Wird erstellt/i }),
      ).toBeDefined()
    })

    resolveDownload()
  })

  it('zeigt Fehlermeldung bei fehlgeschlagener Anfrage', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({
          error: {
            error: 'PDF-Generierung fehlgeschlagen',
            code: 'PDF_GENERATION_FAILED',
          },
        }),
    })

    render(
      <PdfDownloadButton
        dateFrom="2026-02-01"
        dateTo="2026-02-28"
        variant="doctor"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /PDF-Report/i }))

    await waitFor(() => {
      expect(screen.getByText('PDF-Generierung fehlgeschlagen')).toBeDefined()
    })
  })

  it('zeigt Fehlermeldung bei Netzwerkfehler', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    render(
      <PdfDownloadButton
        dateFrom="2026-02-01"
        dateTo="2026-02-28"
        variant="doctor"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /PDF-Report/i }))

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeDefined()
    })
  })

  it('ruft korrekten API-Pfad für Arzt-Variante auf (ohne Query-Params)', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      blob: () =>
        Promise.resolve(new Blob(['PDF'], { type: 'application/pdf' })),
    })

    render(
      <PdfDownloadButton
        dateFrom="2026-02-01"
        dateTo="2026-02-28"
        variant="doctor"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /PDF-Report/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/report/pdf')
    })
  })

  it('ruft korrekten API-Pfad für Patienten-Variante auf (mit Query-Params)', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      blob: () =>
        Promise.resolve(new Blob(['PDF'], { type: 'application/pdf' })),
    })

    render(
      <PdfDownloadButton
        dateFrom="2026-02-01"
        dateTo="2026-02-28"
        variant="patient"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /PDF-Report/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/report/pdf?startDate=2026-02-01&endDate=2026-02-28',
      )
    })
  })
})
