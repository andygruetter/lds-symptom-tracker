import { describe, expect, it, vi } from 'vitest'

import { render, screen } from '@testing-library/react'

import { DoctorEventDetailView } from '@/components/sharing/doctor-event-detail-view'
import type { EventDetail } from '@/types/analytics'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn() }),
}))

// Mock AudioPlayer
vi.mock('@/components/event/audio-player', () => ({
  AudioPlayer: ({ audioUrl }: { audioUrl: string }) => (
    <audio data-testid="audio-player" src={audioUrl} />
  ),
}))

// Mock PhotoGallery
vi.mock('@/components/event/photo-gallery', () => ({
  PhotoGallery: ({
    photos,
  }: {
    photos: { id: string; signedUrl: string }[]
  }) => <div data-testid="photo-gallery">{photos.length} Fotos</div>,
}))

const baseSymptomEvent: EventDetail = {
  id: 'event-1',
  eventType: 'symptom',
  occurredAt: '2026-02-10T10:00:00Z',
  createdAt: '2026-02-10T10:00:00Z',
  endedAt: null,
  rawInput: 'Kopfschmerzen rechts',
  audioUrl: null,
  extractedFields: [
    {
      fieldName: 'symptom_name',
      value: 'Kopfschmerzen',
      confidence: 92,
      confirmed: true,
      symptomIndex: 0,
    },
    {
      fieldName: 'body_region',
      value: 'Kopf',
      confidence: 85,
      confirmed: false,
      symptomIndex: 0,
    },
  ],
  photos: [],
  symptomName: 'Kopfschmerzen',
  medication: null,
}

const baseMedicationEvent: EventDetail = {
  id: 'event-2',
  eventType: 'medication',
  occurredAt: '2026-02-11T08:30:00Z',
  createdAt: '2026-02-11T08:30:00Z',
  endedAt: null,
  rawInput: null,
  audioUrl: null,
  extractedFields: [
    {
      fieldName: 'medication',
      value: 'Ibuprofen 400mg',
      confidence: 95,
      confirmed: true,
      symptomIndex: 0,
    },
  ],
  photos: [],
  symptomName: null,
  medication: 'Ibuprofen 400mg',
}

describe('DoctorEventDetailView', () => {
  it('rendert Symptom-Event mit extrahierten Feldern und Konfidenz-Indikatoren', () => {
    render(<DoctorEventDetailView detail={baseSymptomEvent} />)

    // Symptom-Badge
    expect(screen.getByText('Symptom')).toBeInTheDocument()

    // Transkription
    expect(screen.getByText('Kopfschmerzen rechts')).toBeInTheDocument()

    // Extrahierte Felder
    expect(screen.getByText('Symptomname')).toBeInTheDocument()
    expect(screen.getByText('Kopfschmerzen')).toBeInTheDocument()
    expect(screen.getByText('Körperregion')).toBeInTheDocument()
    expect(screen.getByText('Kopf')).toBeInTheDocument()

    // Konfidenz-Prozentangaben
    expect(screen.getByText('92%')).toBeInTheDocument()
    expect(screen.getByText('85%')).toBeInTheDocument()
  })

  it('rendert Medikament-Event mit korrektem Badge', () => {
    render(<DoctorEventDetailView detail={baseMedicationEvent} />)

    expect(screen.getAllByText('Medikament').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Ibuprofen 400mg')).toBeInTheDocument()
    expect(screen.getByText('95%')).toBeInTheDocument()
  })

  it('rendert AudioPlayer wenn audioUrl vorhanden', () => {
    const eventMitAudio: EventDetail = {
      ...baseSymptomEvent,
      audioUrl: 'https://signed.url/audio.webm',
    }
    render(<DoctorEventDetailView detail={eventMitAudio} />)

    expect(screen.getByTestId('audio-player')).toBeInTheDocument()
    expect(screen.getByTestId('audio-player')).toHaveAttribute(
      'src',
      'https://signed.url/audio.webm',
    )
  })

  it('rendert KEINEN AudioPlayer wenn audioUrl null ist', () => {
    render(<DoctorEventDetailView detail={baseSymptomEvent} />)

    expect(screen.queryByTestId('audio-player')).not.toBeInTheDocument()
  })

  it('rendert PhotoGallery wenn Fotos vorhanden', () => {
    const eventMitFotos: EventDetail = {
      ...baseSymptomEvent,
      photos: [
        { id: 'photo-1', signedUrl: 'https://signed.url/photo1.jpg' },
        { id: 'photo-2', signedUrl: 'https://signed.url/photo2.jpg' },
      ],
    }
    render(<DoctorEventDetailView detail={eventMitFotos} />)

    expect(screen.getByTestId('photo-gallery')).toBeInTheDocument()
    expect(screen.getByText('2 Fotos')).toBeInTheDocument()
  })

  it('rendert KEINE PhotoGallery wenn keine Fotos vorhanden', () => {
    render(<DoctorEventDetailView detail={baseSymptomEvent} />)

    expect(screen.queryByTestId('photo-gallery')).not.toBeInTheDocument()
  })

  it('zeigt Zurück-Button mit Label "← Übersicht"', () => {
    render(<DoctorEventDetailView detail={baseSymptomEvent} />)

    expect(screen.getByText('← Übersicht')).toBeInTheDocument()
  })

  it('zeigt KEINEN Bearbeiten- oder Löschen-Button (read-only für Arzt)', () => {
    render(<DoctorEventDetailView detail={baseSymptomEvent} />)

    expect(screen.queryByText('Bearbeiten')).not.toBeInTheDocument()
    expect(screen.queryByText('Löschen')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Event löschen')).not.toBeInTheDocument()
  })
})
