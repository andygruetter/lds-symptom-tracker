'use client'

import { useRouter } from 'next/navigation'

import { Camera, ChevronRight, Mic } from 'lucide-react'

import type { FeedEvent, FeedSymptomGroup } from '@/types/analytics'

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

function SymptomGroupRow({
  group,
  symbol,
}: {
  group: FeedSymptomGroup
  symbol: string
}) {
  const locationParts = [group.bodyRegion, group.side].filter(Boolean)
  const detailParts: string[] = []
  if (group.intensity !== null) detailParts.push(`${group.intensity}/10`)
  if (group.symptomType) detailParts.push(group.symptomType)

  return (
    <div>
      <p className="text-sm font-medium text-foreground">
        {symbol} {group.symptomName ?? '—'}
      </p>
      {(locationParts.length > 0 || detailParts.length > 0) && (
        <p className="text-xs text-muted-foreground">
          {[locationParts.join(', '), ...detailParts]
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}
    </div>
  )
}

type Props = {
  event: FeedEvent
}

export function FeedEventCard({ event }: Props) {
  const router = useRouter()
  const isMedication = event.eventType === 'medication'

  const accentColor = isMedication ? '#4A7FA5' : '#C06A3C'
  const badgeBg = isMedication ? 'bg-[#4A7FA5]/10' : 'bg-[#C06A3C]/10'
  const badgeText = isMedication ? 'text-[#4A7FA5]' : 'text-[#C06A3C]'
  const badgeLabel = isMedication ? 'Medikament' : 'Symptom'
  const symbol = isMedication ? '◆' : '●'

  return (
    <button
      type="button"
      onClick={() => router.push(`/event/${event.id}`)}
      className="w-full min-h-[44px] text-left"
    >
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
            {/* Chevron */}
            <ChevronRight
              className="h-4 w-4 text-muted-foreground"
              data-testid="chevron-right"
            />
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
          ) : event.symptoms.length > 1 ? (
            <div className="space-y-1.5">
              {event.symptoms.map((s, i) => (
                <SymptomGroupRow key={i} group={s} symbol={symbol} />
              ))}
              {event.endedAt && (
                <p className="text-xs text-muted-foreground">
                  Dauer: {formatDuration(event.occurredAt, event.endedAt)}
                </p>
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
    </button>
  )
}
