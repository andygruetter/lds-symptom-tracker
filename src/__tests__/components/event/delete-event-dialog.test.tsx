import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockDeleteEvent = vi.fn()
const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('@/lib/actions/insights-actions', () => ({
  deleteEvent: (...args: unknown[]) => mockDeleteEvent(...args),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
})

describe('DeleteEventDialog', () => {
  it('rendert Dialog mit Title und Buttons', async () => {
    const { DeleteEventDialog } =
      await import('@/components/event/delete-event-dialog')
    render(
      <DeleteEventDialog
        open={true}
        onOpenChange={vi.fn()}
        eventId="event-1"
      />,
    )

    expect(screen.getByText('Event löschen?')).toBeTruthy()
    expect(screen.getByText('Abbrechen')).toBeTruthy()
    expect(screen.getByText('Ja, Event löschen')).toBeTruthy()
  })

  it('schliesst Dialog bei Abbrechen', async () => {
    const mockOnOpenChange = vi.fn()
    const { DeleteEventDialog } =
      await import('@/components/event/delete-event-dialog')
    render(
      <DeleteEventDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        eventId="event-1"
      />,
    )

    fireEvent.click(screen.getByText('Abbrechen'))
    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('zeigt Fehlermeldung an wenn deleteEvent fehlschlägt', async () => {
    mockDeleteEvent.mockResolvedValue({
      data: null,
      error: { error: 'Event nicht gefunden', code: 'NOT_FOUND' },
    })
    const { DeleteEventDialog } =
      await import('@/components/event/delete-event-dialog')
    render(
      <DeleteEventDialog
        open={true}
        onOpenChange={vi.fn()}
        eventId="event-1"
      />,
    )

    fireEvent.click(screen.getByText('Ja, Event löschen'))

    await vi.waitFor(() => {
      expect(screen.getByText('Event nicht gefunden')).toBeTruthy()
    })
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('ruft deleteEvent auf und navigiert bei Erfolg', async () => {
    mockDeleteEvent.mockResolvedValue({ data: null, error: null })
    const { DeleteEventDialog } =
      await import('@/components/event/delete-event-dialog')
    render(
      <DeleteEventDialog
        open={true}
        onOpenChange={vi.fn()}
        eventId="event-1"
      />,
    )

    fireEvent.click(screen.getByText('Ja, Event löschen'))

    // Wait for async operation
    await vi.waitFor(() => {
      expect(mockDeleteEvent).toHaveBeenCalledWith('event-1')
      expect(mockPush).toHaveBeenCalledWith('/insights')
    })
  })
})
