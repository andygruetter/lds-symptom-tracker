import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { SymptomRankingEntry } from '@/types/analytics'

const symptomEntry: SymptomRankingEntry = {
  name: 'Rückenschmerzen',
  totalCount: 12,
  monthlyCounts: [
    { year: 2026, month: 1, count: 4 },
    { year: 2026, month: 2, count: 8 },
  ],
  trend: 'increasing',
  avgIntensity: 6.5,
}

const medicationEntry: SymptomRankingEntry = {
  name: 'Dafalgan 1g',
  totalCount: 6,
  monthlyCounts: [
    { year: 2026, month: 1, count: 3 },
    { year: 2026, month: 2, count: 3 },
  ],
  trend: 'stable',
  avgIntensity: null,
}

describe('DoctorRankingCard', () => {
  it('rendert Symptom-Variante mit Terracotta-Akzent (#C06A3C)', async () => {
    const { DoctorRankingCard } =
      await import('@/components/sharing/doctor-ranking-card')
    const { container } = render(
      <DoctorRankingCard entry={symptomEntry} variant="symptom" />,
    )

    expect(screen.getByText('Rückenschmerzen')).toBeInTheDocument()
    expect(screen.getByText('12x')).toBeInTheDocument()

    // Terracotta Border-Left (Browser konvertiert #C06A3C → rgb(192, 106, 60))
    const card = container.firstChild as HTMLElement
    expect(card.style.borderLeft).toContain('rgb(192, 106, 60)')
  })

  it('rendert Medikament-Variante mit Stahlblau-Akzent (#4A7FA5)', async () => {
    const { DoctorRankingCard } =
      await import('@/components/sharing/doctor-ranking-card')
    const { container } = render(
      <DoctorRankingCard entry={medicationEntry} variant="symptom" />,
    )

    expect(screen.getByText('Dafalgan 1g')).toBeInTheDocument()
    expect(screen.getByText('6x')).toBeInTheDocument()

    // Terracotta Border-Left (Browser konvertiert #C06A3C → rgb(192, 106, 60))
    const card = container.firstChild as HTMLElement
    expect(card.style.borderLeft).toContain('rgb(192, 106, 60)')
  })

  it('zeigt Trend-Pfeil ↑ bei steigendem Trend (Terracotta)', async () => {
    const { DoctorRankingCard } =
      await import('@/components/sharing/doctor-ranking-card')
    render(<DoctorRankingCard entry={symptomEntry} variant="symptom" />)

    const arrow = screen.getByText('↑')
    expect(arrow).toBeInTheDocument()
    expect(arrow.className).toContain('text-[#C06A3C]')
  })

  it('zeigt Trend-Pfeil → bei stabilem Trend (Grau)', async () => {
    const { DoctorRankingCard } =
      await import('@/components/sharing/doctor-ranking-card')
    render(<DoctorRankingCard entry={medicationEntry} variant="symptom" />)

    const arrow = screen.getByText('→')
    expect(arrow).toBeInTheDocument()
    expect(arrow.className).toContain('text-[#5A6270]')
  })

  it('zeigt Trend-Pfeil ↓ bei sinkendem Trend (Teal)', async () => {
    const { DoctorRankingCard } =
      await import('@/components/sharing/doctor-ranking-card')
    const entry: SymptomRankingEntry = {
      ...symptomEntry,
      trend: 'decreasing',
    }
    render(<DoctorRankingCard entry={entry} variant="symptom" />)

    const arrow = screen.getByText('↓')
    expect(arrow).toBeInTheDocument()
    expect(arrow.className).toContain('text-[#2A7A65]')
  })

  it('zeigt Sparkline SVG bei >= 2 Datenpunkten', async () => {
    const { DoctorRankingCard } =
      await import('@/components/sharing/doctor-ranking-card')
    const { container } = render(
      <DoctorRankingCard entry={symptomEntry} variant="symptom" />,
    )

    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('zeigt keine Sparkline bei < 2 Datenpunkten', async () => {
    const { DoctorRankingCard } =
      await import('@/components/sharing/doctor-ranking-card')
    const entry: SymptomRankingEntry = {
      ...symptomEntry,
      monthlyCounts: [{ year: 2026, month: 2, count: 5 }],
      avgIntensity: null,
    }
    const { container } = render(
      <DoctorRankingCard entry={entry} variant="symptom" />,
    )

    const svg = container.querySelector('svg')
    expect(svg).not.toBeInTheDocument()
  })

  it('zeigt durchschnittliche Intensität bei Symptom-Variante', async () => {
    const { DoctorRankingCard } =
      await import('@/components/sharing/doctor-ranking-card')
    render(<DoctorRankingCard entry={symptomEntry} variant="symptom" />)

    expect(screen.getByText('∅ 6.5/10')).toBeInTheDocument()
  })

  it('hat min-height 44px für Touch-Target', async () => {
    const { DoctorRankingCard } =
      await import('@/components/sharing/doctor-ranking-card')
    const { container } = render(
      <DoctorRankingCard entry={symptomEntry} variant="symptom" />,
    )

    const card = container.firstChild as HTMLElement
    expect(card.style.minHeight).toBe('44px')
  })

  it('verwendet Arzt-Theme: border statt shadow-sm', async () => {
    const { DoctorRankingCard } =
      await import('@/components/sharing/doctor-ranking-card')
    const { container } = render(
      <DoctorRankingCard entry={symptomEntry} variant="symptom" />,
    )

    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('border')
    expect(card.className).toContain('rounded-lg')
    expect(card.className).not.toContain('shadow-sm')
  })
})
