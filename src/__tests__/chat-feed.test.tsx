import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ChatFeed } from '@/components/capture/chat-feed'
import type { ExtractedData } from '@/types/ai'
import type { SymptomEvent } from '@/types/symptom'

const mockEvent: SymptomEvent = {
  id: 'event-1',
  account_id: 'user-1',
  event_type: 'symptom',
  raw_input: 'Kopfschmerzen rechts',
  audio_url: null,
  status: 'pending',
  created_at: '2026-03-02T10:30:00Z',
  ended_at: null,
  deleted_at: null,
}

const confirmedEvent: SymptomEvent = {
  ...mockEvent,
  id: 'event-2',
  raw_input: 'Rückenschmerzen links',
  status: 'confirmed',
  created_at: '2026-03-02T10:35:00Z',
}

describe('ChatFeed', () => {
  it('zeigt Lade-Zustand', () => {
    render(<ChatFeed events={[]} isLoading />)

    expect(screen.getByText('Wird geladen...')).toBeInTheDocument()
  })

  it('zeigt leeren Zustand mit Hinweis-Text', () => {
    render(<ChatFeed events={[]} isLoading={false} />)

    expect(screen.getByText(/Beschreibe dein Symptom/)).toBeInTheDocument()
  })

  it('zeigt Events als ChatBubbles', () => {
    render(<ChatFeed events={[mockEvent]} isLoading={false} />)

    expect(screen.getByText('Kopfschmerzen rechts')).toBeInTheDocument()
  })

  it('zeigt Processing-Dots für pending Events', () => {
    render(<ChatFeed events={[mockEvent]} isLoading={false} />)

    const articles = screen.getAllByRole('article')
    // 2 articles: sent bubble + processing bubble
    expect(articles.length).toBe(2)
  })

  it('zeigt keine Processing-Dots für confirmed Events', () => {
    render(<ChatFeed events={[confirmedEvent]} isLoading={false} />)

    const articles = screen.getAllByRole('article')
    // Nur 1 article: sent bubble (kein processing)
    expect(articles.length).toBe(1)
  })

  it('zeigt mehrere Events', () => {
    render(<ChatFeed events={[mockEvent, confirmedEvent]} isLoading={false} />)

    expect(screen.getByText('Kopfschmerzen rechts')).toBeInTheDocument()
    expect(screen.getByText('Rückenschmerzen links')).toBeInTheDocument()
  })

  it('zeigt ReviewBubble für extracted Events', () => {
    const extractedEvent: SymptomEvent = {
      ...mockEvent,
      status: 'extracted',
    }
    const extractedDataMap: Record<string, ExtractedData[]> = {
      'event-1': [
        {
          id: 'f1',
          symptom_event_id: 'event-1',
          field_name: 'symptom_name',
          value: 'Kopfschmerzen',
          confidence: 95,
          confirmed: false,
          created_at: '2026-03-02T10:00:00Z',
        },
      ],
    }

    render(
      <ChatFeed
        events={[extractedEvent]}
        extractedDataMap={extractedDataMap}
        isLoading={false}
      />,
    )

    // ReviewBubble zeigt Felder als Tags und Bestätigen/Ändern Buttons
    expect(screen.getByText('Kopfschmerzen')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /^bestätigen$/i }),
    ).toBeInTheDocument()
  })

  it('zeigt "Gespeichert ✓" für confirmed Events mit Feldern', () => {
    const extractedDataMap: Record<string, ExtractedData[]> = {
      'event-2': [
        {
          id: 'f1',
          symptom_event_id: 'event-2',
          field_name: 'symptom_name',
          value: 'Rückenschmerzen',
          confidence: 95,
          confirmed: true,
          created_at: '2026-03-02T10:00:00Z',
        },
      ],
    }

    render(
      <ChatFeed
        events={[confirmedEvent]}
        extractedDataMap={extractedDataMap}
        isLoading={false}
      />,
    )

    expect(screen.getByText('Gespeichert ✓')).toBeInTheDocument()
  })

  it('zeigt ClarificationBubble für unsichere Felder in extracted Events', () => {
    const extractedEvent: SymptomEvent = {
      ...mockEvent,
      status: 'extracted',
    }
    const extractedDataMap: Record<string, ExtractedData[]> = {
      'event-1': [
        {
          id: 'f1',
          symptom_event_id: 'event-1',
          field_name: 'Symptom',
          value: 'Rückenschmerzen',
          confidence: 90,
          confirmed: false,
          created_at: '2026-03-02T10:00:00Z',
        },
        {
          id: 'f2',
          symptom_event_id: 'event-1',
          field_name: 'Seite',
          value: 'links',
          confidence: 55,
          confirmed: false,
          created_at: '2026-03-02T10:00:00Z',
        },
      ],
    }

    render(
      <ChatFeed
        events={[extractedEvent]}
        extractedDataMap={extractedDataMap}
        isLoading={false}
      />,
    )

    // ClarificationBubble für unsicheres Feld "Seite"
    expect(screen.getByText('Welche Seite?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Links' })).toBeInTheDocument()
  })

  it('zeigt Sent-Bubble nur einmal bei Multi-Symptom-Extraktion', () => {
    // Realistisches Szenario: Pipeline erstellt zusätzliche Events ~6s nach dem Original
    const event1: SymptomEvent = {
      ...mockEvent,
      id: 'multi-1',
      raw_input: 'Kopf- und Nackenschmerzen',
      status: 'extracted',
      created_at: '2026-03-02T10:30:00Z',
    }
    const event2: SymptomEvent = {
      ...mockEvent,
      id: 'multi-2',
      raw_input: 'Kopf- und Nackenschmerzen',
      status: 'extracted',
      created_at: '2026-03-02T10:30:06Z', // 6 Sekunden später (realistisch)
    }
    const extractedDataMap: Record<string, ExtractedData[]> = {
      'multi-1': [
        {
          id: 'f1',
          symptom_event_id: 'multi-1',
          field_name: 'symptom_name',
          value: 'Kopfschmerzen',
          confidence: 95,
          confirmed: false,
          created_at: '2026-03-02T10:30:00Z',
        },
      ],
      'multi-2': [
        {
          id: 'f2',
          symptom_event_id: 'multi-2',
          field_name: 'symptom_name',
          value: 'Nackenschmerzen',
          confidence: 95,
          confirmed: false,
          created_at: '2026-03-02T10:30:00Z',
        },
      ],
    }

    // Events kommen DESC sortiert vom Hook (neueste zuerst)
    render(
      <ChatFeed
        events={[event2, event1]}
        extractedDataMap={extractedDataMap}
        isLoading={false}
      />,
    )

    // User-Message darf nur einmal angezeigt werden
    const sentBubbles = screen.getAllByText('Kopf- und Nackenschmerzen')
    expect(sentBubbles).toHaveLength(1)

    // Beide Symptome als Review-Bubbles
    expect(screen.getByText('Kopfschmerzen')).toBeInTheDocument()
    expect(screen.getByText('Nackenschmerzen')).toBeInTheDocument()
  })

  it('zeigt Extraction-Failed-Status mit Retry', () => {
    const failedEvent: SymptomEvent = {
      ...mockEvent,
      status: 'extraction_failed',
    }
    const onRetry = vi.fn()

    render(
      <ChatFeed
        events={[failedEvent]}
        isLoading={false}
        onRetryExtraction={onRetry}
      />,
    )

    expect(screen.getByText('Extraktion fehlgeschlagen')).toBeInTheDocument()
    expect(screen.getByText('Erneut versuchen')).toBeInTheDocument()
  })
})
