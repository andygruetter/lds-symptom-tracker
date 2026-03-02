import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock createBrowserClient
const mockSignInWithOAuth = vi.fn()

vi.mock('@/lib/db/client', () => ({
  createBrowserClient: vi.fn(() => ({
    auth: {
      signInWithOAuth: mockSignInWithOAuth,
    },
  })),
}))

// Helper: matchMedia mock
function mockMatchMedia(standalone: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn((query: string) => ({
      matches: query === '(display-mode: standalone)' ? standalone : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockMatchMedia(false)
  // Reset location.href mock
  Object.defineProperty(window, 'location', {
    writable: true,
    value: { origin: 'http://localhost:3000', href: 'http://localhost:3000' },
  })
})

describe('AppleSignInButton', () => {
  it('rendert den Button mit korrektem Text', async () => {
    const { AppleSignInButton } = await import(
      '@/components/auth/apple-sign-in-button'
    )
    render(<AppleSignInButton />)

    expect(
      screen.getByRole('button', { name: /mit apple id anmelden/i }),
    ).toBeInTheDocument()
  })

  it('nutzt normalen OAuth-Flow im Browser-Modus', async () => {
    mockMatchMedia(false)
    mockSignInWithOAuth.mockResolvedValue({ data: {}, error: null })

    const { AppleSignInButton } = await import(
      '@/components/auth/apple-sign-in-button'
    )
    render(<AppleSignInButton />)

    fireEvent.click(
      screen.getByRole('button', { name: /mit apple id anmelden/i }),
    )

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'apple',
        options: {
          redirectTo: 'http://localhost:3000/auth/callback',
        },
      })
    })
  })

  it('nutzt skipBrowserRedirect im Standalone-Modus', async () => {
    mockMatchMedia(true)
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: 'https://auth.example.com/oauth' },
      error: null,
    })

    const { AppleSignInButton } = await import(
      '@/components/auth/apple-sign-in-button'
    )
    render(<AppleSignInButton />)

    fireEvent.click(
      screen.getByRole('button', { name: /mit apple id anmelden/i }),
    )

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'apple',
        options: {
          redirectTo: 'http://localhost:3000/auth/callback',
          skipBrowserRedirect: true,
        },
      })
    })
  })

  it('zeigt Fehlermeldung bei OAuth-Fehler', async () => {
    mockMatchMedia(false)
    mockSignInWithOAuth.mockResolvedValue({
      data: {},
      error: new Error('OAuth failed'),
    })

    const { AppleSignInButton } = await import(
      '@/components/auth/apple-sign-in-button'
    )
    render(<AppleSignInButton />)

    fireEvent.click(
      screen.getByRole('button', { name: /mit apple id anmelden/i }),
    )

    await waitFor(() => {
      expect(
        screen.getByText(
          'Verbindung fehlgeschlagen. Bitte versuche es erneut.',
        ),
      ).toBeInTheDocument()
    })
  })

  it('zeigt Fehlermeldung bei OAuth-Fehler im Standalone-Modus', async () => {
    mockMatchMedia(true)
    mockSignInWithOAuth.mockResolvedValue({
      data: {},
      error: new Error('OAuth failed'),
    })

    const { AppleSignInButton } = await import(
      '@/components/auth/apple-sign-in-button'
    )
    render(<AppleSignInButton />)

    fireEvent.click(
      screen.getByRole('button', { name: /mit apple id anmelden/i }),
    )

    await waitFor(() => {
      expect(
        screen.getByText(
          'Verbindung fehlgeschlagen. Bitte versuche es erneut.',
        ),
      ).toBeInTheDocument()
    })
  })
})
