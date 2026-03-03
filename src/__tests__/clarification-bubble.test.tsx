import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ClarificationBubble } from '@/components/capture/clarification-bubble'
import type { ClarificationQuestion } from '@/types/ai'

const mockQuestion: ClarificationQuestion = {
  fieldName: 'Seite',
  question: 'Welche Seite?',
  options: ['Links', 'Rechts', 'Beidseits'],
  allowFreeText: true,
}

describe('ClarificationBubble', () => {
  const defaultProps = {
    question: mockQuestion,
    onAnswer: vi.fn(),
  }

  it('zeigt Fragetext an', () => {
    render(<ClarificationBubble {...defaultProps} />)
    expect(screen.getByText('Welche Seite?')).toBeInTheDocument()
  })

  it('zeigt Optionen als tippbare Chips', () => {
    render(<ClarificationBubble {...defaultProps} />)

    expect(screen.getByRole('button', { name: 'Links' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rechts' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Beidseits' }),
    ).toBeInTheDocument()
  })

  it('ruft onAnswer bei Chip-Klick auf', () => {
    const onAnswer = vi.fn()
    render(<ClarificationBubble {...defaultProps} onAnswer={onAnswer} />)

    fireEvent.click(screen.getByRole('button', { name: 'Links' }))
    expect(onAnswer).toHaveBeenCalledWith('Seite', 'Links')
  })

  it('zeigt "Andere Antwort..." Button wenn allowFreeText', () => {
    render(<ClarificationBubble {...defaultProps} />)
    expect(
      screen.getByRole('button', { name: /andere antwort/i }),
    ).toBeInTheDocument()
  })

  it('zeigt Freitext-Input nach Klick auf "Andere Antwort..."', () => {
    render(<ClarificationBubble {...defaultProps} />)

    fireEvent.click(
      screen.getByRole('button', { name: /andere antwort/i }),
    )
    expect(
      screen.getByPlaceholderText('Eigene Antwort...'),
    ).toBeInTheDocument()
  })

  it('sendet Freitext-Antwort bei OK-Klick', () => {
    const onAnswer = vi.fn()
    render(<ClarificationBubble {...defaultProps} onAnswer={onAnswer} />)

    fireEvent.click(
      screen.getByRole('button', { name: /andere antwort/i }),
    )
    const input = screen.getByPlaceholderText('Eigene Antwort...')
    fireEvent.change(input, { target: { value: 'Mitte' } })
    fireEvent.click(screen.getByRole('button', { name: 'OK' }))

    expect(onAnswer).toHaveBeenCalledWith('Seite', 'Mitte')
  })

  it('sendet Freitext-Antwort bei Enter', () => {
    const onAnswer = vi.fn()
    render(<ClarificationBubble {...defaultProps} onAnswer={onAnswer} />)

    fireEvent.click(
      screen.getByRole('button', { name: /andere antwort/i }),
    )
    const input = screen.getByPlaceholderText('Eigene Antwort...')
    fireEvent.change(input, { target: { value: 'Mitte' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onAnswer).toHaveBeenCalledWith('Seite', 'Mitte')
  })

  it('zeigt beantworteten Zustand mit hervorgehobener Antwort', () => {
    render(
      <ClarificationBubble
        {...defaultProps}
        isAnswered
        answeredValue="Links"
      />,
    )

    expect(screen.getByText('Links')).toBeInTheDocument()
    // Chips sollten nicht mehr sichtbar sein
    expect(
      screen.queryByRole('button', { name: 'Rechts' }),
    ).not.toBeInTheDocument()
  })

  it('hat role="group" und aria-label', () => {
    const { container } = render(<ClarificationBubble {...defaultProps} />)
    const group = container.querySelector('[role="group"]')
    expect(group).toHaveAttribute(
      'aria-label',
      'Nachfrage: Welche Seite?',
    )
  })

  it('hat Received-Bubble Styling', () => {
    const { container } = render(<ClarificationBubble {...defaultProps} />)
    const bubble = container.querySelector('.bg-card')
    expect(bubble).toHaveClass('rounded-2xl', 'rounded-bl-sm', 'shadow-sm')
  })

  it('Chips haben min-h-11 Touch-Target', () => {
    render(<ClarificationBubble {...defaultProps} />)
    const chip = screen.getByRole('button', { name: 'Links' })
    expect(chip).toHaveClass('min-h-11')
  })

  it('zeigt keine "Andere Antwort..." wenn allowFreeText false', () => {
    const noFreeTextQuestion: ClarificationQuestion = {
      ...mockQuestion,
      allowFreeText: false,
    }
    render(
      <ClarificationBubble {...defaultProps} question={noFreeTextQuestion} />,
    )

    expect(
      screen.queryByRole('button', { name: /andere antwort/i }),
    ).not.toBeInTheDocument()
  })
})
