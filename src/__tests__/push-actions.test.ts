import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetUser = vi.fn()
const mockUpsert = vi.fn()
const mockDelete = vi.fn()
const mockEq = vi.fn()

vi.mock('@/lib/db/client', () => ({
  createServerClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
      from: vi.fn(() => ({
        upsert: mockUpsert,
        delete: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: mockEq,
          })),
        })),
      })),
    }),
  ),
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

describe('subscribePush', () => {
  const validInput = {
    endpoint: 'https://push.example.com/sub1',
    keys: { auth: 'auth-key', p256dh: 'p256dh-key' },
  }

  it('gibt VALIDATION_ERROR zurück bei ungültigem Input', async () => {
    const { subscribePush } = await import('@/lib/actions/push-actions')
    const result = await subscribePush({})

    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(result.data).toBeNull()
  })

  it('gibt VALIDATION_ERROR zurück bei ungültigem Endpoint', async () => {
    const { subscribePush } = await import('@/lib/actions/push-actions')
    const result = await subscribePush({
      endpoint: 'not-a-url',
      keys: { auth: 'auth', p256dh: 'p256dh' },
    })

    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('gibt AUTH_REQUIRED zurück wenn kein User', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { subscribePush } = await import('@/lib/actions/push-actions')
    const result = await subscribePush(validInput)

    expect(result.error?.code).toBe('AUTH_REQUIRED')
  })

  it('speichert Subscription erfolgreich (upsert)', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    })
    mockUpsert.mockResolvedValue({ error: null })

    const { subscribePush } = await import('@/lib/actions/push-actions')
    const result = await subscribePush(validInput)

    expect(result.data).toBeUndefined()
    expect(result.error).toBeNull()
    expect(mockUpsert).toHaveBeenCalledWith(
      {
        account_id: 'user-1',
        endpoint: 'https://push.example.com/sub1',
        keys_auth: 'auth-key',
        keys_p256dh: 'p256dh-key',
        updated_at: expect.any(String),
      },
      { onConflict: 'account_id,endpoint' },
    )
  })

  it('gibt DB_ERROR zurück bei Datenbankfehler', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    })
    mockUpsert.mockResolvedValue({ error: { message: 'DB error' } })

    const { subscribePush } = await import('@/lib/actions/push-actions')
    const result = await subscribePush(validInput)

    expect(result.error?.code).toBe('DB_ERROR')
  })
})

describe('unsubscribePush', () => {
  const validInput = {
    endpoint: 'https://push.example.com/sub1',
  }

  it('gibt VALIDATION_ERROR zurück bei ungültigem Input', async () => {
    const { unsubscribePush } = await import('@/lib/actions/push-actions')
    const result = await unsubscribePush({})

    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('gibt AUTH_REQUIRED zurück wenn kein User', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { unsubscribePush } = await import('@/lib/actions/push-actions')
    const result = await unsubscribePush(validInput)

    expect(result.error?.code).toBe('AUTH_REQUIRED')
  })

  it('löscht Subscription erfolgreich', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    })
    mockEq.mockResolvedValue({ error: null })

    const { unsubscribePush } = await import('@/lib/actions/push-actions')
    const result = await unsubscribePush(validInput)

    expect(result.data).toBeUndefined()
    expect(result.error).toBeNull()
  })

  it('gibt DB_ERROR zurück bei Datenbankfehler', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    })
    mockEq.mockResolvedValue({ error: { message: 'Delete error' } })

    const { unsubscribePush } = await import('@/lib/actions/push-actions')
    const result = await unsubscribePush(validInput)

    expect(result.error?.code).toBe('DB_ERROR')
  })
})
