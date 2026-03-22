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

vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({
    children,
    open,
  }: {
    children: React.ReactNode
    open: boolean
  }) => (open ? <div data-testid="alert-dialog">{children}</div> : null),
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
  AlertDialogAction: ({
    children,
    onClick,
  }: {
    children: React.ReactNode
    onClick?: () => void
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}))

const photos: EventPhoto[] = [
  {
    id: 'photo-1',
    signedUrl: 'https://signed.url/photo1.jpg',
    createdAt: '2026-03-15T10:00:00Z',
  },
  {
    id: 'photo-2',
    signedUrl: 'https://signed.url/photo2.jpg',
    createdAt: '2026-03-15T11:00:00Z',
  },
]

describe('PhotoGallery', () => {
  it('rendert Foto-Grid mit mehreren Fotos', () => {
    render(<PhotoGallery photos={photos} />)
    const imgs = screen.getAllByRole('img')
    expect(imgs).toHaveLength(2)
  })

  it('einzelnes Foto erhält volle Breite (col-span-2)', () => {
    const single: EventPhoto[] = [
      {
        id: 'photo-1',
        signedUrl: 'https://signed.url/photo1.jpg',
        createdAt: '2026-03-15T10:00:00Z',
      },
    ]
    const { container } = render(<PhotoGallery photos={single} />)
    // The outer wrapper div gets col-span-2, not the button
    const wrapper = container.querySelector('.col-span-2')
    expect(wrapper).toBeTruthy()
  })

  it('öffnet Lightbox beim Tippen auf ein Foto', () => {
    render(<PhotoGallery photos={photos} />)
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0])
    expect(screen.getByTestId('dialog')).toBeTruthy()
  })

  it('gruppiert Fotos nach Datum', () => {
    const mixedDates: EventPhoto[] = [
      {
        id: 'p1',
        signedUrl: 'https://url/1.jpg',
        createdAt: '2026-03-15T10:00:00Z',
      },
      {
        id: 'p2',
        signedUrl: 'https://url/2.jpg',
        createdAt: '2026-03-16T10:00:00Z',
      },
    ]
    render(<PhotoGallery photos={mixedDates} />)
    // Two different date labels should appear
    const dateLabels = document.querySelectorAll(
      'p.text-xs.font-medium.text-muted-foreground',
    )
    expect(dateLabels.length).toBeGreaterThanOrEqual(2)
  })

  it('zeigt "Ältere laden" Button wenn totalCount > photos.length', () => {
    const onLoadMore = vi.fn()
    render(
      <PhotoGallery photos={photos} totalCount={5} onLoadMore={onLoadMore} />,
    )
    const loadMoreBtn = screen.getByText('Ältere laden')
    expect(loadMoreBtn).toBeInTheDocument()
    fireEvent.click(loadMoreBtn)
    expect(onLoadMore).toHaveBeenCalledTimes(1)
  })

  it('zeigt keinen "Ältere laden" Button wenn alle Fotos geladen', () => {
    render(<PhotoGallery photos={photos} totalCount={2} onLoadMore={vi.fn()} />)
    expect(screen.queryByText('Ältere laden')).not.toBeInTheDocument()
  })

  it('zeigt Löschen-Button wenn onDeletePhoto gesetzt', () => {
    const onDelete = vi.fn()
    render(<PhotoGallery photos={[photos[0]]} onDeletePhoto={onDelete} />)
    expect(screen.getByLabelText('Foto löschen')).toBeInTheDocument()
  })

  it('zeigt keinen Löschen-Button ohne onDeletePhoto', () => {
    render(<PhotoGallery photos={[photos[0]]} />)
    expect(screen.queryByLabelText('Foto löschen')).not.toBeInTheDocument()
  })
})
