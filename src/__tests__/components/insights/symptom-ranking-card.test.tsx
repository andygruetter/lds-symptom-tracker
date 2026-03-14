import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type {
  MedicationRankingEntry,
  SymptomRankingEntry,
} from '@/types/analytics'

const symptomEntry: SymptomRankingEntry = {
  name: 'Rückenschmerzen',
  totalCount: 12,
  monthlyCounts: [
    { year: 2026, month: 1, count: 3 },
    { year: 2026, month: 2, count: 4 },
    { year: 2026, month: 3, count: 5 },
  ],
  trend: 'increasing',
  avgIntensity: 6.5,
}

const medicationEntry: MedicationRankingEntry = {
  name: 'Dafalgan 1g',
  totalCount: 6,
  monthlyCounts: [
    { year: 2026, month: 1, count: 2 },
    { year: 2026, month: 2, count: 2 },
    { year: 2026, month: 3, count: 2 },
  ],
  trend: 'stable',
}

describe('SymptomRankingCard', () => {
  it('zeigt Symptom-Karte mit Name, Count und Trend-Pfeil', async () => {
    const { SymptomRankingCard } =
      await import('@/components/insights/symptom-ranking-card')
    render(
      <SymptomRankingCard
        entry={symptomEntry}
        variant="symptom"
        isExpanded={false}
        onToggle={vi.fn()}
      />,
    )

    expect(screen.getByText('Rückenschmerzen')).toBeInTheDocument()
    expect(screen.getByText('12x')).toBeInTheDocument()
    expect(screen.getByText('↑')).toBeInTheDocument()
  })

  it('zeigt Medikament-Karte mit Stahlblau-Border', async () => {
    const { SymptomRankingCard } =
      await import('@/components/insights/symptom-ranking-card')
    const { container } = render(
      <SymptomRankingCard
        entry={medicationEntry}
        variant="medication"
        isExpanded={false}
        onToggle={vi.fn()}
      />,
    )

    expect(screen.getByText('Dafalgan 1g')).toBeInTheDocument()
    expect(screen.getByText('6x')).toBeInTheDocument()
    // Der innere div hat den Stahlblau-Border als inline style (Browser konvertiert Hex → rgb)
    const card = container.querySelector('.rounded-lg')
    expect(card).toBeTruthy()
    const borderStyle = (card as HTMLElement).style.borderLeft
    expect(borderStyle).toMatch(/rgb\(74,\s*127,\s*165\)/) // #4A7FA5
  })

  it('zeigt Trend-Pfeil ↑ in Terracotta für increasing', async () => {
    const { SymptomRankingCard } =
      await import('@/components/insights/symptom-ranking-card')
    render(
      <SymptomRankingCard
        entry={{ ...symptomEntry, trend: 'increasing' }}
        variant="symptom"
        isExpanded={false}
        onToggle={vi.fn()}
      />,
    )
    const arrow = screen.getByText('↑')
    expect(arrow.className).toContain('C06A3C')
  })

  it('zeigt Trend-Pfeil → in Grau für stable', async () => {
    const { SymptomRankingCard } =
      await import('@/components/insights/symptom-ranking-card')
    render(
      <SymptomRankingCard
        entry={{ ...symptomEntry, trend: 'stable' }}
        variant="symptom"
        isExpanded={false}
        onToggle={vi.fn()}
      />,
    )
    const arrow = screen.getByText('→')
    expect(arrow.className).toContain('5A6270')
  })

  it('zeigt Trend-Pfeil ↓ in Teal für decreasing', async () => {
    const { SymptomRankingCard } =
      await import('@/components/insights/symptom-ranking-card')
    render(
      <SymptomRankingCard
        entry={{ ...symptomEntry, trend: 'decreasing' }}
        variant="symptom"
        isExpanded={false}
        onToggle={vi.fn()}
      />,
    )
    const arrow = screen.getByText('↓')
    expect(arrow.className).toContain('2A7A65')
  })

  it('zeigt Sparkline wenn 2+ Datenpunkte vorhanden', async () => {
    const { SymptomRankingCard } =
      await import('@/components/insights/symptom-ranking-card')
    const { container } = render(
      <SymptomRankingCard
        entry={symptomEntry}
        variant="symptom"
        isExpanded={false}
        onToggle={vi.fn()}
      />,
    )
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('zeigt durchschnittliche Intensität für Symptome', async () => {
    const { SymptomRankingCard } =
      await import('@/components/insights/symptom-ranking-card')
    render(
      <SymptomRankingCard
        entry={symptomEntry}
        variant="symptom"
        isExpanded={false}
        onToggle={vi.fn()}
      />,
    )
    expect(screen.getByText('∅ 6.5/10')).toBeInTheDocument()
  })
})
