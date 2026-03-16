import { groupEventsByDay } from '@/lib/utils/date'
import type { FeedEvent } from '@/types/analytics'

import { DoctorEventCard } from './doctor-event-card'

function formatDayHeader(isoString: string): string {
  return new Intl.DateTimeFormat('de-CH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(isoString))
}

function formatDateRange(dateFrom: string, dateTo: string): string {
  const fmt = new Intl.DateTimeFormat('de-CH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  return `${fmt.format(new Date(dateFrom))} – ${fmt.format(new Date(dateTo))}`
}

function getMonthKey(dateKey: string): string {
  const [year, month] = dateKey.split('-')
  return `${year}-${month}`
}

function formatMonthSeparator(dateKey: string): string {
  const [year, month] = dateKey.split('-').map(Number)
  return new Intl.DateTimeFormat('de-CH', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1))
}

type Props = {
  events: FeedEvent[]
  dateFrom: string
  dateTo: string
}

export function DoctorTimeline({ events, dateFrom, dateTo }: Props) {
  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">
          Keine erfassten Symptome oder Medikamente im Zeitraum{' '}
          {formatDateRange(dateFrom, dateTo)}.
        </p>
      </div>
    )
  }

  const groups = groupEventsByDay(events)
  const entries = Array.from(groups.entries())

  let lastMonthKey: string | null = null

  return (
    <div className="flex flex-col gap-4">
      {entries.map(([dateKey, dayEvents]) => {
        const currentMonthKey = getMonthKey(dateKey)
        const showMonthSeparator =
          lastMonthKey !== null && currentMonthKey !== lastMonthKey
        lastMonthKey = currentMonthKey

        return (
          <div key={dateKey}>
            {showMonthSeparator && (
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {formatMonthSeparator(dateKey)}
              </div>
            )}
            <p className="mb-2 text-sm font-medium text-muted-foreground">
              {dayEvents[0] ? formatDayHeader(dayEvents[0].occurredAt) : ''}
            </p>
            <div className="flex flex-col gap-2">
              {dayEvents.map((event) => (
                <DoctorEventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
