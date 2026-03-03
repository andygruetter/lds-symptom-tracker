import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { InputBar } from '@/components/capture/input-bar'

describe('InputBar', () => {
  it('zeigt Placeholder-Text "Symptom..."', () => {
    render(<InputBar onSendText={vi.fn()} />)

    expect(screen.getByPlaceholderText('Symptom...')).toBeInTheDocument()
  })

  it('zeigt Mikrofon-Button wenn kein Text eingegeben', () => {
    render(<InputBar onSendText={vi.fn()} />)

    expect(
      screen.getByLabelText('Sprachaufnahme starten'),
    ).toBeInTheDocument()
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

  it('zeigt disabled Kamera-Button', () => {
    render(<InputBar onSendText={vi.fn()} />)

    const cameraBtn = screen.getByLabelText('Foto aufnehmen')
    expect(cameraBtn).toBeDisabled()
  })

  it('hat min 44x44px Touch-Targets (min-h-11 min-w-11)', () => {
    render(<InputBar onSendText={vi.fn()} />)

    const cameraBtn = screen.getByLabelText('Foto aufnehmen')
    expect(cameraBtn.className).toContain('min-h-11')
    expect(cameraBtn.className).toContain('min-w-11')
  })
})
