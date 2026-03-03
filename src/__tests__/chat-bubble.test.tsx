import { fireEvent, render, screen } from '@testing-library/react'
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
    render(
      <ChatBubble variant="sent" content="Test" timestamp="10:30" />,
    )

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
      },
      {
        id: 'f2',
        symptom_event_id: 'e1',
        field_name: 'side',
        value: 'rechts',
        confidence: 90,
        confirmed: false,
        created_at: '2026-03-02T10:00:00Z',
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

    expect(
      screen.getByText('Extraktion fehlgeschlagen'),
    ).toBeInTheDocument()
    expect(screen.getByText('Erneut versuchen')).toBeInTheDocument()
  })

  it('zeigt Aktiv-Badge wenn activeSinceLabel gesetzt', () => {
    render(
      <ChatBubble
        variant="received"
        content="Gespeichert ✓"
        activeSinceLabel="Aktiv seit 2 Std. 30 Min."
      />,
    )

    expect(
      screen.getByText('Aktiv seit 2 Std. 30 Min.'),
    ).toBeInTheDocument()
  })

  it('zeigt Beenden-Button bei aktivem Symptom', () => {
    const onEnd = vi.fn()
    render(
      <ChatBubble
        variant="received"
        content="Gespeichert ✓"
        activeSinceLabel="Aktiv seit 15 Minuten"
        onEndSymptom={onEnd}
      />,
    )

    const button = screen.getByText('Symptom beendet')
    expect(button).toBeInTheDocument()
    fireEvent.click(button)
    expect(onEnd).toHaveBeenCalledTimes(1)
  })

  it('zeigt keinen Beenden-Button ohne onEndSymptom', () => {
    render(
      <ChatBubble
        variant="received"
        content="Gespeichert ✓"
        activeSinceLabel="Aktiv seit 5 Minuten"
      />,
    )

    expect(screen.queryByText('Symptom beendet')).not.toBeInTheDocument()
  })

  it('zeigt Dauer-Badge für beendetes Symptom', () => {
    render(
      <ChatBubble
        variant="received"
        content="Gespeichert ✓"
        durationLabel="3 Std. 20 Min."
      />,
    )

    expect(screen.getByText('Dauer: 3 Std. 20 Min.')).toBeInTheDocument()
  })

  it('zeigt weder Aktiv-Badge noch Dauer-Badge wenn beide nicht gesetzt', () => {
    render(
      <ChatBubble variant="received" content="Gespeichert ✓" />,
    )

    expect(screen.queryByText(/Aktiv seit/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Dauer:/)).not.toBeInTheDocument()
  })
})
