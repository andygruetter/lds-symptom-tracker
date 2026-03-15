'use client'

import { useEffect, useRef, useTransition } from 'react'
import { useState } from 'react'

import { X } from 'lucide-react'

import { loadDayEvents } from '@/lib/actions/insights-actions'
import type { FeedEvent } from '@/types/analytics'

import { FeedEventCard } from './feed-event-card'

type Props = {
  date: string // YYYY-MM-DD
  onClose: () => void
}

function formatDayHeader(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Intl.DateTimeFormat('de-CH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, day))
}

export function DayDrillDown({ date, onClose }: Props) {
  const [events, setEvents] = useState<FeedEvent[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    startTransition(async () => {
      const result = await loadDayEvents(date)
      if (result.data) {
        setEvents(result.data)
        setError(null)
      } else {
        setEvents([])
        setError('Events konnten nicht geladen werden.')
      }
    })
  }, [date])

  useEffect(() => {
    if (events !== null && containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [events])

  return (
    <div
      ref={containerRef}
      className="mt-4 rounded-lg border border-border bg-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-sm font-semibold">{formatDayHeader(date)}</span>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
          aria-label="Drill-Down schliessen"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        {isPending || events === null ? (
          <p className="text-sm text-muted-foreground">Lädt…</p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Keine Einträge an diesem Tag.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {events.map((event) => (
              <FeedEventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
