import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

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
  totalPhotoCount: 0,
  eventStatus: 'confirmed',
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
  totalPhotoCount: 0,
  eventStatus: 'confirmed',
}

describe('DoctorEventDetailView', () => {
  it('rendert Symptom-Event mit extrahierten Feldern und Konfidenz-Indikatoren', () => {
    render(<DoctorEventDetailView detail={baseSymptomEvent} />)

    // Symptom-Badge (also shown as field label → use getAllByText)
    expect(screen.getAllByText('Symptom').length).toBeGreaterThanOrEqual(1)

    // Transkription
    expect(screen.getByText('Kopfschmerzen rechts')).toBeInTheDocument()

    // Extrahierte Felder (symptom_name label is now 'Symptom', already checked above)
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
        {
          id: 'photo-1',
          signedUrl: 'https://signed.url/photo1.jpg',
          createdAt: '2026-02-10T10:00:00Z',
        },
        {
          id: 'photo-2',
          signedUrl: 'https://signed.url/photo2.jpg',
          createdAt: '2026-02-10T10:00:00Z',
        },
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

  it('rendert Multi-Symptom-Event mit gruppierten Feldern', () => {
    const multiSymptomEvent: EventDetail = {
      id: 'event-multi',
      eventType: 'symptom',
      occurredAt: '2026-02-10T10:00:00Z',
      createdAt: '2026-02-10T10:00:00Z',
      endedAt: null,
      rawInput: 'Kopfschmerzen und Schwindel',
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
        {
          fieldName: 'intensity',
          value: '7',
          confidence: 80,
          confirmed: false,
          symptomIndex: 0,
        },
        {
          fieldName: 'symptom_name',
          value: 'Schwindel',
          confidence: 88,
          confirmed: true,
          symptomIndex: 1,
        },
        {
          fieldName: 'body_region',
          value: 'Vestibulär',
          confidence: 72,
          confirmed: false,
          symptomIndex: 1,
        },
        {
          fieldName: 'symptom_time',
          value: '2026-02-10T08:00:00Z',
          confidence: 90,
          confirmed: false,
          symptomIndex: 0,
        },
      ],
      photos: [],
      totalPhotoCount: 0,
      eventStatus: 'confirmed',
    }
    render(<DoctorEventDetailView detail={multiSymptomEvent} />)

    // Beide Symptom-Gruppen werden gerendert
    expect(screen.getByText('Kopfschmerzen')).toBeInTheDocument()
    expect(screen.getByText('Schwindel')).toBeInTheDocument()

    // Gruppen-Nummern (1 und 2)
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()

    // Per-Symptom-Felder beider Gruppen
    expect(screen.getByText('Kopf')).toBeInTheDocument()
    expect(screen.getByText('Vestibulär')).toBeInTheDocument()
    expect(screen.getByText('7/10')).toBeInTheDocument()

    // Konfidenz-Werte
    expect(screen.getByText('92%')).toBeInTheDocument()
    expect(screen.getByText('88%')).toBeInTheDocument()
  })

  it('rendert Shared Fields (Zeitpunkt/Dauer) separat bei Multi-Symptom', () => {
    const multiWithSharedFields: EventDetail = {
      id: 'event-multi-shared',
      eventType: 'symptom',
      occurredAt: '2026-02-10T10:00:00Z',
      createdAt: '2026-02-10T10:00:00Z',
      endedAt: null,
      rawInput: null,
      audioUrl: null,
      extractedFields: [
        {
          fieldName: 'symptom_name',
          value: 'Migräne',
          confidence: 95,
          confirmed: true,
          symptomIndex: 0,
        },
        {
          fieldName: 'symptom_name',
          value: 'Übelkeit',
          confidence: 85,
          confirmed: false,
          symptomIndex: 1,
        },
        {
          fieldName: 'duration',
          value: '90',
          confidence: 80,
          confirmed: false,
          symptomIndex: 0,
        },
      ],
      photos: [],
      totalPhotoCount: 0,
      eventStatus: 'confirmed',
    }
    render(<DoctorEventDetailView detail={multiWithSharedFields} />)

    // Shared field Dauer wird als "1 Std. 30 Min." formatiert
    expect(screen.getByText('Dauer')).toBeInTheDocument()
    expect(screen.getByText('1 Std. 30 Min.')).toBeInTheDocument()
  })

  it('rendert keine Transkription wenn rawInput null ist', () => {
    const eventOhneRawInput: EventDetail = {
      ...baseSymptomEvent,
      rawInput: null,
    }
    render(<DoctorEventDetailView detail={eventOhneRawInput} />)

    expect(screen.queryByText('Ursprüngliche Meldung')).not.toBeInTheDocument()
  })
})
