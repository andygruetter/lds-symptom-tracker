'use client'

import { useTransition, useState } from 'react'

import { Skeleton } from '@/components/ui/skeleton'
import {
  loadSymptomEvents,
  loadSymptomRanking,
} from '@/lib/actions/insights-actions'
import type {
  FeedEvent,
  SymptomRanking,
  SymptomRankingEntry,
  TimeRange,
} from '@/types/analytics'

import { FeedEventCard } from './feed-event-card'
import { SymptomRankingCard } from './symptom-ranking-card'

type Props = {
  initialRanking: SymptomRanking
}

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: '30d', label: '30 T' },
  { value: '3m', label: '3 M' },
  { value: '6m', label: '6 M' },
  { value: 'all', label: 'Alle' },
]

function RankingSkeletonCard() {
  return (
    <div
      className="rounded-lg bg-card px-4 py-3 shadow-sm"
      style={{ borderLeft: '4px solid hsl(var(--muted))' }}
    >
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-12" />
      </div>
      <div className="mt-1 flex items-center justify-between">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-5 w-14" />
      </div>
    </div>
  )
}

export function SymptomRanking({ initialRanking }: Props) {
  const [ranking, setRanking] = useState<SymptomRanking>(initialRanking)
  const [timeRange, setTimeRange] = useState<TimeRange>(
    initialRanking.timeRange,
  )
  const [isPending, startTransition] = useTransition()
  const [expandedName, setExpandedName] = useState<string | null>(null)
  const [expandedEvents, setExpandedEvents] = useState<FeedEvent[]>([])
  const [isLoadingEvents, startLoadingEvents] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleTimeRangeChange(newRange: TimeRange) {
    setTimeRange(newRange)
    setExpandedName(null)
    setExpandedEvents([])
    setError(null)
    startTransition(async () => {
      const result = await loadSymptomRanking(newRange)
      if (result.data) {
        setRanking(result.data)
      } else {
        setError('Ranking konnte nicht geladen werden.')
      }
    })
  }

  function handleCardToggle(name: string) {
    if (expandedName === name) {
      setExpandedName(null)
      setExpandedEvents([])
      return
    }
    setExpandedName(name)
    setExpandedEvents([])
    setError(null)
    startLoadingEvents(async () => {
      const result = await loadSymptomEvents(name, timeRange)
      if (result.data) {
        setExpandedEvents(result.data)
      } else {
        setError('Einträge konnten nicht geladen werden.')
      }
    })
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-24 pt-4">
      {/* Zeitraum-Filter */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {TIME_RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleTimeRangeChange(opt.value)}
            className={`flex-1 rounded-md py-1 text-sm font-medium transition-colors ${
              timeRange === opt.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {isPending ? (
        <>
          <RankingSkeletonCard />
          <RankingSkeletonCard />
          <RankingSkeletonCard />
        </>
      ) : (
        <>
          {/* Symptome */}
          <section>
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
              Symptome
            </h2>
            {ranking.symptoms.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Keine Symptome im gewählten Zeitraum.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {ranking.symptoms.map((entry) => (
                  <div key={entry.name}>
                    <SymptomRankingCard
                      entry={entry}
                      variant="symptom"
                      isExpanded={expandedName === entry.name}
                      onToggle={() => handleCardToggle(entry.name)}
                    />
                    {expandedName === entry.name && (
                      <ExpandedEvents
                        events={expandedEvents}
                        isLoading={isLoadingEvents}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

function ExpandedEvents({
  events,
  isLoading,
}: {
  events: FeedEvent[]
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <div className="mt-1 flex flex-col gap-2 pl-2">
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <p className="mt-1 pl-2 text-xs text-muted-foreground">
        Keine Einträge gefunden.
      </p>
    )
  }

  return (
    <div className="mt-1 flex flex-col gap-2 pl-2">
      <p className="text-xs font-medium text-muted-foreground">
        Letzte Einträge:
      </p>
      {events.map((event) => (
        <FeedEventCard key={event.id} event={event} />
      ))}
    </div>
  )
}
