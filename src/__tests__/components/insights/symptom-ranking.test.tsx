import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { SymptomRanking } from '@/types/analytics'

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}))

vi.mock('@/lib/actions/insights-actions', () => ({
  loadSymptomRanking: vi.fn(async () => ({
    data: {
      symptoms: [],
      timeRange: '30d',
      totalSymptomEvents: 0,
    },
    error: null,
  })),
  loadSymptomEvents: vi.fn(async () => ({ data: [], error: null })),
}))

const fullRanking: SymptomRanking = {
  symptoms: [
    {
      name: 'Rückenschmerzen',
      totalCount: 12,
      monthlyCounts: [
        { year: 2026, month: 1, count: 3 },
        { year: 2026, month: 2, count: 4 },
        { year: 2026, month: 3, count: 5 },
      ],
      trend: 'increasing',
      avgIntensity: 6.5,
    },
  ],
  timeRange: '3m',
  totalSymptomEvents: 12,
}

const emptyRanking: SymptomRanking = {
  symptoms: [],
  timeRange: '3m',
  totalSymptomEvents: 0,
}

describe('SymptomRanking', () => {
  it('rendert Ranking mit Symptomen', async () => {
    const { SymptomRanking } =
      await import('@/components/insights/symptom-ranking')
    render(<SymptomRanking initialRanking={fullRanking} />)

    expect(screen.getByText('Symptome')).toBeInTheDocument()
    expect(screen.getByText('Rückenschmerzen')).toBeInTheDocument()
  })

  it('zeigt Zeitraum-Filter Buttons', async () => {
    const { SymptomRanking } =
      await import('@/components/insights/symptom-ranking')
    render(<SymptomRanking initialRanking={fullRanking} />)

    expect(screen.getByText('30 T')).toBeInTheDocument()
    expect(screen.getByText('3 M')).toBeInTheDocument()
    expect(screen.getByText('6 M')).toBeInTheDocument()
    expect(screen.getByText('Alle')).toBeInTheDocument()
  })

  it('zeigt Leertext bei keinen Symptomen im Zeitraum', async () => {
    const { SymptomRanking } =
      await import('@/components/insights/symptom-ranking')
    render(<SymptomRanking initialRanking={emptyRanking} />)

    expect(
      screen.getByText('Keine Symptome im gewählten Zeitraum.'),
    ).toBeInTheDocument()
  })

  it('versteckt Medikamente-Sektion wenn keine Medikamente vorhanden', async () => {
    const { SymptomRanking } =
      await import('@/components/insights/symptom-ranking')
    render(<SymptomRanking initialRanking={emptyRanking} />)

    expect(screen.queryByText('Medikamente')).toBeNull()
  })
})
