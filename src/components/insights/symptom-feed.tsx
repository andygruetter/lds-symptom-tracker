'use client'

import { useState, useTransition } from 'react'

import { loadMoreFeedEvents } from '@/lib/actions/insights-actions'
import { groupEventsByDay, toLocalDateKey } from '@/lib/utils/date'
import type { FeedEvent } from '@/types/analytics'

import { EmptyFeed } from './empty-feed'
import { FeedEventCard } from './feed-event-card'

function formatDayHeader(isoString: string): string {
  const date = new Date(isoString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (toLocalDateKey(date) === toLocalDateKey(today)) return 'Heute'
  if (toLocalDateKey(date) === toLocalDateKey(yesterday)) return 'Gestern'

  return new Intl.DateTimeFormat('de-CH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

type Props = {
  initialEvents: FeedEvent[]
  initialCursor: string | null
  hasMore: boolean
}

export function SymptomFeed({
  initialEvents,
  initialCursor,
  hasMore: initialHasMore,
}: Props) {
  const [events, setEvents] = useState<FeedEvent[]>(initialEvents)
  const [cursor, setCursor] = useState<string | null>(initialCursor)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [isPending, startTransition] = useTransition()

  if (events.length === 0) {
    return <EmptyFeed />
  }

  const groups = groupEventsByDay(events)

  const handleLoadMore = () => {
    if (!cursor) return

    startTransition(async () => {
      const result = await loadMoreFeedEvents(cursor)
      if (result.data) {
        setEvents((prev) => [...prev, ...result.data.events])
        setCursor(result.data.nextCursor)
        setHasMore(result.data.hasMore)
      }
    })
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-24 pt-4">
      {Array.from(groups.entries()).map(([dateKey, dayEvents]) => (
        <div key={dateKey}>
          <p className="mb-2 text-sm font-medium text-muted-foreground">
            {dayEvents[0] ? formatDayHeader(dayEvents[0].occurredAt) : ''}
          </p>
          <div className="flex flex-col gap-2">
            {dayEvents.map((event) => (
              <FeedEventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      ))}

      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={isPending}
            className="text-sm text-muted-foreground transition-opacity disabled:opacity-50"
          >
            {isPending ? 'Lädt…' : 'Mehr laden'}
          </button>
        </div>
      )}
    </div>
  )
}
