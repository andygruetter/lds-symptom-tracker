import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { SymptomRanking } from '@/types/analytics'

function makeRanking(overrides: Partial<SymptomRanking> = {}): SymptomRanking {
  return {
    symptoms: [],
    medications: [],
    timeRange: 'all',
    totalSymptomEvents: 0,
    totalMedicationEvents: 0,
    ...overrides,
  }
}

describe('DoctorRanking', () => {
  it('zeigt Empty State wenn keine Symptome und keine Medikamente vorhanden', async () => {
    const { DoctorRanking } =
      await import('@/components/sharing/doctor-ranking')
    render(<DoctorRanking ranking={makeRanking()} />)

    expect(
      screen.getByText('Keine Symptome in diesem Zeitraum erfasst.'),
    ).toBeInTheDocument()
  })

  it('rendert Symptom-Einträge korrekt', async () => {
    const { DoctorRanking } =
      await import('@/components/sharing/doctor-ranking')
    const ranking = makeRanking({
      symptoms: [
        {
          name: 'Kopfschmerzen',
          totalCount: 8,
          monthlyCounts: [{ year: 2026, month: 2, count: 8 }],
          trend: 'stable',
          avgIntensity: 5.5,
        },
        {
          name: 'Rückenschmerzen',
          totalCount: 12,
          monthlyCounts: [{ year: 2026, month: 2, count: 12 }],
          trend: 'increasing',
          avgIntensity: 6.5,
        },
      ],
      totalSymptomEvents: 20,
    })

    render(<DoctorRanking ranking={ranking} />)

    expect(screen.getAllByText('Kopfschmerzen')).toHaveLength(
      expect.any(Number) || 1,
    )
    expect(screen.getAllByText('Kopfschmerzen').length).toBeGreaterThanOrEqual(
      1,
    )
    expect(
      screen.getAllByText('Rückenschmerzen').length,
    ).toBeGreaterThanOrEqual(1)
  })

  it('rendert Medikamente-Sektion nur wenn Medikamente vorhanden', async () => {
    const { DoctorRanking } =
      await import('@/components/sharing/doctor-ranking')

    // Ohne Medikamente: Sektion nicht sichtbar
    const rankingOhne = makeRanking({
      symptoms: [
        {
          name: 'Kopfschmerzen',
          totalCount: 5,
          monthlyCounts: [],
          trend: 'stable',
          avgIntensity: null,
        },
      ],
      totalSymptomEvents: 5,
    })
    const { rerender } = render(<DoctorRanking ranking={rankingOhne} />)
    expect(screen.queryByText('Medikamente')).not.toBeInTheDocument()

    // Mit Medikamenten: Sektion sichtbar
    const rankingMit = makeRanking({
      symptoms: [
        {
          name: 'Kopfschmerzen',
          totalCount: 5,
          monthlyCounts: [],
          trend: 'stable',
          avgIntensity: null,
        },
      ],
      medications: [
        {
          name: 'Ibuprofen',
          totalCount: 3,
          monthlyCounts: [],
          trend: 'stable',
        },
      ],
      totalSymptomEvents: 5,
      totalMedicationEvents: 3,
    })
    rerender(<DoctorRanking ranking={rankingMit} />)
    expect(screen.getByText('Medikamente')).toBeInTheDocument()
    expect(screen.getByText('Ibuprofen')).toBeInTheDocument()
  })

  it('verwendet Arzt-Theme: border und rounded-lg statt shadow-sm', async () => {
    const { DoctorRanking } =
      await import('@/components/sharing/doctor-ranking')
    const { container } = render(
      <DoctorRanking
        ranking={makeRanking({
          symptoms: [
            {
              name: 'Test',
              totalCount: 1,
              monthlyCounts: [],
              trend: 'stable',
              avgIntensity: null,
            },
          ],
          totalSymptomEvents: 1,
        })}
      />,
    )

    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('rounded-lg')
    expect(card.className).toContain('border')
    expect(card.className).not.toContain('shadow-sm')
  })

  it('enthält responsive Klassen: xl:hidden für Karten und hidden xl:table für Tabelle', async () => {
    const { DoctorRanking } =
      await import('@/components/sharing/doctor-ranking')
    const { container } = render(
      <DoctorRanking
        ranking={makeRanking({
          symptoms: [
            {
              name: 'Kopfschmerzen',
              totalCount: 3,
              monthlyCounts: [],
              trend: 'stable',
              avgIntensity: null,
            },
          ],
          totalSymptomEvents: 3,
        })}
      />,
    )

    // Mobile Karten-Container
    const mobileContainer = container.querySelector('.xl\\:hidden')
    expect(mobileContainer).toBeInTheDocument()

    // Desktop Tabelle
    const desktopTable = container.querySelector('.hidden.xl\\:table')
    expect(desktopTable).toBeInTheDocument()
    expect(desktopTable?.tagName).toBe('TABLE')
  })

  it('zeigt KEINEN Platzhalter-Text "Kommt in einer zukünftigen Version"', async () => {
    const { DoctorRanking } =
      await import('@/components/sharing/doctor-ranking')
    render(
      <DoctorRanking
        ranking={makeRanking({
          symptoms: [
            {
              name: 'Kopfschmerzen',
              totalCount: 1,
              monthlyCounts: [],
              trend: 'stable',
              avgIntensity: null,
            },
          ],
          totalSymptomEvents: 1,
        })}
      />,
    )

    expect(
      screen.queryByText('Kommt in einer zukünftigen Version.'),
    ).not.toBeInTheDocument()
  })
})
