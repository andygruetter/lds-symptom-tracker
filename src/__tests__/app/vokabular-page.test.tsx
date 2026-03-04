import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const mockGetUser = vi.fn()
const mockGetVocabulary = vi.fn()
const mockRedirect = vi.fn()

vi.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}))

vi.mock('@/lib/db/client', () => ({
  createServerClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
    }),
  ),
}))

vi.mock('@/lib/db/vocabulary', () => ({
  getVocabulary: (...args: unknown[]) => mockGetVocabulary(...args),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      getAll: vi.fn(() => []),
      set: vi.fn(),
    }),
  ),
}))

describe('Vokabular-Seite', () => {
  it('zeigt Empty-State wenn kein Vokabular vorhanden', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    })
    mockGetVocabulary.mockResolvedValue([])

    const VokabularPage = (
      await import('@/app/(app)/more/vokabular/page')
    ).default
    const page = await VokabularPage()
    render(page)

    expect(
      screen.getByText(/Noch keine Begriffe gelernt/),
    ).toBeInTheDocument()
  })

  it('zeigt Vokabular-Tabelle mit Einträgen', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    })
    mockGetVocabulary.mockResolvedValue([
      {
        patientTerm: 'Rügge',
        mappedTerm: 'Rücken',
        fieldName: 'body_region',
        usageCount: 5,
      },
      {
        patientTerm: 'Stächä',
        mappedTerm: 'stechend',
        fieldName: 'symptom_type',
        usageCount: 3,
      },
    ])

    const VokabularPage = (
      await import('@/app/(app)/more/vokabular/page')
    ).default
    const page = await VokabularPage()
    render(page)

    expect(screen.getByText('Rügge')).toBeInTheDocument()
    expect(screen.getByText('Rücken')).toBeInTheDocument()
    expect(screen.getByText('Körperregion')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('Stächä')).toBeInTheDocument()
    expect(screen.getByText('stechend')).toBeInTheDocument()
    expect(screen.getByText('Art')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('zeigt Seitentitel Mein Vokabular', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    })
    mockGetVocabulary.mockResolvedValue([])

    const VokabularPage = (
      await import('@/app/(app)/more/vokabular/page')
    ).default
    const page = await VokabularPage()
    render(page)

    expect(
      screen.getByRole('heading', { name: 'Mein Vokabular', level: 1 }),
    ).toBeInTheDocument()
  })

  it('zeigt Tabellen-Header korrekt', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    })
    mockGetVocabulary.mockResolvedValue([
      {
        patientTerm: 'Rügge',
        mappedTerm: 'Rücken',
        fieldName: 'body_region',
        usageCount: 5,
      },
    ])

    const VokabularPage = (
      await import('@/app/(app)/more/vokabular/page')
    ).default
    const page = await VokabularPage()
    render(page)

    expect(screen.getByText('Mein Begriff')).toBeInTheDocument()
    expect(screen.getByText('Bedeutung')).toBeInTheDocument()
    expect(screen.getByText('#')).toBeInTheDocument()
  })

  it('leitet nicht-authentifizierte User weiter', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
    })

    const VokabularPage = (
      await import('@/app/(app)/more/vokabular/page')
    ).default

    try {
      await VokabularPage()
    } catch {
      // redirect throws in test environment
    }

    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })
})
