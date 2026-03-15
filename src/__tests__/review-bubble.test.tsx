import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ReviewBubble } from '@/components/capture/review-bubble'
import type { ExtractedData } from '@/types/ai'

const mockFields: ExtractedData[] = [
  {
    id: 'field-1',
    symptom_event_id: 'event-1',
    field_name: 'symptom_name',
    value: 'Rückenschmerzen',
    confidence: 92,
    confirmed: false,
    created_at: '2026-03-02T10:00:00Z',
    symptom_index: 0,
  },
  {
    id: 'field-2',
    symptom_event_id: 'event-1',
    field_name: 'body_region',
    value: 'Schulterblatt',
    confidence: 75,
    confirmed: false,
    created_at: '2026-03-02T10:00:00Z',
    symptom_index: 0,
  },
  {
    id: 'field-3',
    symptom_event_id: 'event-1',
    field_name: 'intensity',
    value: '6',
    confidence: 88,
    confirmed: false,
    created_at: '2026-03-02T10:00:00Z',
    symptom_index: 0,
  },
]

describe('ReviewBubble', () => {
  const defaultProps = {
    extractedFields: mockFields,
    eventId: 'event-1',
    onConfirm: vi.fn(),
    onCorrect: vi.fn(),
  }

  it('zeigt Symptomname prominent an', () => {
    render(<ReviewBubble {...defaultProps} />)
    const name = screen.getByText('Rückenschmerzen')
    expect(name).toBeInTheDocument()
    expect(name.tagName).toBe('P')
    expect(name).toHaveClass('font-semibold')
  })

  it('zeigt Körperregion und Intensität als Zusatzinfo', () => {
    render(<ReviewBubble {...defaultProps} />)
    expect(screen.getByText('Schulterblatt')).toBeInTheDocument()
    expect(screen.getByText(/mittel \(6\)/)).toBeInTheDocument()
  })

  it('zeigt formatierte Zeitangabe statt ISO-String', () => {
    const fieldsWithTime: ExtractedData[] = [
      ...mockFields,
      {
        id: 'field-time',
        symptom_event_id: 'event-1',
        field_name: 'symptom_time',
        value: '2026-03-15T17:50:00+00:00',
        confidence: 80,
        confirmed: false,
        created_at: '2026-03-02T10:00:00Z',
        symptom_index: 0,
      },
    ]
    render(<ReviewBubble {...defaultProps} extractedFields={fieldsWithTime} />)
    // Should show formatted date, not raw ISO
    expect(
      screen.queryByText('2026-03-15T17:50:00+00:00'),
    ).not.toBeInTheDocument()
    // Should contain formatted parts (day, time)
    expect(screen.getByText(/15\./)).toBeInTheDocument()
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

  it('zeigt Konfidenz-Label ohne Prozentzahl', () => {
    render(<ReviewBubble {...defaultProps} />)
    // Average: (92 + 75 + 88) / 3 = 85 → "sicher erkannt"
    expect(screen.getByText('sicher erkannt')).toBeInTheDocument()
    // No percentage visible
    expect(screen.queryByText('85%')).not.toBeInTheDocument()
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
    expect(bubble).toHaveClass('rounded-2xl', 'rounded-bl-sm', 'shadow-sm')
  })

  it('Ändern-Button aktiviert Edit-Mode für erstes unbestätigtes Feld', () => {
    render(<ReviewBubble {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /^ändern$/i }))
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('Bestätigen-Button hat min 48x48px', () => {
    render(<ReviewBubble {...defaultProps} />)
    const btn = screen.getByRole('button', { name: /^bestätigen$/i })
    expect(btn).toHaveClass('min-h-[48px]', 'min-w-[48px]')
  })

  it('zeigt Extra-Felder als Tags', () => {
    const fieldsWithExtra: ExtractedData[] = [
      ...mockFields,
      {
        id: 'field-extra',
        symptom_event_id: 'event-1',
        field_name: 'trigger',
        value: 'nach dem Sport',
        confidence: 70,
        confirmed: false,
        created_at: '2026-03-02T10:00:00Z',
        symptom_index: 0,
      },
    ]
    render(<ReviewBubble {...defaultProps} extractedFields={fieldsWithExtra} />)
    expect(screen.getByText('nach dem Sport')).toBeInTheDocument()
  })
})
