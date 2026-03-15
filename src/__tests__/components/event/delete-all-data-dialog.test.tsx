import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockDeleteAllEvents = vi.fn()
const mockToastSuccess = vi.fn()

vi.mock('@/lib/actions/insights-actions', () => ({
  deleteAllEvents: () => mockDeleteAllEvents(),
}))

vi.mock('sonner', () => ({
  toast: { success: (...args: unknown[]) => mockToastSuccess(...args) },
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

  it('zeigt Fehlermeldung an wenn deleteAllEvents fehlschlägt', async () => {
    mockDeleteAllEvents.mockResolvedValue({
      data: null,
      error: { error: 'Löschung fehlgeschlagen', code: 'DELETE_FAILED' },
    })
    const { DeleteAllDataDialog } =
      await import('@/components/event/delete-all-data-dialog')
    render(<DeleteAllDataDialog open={true} onOpenChange={vi.fn()} />)

    fireEvent.click(screen.getByText('Ja, alle Daten löschen'))

    await vi.waitFor(() => {
      expect(screen.getByText('Löschung fehlgeschlagen')).toBeTruthy()
    })
  })

  it('ruft deleteAllEvents auf und zeigt Toast bei Erfolg', async () => {
    mockDeleteAllEvents.mockResolvedValue({
      data: { deletedCount: 3 },
      error: null,
    })
    const mockOnOpenChange = vi.fn()
    const { DeleteAllDataDialog } =
      await import('@/components/event/delete-all-data-dialog')
    render(<DeleteAllDataDialog open={true} onOpenChange={mockOnOpenChange} />)

    fireEvent.click(screen.getByText('Ja, alle Daten löschen'))

    await vi.waitFor(() => {
      expect(mockDeleteAllEvents).toHaveBeenCalled()
      expect(mockToastSuccess).toHaveBeenCalledWith('3 Events gelöscht')
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })
  })
})
