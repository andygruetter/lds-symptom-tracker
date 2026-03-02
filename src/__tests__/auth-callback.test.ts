import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock createServerClient
const mockExchangeCodeForSession = vi.fn()
const mockSignOut = vi.fn()

vi.mock('@/lib/db/client', () => ({
  createServerClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        exchangeCodeForSession: mockExchangeCodeForSession,
        signOut: mockSignOut,
        getUser: vi.fn(() => Promise.resolve({ data: { user: null } })),
      },
    }),
  ),
  createBrowserClient: vi.fn(() => ({
    auth: {
      signInWithOAuth: vi.fn(),
    },
  })),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      getAll: vi.fn(() => []),
      set: vi.fn(),
    }),
  ),
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key')
})

describe('Auth Callback Route', () => {
  it('tauscht Auth-Code gegen Session und redirected zu /', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null })

    const { GET } = await import('@/app/auth/callback/route')
    const request = new Request(
      'http://localhost:3000/auth/callback?code=test-auth-code',
    )

    const response = await GET(request)

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('test-auth-code')
    expect(response.status).toBe(307)
    expect(response.headers.get('Location')).toBe('http://localhost:3000/')
  })

  it('redirected zu /auth/login?error=callback bei fehlendem Code', async () => {
    const { GET } = await import('@/app/auth/callback/route')
    const request = new Request('http://localhost:3000/auth/callback')

    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('Location')).toBe(
      'http://localhost:3000/auth/login?error=callback',
    )
  })

  it('redirected zu /auth/login?error=callback bei Exchange-Fehler', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      error: new Error('Invalid code'),
    })

    const { GET } = await import('@/app/auth/callback/route')
    const request = new Request(
      'http://localhost:3000/auth/callback?code=invalid-code',
    )

    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('Location')).toBe(
      'http://localhost:3000/auth/login?error=callback',
    )
  })

  it('validiert next-Parameter — nur relative Pfade erlaubt', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null })

    const { GET } = await import('@/app/auth/callback/route')
    const request = new Request(
      'http://localhost:3000/auth/callback?code=test-code&next=https://evil.com',
    )

    const response = await GET(request)

    expect(response.status).toBe(307)
    // Sollte zu / redirecten, nicht zu https://evil.com
    expect(response.headers.get('Location')).toBe('http://localhost:3000/')
  })
})

describe('Sign-Out Action', () => {
  it('ruft supabase.auth.signOut() auf', async () => {
    mockSignOut.mockResolvedValue({ error: null })

    const { signOut } = await import('@/lib/actions/auth-actions')

    try {
      await signOut()
    } catch (e) {
      // redirect() wirft im Mock
      expect((e as Error).message).toContain('REDIRECT:/auth/login')
    }

    expect(mockSignOut).toHaveBeenCalled()
  })

  it('gibt AppError zurück bei signOut-Fehler', async () => {
    mockSignOut.mockResolvedValue({
      error: new Error('Sign out failed'),
    })

    const { signOut } = await import('@/lib/actions/auth-actions')
    const result = await signOut()

    expect(result).toEqual({
      data: null,
      error: {
        error: 'Abmeldung fehlgeschlagen',
        code: 'SIGN_OUT_ERROR',
      },
    })
  })
})
