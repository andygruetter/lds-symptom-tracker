import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import {
  AudioSection,
  EventTypeBadge,
  ExtractedDataSection,
  RawInputSection,
  ReadOnlyPhotoSection,
} from '@/components/event/event-detail-sections'
import type { ExtractedField } from '@/types/analytics'

vi.mock('@/components/event/audio-player', () => ({
  AudioPlayer: ({ audioUrl }: { audioUrl: string }) => (
    <audio data-testid="audio-player" src={audioUrl} />
  ),
}))

vi.mock('@/components/event/photo-gallery', () => ({
  PhotoGallery: ({
    photos,
  }: {
    photos: { id: string; signedUrl: string }[]
  }) => <div data-testid="photo-gallery">{photos.length} Fotos</div>,
}))

describe('EventTypeBadge', () => {
  it('zeigt Symptom-Badge', () => {
    render(
      <EventTypeBadge
        eventType="symptom"
        endedAt={null}
        occurredAt="2026-03-14T09:30:00Z"
      />,
    )
    expect(screen.getByText('Symptom')).toBeInTheDocument()
  })

  it('zeigt Symptom-Badge für alle Event-Typen', () => {
    render(
      <EventTypeBadge
        eventType="symptom"
        endedAt={null}
        occurredAt="2026-03-14T09:30:00Z"
      />,
    )
    expect(screen.getByText('Symptom')).toBeInTheDocument()
  })

  it('zeigt Dauer wenn endedAt vorhanden', () => {
    render(
      <EventTypeBadge
        eventType="symptom"
        endedAt="2026-03-14T10:30:00Z"
        occurredAt="2026-03-14T09:30:00Z"
      />,
    )
    expect(screen.getByText(/Dauer:/)).toBeInTheDocument()
  })
})

describe('RawInputSection', () => {
  it('zeigt Meldung wenn rawInput vorhanden', () => {
    render(<RawInputSection rawInput="Kopfschmerzen links" />)
    expect(screen.getByText('Ursprüngliche Meldung')).toBeInTheDocument()
    expect(screen.getByText('Kopfschmerzen links')).toBeInTheDocument()
  })

  it('rendert nichts wenn rawInput null', () => {
    const { container } = render(<RawInputSection rawInput={null} />)
    expect(container.innerHTML).toBe('')
  })
})

describe('AudioSection', () => {
  it('zeigt AudioPlayer wenn URL vorhanden', () => {
    render(<AudioSection audioUrl="https://test.com/audio.webm" />)
    expect(screen.getByTestId('audio-player')).toBeInTheDocument()
  })

  it('rendert nichts wenn URL null', () => {
    const { container } = render(<AudioSection audioUrl={null} />)
    expect(container.innerHTML).toBe('')
  })
})

describe('ExtractedDataSection', () => {
  const singleFields: ExtractedField[] = [
    {
      fieldName: 'symptom_name',
      value: 'Kopfschmerzen',
      confidence: 90,
      confirmed: true,
      symptomIndex: 0,
      medicationIndex: null,
    },
    {
      fieldName: 'body_region',
      value: 'Kopf',
      confidence: 85,
      confirmed: false,
      symptomIndex: 0,
      medicationIndex: null,
    },
  ]

  it('zeigt extrahierte Daten für Single-Symptom', () => {
    render(
      <ExtractedDataSection
        extractedFields={singleFields}
        eventType="symptom"
      />,
    )
    expect(screen.getByText('Extrahierte Daten')).toBeInTheDocument()
    expect(screen.getByText('Kopfschmerzen')).toBeInTheDocument()
    expect(screen.getByText('Kopf')).toBeInTheDocument()
  })

  it('zeigt Konfidenz-Prozente wenn showConfidencePercentage', () => {
    render(
      <ExtractedDataSection
        extractedFields={singleFields}
        eventType="symptom"
        showConfidencePercentage
      />,
    )
    expect(screen.getByText('90%')).toBeInTheDocument()
    expect(screen.getByText('85%')).toBeInTheDocument()
  })

  it('zeigt keine Prozente ohne showConfidencePercentage', () => {
    render(
      <ExtractedDataSection
        extractedFields={singleFields}
        eventType="symptom"
      />,
    )
    expect(screen.queryByText('90%')).not.toBeInTheDocument()
  })

  it('zeigt Multi-Symptom-Gruppen', () => {
    const multiFields: ExtractedField[] = [
      {
        fieldName: 'symptom_name',
        value: 'Kopfschmerzen',
        confidence: 90,
        confirmed: true,
        symptomIndex: 0,
        medicationIndex: null,
      },
      {
        fieldName: 'symptom_name',
        value: 'Schwindel',
        confidence: 80,
        confirmed: false,
        symptomIndex: 1,
        medicationIndex: null,
      },
    ]
    render(
      <ExtractedDataSection
        extractedFields={multiFields}
        eventType="symptom"
      />,
    )
    expect(screen.getByText('Kopfschmerzen')).toBeInTheDocument()
    expect(screen.getByText('Schwindel')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })
})

describe('ReadOnlyPhotoSection', () => {
  it('zeigt PhotoGallery wenn Fotos vorhanden', () => {
    render(
      <ReadOnlyPhotoSection
        photos={[
          {
            id: 'p1',
            signedUrl: 'https://test.com/photo.jpg',
            createdAt: '2026-03-14T10:00:00Z',
          },
        ]}
        totalPhotoCount={1}
      />,
    )
    expect(screen.getByTestId('photo-gallery')).toBeInTheDocument()
    expect(screen.getByText(/Fotos \(1\)/)).toBeInTheDocument()
  })

  it('rendert nichts wenn keine Fotos', () => {
    const { container } = render(
      <ReadOnlyPhotoSection photos={[]} totalPhotoCount={0} />,
    )
    expect(container.innerHTML).toBe('')
  })
})
