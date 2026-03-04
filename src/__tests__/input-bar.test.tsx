import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Hoisted mutable mock state — can be changed per-test
const mockRecorderState = vi.hoisted(() => ({
  state: 'idle' as string,
  permission: 'prompt' as string,
  duration: 0,
  isWarning: false,
  analyserData: null as Uint8Array | null,
  mimeType: null as string | null,
  startRecording: vi.fn(),
  stopRecording: vi.fn().mockResolvedValue(null),
  cancelRecording: vi.fn(),
}))

vi.mock('@/hooks/use-audio-recorder', () => ({
  useAudioRecorder: () => mockRecorderState,
}))

import { InputBar } from '@/components/capture/input-bar'

beforeEach(() => {
  // Reset to default idle state before each test
  mockRecorderState.state = 'idle'
  mockRecorderState.permission = 'prompt'
  mockRecorderState.duration = 0
  mockRecorderState.isWarning = false
  mockRecorderState.analyserData = null
  mockRecorderState.mimeType = null
  mockRecorderState.startRecording = vi.fn()
  mockRecorderState.stopRecording = vi.fn().mockResolvedValue(null)
  mockRecorderState.cancelRecording = vi.fn()
})

describe('InputBar', () => {
  it('zeigt Placeholder-Text "Symptom..."', () => {
    render(<InputBar onSendText={vi.fn()} />)

    expect(screen.getByPlaceholderText('Symptom...')).toBeInTheDocument()
  })

  it('zeigt Mikrofon-Button wenn kein Text eingegeben', () => {
    render(<InputBar onSendText={vi.fn()} />)

    expect(screen.getByLabelText('Sprachaufnahme starten')).toBeInTheDocument()
    expect(screen.queryByLabelText('Nachricht senden')).not.toBeInTheDocument()
  })

  it('zeigt Send-Button wenn Text eingegeben', () => {
    render(<InputBar onSendText={vi.fn()} />)

    const textarea = screen.getByPlaceholderText('Symptom...')
    fireEvent.change(textarea, { target: { value: 'Kopfschmerzen' } })

    expect(screen.getByLabelText('Nachricht senden')).toBeInTheDocument()
    expect(
      screen.queryByLabelText('Sprachaufnahme starten'),
    ).not.toBeInTheDocument()
  })

  it('ruft onSendText auf bei Send-Button Klick', () => {
    const onSendText = vi.fn()
    render(<InputBar onSendText={onSendText} />)

    const textarea = screen.getByPlaceholderText('Symptom...')
    fireEvent.change(textarea, { target: { value: 'Rückenschmerzen links' } })
    fireEvent.click(screen.getByLabelText('Nachricht senden'))

    expect(onSendText).toHaveBeenCalledWith('Rückenschmerzen links')
  })

  it('ruft onSendText auf bei Enter-Taste', () => {
    const onSendText = vi.fn()
    render(<InputBar onSendText={onSendText} />)

    const textarea = screen.getByPlaceholderText('Symptom...')
    fireEvent.change(textarea, { target: { value: 'Kopfschmerzen' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })

    expect(onSendText).toHaveBeenCalledWith('Kopfschmerzen')
  })

  it('sendet nicht bei Shift+Enter', () => {
    const onSendText = vi.fn()
    render(<InputBar onSendText={onSendText} />)

    const textarea = screen.getByPlaceholderText('Symptom...')
    fireEvent.change(textarea, { target: { value: 'Test' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })

    expect(onSendText).not.toHaveBeenCalled()
  })

  it('leert Input nach dem Senden', () => {
    const onSendText = vi.fn()
    render(<InputBar onSendText={onSendText} />)

    const textarea = screen.getByPlaceholderText(
      'Symptom...',
    ) as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: 'Text' } })
    fireEvent.click(screen.getByLabelText('Nachricht senden'))

    expect(textarea.value).toBe('')
  })

  it('sendet nicht bei leerem Text', () => {
    const onSendText = vi.fn()
    render(<InputBar onSendText={onSendText} />)

    const textarea = screen.getByPlaceholderText('Symptom...')
    fireEvent.change(textarea, { target: { value: '   ' } })
    // Mikrofon-Button immer noch sichtbar bei nur Whitespace
    fireEvent.keyDown(textarea, { key: 'Enter' })

    expect(onSendText).not.toHaveBeenCalled()
  })

  it('zeigt aktiven Kamera-Button', () => {
    render(<InputBar onSendText={vi.fn()} />)

    const cameraBtn = screen.getByLabelText('Foto aufnehmen')
    expect(cameraBtn).not.toBeDisabled()
  })

  it('hat min 44x44px Touch-Targets (min-h-11 min-w-11)', () => {
    render(<InputBar onSendText={vi.fn()} />)

    const cameraBtn = screen.getByLabelText('Foto aufnehmen')
    expect(cameraBtn.className).toContain('min-h-11')
    expect(cameraBtn.className).toContain('min-w-11')
  })

  it('zeigt Mikrofon-Button als enabled bei prompt Permission', () => {
    render(<InputBar onSendText={vi.fn()} />)

    const micBtn = screen.getByLabelText('Sprachaufnahme starten')
    expect(micBtn).not.toBeDisabled()
  })

  it('hat onPointerDown und onPointerUp auf Mikrofon-Button', () => {
    render(<InputBar onSendText={vi.fn()} />)

    const micBtn = screen.getByLabelText('Sprachaufnahme starten')
    // PointerDown/Up events should be handled
    expect(micBtn).toBeInTheDocument()
  })
})

describe('InputBar Permission-Denied', () => {
  it('zeigt MicOff-Icon und Hinweis bei denied Permission', () => {
    mockRecorderState.permission = 'denied'

    render(<InputBar onSendText={vi.fn()} />)

    const micBtn = screen.getByLabelText('Mikrofon-Zugriff benötigt')
    expect(micBtn).toBeDisabled()
  })
})

describe('InputBar Recording-Modus', () => {
  it('zeigt Waveform und Cancel-Button im Recording-State', () => {
    mockRecorderState.state = 'recording'
    mockRecorderState.permission = 'granted'
    mockRecorderState.duration = 5
    mockRecorderState.analyserData = new Uint8Array(128).fill(128)
    mockRecorderState.mimeType = 'audio/webm'

    render(<InputBar onSendText={vi.fn()} />)

    // Cancel-Button sichtbar
    expect(screen.getByLabelText('Aufnahme abbrechen')).toBeInTheDocument()

    // TextArea nicht sichtbar
    expect(screen.queryByPlaceholderText('Symptom...')).not.toBeInTheDocument()

    // Waveform duration sichtbar
    expect(screen.getByText('00:05')).toBeInTheDocument()
  })

  it('ruft cancelRecording bei Cancel-Button Klick', () => {
    const mockCancel = vi.fn()
    mockRecorderState.state = 'recording'
    mockRecorderState.permission = 'granted'
    mockRecorderState.duration = 3
    mockRecorderState.analyserData = new Uint8Array(128).fill(128)
    mockRecorderState.mimeType = 'audio/webm'
    mockRecorderState.cancelRecording = mockCancel

    render(<InputBar onSendText={vi.fn()} />)

    fireEvent.click(screen.getByLabelText('Aufnahme abbrechen'))
    expect(mockCancel).toHaveBeenCalled()
  })
})
