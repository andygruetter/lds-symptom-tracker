import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ChatBubble } from '@/components/capture/chat-bubble'

describe('ChatBubble', () => {
  it('zeigt Sent-Variante mit Content und Timestamp', () => {
    render(
      <ChatBubble
        variant="sent"
        content="Kopfschmerzen rechts"
        timestamp="10:30"
      />,
    )

    expect(screen.getByText('Kopfschmerzen rechts')).toBeInTheDocument()
    expect(screen.getByText('10:30')).toBeInTheDocument()
  })

  it('zeigt Received-Variante', () => {
    render(
      <ChatBubble
        variant="received"
        content="Wird verarbeitet..."
        timestamp="10:31"
      />,
    )

    expect(screen.getByText('Wird verarbeitet...')).toBeInTheDocument()
  })

  it('zeigt System-Variante', () => {
    render(<ChatBubble variant="system" content="Symptom erfasst" />)

    expect(screen.getByText('Symptom erfasst')).toBeInTheDocument()
  })

  it('zeigt Processing-Dots wenn isProcessing=true', () => {
    render(<ChatBubble variant="received" isProcessing />)

    const article = screen.getByRole('article')
    expect(article).toBeInTheDocument()
    // Processing dots sind 3 spans
    const dots = article.querySelectorAll('.animate-pulse')
    expect(dots.length).toBe(3)
  })

  it('hat role="article" und aria-label', () => {
    render(<ChatBubble variant="sent" content="Test" timestamp="10:30" />)

    const article = screen.getByRole('article')
    expect(article).toHaveAttribute('aria-label', 'Nachricht vom 10:30')
  })

  it('zeigt keinen Timestamp wenn nicht angegeben', () => {
    render(<ChatBubble variant="sent" content="Nur Text" />)

    expect(screen.getByText('Nur Text')).toBeInTheDocument()
    expect(screen.getByRole('article')).toHaveAttribute(
      'aria-label',
      'Chat-Nachricht',
    )
  })

  it('zeigt Medikamenten-Stil mit Pill-Icon', () => {
    render(
      <ChatBubble
        variant="sent"
        content="Ibuprofen eingenommen"
        isMedication
      />,
    )

    expect(screen.getByText('Ibuprofen eingenommen')).toBeInTheDocument()
  })

  it('zeigt extrahierte Felder als Tags', () => {
    const fields = [
      {
        id: 'f1',
        symptom_event_id: 'e1',
        field_name: 'symptom_name',
        value: 'Kopfschmerzen',
        confidence: 95,
        confirmed: false,
        created_at: '2026-03-02T10:00:00Z',
        symptom_index: 0,
      },
      {
        id: 'f2',
        symptom_event_id: 'e1',
        field_name: 'side',
        value: 'rechts',
        confidence: 90,
        confirmed: false,
        created_at: '2026-03-02T10:00:00Z',
        symptom_index: 0,
      },
    ]

    render(
      <ChatBubble
        variant="received"
        content="Symptom extrahiert"
        extractedFields={fields}
      />,
    )

    expect(screen.getByText('Kopfschmerzen')).toBeInTheDocument()
    expect(screen.getByText('rechts')).toBeInTheDocument()
  })

  it('zeigt Extraction-Failed mit Retry-Button', () => {
    const onRetry = vi.fn()
    render(
      <ChatBubble
        variant="received"
        isExtractionFailed
        onRetryExtraction={onRetry}
      />,
    )

    expect(screen.getByText('Extraktion fehlgeschlagen')).toBeInTheDocument()
    expect(screen.getByText('Erneut versuchen')).toBeInTheDocument()
  })

  it('zeigt weder Aktiv-Badge noch Dauer-Badge', () => {
    render(<ChatBubble variant="received" content="Gespeichert ✓" />)

    expect(screen.queryByText(/Aktiv seit/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Dauer:/)).not.toBeInTheDocument()
  })

  it('zeigt Voice-Indikator mit Mikrofon-Icon bei isVoice ohne Content', () => {
    render(<ChatBubble variant="sent" isVoice timestamp="10:30" />)

    expect(screen.getByText('Sprachaufnahme')).toBeInTheDocument()
  })

  it('zeigt Content statt Voice-Indikator wenn beides gesetzt', () => {
    render(
      <ChatBubble
        variant="sent"
        isVoice
        content="Transkribierter Text"
        timestamp="10:30"
      />,
    )

    expect(screen.getByText('Transkribierter Text')).toBeInTheDocument()
    expect(screen.queryByText('Sprachaufnahme')).not.toBeInTheDocument()
  })

  it('zeigt Mikrofon-Icon bei Voice-Event mit transkribiertem Text', () => {
    const { container } = render(
      <ChatBubble
        variant="sent"
        isVoice
        content="Ich habe Kopfschmerzen"
        timestamp="10:30"
      />,
    )

    // Mikrofon-Icon sollte sichtbar sein (als Voice-Indikator)
    const micIcon = container.querySelector('[aria-hidden="true"]')
    expect(micIcon).toBeInTheDocument()
    expect(screen.getByText('Ich habe Kopfschmerzen')).toBeInTheDocument()
  })

  it('zeigt Transcription-Failed mit Retry-Button', () => {
    const onRetry = vi.fn()
    render(
      <ChatBubble
        variant="received"
        isTranscriptionFailed
        onRetryExtraction={onRetry}
      />,
    )

    expect(screen.getByText('Transkription fehlgeschlagen')).toBeInTheDocument()
    expect(screen.getByText('Erneut versuchen')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Erneut versuchen'))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('zeigt Kamera-Icon bei confirmed Event mit onAddPhoto', () => {
    const onAddPhoto = vi.fn()
    render(
      <ChatBubble
        variant="sent"
        content="Kopfschmerzen"
        timestamp="10:30"
        eventId="event-1"
        eventStatus="confirmed"
        onAddPhoto={onAddPhoto}
      />,
    )

    const cameraBtn = screen.getByLabelText('Foto hinzufügen')
    expect(cameraBtn).toBeInTheDocument()
    fireEvent.click(cameraBtn)
    expect(onAddPhoto).toHaveBeenCalledWith('event-1')
  })

  it('zeigt kein Kamera-Icon bei pending Event', () => {
    render(
      <ChatBubble
        variant="sent"
        content="Kopfschmerzen"
        timestamp="10:30"
        eventId="event-1"
        eventStatus="pending"
        onAddPhoto={vi.fn()}
      />,
    )

    expect(screen.queryByLabelText('Foto hinzufügen')).not.toBeInTheDocument()
  })

  it('zeigt kein Kamera-Icon bei extracted Event', () => {
    render(
      <ChatBubble
        variant="sent"
        content="Kopfschmerzen"
        timestamp="10:30"
        eventId="event-1"
        eventStatus="extracted"
        onAddPhoto={vi.fn()}
      />,
    )

    expect(screen.queryByLabelText('Foto hinzufügen')).not.toBeInTheDocument()
  })

  it('Kamera-Icon stopPropagation verhindert Bubble-Navigation', () => {
    const onNavigate = vi.fn()
    const onAddPhoto = vi.fn()
    render(
      <ChatBubble
        variant="received"
        content="Gespeichert ✓"
        timestamp="10:30"
        eventId="event-1"
        eventStatus="confirmed"
        onNavigate={onNavigate}
        onAddPhoto={onAddPhoto}
      />,
    )

    fireEvent.click(screen.getByLabelText('Foto hinzufügen'))
    expect(onAddPhoto).toHaveBeenCalledTimes(1)
    expect(onNavigate).not.toHaveBeenCalled()
  })

  // --- Re-Run Overlay-Menu Tests ---

  it('zeigt kein Overlay-Menu wenn showRerunMenu=false', () => {
    render(
      <ChatBubble
        variant="sent"
        content="Kopfschmerzen"
        showRerunMenu={false}
        onRetryExtraction={vi.fn()}
      />,
    )

    expect(screen.queryByText('Extraktion wiederholen')).not.toBeInTheDocument()
    expect(
      screen.queryByText('Transkription wiederholen'),
    ).not.toBeInTheDocument()
  })

  it('zeigt Overlay-Menu nach Long-Press (1500ms) mit "Extraktion wiederholen"', async () => {
    vi.useFakeTimers()
    const onRetryExtraction = vi.fn()
    render(
      <ChatBubble
        variant="sent"
        content="Kopfschmerzen"
        showRerunMenu={true}
        onRetryExtraction={onRetryExtraction}
        eventStatus="confirmed"
      />,
    )

    const inner = screen.getByRole('article').firstElementChild!

    await act(async () => {
      fireEvent.touchStart(inner)
      await vi.advanceTimersByTimeAsync(1500)
    })

    expect(screen.getByText('Extraktion wiederholen')).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('zeigt "Transkription wiederholen" im Menu nur bei Voice-Events', async () => {
    vi.useFakeTimers()
    render(
      <ChatBubble
        variant="sent"
        content="Sprachaufnahme"
        showRerunMenu={true}
        isVoiceEvent={true}
        onRetryExtraction={vi.fn()}
        onRetryTranscription={vi.fn()}
        eventStatus="confirmed"
      />,
    )

    const inner = screen.getByRole('article').firstElementChild!

    await act(async () => {
      fireEvent.touchStart(inner)
      await vi.advanceTimersByTimeAsync(1500)
    })

    expect(screen.getByText('Extraktion wiederholen')).toBeInTheDocument()
    expect(screen.getByText('Transkription wiederholen')).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('ruft onRetryExtraction auf beim Menu-Button-Klick', async () => {
    vi.useFakeTimers()
    const onRetryExtraction = vi.fn()
    render(
      <ChatBubble
        variant="sent"
        content="Kopfschmerzen"
        showRerunMenu={true}
        onRetryExtraction={onRetryExtraction}
        eventStatus="confirmed"
      />,
    )

    const inner = screen.getByRole('article').firstElementChild!

    await act(async () => {
      fireEvent.touchStart(inner)
      await vi.advanceTimersByTimeAsync(1500)
    })

    fireEvent.click(screen.getByText('Extraktion wiederholen'))
    expect(onRetryExtraction).toHaveBeenCalledTimes(1)
    // Menu should close after clicking
    expect(screen.queryByText('Extraktion wiederholen')).not.toBeInTheDocument()
    vi.useRealTimers()
  })

  it('enthält kein "Transkription wiederholen" bei nicht-Voice-Events im Menu', async () => {
    vi.useFakeTimers()
    render(
      <ChatBubble
        variant="sent"
        content="Kopfschmerzen"
        showRerunMenu={true}
        isVoiceEvent={false}
        onRetryExtraction={vi.fn()}
        onRetryTranscription={vi.fn()}
        eventStatus="confirmed"
      />,
    )

    const inner = screen.getByRole('article').firstElementChild!

    await act(async () => {
      fireEvent.touchStart(inner)
      await vi.advanceTimersByTimeAsync(1500)
    })

    expect(screen.getByText('Extraktion wiederholen')).toBeInTheDocument()
    expect(
      screen.queryByText('Transkription wiederholen'),
    ).not.toBeInTheDocument()
    vi.useRealTimers()
  })

  it('zeigt Foto-Indikator bei isPhoto ohne Content', () => {
    render(<ChatBubble variant="sent" isPhoto timestamp="10:30" />)

    expect(screen.getByText('Foto')).toBeInTheDocument()
  })

  it('zeigt Content statt Foto-Indikator wenn beides gesetzt', () => {
    render(
      <ChatBubble
        variant="sent"
        isPhoto
        content="Hautausschlag am Arm"
        timestamp="10:30"
      />,
    )

    expect(screen.getByText('Hautausschlag am Arm')).toBeInTheDocument()
    expect(screen.queryByText('Foto')).not.toBeInTheDocument()
  })

  it('zeigt Photo-Grid mit Loading-Skeletons ohne getSignedUrl', () => {
    const photos = [
      {
        id: 'p1',
        symptom_event_id: 'e1',
        storage_path: 'path/photo1.jpg',
        created_at: '2026-03-03T10:00:00Z',
      },
      {
        id: 'p2',
        symptom_event_id: 'e1',
        storage_path: 'path/photo2.jpg',
        created_at: '2026-03-03T10:00:00Z',
      },
    ]

    render(
      <ChatBubble
        variant="sent"
        content="Foto-Dokumentation"
        photos={photos}
        timestamp="10:30"
      />,
    )

    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('zeigt +X Badge bei mehr als 3 Fotos', () => {
    const photos = Array.from({ length: 5 }, (_, i) => ({
      id: `p${i}`,
      symptom_event_id: 'e1',
      storage_path: `path/photo${i}.jpg`,
      created_at: '2026-03-03T10:00:00Z',
    }))

    render(
      <ChatBubble
        variant="sent"
        content="Viele Fotos"
        photos={photos}
        timestamp="10:30"
      />,
    )

    expect(screen.getByText('+2')).toBeInTheDocument()
  })

  it('ruft onNavigate auf beim Klick wenn eventId und nicht-pending Status', () => {
    const onNavigate = vi.fn()
    render(
      <ChatBubble
        variant="received"
        content="Gespeichert ✓"
        eventId="event-1"
        eventStatus="confirmed"
        onNavigate={onNavigate}
      />,
    )

    fireEvent.click(screen.getByRole('article'))
    expect(onNavigate).toHaveBeenCalledWith('event-1')
  })

  it('ruft onNavigate NICHT auf wenn Status "pending"', () => {
    const onNavigate = vi.fn()
    render(
      <ChatBubble
        variant="sent"
        content="Symptom..."
        eventId="event-1"
        eventStatus="pending"
        onNavigate={onNavigate}
      />,
    )

    fireEvent.click(screen.getByRole('article'))
    expect(onNavigate).not.toHaveBeenCalled()
  })
})
