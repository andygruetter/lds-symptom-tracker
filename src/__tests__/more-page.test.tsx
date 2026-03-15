import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/more'),
}))

vi.mock('@/lib/actions/account-actions', () => ({
  deleteAccount: vi.fn(),
}))

vi.mock('@/lib/actions/sharing-actions', () => ({
  createSharingLinkAction: vi
    .fn()
    .mockResolvedValue({ data: null, error: null }),
}))

describe('Mehr-Seite', () => {
  it('zeigt Disclaimer-Button', async () => {
    const { MorePageContent } =
      await import('@/components/more/more-page-content')
    render(<MorePageContent initialLinks={[]} />)

    expect(screen.getByText('Disclaimer anzeigen')).toBeInTheDocument()
  })

  it('zeigt Account-Löschen-Button (enabled)', async () => {
    const { MorePageContent } =
      await import('@/components/more/more-page-content')
    render(<MorePageContent initialLinks={[]} />)

    expect(screen.getByText('Account löschen')).toBeInTheDocument()

    const deleteButton = screen.getByText('Account löschen').closest('button')
    expect(deleteButton).not.toBeDisabled()
  })

  it('zeigt kein "Kommt bald" mehr', async () => {
    const { MorePageContent } =
      await import('@/components/more/more-page-content')
    render(<MorePageContent initialLinks={[]} />)

    expect(screen.queryByText('Kommt bald')).not.toBeInTheDocument()
  })

  it('hat Section-Überschriften Rechtliches und Account', async () => {
    const { MorePageContent } =
      await import('@/components/more/more-page-content')
    render(<MorePageContent initialLinks={[]} />)

    expect(screen.getByText('Rechtliches')).toBeInTheDocument()
    expect(screen.getByText('Account')).toBeInTheDocument()
  })

  it('zeigt Seitentitel Mehr', async () => {
    const { MorePageContent } =
      await import('@/components/more/more-page-content')
    render(<MorePageContent initialLinks={[]} />)

    expect(
      screen.getByRole('heading', { name: 'Mehr', level: 1 }),
    ).toBeInTheDocument()
  })

  it('öffnet Disclaimer-Dialog bei Klick auf Disclaimer-Button', async () => {
    const { MorePageContent } =
      await import('@/components/more/more-page-content')
    render(<MorePageContent initialLinks={[]} />)

    const button = screen.getByText('Disclaimer anzeigen')
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Wichtiger Hinweis')).toBeInTheDocument()
      expect(screen.getByText('Kein Medizinprodukt')).toBeInTheDocument()
    })
  })

  it('öffnet Delete-Account-Dialog bei Klick auf Löschen-Button', async () => {
    const { MorePageContent } =
      await import('@/components/more/more-page-content')
    render(<MorePageContent initialLinks={[]} />)

    const button = screen.getByText('Account löschen').closest('button')
    expect(button).not.toBeNull()
    fireEvent.click(button as HTMLButtonElement)

    await waitFor(() => {
      expect(screen.getByText('Account löschen?')).toBeInTheDocument()
      expect(screen.getByText(/30 Tagen unwiderruflich/)).toBeInTheDocument()
    })
  })

  it('zeigt Mein Vokabular Link', async () => {
    const { MorePageContent } =
      await import('@/components/more/more-page-content')
    render(<MorePageContent initialLinks={[]} />)

    expect(screen.getByText('Mein Vokabular')).toBeInTheDocument()
  })

  it('hat KI & Lernen Section', async () => {
    const { MorePageContent } =
      await import('@/components/more/more-page-content')
    render(<MorePageContent initialLinks={[]} />)

    expect(screen.getByText('KI & Lernen')).toBeInTheDocument()
  })

  it('hat Sharing Section', async () => {
    const { MorePageContent } =
      await import('@/components/more/more-page-content')
    render(<MorePageContent initialLinks={[]} />)

    expect(screen.getByText('Sharing')).toBeInTheDocument()
  })
})
