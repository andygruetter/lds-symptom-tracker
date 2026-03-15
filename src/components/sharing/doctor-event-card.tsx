import { Camera, Mic } from 'lucide-react'

import type { FeedEvent } from '@/types/analytics'

function formatTime(isoString: string): string {
  return new Intl.DateTimeFormat('de-CH', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoString))
}

function formatDuration(occurredAt: string, endedAt: string): string {
  const diffMs = new Date(endedAt).getTime() - new Date(occurredAt).getTime()
  const totalMinutes = Math.floor(diffMs / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}min`
  if (hours > 0) return `${hours}h`
  return `${minutes}min`
}

type Props = {
  event: FeedEvent
}

export function DoctorEventCard({ event }: Props) {
  const isMedication = event.eventType === 'medication'

  const accentColor = isMedication ? '#4A7FA5' : '#C06A3C'
  const badgeBg = isMedication ? 'bg-[#4A7FA5]/10' : 'bg-[#C06A3C]/10'
  const badgeText = isMedication ? 'text-[#4A7FA5]' : 'text-[#C06A3C]'
  const badgeLabel = isMedication ? 'Medikament' : 'Symptom'
  const symbol = isMedication ? '◆' : '●'

  return (
    <div
      className="relative rounded-lg bg-card px-4 py-3 shadow-sm"
      style={{ borderLeft: `3px solid ${accentColor}` }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          {formatTime(event.occurredAt)}
        </span>
        <div className="flex items-center gap-2">
          {/* Media indicators */}
          {event.photoCount > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <Camera className="h-3 w-3" />
              {event.photoCount}
            </span>
          )}
          {event.hasAudio && (
            <span
              className="text-muted-foreground"
              data-testid="audio-indicator"
            >
              <Mic className="h-3 w-3" />
            </span>
          )}
          {/* Type badge */}
          <span
            className={`rounded px-1.5 py-0.5 text-xs font-medium ${badgeBg} ${badgeText}`}
          >
            {badgeLabel}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="mt-1">
        {isMedication ? (
          <div>
            <p className="text-sm font-medium text-foreground">
              {symbol} {event.medication ?? event.rawInput ?? '—'}
            </p>
            {event.dosage && (
              <p className="text-xs text-muted-foreground">{event.dosage}</p>
            )}
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium text-foreground">
              {symbol} {event.symptomName ?? event.rawInput ?? '—'}
            </p>
            {(event.bodyRegion || event.side) && (
              <p className="text-xs text-muted-foreground">
                {[event.bodyRegion, event.side].filter(Boolean).join(', ')}
              </p>
            )}
            <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
              {event.intensity !== null && (
                <span>Intensität: {event.intensity}/10</span>
              )}
              {event.symptomType && <span>{event.symptomType}</span>}
              {event.endedAt && (
                <span>
                  Dauer: {formatDuration(event.occurredAt, event.endedAt)}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
