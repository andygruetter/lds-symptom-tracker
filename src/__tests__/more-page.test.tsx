import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/more'),
}))

describe('Mehr-Seite', () => {
  it('zeigt Disclaimer-Button', async () => {
    const MorePage = (await import('@/app/(app)/more/page')).default
    render(<MorePage />)

    expect(screen.getByText('Disclaimer anzeigen')).toBeInTheDocument()
  })

  it('zeigt Account-Löschen-Platzhalter (disabled)', async () => {
    const MorePage = (await import('@/app/(app)/more/page')).default
    render(<MorePage />)

    expect(screen.getByText('Account löschen')).toBeInTheDocument()
    expect(screen.getByText('Kommt bald')).toBeInTheDocument()

    const deleteButton = screen.getByText('Account löschen').closest('button')
    expect(deleteButton).toBeDisabled()
  })

  it('hat Section-Überschriften Rechtliches und Account', async () => {
    const MorePage = (await import('@/app/(app)/more/page')).default
    render(<MorePage />)

    expect(screen.getByText('Rechtliches')).toBeInTheDocument()
    expect(screen.getByText('Account')).toBeInTheDocument()
  })

  it('zeigt Seitentitel Mehr', async () => {
    const MorePage = (await import('@/app/(app)/more/page')).default
    render(<MorePage />)

    expect(
      screen.getByRole('heading', { name: 'Mehr', level: 1 }),
    ).toBeInTheDocument()
  })

  it('öffnet Disclaimer-Dialog bei Klick auf Disclaimer-Button', async () => {
    const MorePage = (await import('@/app/(app)/more/page')).default
    render(<MorePage />)

    const button = screen.getByText('Disclaimer anzeigen')
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Wichtiger Hinweis')).toBeInTheDocument()
      expect(screen.getByText('Kein Medizinprodukt')).toBeInTheDocument()
    })
  })
})
