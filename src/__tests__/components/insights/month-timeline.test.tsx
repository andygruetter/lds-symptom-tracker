import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { MonthTimeline } from '@/types/analytics'

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}))

vi.mock('@/lib/actions/insights-actions', () => ({
  loadMonthTimeline: vi.fn().mockResolvedValue({
    data: null,
    error: { error: 'Mock', code: 'MOCK' },
  }),
  loadDayEvents: vi.fn().mockResolvedValue({
    data: [],
    error: null,
  }),
}))

function makeTimeline(
  year: number,
  month: number,
  overrides: Partial<{ symptomCount: number; medicationCount: number }> = {},
): MonthTimeline {
  const daysInMonth = new Date(year, month, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => ({
    date: `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`,
    symptomCount: 0,
    medicationCount: 0,
    totalCount: 0,
    maxIntensity: null,
  }))

  // Set events on day 14 if overrides provided
  if (overrides.symptomCount || overrides.medicationCount) {
    const day14 = days.find(
      (d) => d.date === `${year}-${String(month).padStart(2, '0')}-14`,
    )
    if (day14) {
      day14.symptomCount = overrides.symptomCount ?? 0
      day14.medicationCount = overrides.medicationCount ?? 0
      day14.totalCount =
        (overrides.symptomCount ?? 0) + (overrides.medicationCount ?? 0)
    }
  }

  return {
    year,
    month,
    days,
    totalEvents:
      (overrides.symptomCount ?? 0) + (overrides.medicationCount ?? 0),
  }
}

describe('MonthTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rendert Kalender-Grid mit Wochentag-Header', async () => {
    const { MonthTimeline } =
      await import('@/components/insights/month-timeline')
    render(<MonthTimeline initialTimeline={makeTimeline(2026, 3)} />)

    expect(screen.getByText('Mo')).toBeInTheDocument()
    expect(screen.getByText('Di')).toBeInTheDocument()
    expect(screen.getByText('Mi')).toBeInTheDocument()
    expect(screen.getByText('Do')).toBeInTheDocument()
    expect(screen.getByText('Fr')).toBeInTheDocument()
    expect(screen.getByText('Sa')).toBeInTheDocument()
    expect(screen.getByText('So')).toBeInTheDocument()
  })

  it('zeigt Monatsname korrekt', async () => {
    const { MonthTimeline } =
      await import('@/components/insights/month-timeline')
    render(<MonthTimeline initialTimeline={makeTimeline(2026, 3)} />)

    expect(screen.getByText(/März 2026/i)).toBeInTheDocument()
  })

  it('zeigt Event-Punkte für Symptome und Medikamente', async () => {
    const { MonthTimeline } =
      await import('@/components/insights/month-timeline')
    const timeline = makeTimeline(2026, 3, {
      symptomCount: 2,
      medicationCount: 1,
    })
    render(<MonthTimeline initialTimeline={timeline} />)

    // Symptom-Punkt und Medikament-Punkt vorhanden
    expect(screen.getAllByTestId('symptom-dot').length).toBeGreaterThan(0)
    expect(screen.getAllByTestId('medication-dot').length).toBeGreaterThan(0)
  })

  it('markiert heutigen Tag mit aria-current="date"', async () => {
    const { MonthTimeline } =
      await import('@/components/insights/month-timeline')
    const today = new Date()
    const timeline = makeTimeline(today.getFullYear(), today.getMonth() + 1)
    render(<MonthTimeline initialTimeline={timeline} />)

    const todayCell = screen
      .getAllByRole('button')
      .find((btn) => btn.getAttribute('aria-current') === 'date')
    expect(todayCell).toBeDefined()
  })

  it('ruft loadMonthTimeline bei Navigation zum vorherigen Monat auf', async () => {
    const { loadMonthTimeline } = await import('@/lib/actions/insights-actions')
    const mockLoad = vi.mocked(loadMonthTimeline)

    const { MonthTimeline } =
      await import('@/components/insights/month-timeline')
    render(<MonthTimeline initialTimeline={makeTimeline(2026, 3)} />)

    fireEvent.click(screen.getByRole('button', { name: /vorheriger monat/i }))

    await waitFor(() => {
      expect(mockLoad).toHaveBeenCalledWith(2026, 2)
    })
  })

  it('deaktiviert Nächster-Monat-Button im aktuellen Monat', async () => {
    const today = new Date()
    const { MonthTimeline } =
      await import('@/components/insights/month-timeline')
    render(
      <MonthTimeline
        initialTimeline={makeTimeline(
          today.getFullYear(),
          today.getMonth() + 1,
        )}
      />,
    )

    const nextBtn = screen.getByRole('button', { name: /nächster monat/i })
    expect(nextBtn).toBeDisabled()
  })

  it('öffnet Drill-Down bei Tap auf Tag mit Events', async () => {
    const { loadDayEvents } = await import('@/lib/actions/insights-actions')
    vi.mocked(loadDayEvents).mockResolvedValue({ data: [], error: null })

    const { MonthTimeline } =
      await import('@/components/insights/month-timeline')
    const timeline = makeTimeline(2026, 3, {
      symptomCount: 1,
      medicationCount: 0,
    })
    render(<MonthTimeline initialTimeline={timeline} />)

    // Click on the day 14 cell (which has events)
    const day14Btn = screen
      .getAllByRole('button')
      .find((btn) => btn.getAttribute('aria-label')?.includes('14. März 2026'))
    expect(day14Btn).toBeDefined()
    fireEvent.click(day14Btn!)

    await waitFor(() => {
      expect(screen.getByText(/14. März 2026/i)).toBeInTheDocument()
    })
  })
})
