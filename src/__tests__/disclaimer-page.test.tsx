import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    refresh: vi.fn(),
  })),
}))

const mockAcceptDisclaimer = vi.fn()
vi.mock('@/lib/actions/disclaimer-actions', () => ({
  acceptDisclaimer: (...args: unknown[]) => mockAcceptDisclaimer(...args),
}))

describe('Disclaimer-Seite', () => {
  it('zeigt Disclaimer-Titel und alle Abschnitte an', async () => {
    const DisclaimerPage = (await import('@/app/disclaimer/page')).default
    render(<DisclaimerPage />)

    expect(screen.getByText('Wichtiger Hinweis')).toBeInTheDocument()
    expect(screen.getByText('Kein Medizinprodukt')).toBeInTheDocument()
    expect(
      screen.getByText('Kein Ersatz für ärztliche Beratung'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Keine Diagnose oder Therapieempfehlung'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Verarbeitung von Gesundheitsdaten'),
    ).toBeInTheDocument()
    expect(screen.getByText('Eigenverantwortung')).toBeInTheDocument()
  })

  it('hat einen Akzeptieren-Button', async () => {
    const DisclaimerPage = (await import('@/app/disclaimer/page')).default
    render(<DisclaimerPage />)

    const button = screen.getByRole('button', {
      name: 'Ich habe den Hinweis gelesen und verstanden',
    })
    expect(button).toBeInTheDocument()
  })

  it('nutzt Patient-Theme', async () => {
    const DisclaimerPage = (await import('@/app/disclaimer/page')).default
    const { container } = render(<DisclaimerPage />)

    const themeDiv = container.querySelector('[data-theme="patient"]')
    expect(themeDiv).toBeInTheDocument()
  })

  it('zeigt Fehlermeldung wenn acceptDisclaimer fehlschlägt', async () => {
    mockAcceptDisclaimer.mockResolvedValue({
      data: null,
      error: { error: 'Speichern fehlgeschlagen', code: 'DB_ERROR' },
    })

    const DisclaimerPage = (await import('@/app/disclaimer/page')).default
    render(<DisclaimerPage />)

    const button = screen.getByRole('button', {
      name: 'Ich habe den Hinweis gelesen und verstanden',
    })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Speichern fehlgeschlagen')).toBeInTheDocument()
    })
  })
})
