import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { FeedEvent } from '@/types/analytics'

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}))

vi.mock('@/lib/actions/insights-actions', () => ({
  loadMoreFeedEvents: vi.fn().mockResolvedValue({
    data: { events: [], nextCursor: null, hasMore: false },
    error: null,
  }),
}))

const makeEvent = (id: string, occurredAt: string): FeedEvent => ({
  id,
  eventType: 'symptom',
  occurredAt,
  createdAt: occurredAt,
  endedAt: null,
  rawInput: `Event ${id}`,
  symptomName: `Symptom ${id}`,
  bodyRegion: null,
  side: null,
  symptomType: null,
  intensity: null,
  medication: null,
  dosage: null,
  photoCount: 0,
  hasAudio: false,
})

describe('SymptomFeed', () => {
  it('rendert leeren Zustand wenn keine Events', async () => {
    const { SymptomFeed } = await import('@/components/insights/symptom-feed')
    render(
      <SymptomFeed initialEvents={[]} initialCursor={null} hasMore={false} />,
    )

    expect(screen.getByText(/noch keine einträge/i)).toBeInTheDocument()
  })

  it('rendert Events in Tages-Gruppen', async () => {
    const { SymptomFeed } = await import('@/components/insights/symptom-feed')
    const events = [
      makeEvent('1', '2026-03-14T09:30:00Z'),
      makeEvent('2', '2026-03-13T20:00:00Z'),
    ]
    render(
      <SymptomFeed
        initialEvents={events}
        initialCursor="2026-03-13T20:00:00Z"
        hasMore={false}
      />,
    )

    // Event-Namen sollen sichtbar sein
    expect(screen.getByText(/Symptom 1/)).toBeInTheDocument()
    expect(screen.getByText(/Symptom 2/)).toBeInTheDocument()
  })

  it('zeigt Tages-Header für Gruppen', async () => {
    const { SymptomFeed } = await import('@/components/insights/symptom-feed')
    // Use a fixed date in 2025 that is definitely not "today" (today is 2026-03-14)
    const events = [makeEvent('1', '2025-01-15T09:30:00Z')]
    render(
      <SymptomFeed
        initialEvents={events}
        initialCursor="2025-01-15T09:30:00Z"
        hasMore={false}
      />,
    )

    // Should show a date header (not "Heute" for 2025)
    expect(screen.getByText(/januar/i)).toBeInTheDocument()
  })

  it('zeigt Mehr-laden-Button wenn hasMore=true', async () => {
    const { SymptomFeed } = await import('@/components/insights/symptom-feed')
    const events = [makeEvent('1', '2026-03-14T09:30:00Z')]
    render(
      <SymptomFeed
        initialEvents={events}
        initialCursor="2026-03-14T09:30:00Z"
        hasMore={true}
      />,
    )

    expect(
      screen.getByRole('button', { name: /mehr laden/i }),
    ).toBeInTheDocument()
  })

  it('zeigt keinen Mehr-laden-Button wenn hasMore=false', async () => {
    const { SymptomFeed } = await import('@/components/insights/symptom-feed')
    const events = [makeEvent('1', '2026-03-14T09:30:00Z')]
    render(
      <SymptomFeed
        initialEvents={events}
        initialCursor="2026-03-14T09:30:00Z"
        hasMore={false}
      />,
    )

    expect(
      screen.queryByRole('button', { name: /mehr laden/i }),
    ).not.toBeInTheDocument()
  })

  it('lädt mehr Events bei Klick auf Mehr-laden-Button', async () => {
    const { loadMoreFeedEvents } =
      await import('@/lib/actions/insights-actions')
    const mockLoad = vi.mocked(loadMoreFeedEvents)
    const newEvent = makeEvent('new-1', '2026-03-10T10:00:00Z')
    mockLoad.mockResolvedValueOnce({
      data: {
        events: [newEvent],
        nextCursor: '2026-03-10T10:00:00Z',
        hasMore: false,
      },
      error: null,
    })

    const { SymptomFeed } = await import('@/components/insights/symptom-feed')
    const events = [makeEvent('1', '2026-03-14T09:30:00Z')]
    render(
      <SymptomFeed
        initialEvents={events}
        initialCursor="2026-03-14T09:30:00Z"
        hasMore={true}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /mehr laden/i }))

    await waitFor(() => {
      expect(screen.getByText(/Symptom new-1/)).toBeInTheDocument()
    })
  })
})
