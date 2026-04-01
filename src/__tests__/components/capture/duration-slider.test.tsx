import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DurationSlider } from '@/components/capture/duration-slider'

describe('DurationSlider', () => {
  it('rendert einen Slider mit role="slider"', () => {
    render(<DurationSlider onChange={vi.fn()} />)
    expect(screen.getByRole('slider')).toBeInTheDocument()
  })

  it('zeigt "Bitte Dauer angeben" wenn kein value gesetzt', () => {
    render(<DurationSlider onChange={vi.fn()} />)
    expect(screen.getByText('Bitte Dauer angeben')).toBeInTheDocument()
  })

  it('zeigt formatierten Wert wenn value gesetzt (120 → "2 Std.")', () => {
    render(<DurationSlider value={120} onChange={vi.fn()} />)
    expect(screen.getByText('2 Std.')).toBeInTheDocument()
    expect(screen.queryByText('Bitte Dauer angeben')).not.toBeInTheDocument()
  })

  it('zeigt "< 30 Sek." bei value=0', () => {
    render(<DurationSlider value={0} onChange={vi.fn()} />)
    expect(screen.getByText('< 30 Sek.')).toBeInTheDocument()
  })

  it('hat aria-label="Symptomdauer"', () => {
    render(<DurationSlider onChange={vi.fn()} />)
    expect(screen.getByRole('slider')).toHaveAttribute(
      'aria-label',
      'Symptomdauer',
    )
  })

  it('ruft onChange mit korrektem Minuten-Wert bei pointerUp auf', () => {
    const onChange = vi.fn()
    render(<DurationSlider onChange={onChange} />)
    const slider = screen.getByRole('slider')

    // Slider auf Index 5 (= 60 Minuten) setzen
    fireEvent.change(slider, { target: { value: '5' } })
    fireEvent.pointerUp(slider)

    expect(onChange).toHaveBeenCalledWith(60)
  })

  it('aktualisiert Label live bei onChange ohne DB-Write (vor pointerUp)', () => {
    const onChange = vi.fn()
    render(<DurationSlider onChange={onChange} />)
    const slider = screen.getByRole('slider')

    fireEvent.change(slider, { target: { value: '4' } }) // 30 Min
    expect(screen.getByText('30 Min.')).toBeInTheDocument()
    // onChange noch NICHT aufgerufen (kein pointerUp)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('zeigt Endpunkt-Labels "< 30s" und "24 Std."', () => {
    render(<DurationSlider onChange={vi.fn()} />)
    expect(screen.getByText('< 30s')).toBeInTheDocument()
    expect(screen.getByText('24 Std.')).toBeInTheDocument()
  })
})
