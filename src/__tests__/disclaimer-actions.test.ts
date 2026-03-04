import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetUser = vi.fn()
const mockUpdateUser = vi.fn()
const mockEq = vi.fn()

vi.mock('@/lib/db/client', () => ({
  createServerClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
        updateUser: mockUpdateUser,
      },
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: mockEq,
        })),
      })),
    }),
  ),
}))

const mockRevalidatePath = vi.fn()
vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
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
})

describe('acceptDisclaimer', () => {
  it('gibt AUTH_REQUIRED zurück wenn kein User', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { acceptDisclaimer } =
      await import('@/lib/actions/disclaimer-actions')
    const result = await acceptDisclaimer()

    expect(result.error?.code).toBe('AUTH_REQUIRED')
    expect(result.data).toBeNull()
  })

  it('aktualisiert DB und user_metadata bei Erfolg', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
    })
    mockEq.mockResolvedValue({ error: null })
    mockUpdateUser.mockResolvedValue({ error: null })

    const { acceptDisclaimer } =
      await import('@/lib/actions/disclaimer-actions')
    const result = await acceptDisclaimer()

    expect(result.data).not.toBeNull()
    expect(result.data?.acceptedAt).toBeDefined()
    expect(result.error).toBeNull()
    expect(mockUpdateUser).toHaveBeenCalledWith({
      data: { disclaimer_accepted: true },
    })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/', 'layout')
  })

  it('gibt DB_ERROR zurück bei Datenbankfehler', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
    })
    mockEq.mockResolvedValue({ error: new Error('DB failure') })

    const { acceptDisclaimer } =
      await import('@/lib/actions/disclaimer-actions')
    const result = await acceptDisclaimer()

    expect(result.error?.code).toBe('DB_ERROR')
    expect(result.data).toBeNull()
  })

  it('loggt Warnung aber failt nicht bei user_metadata Fehler', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
    })
    mockEq.mockResolvedValue({ error: null })
    mockUpdateUser.mockResolvedValue({
      error: { message: 'metadata update failed' },
    })

    const { acceptDisclaimer } =
      await import('@/lib/actions/disclaimer-actions')
    const result = await acceptDisclaimer()

    // DB erfolgreich → Gesamtergebnis ist Erfolg
    expect(result.data).not.toBeNull()
    expect(result.error).toBeNull()
    expect(consoleSpy).toHaveBeenCalledWith(
      'user_metadata update failed:',
      'metadata update failed',
    )

    consoleSpy.mockRestore()
  })
})
