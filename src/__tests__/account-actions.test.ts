import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetUser = vi.fn()
const mockSignOut = vi.fn()
const mockEq = vi.fn()

vi.mock('@/lib/db/client', () => ({
  createServerClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
        signOut: mockSignOut,
      },
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: mockEq,
        })),
      })),
    }),
  ),
}))

const mockRedirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`)
})

vi.mock('next/navigation', () => ({
  redirect: (url: string) => mockRedirect(url),
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

describe('deleteAccount', () => {
  it('gibt AUTH_REQUIRED zurück wenn kein User', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { deleteAccount } = await import('@/lib/actions/account-actions')
    const result = await deleteAccount()

    expect(result.error?.code).toBe('AUTH_REQUIRED')
    expect(result.data).toBeNull()
  })

  it('setzt deleted_at bei Erfolg', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
    })
    mockEq.mockResolvedValue({ error: null })
    mockSignOut.mockResolvedValue({ error: null })

    const { deleteAccount } = await import('@/lib/actions/account-actions')

    await expect(deleteAccount()).rejects.toThrow('REDIRECT:/auth/login')
    expect(mockEq).toHaveBeenCalledWith('id', 'test-user-id')
  })

  it('ruft signOut auf nach DB-Update', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
    })
    mockEq.mockResolvedValue({ error: null })
    mockSignOut.mockResolvedValue({ error: null })

    const { deleteAccount } = await import('@/lib/actions/account-actions')

    await expect(deleteAccount()).rejects.toThrow('REDIRECT:/auth/login')
    expect(mockSignOut).toHaveBeenCalled()
  })

  it('ruft redirect nach signOut auf', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
    })
    mockEq.mockResolvedValue({ error: null })
    mockSignOut.mockResolvedValue({ error: null })

    const { deleteAccount } = await import('@/lib/actions/account-actions')

    await expect(deleteAccount()).rejects.toThrow('REDIRECT:/auth/login')
    expect(mockRedirect).toHaveBeenCalledWith('/auth/login')
  })

  it('gibt DELETE_FAILED zurück bei DB-Error', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
    })
    mockEq.mockResolvedValue({ error: new Error('DB failure') })

    const { deleteAccount } = await import('@/lib/actions/account-actions')
    const result = await deleteAccount()

    expect(result.error?.code).toBe('DELETE_FAILED')
    expect(result.data).toBeNull()
  })

  it('ruft signOut NICHT auf bei DB-Error', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
    })
    mockEq.mockResolvedValue({ error: new Error('DB failure') })

    const { deleteAccount } = await import('@/lib/actions/account-actions')
    await deleteAccount()

    expect(mockSignOut).not.toHaveBeenCalled()
  })
})
