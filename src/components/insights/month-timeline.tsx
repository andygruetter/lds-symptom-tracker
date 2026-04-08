'use client'

import { useState, useTransition } from 'react'

import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Skeleton } from '@/components/ui/skeleton'
import { loadMonthTimeline } from '@/lib/actions/insights-actions'
import { toLocalDateKey } from '@/lib/utils/date'
import type { MonthTimeline } from '@/types/analytics'

import { DayDrillDown } from './day-drill-down'

type Props = {
  initialTimeline: MonthTimeline
}

const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

function getStartWeekday(year: number, month: number): number {
  // JavaScript getDay(): 0=So, 1=Mo, ..., 6=Sa
  // Umrechnung zu Mo=0, Di=1, ..., So=6
  const firstDay = new Date(year, month - 1, 1)
  return (firstDay.getDay() + 6) % 7
}

function formatMonthHeader(year: number, month: number): string {
  return new Intl.DateTimeFormat('de-CH', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, 1))
}

function getDensityStyle(totalCount: number): React.CSSProperties {
  if (totalCount === 0) return {}
  // Orange-tinted background with increasing opacity
  if (totalCount === 1) return { backgroundColor: 'rgba(192, 106, 60, 0.08)' }
  if (totalCount <= 3) return { backgroundColor: 'rgba(192, 106, 60, 0.15)' }
  return { backgroundColor: 'rgba(192, 106, 60, 0.25)' }
}

function getDotSize(count: number): string {
  if (count === 1) return 'h-1.5 w-1.5'
  if (count <= 3) return 'h-2 w-2'
  return 'h-2.5 w-2.5'
}

export function MonthTimeline({ initialTimeline }: Props) {
  const [timeline, setTimeline] = useState<MonthTimeline>(initialTimeline)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const today = toLocalDateKey(new Date())
  const todayDate = new Date()
  const currentYear = todayDate.getFullYear()
  const currentMonth = todayDate.getMonth() + 1

  const isCurrentMonth =
    timeline.year === currentYear && timeline.month === currentMonth

  const startWeekday = getStartWeekday(timeline.year, timeline.month)

  const handleMonthChange = (delta: number) => {
    let newYear = timeline.year
    let newMonth = timeline.month + delta

    if (newMonth > 12) {
      newYear += 1
      newMonth = 1
    } else if (newMonth < 1) {
      newYear -= 1
      newMonth = 12
    }

    startTransition(async () => {
      const result = await loadMonthTimeline(newYear, newMonth)
      if (result.data) {
        setTimeline(result.data)
        setSelectedDate(null)
        setError(null)
      } else {
        setError('Monat konnte nicht geladen werden.')
      }
    })
  }

  const handleDayTap = (dateKey: string) => {
    setSelectedDate((prev) => (prev === dateKey ? null : dateKey))
  }

  return (
    <div className="px-4 pb-24 pt-4">
      {/* Monats-Navigation */}
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => handleMonthChange(-1)}
          disabled={isPending}
          className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
          aria-label="Vorheriger Monat"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <h2 className="text-base font-semibold">
          {formatMonthHeader(timeline.year, timeline.month)}
        </h2>

        <button
          type="button"
          onClick={() => handleMonthChange(1)}
          disabled={isPending || isCurrentMonth}
          className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
          aria-label="Nächster Monat"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {error && (
        <p className="mb-3 text-center text-sm text-destructive">{error}</p>
      )}

      {isPending ? (
        <CalendarSkeleton />
      ) : (
        <>
          {/* Wochentag-Header */}
          <div className="mb-1 grid grid-cols-7 gap-0.5">
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                className="flex items-center justify-center text-xs font-medium text-muted-foreground"
              >
                {label}
              </div>
            ))}
          </div>

          {/* Kalender-Grid */}
          <div className="grid grid-cols-7 gap-0.5" data-testid="calendar-grid">
            {/* Leere Zellen vor dem 1. Tag */}
            {Array.from({ length: startWeekday }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[44px]" />
            ))}

            {/* Tages-Zellen */}
            {timeline.days.map((day) => {
              const isToday = day.date === today
              const isSelected = day.date === selectedDate
              const hasEvents = day.totalCount > 0

              const ariaLabel = buildAriaLabel(day.date, day.symptomCount)

              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => handleDayTap(day.date)}
                  disabled={!hasEvents}
                  aria-label={ariaLabel}
                  aria-current={isToday ? 'date' : undefined}
                  className={[
                    'flex min-h-[44px] flex-col items-center justify-center rounded-lg p-0.5 transition-colors',
                    isToday ? 'ring-2 ring-primary' : '',
                    isSelected ? 'bg-muted' : '',
                    hasEvents
                      ? 'cursor-pointer hover:bg-muted/60'
                      : 'cursor-default',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={
                    !isSelected ? getDensityStyle(day.totalCount) : undefined
                  }
                >
                  <span className="text-xs font-medium leading-none">
                    {parseInt(day.date.split('-')[2], 10)}
                  </span>
                  {hasEvents && (
                    <div className="mt-0.5 flex items-center gap-0.5">
                      {day.symptomCount > 0 && (
                        <span
                          data-testid="symptom-dot"
                          className={`rounded-full ${getDotSize(day.symptomCount)}`}
                          style={{ backgroundColor: '#C06A3C' }}
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* Tages-Drill-Down */}
      {selectedDate && (
        <DayDrillDown
          date={selectedDate}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  )
}

function buildAriaLabel(date: string, symptomCount: number): string {
  const [year, month, day] = date.split('-').map(Number)
  const formatted = new Intl.DateTimeFormat('de-CH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, day))

  const parts: string[] = [formatted]
  if (symptomCount > 0)
    parts.push(`${symptomCount} Symptom${symptomCount !== 1 ? 'e' : ''}`)
  if (symptomCount === 0) parts.push('Keine Einträge')

  return parts.join(', ')
}

function CalendarSkeleton() {
  return (
    <div data-testid="calendar-skeleton">
      <div className="mb-1 grid grid-cols-7 gap-0.5">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="flex items-center justify-center text-xs font-medium text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className="min-h-[44px] rounded-lg" />
        ))}
      </div>
    </div>
  )
}
