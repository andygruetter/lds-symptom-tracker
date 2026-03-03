import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ReviewBubble } from '@/components/capture/review-bubble'
import type { ExtractedData } from '@/types/ai'

const mockFields: ExtractedData[] = [
  {
    id: 'field-1',
    symptom_event_id: 'event-1',
    field_name: 'Symptom',
    value: 'Rückenschmerzen',
    confidence: 92,
    confirmed: false,
    created_at: '2026-03-02T10:00:00Z',
  },
  {
    id: 'field-2',
    symptom_event_id: 'event-1',
    field_name: 'Körperteil',
    value: 'Schulterblatt',
    confidence: 75,
    confirmed: false,
    created_at: '2026-03-02T10:00:00Z',
  },
  {
    id: 'field-3',
    symptom_event_id: 'event-1',
    field_name: 'Intensität',
    value: '6/10',
    confidence: 88,
    confirmed: false,
    created_at: '2026-03-02T10:00:00Z',
  },
]

describe('ReviewBubble', () => {
  const defaultProps = {
    extractedFields: mockFields,
    eventId: 'event-1',
    onConfirm: vi.fn(),
    onCorrect: vi.fn(),
  }

  it('zeigt alle extrahierten Felder als Tags', () => {
    render(<ReviewBubble {...defaultProps} />)

    expect(screen.getByText('Rückenschmerzen')).toBeInTheDocument()
    expect(screen.getByText('Schulterblatt')).toBeInTheDocument()
    expect(screen.getByText('6/10')).toBeInTheDocument()
  })

  it('zeigt Bestätigen- und Ändern-Buttons', () => {
    render(<ReviewBubble {...defaultProps} />)

    expect(
      screen.getByRole('button', { name: /^bestätigen$/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /^ändern$/i }),
    ).toBeInTheDocument()
  })

  it('ruft onConfirm mit eventId bei Klick auf Bestätigen', () => {
    const onConfirm = vi.fn()
    render(<ReviewBubble {...defaultProps} onConfirm={onConfirm} />)

    fireEvent.click(screen.getByRole('button', { name: /^bestätigen$/i }))
    expect(onConfirm).toHaveBeenCalledWith('event-1')
  })

  it('zeigt Konfidenz-Indikator mit Durchschnittswert', () => {
    render(<ReviewBubble {...defaultProps} />)

    // Durchschnitt: (92 + 75 + 88) / 3 = 85
    expect(screen.getByText('85%')).toBeInTheDocument()
  })

  it('zeigt "Wird bestätigt..." bei isConfirming', () => {
    render(<ReviewBubble {...defaultProps} isConfirming />)

    expect(screen.getByText('Wird bestätigt...')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /^wird bestätigt/i }),
    ).toBeDisabled()
  })

  it('hat Received-Bubble Styling', () => {
    const { container } = render(<ReviewBubble {...defaultProps} />)
    const bubble = container.querySelector('.bg-card')
    expect(bubble).toHaveClass(
      'rounded-2xl',
      'rounded-bl-sm',
      'shadow-sm',
    )
  })

  it('Ändern-Button aktiviert Edit-Mode für erstes unbestätigtes Feld', () => {
    render(<ReviewBubble {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: /^ändern$/i }))

    // Should show an input field (first unconfirmed field: Symptom)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('Bestätigen-Button hat min 48x48px', () => {
    render(<ReviewBubble {...defaultProps} />)
    const btn = screen.getByRole('button', { name: /^bestätigen$/i })
    expect(btn).toHaveClass('min-h-[48px]', 'min-w-[48px]')
  })
})
