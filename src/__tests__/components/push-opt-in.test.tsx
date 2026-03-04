import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockSubscribe = vi.fn()
const mockUsePushNotifications = vi.fn()

vi.mock('@/hooks/use-push-notifications', () => ({
  usePushNotifications: () => mockUsePushNotifications(),
}))

beforeEach(() => {
  vi.clearAllMocks()

  // Mock sessionStorage
  const store: Record<string, string> = {}
  vi.stubGlobal('sessionStorage', {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
  })

  mockUsePushNotifications.mockReturnValue({
    permission: 'default',
    isSubscribed: false,
    isSupported: true,
    isLoading: false,
    subscribe: mockSubscribe,
    unsubscribe: vi.fn(),
  })
})

describe('PushOptIn', () => {
  it('zeigt Banner wenn Permission default und nicht subscribed', async () => {
    const { PushOptIn } = await import('@/components/capture/push-opt-in')

    render(<PushOptIn />)

    expect(
      screen.getByText(/Benachrichtigungen aktivieren/),
    ).toBeInTheDocument()
    expect(screen.getByText('Aktivieren')).toBeInTheDocument()
    expect(screen.getByText('Später')).toBeInTheDocument()
  })

  it('zeigt Banner nicht wenn bereits subscribed', async () => {
    mockUsePushNotifications.mockReturnValue({
      permission: 'granted',
      isSubscribed: true,
      isSupported: true,
      isLoading: false,
      subscribe: mockSubscribe,
      unsubscribe: vi.fn(),
    })

    const { PushOptIn } = await import('@/components/capture/push-opt-in')

    render(<PushOptIn />)

    expect(
      screen.queryByText(/Benachrichtigungen aktivieren/),
    ).not.toBeInTheDocument()
  })

  it('zeigt Banner nicht wenn Permission denied', async () => {
    mockUsePushNotifications.mockReturnValue({
      permission: 'denied',
      isSubscribed: false,
      isSupported: true,
      isLoading: false,
      subscribe: mockSubscribe,
      unsubscribe: vi.fn(),
    })

    const { PushOptIn } = await import('@/components/capture/push-opt-in')

    render(<PushOptIn />)

    expect(
      screen.queryByText(/Benachrichtigungen aktivieren/),
    ).not.toBeInTheDocument()
  })

  it('zeigt Banner nicht wenn Push nicht unterstützt', async () => {
    mockUsePushNotifications.mockReturnValue({
      permission: 'default',
      isSubscribed: false,
      isSupported: false,
      isLoading: false,
      subscribe: mockSubscribe,
      unsubscribe: vi.fn(),
    })

    const { PushOptIn } = await import('@/components/capture/push-opt-in')

    render(<PushOptIn />)

    expect(
      screen.queryByText(/Benachrichtigungen aktivieren/),
    ).not.toBeInTheDocument()
  })

  it('ruft subscribe() auf bei "Aktivieren" Klick', async () => {
    mockSubscribe.mockResolvedValue(undefined)

    const { PushOptIn } = await import('@/components/capture/push-opt-in')

    render(<PushOptIn />)

    await act(async () => {
      fireEvent.click(screen.getByText('Aktivieren'))
    })

    expect(mockSubscribe).toHaveBeenCalled()
  })

  it('zeigt Loading-State während Aktivierung', async () => {
    let resolveSubscribe: () => void
    mockSubscribe.mockImplementation(
      () => new Promise<void>((resolve) => { resolveSubscribe = resolve }),
    )

    const { PushOptIn } = await import('@/components/capture/push-opt-in')

    render(<PushOptIn />)

    // Klick startet Aktivierung
    await act(async () => {
      fireEvent.click(screen.getByText('Aktivieren'))
    })

    expect(screen.getByText('Wird aktiviert…')).toBeInTheDocument()
    expect(screen.getByText('Wird aktiviert…')).toBeDisabled()
    expect(screen.getByText('Später')).toBeDisabled()

    // Resolve
    await act(async () => {
      resolveSubscribe!()
    })
  })

  it('blendet Banner aus bei "Später" Klick', async () => {
    const { PushOptIn } = await import('@/components/capture/push-opt-in')

    const { rerender } = render(<PushOptIn />)

    expect(
      screen.getByText(/Benachrichtigungen aktivieren/),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByText('Später'))

    rerender(<PushOptIn />)

    expect(
      screen.queryByText(/Benachrichtigungen aktivieren/),
    ).not.toBeInTheDocument()
    expect(sessionStorage.setItem).toHaveBeenCalledWith(
      'push-opt-in-dismissed',
      'true',
    )
  })

  it('zeigt Banner nicht während isLoading', async () => {
    mockUsePushNotifications.mockReturnValue({
      permission: 'default',
      isSubscribed: false,
      isSupported: true,
      isLoading: true,
      subscribe: mockSubscribe,
      unsubscribe: vi.fn(),
    })

    const { PushOptIn } = await import('@/components/capture/push-opt-in')

    render(<PushOptIn />)

    expect(
      screen.queryByText(/Benachrichtigungen aktivieren/),
    ).not.toBeInTheDocument()
  })
})
