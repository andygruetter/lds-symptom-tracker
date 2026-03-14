import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockDeleteAllEvents = vi.fn()

vi.mock('@/lib/actions/insights-actions', () => ({
  deleteAllEvents: () => mockDeleteAllEvents(),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
})

describe('DeleteAllDataDialog', () => {
  it('rendert Dialog mit Warnung', async () => {
    const { DeleteAllDataDialog } =
      await import('@/components/event/delete-all-data-dialog')
    render(<DeleteAllDataDialog open={true} onOpenChange={vi.fn()} />)

    expect(screen.getByText('Alle Daten löschen?')).toBeTruthy()
    expect(screen.getByText(/Dein Account bleibt bestehen/)).toBeTruthy()
    expect(screen.getByText('Ja, alle Daten löschen')).toBeTruthy()
  })

  it('ruft deleteAllEvents auf bei Bestätigung', async () => {
    mockDeleteAllEvents.mockResolvedValue({
      data: { deletedCount: 3 },
      error: null,
    })
    const { DeleteAllDataDialog } =
      await import('@/components/event/delete-all-data-dialog')
    render(<DeleteAllDataDialog open={true} onOpenChange={vi.fn()} />)

    fireEvent.click(screen.getByText('Ja, alle Daten löschen'))

    await vi.waitFor(() => {
      expect(mockDeleteAllEvents).toHaveBeenCalled()
      expect(screen.getByText('3 Events gelöscht')).toBeTruthy()
    })
  })
})
