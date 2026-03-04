import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { SymptomTag } from '@/components/capture/symptom-tag'

describe('SymptomTag', () => {
  const defaultProps = {
    label: 'Körperteil',
    value: 'Schulterblatt',
    confidence: 92,
    editable: true,
  }

  describe('Confirmed State (nicht editierbar)', () => {
    it('zeigt Value ohne Edit-Möglichkeit', () => {
      render(<SymptomTag {...defaultProps} editable={false} />)

      expect(screen.getByText('Schulterblatt')).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: /ändern/i }),
      ).not.toBeInTheDocument()
    })

    it('hat bg-muted Styling', () => {
      const { container } = render(
        <SymptomTag {...defaultProps} editable={false} />,
      )
      expect(container.firstChild).toHaveClass('bg-muted')
    })
  })

  describe('Uncertain State (editierbar, niedrige Konfidenz)', () => {
    it('zeigt Border für unsichere Felder', () => {
      const { container } = render(
        <SymptomTag {...defaultProps} confidence={65} />,
      )
      expect(container.firstChild).toHaveClass('border')
    })

    it('hat aria-label für Accessibility', () => {
      render(<SymptomTag {...defaultProps} confidence={65} />)
      expect(
        screen.getByRole('button', { name: 'Körperteil ändern' }),
      ).toBeInTheDocument()
    })

    it('hat min 44x44px Touch-Target', () => {
      render(<SymptomTag {...defaultProps} confidence={65} />)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('min-h-[44px]', 'min-w-[44px]')
    })
  })

  describe('Default State (editierbar, hohe Konfidenz)', () => {
    it('zeigt keinen Border bei hoher Konfidenz', () => {
      const { container } = render(
        <SymptomTag {...defaultProps} confidence={90} />,
      )
      expect(container.firstChild).not.toHaveClass('border')
    })

    it('ruft onStartEdit beim Klick auf', () => {
      const onStartEdit = vi.fn()
      render(<SymptomTag {...defaultProps} onStartEdit={onStartEdit} />)

      fireEvent.click(screen.getByRole('button'))
      expect(onStartEdit).toHaveBeenCalledOnce()
    })
  })

  describe('Editing State', () => {
    it('zeigt Input-Feld im Edit-Mode', () => {
      render(<SymptomTag {...defaultProps} isEditing />)

      const input = screen.getByRole('textbox')
      expect(input).toBeInTheDocument()
      expect(input).toHaveValue('Schulterblatt')
    })

    it('zeigt Label im Edit-Mode', () => {
      render(<SymptomTag {...defaultProps} isEditing />)
      expect(screen.getByText('Körperteil:')).toBeInTheDocument()
    })

    it('hat dashed Border im Edit-Mode', () => {
      const { container } = render(<SymptomTag {...defaultProps} isEditing />)
      expect(container.firstChild).toHaveClass('border-dashed')
    })

    it('ruft onEdit bei Enter auf', () => {
      const onEdit = vi.fn()
      render(<SymptomTag {...defaultProps} isEditing onEdit={onEdit} />)

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'Oberer Rücken' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      expect(onEdit).toHaveBeenCalledWith('Oberer Rücken')
    })

    it('ruft onCancelEdit bei Escape auf', () => {
      const onCancelEdit = vi.fn()
      render(
        <SymptomTag {...defaultProps} isEditing onCancelEdit={onCancelEdit} />,
      )

      fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' })
      expect(onCancelEdit).toHaveBeenCalledOnce()
    })

    it('zeigt Dropdown wenn Options vorhanden', () => {
      render(
        <SymptomTag
          {...defaultProps}
          isEditing
          options={['Oberer Rücken', 'Unterer Rücken', 'Schulterblatt']}
        />,
      )

      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })
  })
})
