import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { EventDetailView } from '@/components/event/event-detail-view'
import type { EventDetail } from '@/types/analytics'

const mockRefresh = vi.fn()
const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    back: vi.fn(),
    push: mockPush,
    refresh: mockRefresh,
  })),
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

vi.mock('@/components/capture/photo-picker', () => ({
  PhotoPicker: () => <div data-testid="photo-picker" />,
}))

vi.mock('@/lib/actions/symptom-actions', () => ({
  addPhotosToEvent: vi
    .fn()
    .mockResolvedValue({ data: { count: 0 }, error: null }),
  deleteEventPhoto: vi.fn().mockResolvedValue({ data: null, error: null }),
  loadMoreEventPhotos: vi.fn().mockResolvedValue({ data: [], error: null }),
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
  totalPhotoCount: 0,
  eventStatus: 'confirmed',
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

  it('zeigt keine Foto-Galerie wenn keine Fotos vorhanden', () => {
    render(<EventDetailView detail={baseDetail} />)
    expect(screen.queryByTestId('photo-gallery')).toBeNull()
  })

  it('zeigt Foto-Galerie wenn Fotos vorhanden', () => {
    const withPhotos: EventDetail = {
      ...baseDetail,
      photos: [
        {
          id: 'p1',
          signedUrl: 'https://signed.url/photo.jpg',
          createdAt: '2026-03-15T10:00:00Z',
        },
      ],
      totalPhotoCount: 1,
    }
    render(<EventDetailView detail={withPhotos} />)
    expect(screen.getByTestId('photo-gallery')).toBeTruthy()
  })

  it('zeigt Bearbeiten-Link für Symptom-Events', () => {
    render(<EventDetailView detail={baseDetail} />)
    const editLink = screen.getByText('Bearbeiten')
    expect(editLink).toBeTruthy()
  })

  it('zeigt PhotoPicker (Uploader) bei confirmed Event', () => {
    render(<EventDetailView detail={baseDetail} />)
    expect(screen.getByTestId('photo-picker')).toBeTruthy()
  })

  it('zeigt PhotoPicker bei extraction_failed Event', () => {
    render(
      <EventDetailView
        detail={{ ...baseDetail, eventStatus: 'extraction_failed' }}
      />,
    )
    expect(screen.getByTestId('photo-picker')).toBeTruthy()
  })

  it('versteckt PhotoPicker bei pending Event', () => {
    render(
      <EventDetailView detail={{ ...baseDetail, eventStatus: 'pending' }} />,
    )
    expect(screen.queryByTestId('photo-picker')).toBeNull()
  })

  it('versteckt PhotoPicker bei extracted Event', () => {
    render(
      <EventDetailView detail={{ ...baseDetail, eventStatus: 'extracted' }} />,
    )
    expect(screen.queryByTestId('photo-picker')).toBeNull()
  })

  // --- Re-Run Button Tests ---

  it('zeigt "Extraktion wiederholen" Button bei confirmed Event', () => {
    render(<EventDetailView detail={baseDetail} />)

    expect(screen.getByText('Extraktion wiederholen')).toBeTruthy()
  })

  it('zeigt "Extraktion wiederholen" Button auch bei extracted Event', () => {
    render(
      <EventDetailView detail={{ ...baseDetail, eventStatus: 'extracted' }} />,
    )

    expect(screen.getByText('Extraktion wiederholen')).toBeTruthy()
  })

  it('zeigt keinen Re-Run Button bei pending Event', () => {
    render(
      <EventDetailView detail={{ ...baseDetail, eventStatus: 'pending' }} />,
    )

    expect(screen.queryByText('Extraktion wiederholen')).toBeNull()
  })

  it('zeigt "Transkription wiederholen" nur wenn audioUrl vorhanden', () => {
    const { rerender } = render(<EventDetailView detail={baseDetail} />)

    // Kein audioUrl → kein Transkriptions-Button
    expect(screen.queryByText('Transkription wiederholen')).toBeNull()

    rerender(
      <EventDetailView
        detail={{ ...baseDetail, audioUrl: 'https://signed.url/audio.webm' }}
      />,
    )

    // Mit audioUrl → Transkriptions-Button erscheint
    expect(screen.getByText('Transkription wiederholen')).toBeTruthy()
  })

  it('Button-Click ruft fetch() mit korrektem mode-Parameter auf', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', mockFetch)

    render(<EventDetailView detail={baseDetail} />)

    const extractionBtn = screen.getByText('Extraktion wiederholen')
    await act(async () => {
      extractionBtn.click()
    })

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/ai/extract',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"mode":"extract"'),
      }),
    )

    vi.unstubAllGlobals()
  })

  it('Transkription-Button-Click ruft fetch() mit mode=transcribe auf', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', mockFetch)

    render(
      <EventDetailView
        detail={{ ...baseDetail, audioUrl: 'https://signed.url/audio.webm' }}
      />,
    )

    const transcriptionBtn = screen.getByText('Transkription wiederholen')
    await act(async () => {
      transcriptionBtn.click()
    })

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/ai/extract',
      expect.objectContaining({
        body: expect.stringContaining('"mode":"transcribe"'),
      }),
    )

    vi.unstubAllGlobals()
  })

  it('zeigt Fehlermeldung bei fehlgeschlagenem Re-Run', async () => {
    mockRefresh.mockClear()
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 })
    vi.stubGlobal('fetch', mockFetch)

    render(<EventDetailView detail={baseDetail} />)

    const extractionBtn = screen.getByText('Extraktion wiederholen')
    await act(async () => {
      extractionBtn.click()
    })

    expect(screen.getByText('Erneuter Versuch fehlgeschlagen')).toBeTruthy()
    expect(mockRefresh).not.toHaveBeenCalled()

    vi.unstubAllGlobals()
  })

  it('zeigt Netzwerk-Fehlermeldung bei fetch-Exception', async () => {
    mockRefresh.mockClear()
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'))
    vi.stubGlobal('fetch', mockFetch)

    render(<EventDetailView detail={baseDetail} />)

    const extractionBtn = screen.getByText('Extraktion wiederholen')
    await act(async () => {
      extractionBtn.click()
    })

    expect(
      screen.getByText('Netzwerkfehler — bitte erneut versuchen'),
    ).toBeTruthy()
    expect(mockRefresh).not.toHaveBeenCalled()

    vi.unstubAllGlobals()
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
    }
    render(<EventDetailView detail={medDetail} />)
    // "Medikament" appears in badge AND in field labels, so use getAllByText
    expect(screen.getAllByText('Medikament').length).toBeGreaterThan(0)
    expect(screen.queryByText('Bearbeiten')).toBeNull()
  })
})
