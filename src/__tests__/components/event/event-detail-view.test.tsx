import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { EventDetailView } from '@/components/event/event-detail-view'
import type { EventDetail } from '@/types/analytics'

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ back: vi.fn(), push: vi.fn() })),
}))

vi.mock('@/components/event/audio-player', () => ({
  AudioPlayer: ({ audioUrl }: { audioUrl: string }) => (
    <div data-testid="audio-player" data-url={audioUrl} />
  ),
}))

vi.mock('@/components/event/photo-gallery', () => ({
  PhotoGallery: ({
    photos,
  }: {
    photos: { id: string; signedUrl: string }[]
  }) => <div data-testid="photo-gallery" data-count={photos.length} />,
}))

const baseDetail: EventDetail = {
  id: 'event-abc',
  eventType: 'symptom',
  occurredAt: '2026-03-14T09:30:00Z',
  createdAt: '2026-03-14T09:30:00Z',
  endedAt: null,
  rawInput: 'Rückenschmerzen links',
  audioUrl: null,
  extractedFields: [
    {
      fieldName: 'symptom_name',
      value: 'Rückenschmerzen',
      confidence: 90,
      confirmed: true,
      symptomIndex: 0,
    },
    {
      fieldName: 'body_region',
      value: 'Rücken',
      confidence: 75,
      confirmed: false,
      symptomIndex: 0,
    },
    {
      fieldName: 'intensity',
      value: '7',
      confidence: 60,
      confirmed: false,
      symptomIndex: 0,
    },
  ],
  photos: [],
  symptomName: 'Rückenschmerzen',
  medication: null,
}

describe('EventDetailView', () => {
  it('rendert Detail-View mit allen Sektionen', () => {
    render(<EventDetailView detail={baseDetail} />)
    expect(screen.getByText('Event-Details')).toBeTruthy()
    expect(screen.getByText('Ursprüngliche Meldung')).toBeTruthy()
    expect(screen.getByText('Rückenschmerzen links')).toBeTruthy()
    expect(screen.getByText('Extrahierte Daten')).toBeTruthy()
  })

  it('zeigt Konfidenz-Dots für Felder mit Konfidenzwerten', () => {
    const { container } = render(<EventDetailView detail={baseDetail} />)
    // Three extracted fields with confidence → three dots
    const dots = container.querySelectorAll('[title^="Konfidenz:"]')
    expect(dots.length).toBe(3)
  })

  it('zeigt Audio-Sektion NUR wenn audioUrl vorhanden', () => {
    const { rerender } = render(<EventDetailView detail={baseDetail} />)
    expect(screen.queryByTestId('audio-player')).toBeNull()

    rerender(
      <EventDetailView
        detail={{ ...baseDetail, audioUrl: 'https://signed.url/audio.webm' }}
      />,
    )
    expect(screen.getByTestId('audio-player')).toBeTruthy()
  })

  it('zeigt Foto-Sektion NUR wenn Fotos vorhanden', () => {
    const { rerender } = render(<EventDetailView detail={baseDetail} />)
    expect(screen.queryByTestId('photo-gallery')).toBeNull()

    const withPhotos: EventDetail = {
      ...baseDetail,
      photos: [{ id: 'p1', signedUrl: 'https://signed.url/photo.jpg' }],
    }
    rerender(<EventDetailView detail={withPhotos} />)
    expect(screen.getByTestId('photo-gallery')).toBeTruthy()
  })

  it('zeigt Bearbeiten-Link für Symptom-Events', () => {
    render(<EventDetailView detail={baseDetail} />)
    const editLink = screen.getByText('Bearbeiten')
    expect(editLink).toBeTruthy()
  })

  it('zeigt Medikament-Event korrekt (kein Bearbeiten-Link)', () => {
    const medDetail: EventDetail = {
      ...baseDetail,
      eventType: 'medication',
      extractedFields: [
        {
          fieldName: 'medication',
          value: 'Dafalgan',
          confidence: 95,
          confirmed: true,
          symptomIndex: 0,
        },
        {
          fieldName: 'dosage',
          value: '1g',
          confidence: 85,
          confirmed: false,
          symptomIndex: 0,
        },
      ],
      medication: 'Dafalgan',
      symptomName: null,
    }
    render(<EventDetailView detail={medDetail} />)
    // "Medikament" appears in badge AND in field labels, so use getAllByText
    expect(screen.getAllByText('Medikament').length).toBeGreaterThan(0)
    expect(screen.queryByText('Bearbeiten')).toBeNull()
  })
})
