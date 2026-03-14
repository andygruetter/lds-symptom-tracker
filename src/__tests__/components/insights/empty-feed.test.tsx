import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('EmptyFeed', () => {
  it('zeigt Anti-Tagebuch-Text', async () => {
    const { EmptyFeed } = await import('@/components/insights/empty-feed')
    render(<EmptyFeed />)

    expect(screen.getByText(/noch keine einträge/i)).toBeInTheDocument()
    expect(screen.getByText(/guter tag/i)).toBeInTheDocument()
  })

  it('enthält keine Gamification', async () => {
    const { EmptyFeed } = await import('@/components/insights/empty-feed')
    render(<EmptyFeed />)

    expect(
      screen.queryByText(/erstelle deinen ersten eintrag/i),
    ).not.toBeInTheDocument()
    expect(screen.queryByText(/streak/i)).not.toBeInTheDocument()
  })
})
