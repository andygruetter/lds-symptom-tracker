import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { FeedEvent } from '@/types/analytics'

const symptomEvent: FeedEvent = {
  id: 'event-1',
  eventType: 'symptom',
  occurredAt: '2026-03-14T09:30:00Z',
  createdAt: '2026-03-14T09:30:00Z',
  endedAt: '2026-03-14T11:00:00Z',
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

describe('DoctorEventCard', () => {
  it('zeigt Symptom-Karte mit Name, Körperregion und Seite', async () => {
    const { DoctorEventCard } =
      await import('@/components/sharing/doctor-event-card')
    render(<DoctorEventCard event={symptomEvent} />)

    expect(screen.getByText(/Rückenschmerzen/)).toBeInTheDocument()
    expect(screen.getByText(/Rücken.*links/)).toBeInTheDocument()
  })

  it('zeigt Symptom-Intensität und -Typ', async () => {
    const { DoctorEventCard } =
      await import('@/components/sharing/doctor-event-card')
    render(<DoctorEventCard event={symptomEvent} />)

    expect(screen.getByText(/7\/10/)).toBeInTheDocument()
    expect(screen.getByText(/stechend/)).toBeInTheDocument()
  })

  it('zeigt Dauer wenn endedAt vorhanden (Multi-Symptom)', async () => {
    const { DoctorEventCard } =
      await import('@/components/sharing/doctor-event-card')
    // Duration is only shown in multi-symptom cards
    const multiEvent: FeedEvent = {
      ...symptomEvent,
      symptoms: [
        ...symptomEvent.symptoms,
        { displayName: 'Schwindel', fields: { symptom_name: 'Schwindel' } },
      ],
    }
    render(<DoctorEventCard event={multiEvent} />)

    expect(screen.getByText(/Dauer: 1h 30min/)).toBeInTheDocument()
  })

  it('zeigt Medikament-Karte mit Name und Dosierung', async () => {
    const { DoctorEventCard } =
      await import('@/components/sharing/doctor-event-card')
    render(<DoctorEventCard event={medicationEvent} />)

    expect(screen.getAllByText(/Dafalgan/).length).toBeGreaterThan(0)
    expect(screen.getByText(/1g/)).toBeInTheDocument()
  })

  it('zeigt Typ-Badge "Symptom" für Symptom-Events', async () => {
    const { DoctorEventCard } =
      await import('@/components/sharing/doctor-event-card')
    render(<DoctorEventCard event={symptomEvent} />)

    expect(screen.getByText('Symptom')).toBeInTheDocument()
  })

  it('zeigt Typ-Badge "Symptom" für alle Event-Typen', async () => {
    const { DoctorEventCard } =
      await import('@/components/sharing/doctor-event-card')
    render(<DoctorEventCard event={medicationEvent} />)

    expect(screen.getByText('Symptom')).toBeInTheDocument()
  })

  it('hat KEINEN Chevron-Right (kein klickbares Element)', async () => {
    const { DoctorEventCard } =
      await import('@/components/sharing/doctor-event-card')
    const { container } = render(<DoctorEventCard event={symptomEvent} />)

    expect(container.querySelector('[data-testid="chevron-right"]')).toBeNull()
  })

  it('hat KEIN button oder onClick (read-only)', async () => {
    const { DoctorEventCard } =
      await import('@/components/sharing/doctor-event-card')
    const { container } = render(<DoctorEventCard event={symptomEvent} />)

    expect(container.querySelector('button')).toBeNull()
    expect(container.querySelector('a')).toBeNull()
  })

  it('zeigt Foto-Indikator wenn Fotos vorhanden', async () => {
    const { DoctorEventCard } =
      await import('@/components/sharing/doctor-event-card')
    render(<DoctorEventCard event={symptomEvent} />)

    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('zeigt Audio-Indikator wenn Audio vorhanden', async () => {
    const { DoctorEventCard } =
      await import('@/components/sharing/doctor-event-card')
    render(<DoctorEventCard event={medicationEvent} />)

    expect(screen.getByTestId('audio-indicator')).toBeInTheDocument()
  })

  it('zeigt linke Farbkante — Symptom orange', async () => {
    const { DoctorEventCard } =
      await import('@/components/sharing/doctor-event-card')
    const { container } = render(<DoctorEventCard event={symptomEvent} />)

    const card = container.querySelector('[style*="border-left"]')
    expect(card).toBeTruthy()
    expect(card?.getAttribute('style')).toContain('rgb(192, 106, 60)')
  })

  it('zeigt linke Farbkante — immer orange (Terracotta)', async () => {
    const { DoctorEventCard } =
      await import('@/components/sharing/doctor-event-card')
    const { container } = render(<DoctorEventCard event={medicationEvent} />)

    const card = container.querySelector('[style*="border-left"]')
    expect(card).toBeTruthy()
    expect(card?.getAttribute('style')).toContain('rgb(192, 106, 60)')
  })

  it('formatiert Uhrzeit korrekt', async () => {
    const { DoctorEventCard } =
      await import('@/components/sharing/doctor-event-card')
    render(<DoctorEventCard event={symptomEvent} />)

    expect(screen.getByText(/\d{1,2}:\d{2}/)).toBeInTheDocument()
  })
})
