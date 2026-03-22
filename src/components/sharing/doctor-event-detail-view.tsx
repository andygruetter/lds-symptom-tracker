'use client'

import { useRouter } from 'next/navigation'

import {
  AudioSection,
  EventTypeBadge,
  ExtractedDataSection,
  RawInputSection,
  ReadOnlyPhotoSection,
} from '@/components/event/event-detail-sections'
import { formatDateTime } from '@/components/event/event-detail-utils'
import type { EventDetail } from '@/types/analytics'

interface DoctorEventDetailViewProps {
  detail: EventDetail
}

export function DoctorEventDetailView({ detail }: DoctorEventDetailViewProps) {
  const router = useRouter()

  const { date, time } = formatDateTime(detail.occurredAt)

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium text-foreground transition-colors active:bg-muted"
          aria-label="Zurück zur Übersicht"
        >
          ← Übersicht
        </button>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-foreground">{date}</span>
          <span className="text-xs text-muted-foreground">{time} Uhr</span>
        </div>
      </div>

      <div className="flex-1 px-4 py-4">
        <div className="mx-auto max-w-2xl space-y-4">
          <EventTypeBadge
            eventType={detail.eventType}
            endedAt={detail.endedAt}
            occurredAt={detail.occurredAt}
          />

          <RawInputSection rawInput={detail.rawInput} />

          <AudioSection audioUrl={detail.audioUrl} />

          <ExtractedDataSection
            extractedFields={detail.extractedFields}
            eventType={detail.eventType}
            showConfidencePercentage
          />

          <ReadOnlyPhotoSection
            photos={detail.photos}
            totalPhotoCount={detail.totalPhotoCount}
          />

          <div className="h-4" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}
