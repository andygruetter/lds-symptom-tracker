import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockSubscribePush = vi.fn()
const mockUnsubscribePush = vi.fn()

vi.mock('@/lib/actions/push-actions', () => ({
  subscribePush: (...args: unknown[]) => mockSubscribePush(...args),
  unsubscribePush: (...args: unknown[]) => mockUnsubscribePush(...args),
}))

// Browser API Mocks
const mockPushSubscription = {
  endpoint: 'https://push.example.com/sub1',
  unsubscribe: vi.fn().mockResolvedValue(true),
  toJSON: () => ({
    endpoint: 'https://push.example.com/sub1',
    keys: { auth: 'auth-key', p256dh: 'p256dh-key' },
  }),
}

const mockPushManager = {
  getSubscription: vi.fn().mockResolvedValue(null),
  subscribe: vi.fn().mockResolvedValue(mockPushSubscription),
}

const mockRegistration = {
  pushManager: mockPushManager,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('NEXT_PUBLIC_VAPID_KEY', 'BDk_test_vapid_key')

  // Mock Notification API
  vi.stubGlobal('Notification', {
    permission: 'default' as NotificationPermission,
    requestPermission: vi.fn().mockResolvedValue('granted'),
  })

  // Mock PushManager (existence check)
  vi.stubGlobal('PushManager', {})

  // Mock ServiceWorker
  Object.defineProperty(navigator, 'serviceWorker', {
    value: {
      ready: Promise.resolve(mockRegistration),
    },
    configurable: true,
    writable: true,
  })
})

describe('usePushNotifications', () => {
  it('initialisiert mit korrekten Defaults', async () => {
    const { usePushNotifications } = await import(
      '@/hooks/use-push-notifications'
    )

    const { result } = renderHook(() => usePushNotifications())

    // Warten auf async init
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })

    expect(result.current.permission).toBe('default')
    expect(result.current.isSubscribed).toBe(false)
    expect(result.current.isSupported).toBe(true)
    expect(result.current.isLoading).toBe(false)
  })

  it('erkennt bestehende Subscription', async () => {
    mockPushManager.getSubscription.mockResolvedValueOnce(mockPushSubscription)

    const { usePushNotifications } = await import(
      '@/hooks/use-push-notifications'
    )

    const { result } = renderHook(() => usePushNotifications())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })

    expect(result.current.isSubscribed).toBe(true)
  })

  it('subscribe() fragt Permission an und subscribed', async () => {
    mockSubscribePush.mockResolvedValue({ data: undefined, error: null })

    const { usePushNotifications } = await import(
      '@/hooks/use-push-notifications'
    )

    const { result } = renderHook(() => usePushNotifications())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })

    await act(async () => {
      await result.current.subscribe()
    })

    expect(Notification.requestPermission).toHaveBeenCalled()
    expect(mockPushManager.subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: expect.any(ArrayBuffer),
    })
    expect(mockSubscribePush).toHaveBeenCalledWith({
      endpoint: 'https://push.example.com/sub1',
      keys: { auth: 'auth-key', p256dh: 'p256dh-key' },
    })
    expect(result.current.isSubscribed).toBe(true)
  })

  it('subscribe() stoppt wenn Permission denied', async () => {
    ;(Notification.requestPermission as ReturnType<typeof vi.fn>).mockResolvedValueOnce('denied')

    const { usePushNotifications } = await import(
      '@/hooks/use-push-notifications'
    )

    const { result } = renderHook(() => usePushNotifications())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })

    await act(async () => {
      await result.current.subscribe()
    })

    expect(mockPushManager.subscribe).not.toHaveBeenCalled()
    expect(result.current.isSubscribed).toBe(false)
    expect(result.current.permission).toBe('denied')
  })

  it('unsubscribe() entfernt Subscription', async () => {
    mockPushManager.getSubscription.mockResolvedValue(mockPushSubscription)
    mockUnsubscribePush.mockResolvedValue({ data: undefined, error: null })

    const { usePushNotifications } = await import(
      '@/hooks/use-push-notifications'
    )

    const { result } = renderHook(() => usePushNotifications())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })

    await act(async () => {
      await result.current.unsubscribe()
    })

    expect(mockPushSubscription.unsubscribe).toHaveBeenCalled()
    expect(mockUnsubscribePush).toHaveBeenCalledWith({
      endpoint: 'https://push.example.com/sub1',
    })
    expect(result.current.isSubscribed).toBe(false)
  })

  it('graceful degradation wenn PushManager nicht verfügbar', async () => {
    // @ts-expect-error - testing undefined PushManager
    delete window.PushManager

    const { usePushNotifications } = await import(
      '@/hooks/use-push-notifications'
    )

    const { result } = renderHook(() => usePushNotifications())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })

    expect(result.current.isSupported).toBe(false)
    expect(result.current.isLoading).toBe(false)

    // Restore
    vi.stubGlobal('PushManager', {})
  })
})
