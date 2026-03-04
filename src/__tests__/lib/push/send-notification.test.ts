import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockSendNotification = vi.fn()
const mockSetVapidDetails = vi.fn()

vi.mock('web-push', () => ({
  default: {
    sendNotification: (...args: unknown[]) => mockSendNotification(...args),
    setVapidDetails: (...args: unknown[]) => mockSetVapidDetails(...args),
  },
}))

const mockFrom = vi.fn()

vi.mock('@/lib/db/client', () => ({
  createServiceClient: vi.fn(() => ({
    from: (...args: unknown[]) => mockFrom(...args),
  })),
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key')
  vi.stubEnv('NEXT_PUBLIC_VAPID_KEY', 'test-vapid-public')
  vi.stubEnv('VAPID_PRIVATE_KEY', 'test-vapid-private')
  vi.stubEnv('VAPID_SUBJECT', 'mailto:test@example.com')
})

describe('sendPushNotification', () => {
  const accountId = 'user-1'
  const payload = {
    title: 'Symptom verarbeitet',
    body: 'Dein Symptom wurde verarbeitet — tippe zum Überprüfen',
    url: '/',
  }

  function setupSubscriptions(
    subscriptions: Array<{
      id: string
      endpoint: string
      keys_auth: string
      keys_p256dh: string
    }> | null,
    error: unknown = null,
  ) {
    const mockEq = vi.fn().mockResolvedValue({
      data: subscriptions,
      error,
    })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ select: mockSelect })
  }

  it('sendet Push an alle Subscriptions eines Users', async () => {
    const subs = [
      {
        id: 'sub-1',
        endpoint: 'https://push.example.com/sub1',
        keys_auth: 'auth1',
        keys_p256dh: 'p256dh1',
      },
      {
        id: 'sub-2',
        endpoint: 'https://push.example.com/sub2',
        keys_auth: 'auth2',
        keys_p256dh: 'p256dh2',
      },
    ]
    setupSubscriptions(subs)
    mockSendNotification.mockResolvedValue({})

    const { sendPushNotification } =
      await import('@/lib/push/send-notification')
    await sendPushNotification(accountId, payload)

    expect(mockSendNotification).toHaveBeenCalledTimes(2)
    expect(mockSendNotification).toHaveBeenCalledWith(
      {
        endpoint: 'https://push.example.com/sub1',
        keys: { auth: 'auth1', p256dh: 'p256dh1' },
      },
      JSON.stringify(payload),
    )
  })

  it('macht nichts wenn keine Subscriptions vorhanden', async () => {
    setupSubscriptions([])

    const { sendPushNotification } =
      await import('@/lib/push/send-notification')
    await sendPushNotification(accountId, payload)

    expect(mockSendNotification).not.toHaveBeenCalled()
  })

  it('macht nichts bei DB-Fehler', async () => {
    setupSubscriptions(null, { message: 'DB error' })

    const { sendPushNotification } =
      await import('@/lib/push/send-notification')
    await sendPushNotification(accountId, payload)

    expect(mockSendNotification).not.toHaveBeenCalled()
  })

  it('entfernt Subscription bei 410 Gone', async () => {
    const subs = [
      {
        id: 'sub-expired',
        endpoint: 'https://push.example.com/expired',
        keys_auth: 'auth',
        keys_p256dh: 'p256dh',
      },
    ]
    setupSubscriptions(subs)

    const goneError = { statusCode: 410, message: 'Gone' }
    mockSendNotification.mockRejectedValue(goneError)

    // Mock für delete chain
    const mockDeleteEq = vi.fn().mockResolvedValue({ error: null })
    const mockDelete = vi.fn().mockReturnValue({ eq: mockDeleteEq })
    // Beim zweiten from()-Aufruf (delete) muss ein neuer Mock zurückkommen
    let fromCallCount = 0
    mockFrom.mockImplementation(() => {
      fromCallCount++
      if (fromCallCount === 1) {
        // select() für Subscriptions laden
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: subs, error: null }),
          }),
        }
      }
      // delete() für expired Subscription
      return { delete: mockDelete }
    })

    const { sendPushNotification } =
      await import('@/lib/push/send-notification')
    await sendPushNotification(accountId, payload)

    expect(mockDelete).toHaveBeenCalled()
  })

  it('loggt Fehler bei nicht-410 Fehlern ohne zu thrown', async () => {
    const subs = [
      {
        id: 'sub-1',
        endpoint: 'https://push.example.com/sub1',
        keys_auth: 'auth1',
        keys_p256dh: 'p256dh1',
      },
    ]
    setupSubscriptions(subs)

    const networkError = new Error('Network error')
    mockSendNotification.mockRejectedValue(networkError)

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { sendPushNotification } =
      await import('@/lib/push/send-notification')
    await sendPushNotification(accountId, payload)

    expect(consoleSpy).toHaveBeenCalledWith(
      '[Push] Notification fehlgeschlagen:',
      expect.anything(),
    )
    consoleSpy.mockRestore()
  })
})
