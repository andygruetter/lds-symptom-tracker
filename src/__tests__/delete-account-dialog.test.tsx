import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const mockDeleteAccount = vi.fn()

vi.mock('@/lib/actions/account-actions', () => ({
  deleteAccount: (...args: unknown[]) => mockDeleteAccount(...args),
}))

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/more'),
}))

describe('DeleteAccountDialog', () => {
  it('zeigt Dialog-Titel und Warntext', async () => {
    const DeleteAccountDialog = (
      await import('@/components/account/delete-account-dialog')
    ).DeleteAccountDialog
    render(<DeleteAccountDialog open={true} onOpenChange={vi.fn()} />)

    expect(screen.getByText('Account löschen?')).toBeInTheDocument()
    expect(screen.getByText(/30 Tagen unwiderruflich/)).toBeInTheDocument()
  })

  it('zeigt Abbrechen und Löschen Buttons', async () => {
    const DeleteAccountDialog = (
      await import('@/components/account/delete-account-dialog')
    ).DeleteAccountDialog
    render(<DeleteAccountDialog open={true} onOpenChange={vi.fn()} />)

    expect(screen.getByText('Abbrechen')).toBeInTheDocument()
    expect(screen.getByText('Ja, Account löschen')).toBeInTheDocument()
  })

  it('ruft deleteAccount bei Klick auf Löschen-Button auf', async () => {
    mockDeleteAccount.mockResolvedValue({ data: null, error: null })

    const DeleteAccountDialog = (
      await import('@/components/account/delete-account-dialog')
    ).DeleteAccountDialog
    render(<DeleteAccountDialog open={true} onOpenChange={vi.fn()} />)

    const deleteButton = screen.getByText('Ja, Account löschen')
    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(mockDeleteAccount).toHaveBeenCalled()
    })
  })

  it('zeigt Loading-State während Löschung', async () => {
    mockDeleteAccount.mockImplementation(
      () => new Promise(() => {}), // Never resolves
    )

    const DeleteAccountDialog = (
      await import('@/components/account/delete-account-dialog')
    ).DeleteAccountDialog
    render(<DeleteAccountDialog open={true} onOpenChange={vi.fn()} />)

    const deleteButton = screen.getByText('Ja, Account löschen')
    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(screen.getByText('Account wird gelöscht...')).toBeInTheDocument()
    })
  })

  it('zeigt Fehlermeldung bei Error', async () => {
    mockDeleteAccount.mockResolvedValue({
      data: null,
      error: { error: 'Löschung fehlgeschlagen', code: 'DELETE_FAILED' },
    })

    const DeleteAccountDialog = (
      await import('@/components/account/delete-account-dialog')
    ).DeleteAccountDialog
    render(<DeleteAccountDialog open={true} onOpenChange={vi.fn()} />)

    const deleteButton = screen.getByText('Ja, Account löschen')
    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(screen.getByText('Löschung fehlgeschlagen')).toBeInTheDocument()
    })
  })

  it('ruft onOpenChange(false) bei Abbrechen auf', async () => {
    const mockOnOpenChange = vi.fn()
    const DeleteAccountDialog = (
      await import('@/components/account/delete-account-dialog')
    ).DeleteAccountDialog
    render(<DeleteAccountDialog open={true} onOpenChange={mockOnOpenChange} />)

    const cancelButton = screen.getByText('Abbrechen')
    fireEvent.click(cancelButton)

    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('rendert nichts wenn open=false', async () => {
    const DeleteAccountDialog = (
      await import('@/components/account/delete-account-dialog')
    ).DeleteAccountDialog
    render(<DeleteAccountDialog open={false} onOpenChange={vi.fn()} />)

    expect(screen.queryByText('Account löschen?')).not.toBeInTheDocument()
  })
})
