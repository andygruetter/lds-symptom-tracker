import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useLongPress } from '@/hooks/use-long-press'

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('navigator', { vibrate: vi.fn() })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('useLongPress', () => {
  it('ruft Callback nach 1500ms auf', async () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useLongPress(callback))

    act(() => {
      result.current.handlers.onTouchStart({} as React.TouchEvent)
    })

    expect(callback).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500)
    })

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('ruft Callback NICHT auf wenn Touch vor 1500ms endet', async () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useLongPress(callback))

    act(() => {
      result.current.handlers.onTouchStart({} as React.TouchEvent)
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
    })

    act(() => {
      result.current.handlers.onTouchEnd()
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500)
    })

    expect(callback).not.toHaveBeenCalled()
  })

  it('isPressed ist true während Touch, false danach', async () => {
    const { result } = renderHook(() => useLongPress(vi.fn()))

    act(() => {
      result.current.handlers.onTouchStart({} as React.TouchEvent)
    })

    expect(result.current.isPressed).toBe(true)

    act(() => {
      result.current.handlers.onTouchEnd()
    })

    expect(result.current.isPressed).toBe(false)
  })

  it('isPressed wird false nach erfolgreichem Long-Press', async () => {
    const { result } = renderHook(() => useLongPress(vi.fn()))

    act(() => {
      result.current.handlers.onTouchStart({} as React.TouchEvent)
    })

    expect(result.current.isPressed).toBe(true)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500)
    })

    expect(result.current.isPressed).toBe(false)
  })

  it('onTouchCancel bricht Long-Press ab', async () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useLongPress(callback))

    act(() => {
      result.current.handlers.onTouchStart({} as React.TouchEvent)
    })

    act(() => {
      result.current.handlers.onTouchCancel()
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500)
    })

    expect(callback).not.toHaveBeenCalled()
    expect(result.current.isPressed).toBe(false)
  })

  it('onContextMenu verhindert Standard-Browser-Verhalten', () => {
    const { result } = renderHook(() => useLongPress(vi.fn()))

    const mockEvent = {
      preventDefault: vi.fn(),
    } as unknown as React.SyntheticEvent
    act(() => {
      result.current.handlers.onContextMenu(mockEvent)
    })

    expect(mockEvent.preventDefault).toHaveBeenCalled()
  })

  it('Cleanup bei Unmount (kein Memory Leak)', async () => {
    const callback = vi.fn()
    const { result, unmount } = renderHook(() => useLongPress(callback))

    act(() => {
      result.current.handlers.onTouchStart({} as React.TouchEvent)
    })

    unmount()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500)
    })

    // Callback darf nicht aufgerufen werden nach Unmount
    expect(callback).not.toHaveBeenCalled()
  })

  it('respektiert custom delay Option', async () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useLongPress(callback, { delay: 3000 }))

    act(() => {
      result.current.handlers.onTouchStart({} as React.TouchEvent)
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500)
    })

    expect(callback).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500)
    })

    expect(callback).toHaveBeenCalledTimes(1)
  })
})
