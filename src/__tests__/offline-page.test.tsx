import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import OfflinePage from '@/app/~offline/page'

describe('Offline-Fallback-Seite', () => {
  it('zeigt Offline-Meldung an', () => {
    render(<OfflinePage />)

    expect(
      screen.getByText('Keine Internetverbindung'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Bitte überprüfe deine Verbindung und versuche es erneut.',
      ),
    ).toBeInTheDocument()
  })

  it('hat einen Retry-Button', () => {
    render(<OfflinePage />)

    const button = screen.getByRole('button', { name: 'Erneut versuchen' })
    expect(button).toBeInTheDocument()
  })

  it('nutzt Patient-Theme', () => {
    const { container } = render(<OfflinePage />)

    const themeDiv = container.querySelector('[data-theme="patient"]')
    expect(themeDiv).toBeInTheDocument()
  })
})
