import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { FeedEvent } from '@/types/analytics'

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}))

const symptomEvent: FeedEvent = {
  id: 'event-1',
  eventType: 'symptom',
  occurredAt: '2026-03-14T09:30:00Z',
  createdAt: '2026-03-14T09:30:00Z',
  endedAt: null,
  rawInput: 'Rückenschmerzen',
  photoCount: 2,
  hasAudio: false,
  symptoms: [
    {
      displayName: 'Rückenschmerzen',
      fields: {
        symptom_name: 'Rückenschmerzen',
        body_region: 'Rücken',
        side: 'links',
        symptom_type: 'stechend',
        intensity: '7',
      },
    },
  ],
}

const medicationEvent: FeedEvent = {
  id: 'event-2',
  eventType: 'symptom',
  occurredAt: '2026-03-13T20:15:00Z',
  createdAt: '2026-03-13T20:15:00Z',
  endedAt: null,
  rawInput: 'Dafalgan 1g',
  photoCount: 0,
  hasAudio: true,
  symptoms: [
    {
      displayName: 'Dafalgan',
      fields: {
        medication: 'Dafalgan',
        dosage: '1g',
      },
    },
  ],
}

describe('FeedEventCard', () => {
  it('zeigt Symptom-Karte korrekt', async () => {
    const { FeedEventCard } =
      await import('@/components/insights/feed-event-card')
    render(<FeedEventCard event={symptomEvent} />)

    expect(screen.getByText(/Rückenschmerzen/)).toBeInTheDocument()
    expect(screen.getByText(/Rücken.*links/)).toBeInTheDocument()
  })

  it('zeigt Medikament-Karte korrekt', async () => {
    const { FeedEventCard } =
      await import('@/components/insights/feed-event-card')
    render(<FeedEventCard event={medicationEvent} />)

    expect(screen.getAllByText(/Dafalgan/).length).toBeGreaterThan(0)
    expect(screen.getByText(/1g/)).toBeInTheDocument()
  })

  it('zeigt Typ-Badge Symptom', async () => {
    const { FeedEventCard } =
      await import('@/components/insights/feed-event-card')
    render(<FeedEventCard event={symptomEvent} />)

    expect(screen.getByText('Symptom')).toBeInTheDocument()
  })

  it('zeigt Typ-Badge Symptom auch für Medikament-Events', async () => {
    const { FeedEventCard } =
      await import('@/components/insights/feed-event-card')
    render(<FeedEventCard event={medicationEvent} />)

    expect(screen.getByText('Symptom')).toBeInTheDocument()
  })

  it('zeigt Chevron-Right als Tap-Affordance', async () => {
    const { FeedEventCard } =
      await import('@/components/insights/feed-event-card')
    const { container } = render(<FeedEventCard event={symptomEvent} />)

    expect(
      container.querySelector('[data-testid="chevron-right"]'),
    ).toBeTruthy()
  })

  it('zeigt Foto-Indikator wenn Fotos vorhanden', async () => {
    const { FeedEventCard } =
      await import('@/components/insights/feed-event-card')
    render(<FeedEventCard event={symptomEvent} />)

    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('zeigt Audio-Indikator wenn Audio vorhanden', async () => {
    const { FeedEventCard } =
      await import('@/components/insights/feed-event-card')
    render(<FeedEventCard event={medicationEvent} />)

    expect(screen.getByTestId('audio-indicator')).toBeInTheDocument()
  })

  it('formatiert Uhrzeit auf Deutsch', async () => {
    const { FeedEventCard } =
      await import('@/components/insights/feed-event-card')
    render(<FeedEventCard event={symptomEvent} />)

    // occurredAt: '2026-03-14T09:30:00Z' → "09:30" oder "10:30" je nach Timezone
    // Wir testen nur das Format HH:MM
    expect(screen.getByText(/\d{1,2}:\d{2}/)).toBeInTheDocument()
  })

  it('übersetzt Status-Wert resolved zu Abgeklungen', async () => {
    const { FeedEventCard } =
      await import('@/components/insights/feed-event-card')
    const event: FeedEvent = {
      ...symptomEvent,
      symptoms: [
        {
          displayName: 'Kopfschmerzen',
          fields: {
            symptom_name: 'Kopfschmerzen',
            body_region: 'Kopf',
            status: 'resolved',
          },
        },
      ],
    }
    render(<FeedEventCard event={event} />)

    expect(screen.getByText(/Abgeklungen/)).toBeInTheDocument()
    expect(screen.queryByText(/resolved/)).not.toBeInTheDocument()
  })

  it('formatiert ISO-Timestamps in lesbares Datum', async () => {
    const { FeedEventCard } =
      await import('@/components/insights/feed-event-card')
    const event: FeedEvent = {
      ...symptomEvent,
      symptoms: [
        {
          displayName: 'Migräne',
          fields: {
            symptom_name: 'Migräne',
            duration: '2026-03-20T08:00:00+00:00',
          },
        },
      ],
    }
    render(<FeedEventCard event={event} />)

    // Soll kein roher ISO-String angezeigt werden
    expect(screen.queryByText(/2026-03-20T/)).not.toBeInTheDocument()
    // Stattdessen ein formatiertes Datum (z.B. "20. Mär., 08:00")
    expect(screen.getByText(/\d{1,2}\.\s?\w+/)).toBeInTheDocument()
  })

  it('blendet symptom_time Feld aus', async () => {
    const { FeedEventCard } =
      await import('@/components/insights/feed-event-card')
    const event: FeedEvent = {
      ...symptomEvent,
      symptoms: [
        {
          displayName: 'Kopfschmerzen',
          fields: {
            symptom_name: 'Kopfschmerzen',
            symptom_time: '2026-03-22T07:00:00+00:00',
            body_region: 'Kopf',
          },
        },
      ],
    }
    render(<FeedEventCard event={event} />)

    // symptom_time soll nicht als Wert erscheinen (redundant zur Header-Uhrzeit)
    expect(screen.queryByText(/2026-03-22T/)).not.toBeInTheDocument()
  })

  it('zeigt Dauer auch bei Einzelsymptom-Events', async () => {
    const { FeedEventCard } =
      await import('@/components/insights/feed-event-card')
    const event: FeedEvent = {
      ...symptomEvent,
      endedAt: '2026-03-14T12:00:00Z',
      symptoms: [
        {
          displayName: 'Kopfschmerzen',
          fields: { symptom_name: 'Kopfschmerzen' },
        },
      ],
    }
    render(<FeedEventCard event={event} />)

    expect(screen.getByText(/Dauer:/)).toBeInTheDocument()
  })
})
