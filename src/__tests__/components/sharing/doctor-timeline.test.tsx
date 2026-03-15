import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { FeedEvent } from '@/types/analytics'

const makeEvent = (overrides: Partial<FeedEvent> = {}): FeedEvent => {
  const base: FeedEvent = {
    id: 'evt-1',
    eventType: 'symptom',
    occurredAt: '2026-03-14T09:30:00Z',
    createdAt: '2026-03-14T09:30:00Z',
    endedAt: null,
    rawInput: 'Kopfschmerzen',
    symptomName: 'Kopfschmerzen',
    bodyRegion: 'Kopf',
    side: null,
    symptomType: null,
    intensity: 5,
    medication: null,
    dosage: null,
    photoCount: 0,
    hasAudio: false,
    symptoms: [
      {
        symptomName: 'Kopfschmerzen',
        bodyRegion: 'Kopf',
        side: null,
        symptomType: null,
        intensity: 5,
      },
    ],
    ...overrides,
  }
  // Recompute symptoms when overrides change symptom fields, unless explicitly provided
  if (!('symptoms' in overrides)) {
    const et = base.eventType
    if (et === 'medication') {
      base.symptoms = []
    } else if (base.symptomName) {
      base.symptoms = [
        {
          symptomName: base.symptomName,
          bodyRegion: base.bodyRegion,
          side: base.side,
          symptomType: base.symptomType,
          intensity: base.intensity,
        },
      ]
    } else {
      base.symptoms = []
    }
  }
  return base
}

describe('DoctorTimeline', () => {
  it('rendert Events nach Tag gruppiert', async () => {
    const { DoctorTimeline } =
      await import('@/components/sharing/doctor-timeline')
    const events: FeedEvent[] = [
      makeEvent({
        id: 'e1',
        occurredAt: '2026-03-14T10:00:00Z',
        symptomName: 'Kopfschmerzen',
      }),
      makeEvent({
        id: 'e2',
        occurredAt: '2026-03-14T08:00:00Z',
        symptomName: 'Schwindel',
      }),
      makeEvent({
        id: 'e3',
        occurredAt: '2026-03-13T15:00:00Z',
        symptomName: 'Rückenschmerzen',
      }),
    ]

    render(
      <DoctorTimeline
        events={events}
        dateFrom="2026-03-01"
        dateTo="2026-03-15"
      />,
    )

    expect(screen.getByText(/Kopfschmerzen/)).toBeInTheDocument()
    expect(screen.getByText(/Schwindel/)).toBeInTheDocument()
    expect(screen.getByText(/Rückenschmerzen/)).toBeInTheDocument()
  })

  it('zeigt Tages-Header mit formatiertem Datum', async () => {
    const { DoctorTimeline } =
      await import('@/components/sharing/doctor-timeline')
    const events: FeedEvent[] = [
      makeEvent({
        id: 'e1',
        occurredAt: '2026-03-14T10:00:00Z',
      }),
    ]

    render(
      <DoctorTimeline
        events={events}
        dateFrom="2026-03-01"
        dateTo="2026-03-15"
      />,
    )

    // Should show a formatted date like "14. März 2026" (de-CH format)
    expect(screen.getByText(/14\. März 2026/)).toBeInTheDocument()
  })

  it('zeigt Empty-State wenn keine Events', async () => {
    const { DoctorTimeline } =
      await import('@/components/sharing/doctor-timeline')

    render(
      <DoctorTimeline events={[]} dateFrom="2026-03-01" dateTo="2026-03-15" />,
    )

    expect(
      screen.getByText(/Keine erfassten Symptome oder Medikamente/),
    ).toBeInTheDocument()
  })

  it('zeigt formatierten Zeitraum im Empty-State', async () => {
    const { DoctorTimeline } =
      await import('@/components/sharing/doctor-timeline')

    render(
      <DoctorTimeline events={[]} dateFrom="2026-03-01" dateTo="2026-03-15" />,
    )

    const el = screen.getByText(/Keine erfassten Symptome oder Medikamente/)
    expect(el.textContent).toMatch(/März 2026/)
    expect(el.textContent).toContain('–')
  })

  it('zeigt Monats-Separator bei Monatswechsel', async () => {
    const { DoctorTimeline } =
      await import('@/components/sharing/doctor-timeline')
    const events: FeedEvent[] = [
      makeEvent({
        id: 'e1',
        occurredAt: '2026-03-14T10:00:00Z',
        symptomName: 'Kopfschmerzen',
      }),
      makeEvent({
        id: 'e2',
        occurredAt: '2026-02-28T09:00:00Z',
        symptomName: 'Schwindel',
      }),
    ]

    render(
      <DoctorTimeline
        events={events}
        dateFrom="2026-02-01"
        dateTo="2026-03-15"
      />,
    )

    // Month separator is uppercase "FEBRUAR 2026", day header is "28. Februar 2026"
    // Both contain "Februar 2026" — check that at least 2 elements match
    const matches = screen.getAllByText(/Februar 2026/i)
    expect(matches.length).toBeGreaterThanOrEqual(2)
  })

  it('rendert DoctorEventCard für jeden Event', async () => {
    const { DoctorTimeline } =
      await import('@/components/sharing/doctor-timeline')
    const events: FeedEvent[] = [
      makeEvent({ id: 'e1', symptomName: 'Kopfschmerzen' }),
      makeEvent({
        id: 'e2',
        eventType: 'medication',
        medication: 'Ibuprofen',
        symptomName: null,
      }),
    ]

    render(
      <DoctorTimeline
        events={events}
        dateFrom="2026-03-01"
        dateTo="2026-03-15"
      />,
    )

    // Both events should be rendered
    expect(screen.getByText(/Kopfschmerzen/)).toBeInTheDocument()
    expect(screen.getByText(/Ibuprofen/)).toBeInTheDocument()
    // Should have badges
    expect(screen.getByText('Symptom')).toBeInTheDocument()
    expect(screen.getByText('Medikament')).toBeInTheDocument()
  })
})
