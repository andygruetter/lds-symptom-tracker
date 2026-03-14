import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { PhotoGallery } from '@/components/event/photo-gallery'
import type { EventPhoto } from '@/types/analytics'

// Dialog is a client component using radix-ui; provide minimal mock
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
}))

const photos: EventPhoto[] = [
  { id: 'photo-1', signedUrl: 'https://signed.url/photo1.jpg' },
  { id: 'photo-2', signedUrl: 'https://signed.url/photo2.jpg' },
]

describe('PhotoGallery', () => {
  it('rendert Foto-Grid mit mehreren Fotos', () => {
    render(<PhotoGallery photos={photos} />)
    const imgs = screen.getAllByRole('img')
    expect(imgs).toHaveLength(2)
  })

  it('einzelnes Foto erhält volle Breite (col-span-2)', () => {
    const single: EventPhoto[] = [
      { id: 'photo-1', signedUrl: 'https://signed.url/photo1.jpg' },
    ]
    const { container } = render(<PhotoGallery photos={single} />)
    const button = container.querySelector('button')
    expect(button?.className).toContain('col-span-2')
  })

  it('öffnet Lightbox beim Tippen auf ein Foto', () => {
    render(<PhotoGallery photos={photos} />)
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0])
    expect(screen.getByTestId('dialog')).toBeTruthy()
  })
})
