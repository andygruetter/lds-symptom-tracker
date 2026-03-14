import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { SymptomRanking } from '@/types/analytics'

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}))

vi.mock('@/lib/actions/insights-actions', () => ({
  loadSymptomRanking: vi.fn(async () => ({
    data: {
      symptoms: [],
      medications: [],
      timeRange: '30d',
      totalSymptomEvents: 0,
      totalMedicationEvents: 0,
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
  medications: [
    {
      name: 'Dafalgan 1g',
      totalCount: 4,
      monthlyCounts: [
        { year: 2026, month: 2, count: 2 },
        { year: 2026, month: 3, count: 2 },
      ],
      trend: 'stable',
    },
  ],
  timeRange: '3m',
  totalSymptomEvents: 12,
  totalMedicationEvents: 4,
}

const emptyRanking: SymptomRanking = {
  symptoms: [],
  medications: [],
  timeRange: '3m',
  totalSymptomEvents: 0,
  totalMedicationEvents: 0,
}

describe('SymptomRanking', () => {
  it('rendert Ranking mit Symptomen und Medikamenten', async () => {
    const { SymptomRanking } =
      await import('@/components/insights/symptom-ranking')
    render(<SymptomRanking initialRanking={fullRanking} />)

    expect(screen.getByText('Symptome')).toBeInTheDocument()
    expect(screen.getByText('Rückenschmerzen')).toBeInTheDocument()
    expect(screen.getByText('Medikamente')).toBeInTheDocument()
    expect(screen.getByText('Dafalgan 1g')).toBeInTheDocument()
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
