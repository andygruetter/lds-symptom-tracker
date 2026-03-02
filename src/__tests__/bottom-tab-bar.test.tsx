import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { BottomTabBar } from '@/components/layout/bottom-tab-bar'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
}))

// Mock next/link to render a plain anchor
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode
    href: string
    className?: string
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

describe('BottomTabBar', () => {
  it('renders 3 tabs with correct labels', () => {
    render(<BottomTabBar />)

    expect(screen.getByText('Erfassen')).toBeInTheDocument()
    expect(screen.getByText('Auswertung')).toBeInTheDocument()
    expect(screen.getByText('Mehr')).toBeInTheDocument()
  })

  it('has navigation role and aria-label', () => {
    render(<BottomTabBar />)

    const nav = screen.getByRole('navigation', { name: 'Hauptnavigation' })
    expect(nav).toBeInTheDocument()
  })

  it('renders correct links', () => {
    render(<BottomTabBar />)

    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(3)
    expect(links[0]).toHaveAttribute('href', '/')
    expect(links[1]).toHaveAttribute('href', '/insights')
    expect(links[2]).toHaveAttribute('href', '/more')
  })

  it('highlights active tab on root path', () => {
    render(<BottomTabBar />)

    const erfassenLink = screen.getByText('Erfassen').closest('a')
    expect(erfassenLink?.className).toContain('text-primary')
    expect(erfassenLink?.className).toContain('font-medium')
    expect(erfassenLink).toHaveAttribute('aria-current', 'page')

    const auswertungLink = screen.getByText('Auswertung').closest('a')
    expect(auswertungLink?.className).toContain('text-muted-foreground')
    expect(auswertungLink).not.toHaveAttribute('aria-current')
  })

  it('highlights active tab on insights path', async () => {
    const { usePathname } = await import('next/navigation')
    vi.mocked(usePathname).mockReturnValue('/insights')

    render(<BottomTabBar />)

    const auswertungLink = screen.getByText('Auswertung').closest('a')
    expect(auswertungLink?.className).toContain('text-primary')

    const erfassenLink = screen.getByText('Erfassen').closest('a')
    expect(erfassenLink?.className).toContain('text-muted-foreground')
  })
})
