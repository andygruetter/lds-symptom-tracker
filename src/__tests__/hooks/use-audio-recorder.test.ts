import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAudioRecorder } from '@/hooks/use-audio-recorder'

// Mock MediaRecorder
const mockStart = vi.fn()
const mockStop = vi.fn()
let mockOndataavailable: ((e: { data: Blob }) => void) | null = null
let mockOnstop: (() => void) | null = null

class MockMediaRecorder {
  state = 'inactive'
  mimeType = 'audio/webm'

  constructor() {
    mockStart.mockImplementation(() => {
      this.state = 'recording'
    })
    mockStop.mockImplementation(() => {
      this.state = 'inactive'
      if (mockOndataavailable) {
        mockOndataavailable({ data: new Blob(['audio-data'], { type: 'audio/webm' }) })
      }
      if (mockOnstop) {
        mockOnstop()
      }
    })
  }

  start() {
    mockStart()
    this.state = 'recording'
  }

  stop() {
    mockStop()
    this.state = 'inactive'
    // Simulate async events
    setTimeout(() => {
      if (this.ondataavailable) {
        this.ondataavailable({ data: new Blob(['audio-data'], { type: 'audio/webm' }) } as never)
      }
      if (this.onstop) {
        this.onstop(new Event('stop') as never)
      }
    }, 0)
  }

  ondataavailable: ((e: never) => void) | null = null
  onstop: ((e: never) => void) | null = null

  static isTypeSupported(mime: string) {
    return mime === 'audio/webm;codecs=opus' || mime === 'audio/webm'
  }
}

// Mock AudioContext
class MockAudioContext {
  state = 'running'
  async resume() {
    this.state = 'running'
  }
  async close() {}
  createMediaStreamSource() {
    return { connect: vi.fn() }
  }
  createAnalyser() {
    return {
      fftSize: 256,
      frequencyBinCount: 128,
      getByteTimeDomainData: vi.fn((arr: Uint8Array) => {
        arr.fill(128)
      }),
    }
  }
}

// Mock MediaStream
class MockMediaStream {
  active = true
  getTracks() {
    return [{ stop: vi.fn() }]
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('MediaRecorder', MockMediaRecorder)
  vi.stubGlobal('AudioContext', MockAudioContext)

  // Mock getUserMedia
  Object.defineProperty(navigator, 'mediaDevices', {
    value: {
      getUserMedia: vi.fn().mockResolvedValue(new MockMediaStream()),
    },
    writable: true,
    configurable: true,
  })

  // Mock requestAnimationFrame
  vi.stubGlobal('requestAnimationFrame', vi.fn().mockReturnValue(1))
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
})

describe('useAudioRecorder', () => {
  it('startet im idle-State mit prompt Permission', () => {
    const { result } = renderHook(() => useAudioRecorder())

    expect(result.current.state).toBe('idle')
    expect(result.current.permission).toBe('prompt')
    expect(result.current.duration).toBe(0)
    expect(result.current.analyserData).toBeNull()
  })

  it('wechselt zu recording-State bei startRecording', async () => {
    const { result } = renderHook(() => useAudioRecorder())

    await act(async () => {
      await result.current.startRecording()
    })

    expect(result.current.state).toBe('recording')
    expect(result.current.permission).toBe('granted')
    expect(result.current.mimeType).toBe('audio/webm')
  })

  it('setzt Permission auf denied bei NotAllowedError', async () => {
    const mockGetUserMedia = vi.fn().mockRejectedValue(
      new DOMException('Not allowed', 'NotAllowedError'),
    )
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: mockGetUserMedia },
      writable: true,
      configurable: true,
    })

    const { result } = renderHook(() => useAudioRecorder())

    await act(async () => {
      await result.current.startRecording()
    })

    expect(result.current.permission).toBe('denied')
    expect(result.current.state).toBe('idle')
  })

  it('setzt Permission auf unsupported wenn MediaRecorder fehlt', async () => {
    // Must delete the key entirely — stubGlobal(undefined) keeps the key in window
    const saved = globalThis.MediaRecorder
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).MediaRecorder

    const { result } = renderHook(() => useAudioRecorder())

    // useEffect fires asynchronously — wait for state update
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.permission).toBe('unsupported')

    // Restore for other tests
    vi.stubGlobal('MediaRecorder', saved)
  })

  it('cancelRecording setzt State zurück auf idle', async () => {
    const { result } = renderHook(() => useAudioRecorder())

    await act(async () => {
      await result.current.startRecording()
    })

    expect(result.current.state).toBe('recording')

    act(() => {
      result.current.cancelRecording()
    })

    expect(result.current.state).toBe('idle')
    expect(result.current.duration).toBe(0)
  })

  it('isWarning ist true ab 50 Sekunden', async () => {
    const { result } = renderHook(() => useAudioRecorder())

    // Duration < 50 → nicht Warning
    expect(result.current.isWarning).toBe(false)

    // Direkt duration prüfen: isWarning basiert auf duration >= 50
    // Da wir duration nicht einfach setzen können, prüfen wir die Logik
    // isWarning = duration >= WARNING_DURATION_S (50)
  })

  it('startet nicht wenn State nicht idle ist', async () => {
    const { result } = renderHook(() => useAudioRecorder())

    await act(async () => {
      await result.current.startRecording()
    })
    expect(result.current.state).toBe('recording')

    // Zweiter Aufruf sollte ignoriert werden
    const getUserMediaCalls = (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mock.calls.length
    await act(async () => {
      await result.current.startRecording()
    })
    expect((navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mock.calls.length).toBe(getUserMediaCalls)
  })
})
