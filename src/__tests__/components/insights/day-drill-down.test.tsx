import { render, screen, waitFor } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { FeedEvent } from '@/types/analytics'

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}))

vi.mock('@/lib/actions/insights-actions', () => ({
  loadDayEvents: vi.fn(),
}))

const makeEvent = (id: string): FeedEvent => ({
  id,
  eventType: 'symptom',
  occurredAt: '2026-03-14T09:30:00Z',
  createdAt: '2026-03-14T09:30:00Z',
  endedAt: null,
  rawInput: `Event ${id}`,
  symptomName: `Symptom ${id}`,
  bodyRegion: null,
  side: null,
  symptomType: null,
  intensity: null,
  medication: null,
  dosage: null,
  photoCount: 0,
  hasAudio: false,
})

describe('DayDrillDown', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('zeigt Events des Tages an', async () => {
    const { loadDayEvents } = await import('@/lib/actions/insights-actions')
    vi.mocked(loadDayEvents).mockResolvedValue({
      data: [makeEvent('ev-1'), makeEvent('ev-2')],
      error: null,
    })

    const { DayDrillDown } =
      await import('@/components/insights/day-drill-down')
    render(<DayDrillDown date="2026-03-14" onClose={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText(/Symptom ev-1/)).toBeInTheDocument()
      expect(screen.getByText(/Symptom ev-2/)).toBeInTheDocument()
    })
  })

  it('zeigt Empty-State bei leerem Tag', async () => {
    const { loadDayEvents } = await import('@/lib/actions/insights-actions')
    vi.mocked(loadDayEvents).mockResolvedValue({ data: [], error: null })

    const { DayDrillDown } =
      await import('@/components/insights/day-drill-down')
    render(<DayDrillDown date="2026-03-14" onClose={vi.fn()} />)

    await waitFor(() => {
      expect(
        screen.getByText(/Keine Einträge an diesem Tag/),
      ).toBeInTheDocument()
    })
  })

  it('ruft onClose bei Klick auf Schliessen-Button auf', async () => {
    const { loadDayEvents } = await import('@/lib/actions/insights-actions')
    vi.mocked(loadDayEvents).mockResolvedValue({ data: [], error: null })

    const onClose = vi.fn()
    const { DayDrillDown } =
      await import('@/components/insights/day-drill-down')
    render(<DayDrillDown date="2026-03-14" onClose={onClose} />)

    await waitFor(() => {
      expect(
        screen.getByText(/Keine Einträge an diesem Tag/),
      ).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /schliessen/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
