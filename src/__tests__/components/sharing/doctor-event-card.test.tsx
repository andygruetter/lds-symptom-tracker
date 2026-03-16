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
  symptomName: 'Rückenschmerzen',
  bodyRegion: 'Rücken',
  side: 'links',
  symptomType: 'stechend',
  intensity: 7,
  medication: null,
  dosage: null,
  photoCount: 2,
  hasAudio: false,
  symptoms: [
    {
      symptomName: 'Rückenschmerzen',
      bodyRegion: 'Rücken',
      side: 'links',
      symptomType: 'stechend',
      intensity: 7,
    },
  ],
}

const medicationEvent: FeedEvent = {
  id: 'event-2',
  eventType: 'medication',
  occurredAt: '2026-03-13T20:15:00Z',
  createdAt: '2026-03-13T20:15:00Z',
  endedAt: null,
  rawInput: 'Dafalgan 1g',
  symptomName: null,
  bodyRegion: null,
  side: null,
  symptomType: null,
  intensity: null,
  medication: 'Dafalgan',
  dosage: '1g',
  photoCount: 0,
  hasAudio: true,
  symptoms: [],
}

describe('DoctorEventCard', () => {
  it('zeigt Symptom-Karte mit Name, Körperregion und Seite', async () => {
    const { DoctorEventCard } =
      await import('@/components/sharing/doctor-event-card')
    render(<DoctorEventCard event={symptomEvent} />)

    expect(screen.getByText(/Rückenschmerzen/)).toBeInTheDocument()
    expect(screen.getByText('Rücken, links')).toBeInTheDocument()
  })

  it('zeigt Symptom-Intensität und -Typ', async () => {
    const { DoctorEventCard } =
      await import('@/components/sharing/doctor-event-card')
    render(<DoctorEventCard event={symptomEvent} />)

    expect(screen.getByText(/Intensität: 7\/10/)).toBeInTheDocument()
    expect(screen.getByText('stechend')).toBeInTheDocument()
  })

  it('zeigt Dauer wenn endedAt vorhanden', async () => {
    const { DoctorEventCard } =
      await import('@/components/sharing/doctor-event-card')
    render(<DoctorEventCard event={symptomEvent} />)

    expect(screen.getByText(/Dauer: 1h 30min/)).toBeInTheDocument()
  })

  it('zeigt Medikament-Karte mit Name und Dosierung', async () => {
    const { DoctorEventCard } =
      await import('@/components/sharing/doctor-event-card')
    render(<DoctorEventCard event={medicationEvent} />)

    expect(screen.getByText(/Dafalgan/)).toBeInTheDocument()
    expect(screen.getByText('1g')).toBeInTheDocument()
  })

  it('zeigt Typ-Badge "Symptom" für Symptom-Events', async () => {
    const { DoctorEventCard } =
      await import('@/components/sharing/doctor-event-card')
    render(<DoctorEventCard event={symptomEvent} />)

    expect(screen.getByText('Symptom')).toBeInTheDocument()
  })

  it('zeigt Typ-Badge "Medikament" für Medication-Events', async () => {
    const { DoctorEventCard } =
      await import('@/components/sharing/doctor-event-card')
    render(<DoctorEventCard event={medicationEvent} />)

    expect(screen.getByText('Medikament')).toBeInTheDocument()
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

  it('zeigt linke Farbkante — Medikament blau', async () => {
    const { DoctorEventCard } =
      await import('@/components/sharing/doctor-event-card')
    const { container } = render(<DoctorEventCard event={medicationEvent} />)

    const card = container.querySelector('[style*="border-left"]')
    expect(card).toBeTruthy()
    expect(card?.getAttribute('style')).toContain('rgb(74, 127, 165)')
  })

  it('formatiert Uhrzeit korrekt', async () => {
    const { DoctorEventCard } =
      await import('@/components/sharing/doctor-event-card')
    render(<DoctorEventCard event={symptomEvent} />)

    expect(screen.getByText(/\d{1,2}:\d{2}/)).toBeInTheDocument()
  })
})
