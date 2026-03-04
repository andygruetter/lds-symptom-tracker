import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ConfidenceIndicator } from '@/components/capture/confidence-indicator'

describe('ConfidenceIndicator', () => {
  it('zeigt hohe Konfidenz (≥85%) mit Teal-Farbe und Label "sicher erkannt"', () => {
    render(<ConfidenceIndicator score={92} />)

    expect(screen.getByText('92%')).toBeInTheDocument()
    expect(screen.getByText('— sicher erkannt')).toBeInTheDocument()

    const dot = screen.getByText('92%').previousElementSibling
    expect(dot).toHaveStyle({ backgroundColor: '#3A856F' })
  })

  it('zeigt mittlere Konfidenz (70-84%) mit Amber-Farbe und Label "relativ sicher"', () => {
    render(<ConfidenceIndicator score={75} />)

    expect(screen.getByText('75%')).toBeInTheDocument()
    expect(screen.getByText('— relativ sicher')).toBeInTheDocument()

    const dot = screen.getByText('75%').previousElementSibling
    expect(dot).toHaveStyle({ backgroundColor: '#B8913A' })
  })

  it('zeigt niedrige Konfidenz (<70%) mit Terracotta-Farbe und Label "unsicher, bitte überprüfen"', () => {
    render(<ConfidenceIndicator score={55} />)

    expect(screen.getByText('55%')).toBeInTheDocument()
    expect(screen.getByText('— unsicher, bitte überprüfen')).toBeInTheDocument()

    const dot = screen.getByText('55%').previousElementSibling
    expect(dot).toHaveStyle({ backgroundColor: '#C06A3C' })
  })

  it('zeigt Grenzwert 85% als hoch', () => {
    render(<ConfidenceIndicator score={85} />)
    expect(screen.getByText('— sicher erkannt')).toBeInTheDocument()
  })

  it('zeigt Grenzwert 70% als mittel', () => {
    render(<ConfidenceIndicator score={70} />)
    expect(screen.getByText('— relativ sicher')).toBeInTheDocument()
  })

  it('zeigt Grenzwert 69% als niedrig', () => {
    render(<ConfidenceIndicator score={69} />)
    expect(screen.getByText('— unsicher, bitte überprüfen')).toBeInTheDocument()
  })

  it('hat immer Text-Label neben Farbe (Accessibility)', () => {
    render(<ConfidenceIndicator score={90} />)

    // Dot ist aria-hidden
    const dot = screen.getByText('90%').previousElementSibling
    expect(dot).toHaveAttribute('aria-hidden', 'true')

    // Text-Label ist immer vorhanden
    expect(screen.getByText('— sicher erkannt')).toBeInTheDocument()
  })

  it('hat role="img" und aria-label für Screenreader', () => {
    render(<ConfidenceIndicator score={75} />)

    const indicator = screen.getByRole('img')
    expect(indicator).toHaveAttribute(
      'aria-label',
      'Konfidenz: 75% — relativ sicher',
    )
  })
})
