'use client'

import { useRouter } from 'next/navigation'

import { AudioPlayer } from '@/components/event/audio-player'
import { PhotoGallery } from '@/components/event/photo-gallery'
import { getFieldLabel, sortByFieldOrder } from '@/lib/field-config'
import { cn } from '@/lib/utils'
import { formatDuration } from '@/lib/utils/duration'
import type { EventDetail, ExtractedField } from '@/types/analytics'

const EVENT_LEVEL_FIELDS = new Set(['symptom_time', 'duration'])

function groupBySymptomIndex(
  fields: ExtractedField[],
): Map<number, ExtractedField[]> {
  const groups = new Map<number, ExtractedField[]>()
  for (const field of fields) {
    const idx = field.symptomIndex ?? 0
    if (!groups.has(idx)) groups.set(idx, [])
    groups.get(idx)!.push(field)
  }
  return groups
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 85) return 'bg-green-500'
  if (confidence >= 70) return 'bg-yellow-500'
  return 'bg-red-500'
}

function formatDateTime(isoString: string): { date: string; time: string } {
  const d = new Date(isoString)
  return {
    date: new Intl.DateTimeFormat('de-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d),
    time: new Intl.DateTimeFormat('de-CH', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(d),
  }
}

function formatSymptomTimestamp(isoString: string): string {
  const date = new Date(isoString)
  if (isNaN(date.getTime())) return isoString
  return new Intl.DateTimeFormat('de-CH', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatDurationMinutes(minutesStr: string): string | null {
  const minutes = parseInt(minutesStr, 10)
  if (isNaN(minutes) || minutes <= 0) return null
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0 && mins > 0) return `${hours} Std. ${mins} Min.`
  if (hours > 0) return `${hours} Std.`
  return `${minutes} Min.`
}

function formatFieldValue(field: ExtractedField): string {
  if (!field.value) return 'Nicht erfasst'
  if (field.fieldName === 'intensity') return `${field.value}/10`
  if (field.fieldName === 'symptom_time')
    return formatSymptomTimestamp(field.value)
  if (field.fieldName === 'duration')
    return formatDurationMinutes(field.value) ?? field.value
  return field.value
}

function ConfidenceIndicator({ confidence }: { confidence: number | null }) {
  if (confidence === null) return null
  return (
    <div className="flex items-center gap-1">
      <span
        className={cn(
          'size-2 shrink-0 rounded-full',
          getConfidenceColor(confidence),
        )}
        aria-hidden="true"
      />
      <span className="text-xs text-muted-foreground">
        {Math.round(confidence)}%
      </span>
    </div>
  )
}

interface DoctorEventDetailViewProps {
  detail: EventDetail
}

export function DoctorEventDetailView({ detail }: DoctorEventDetailViewProps) {
  const router = useRouter()

  const isMedication = detail.eventType === 'medication'
  const typeBadgeColor = isMedication ? '#4A7FA5' : '#C06A3C'
  const typeLabel = isMedication ? 'Medikament' : 'Symptom'

  const { date, time } = formatDateTime(detail.occurredAt)

  const symptomGroups = isMedication
    ? null
    : groupBySymptomIndex(detail.extractedFields)
  const sortedGroupKeys = symptomGroups
    ? [...symptomGroups.keys()].sort((a, b) => a - b)
    : []
  const isMultiSymptom = sortedGroupKeys.length > 1

  const fieldMap = new Map(detail.extractedFields.map((f) => [f.fieldName, f]))
  const displayFields = sortByFieldOrder(
    detail.extractedFields.filter((f) => !!f.value).map((f) => f.fieldName),
  )
    .map((name) => fieldMap.get(name)!)
    .filter(Boolean)

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
          {/* Event-Typ-Badge + Dauer */}
          <div className="flex items-center justify-between gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold text-white"
              style={{ backgroundColor: typeBadgeColor }}
            >
              <span
                className="size-2 rounded-full bg-white/70"
                aria-hidden="true"
              />
              {typeLabel}
            </span>
            {detail.endedAt && (
              <span className="text-xs text-muted-foreground">
                Dauer:{' '}
                {formatDuration(
                  new Date(detail.occurredAt),
                  new Date(detail.endedAt),
                )}
              </span>
            )}
          </div>

          {/* Transkription / Raw Input */}
          {detail.rawInput && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
                Ursprüngliche Meldung
              </p>
              <div className="rounded-lg border border-border bg-muted/50 px-4 py-3">
                <p className="text-sm text-foreground">{detail.rawInput}</p>
              </div>
            </div>
          )}

          {/* Audio-Sektion */}
          {detail.audioUrl && (
            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">
                Audio-Aufnahme
              </p>
              <AudioPlayer audioUrl={detail.audioUrl} />
            </div>
          )}

          {/* Extrahierte Daten */}
          <div>
            <h2 className="mb-3 text-sm font-semibold text-foreground">
              Extrahierte Daten
            </h2>

            {isMultiSymptom ? (
              <div className="space-y-3">
                {sortedGroupKeys.map((groupIdx, i) => {
                  const groupFields = symptomGroups!.get(groupIdx)!
                  const groupFieldMap = new Map(
                    groupFields.map((f) => [f.fieldName, f]),
                  )
                  const symptomName =
                    groupFieldMap.get('symptom_name')?.value ??
                    `Symptom ${i + 1}`
                  const symptomNameConf =
                    groupFieldMap.get('symptom_name')?.confidence ?? null

                  const perSymptomFieldNames = sortByFieldOrder(
                    groupFields
                      .filter(
                        (f) =>
                          !!f.value &&
                          f.fieldName !== 'symptom_name' &&
                          !EVENT_LEVEL_FIELDS.has(f.fieldName),
                      )
                      .map((f) => f.fieldName),
                  )
                  const filledFields = perSymptomFieldNames
                    .map((name) => groupFieldMap.get(name)!)
                    .filter((f): f is ExtractedField => !!f)

                  return (
                    <div
                      key={groupIdx}
                      className="rounded-lg border border-border"
                    >
                      <div className="flex items-center gap-2 px-4 py-3">
                        <span className="inline-flex size-5 items-center justify-center rounded-full bg-[#C06A3C]/10 text-xs font-semibold text-[#C06A3C]">
                          {i + 1}
                        </span>
                        <span className="text-sm font-semibold text-foreground">
                          {symptomName}
                        </span>
                        <ConfidenceIndicator confidence={symptomNameConf} />
                      </div>
                      {filledFields.length > 0 && (
                        <div className="divide-y divide-border border-t border-border">
                          {filledFields.map((field) => (
                            <div
                              key={`${groupIdx}-${field.fieldName}`}
                              className="flex items-center justify-between px-4 py-2.5"
                            >
                              <span className="text-xs text-muted-foreground">
                                {getFieldLabel(field.fieldName)}
                              </span>
                              <div className="flex items-center gap-2">
                                <ConfidenceIndicator
                                  confidence={field.confidence}
                                />
                                <span className="text-sm text-foreground">
                                  {formatFieldValue(field)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Shared fields: Zeitpunkt & Dauer */}
                {(() => {
                  const firstGroup = symptomGroups!.get(sortedGroupKeys[0])!
                  const sharedFieldMap = new Map(
                    firstGroup.map((f) => [f.fieldName, f]),
                  )
                  const filledShared = sortByFieldOrder(
                    firstGroup
                      .filter(
                        (f) => !!f.value && EVENT_LEVEL_FIELDS.has(f.fieldName),
                      )
                      .map((f) => f.fieldName),
                  )
                    .map((name) => sharedFieldMap.get(name)!)
                    .filter((f): f is ExtractedField => !!f)

                  if (filledShared.length === 0) return null

                  return (
                    <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
                      {filledShared.map((field) => (
                        <div
                          key={field.fieldName}
                          className="flex items-center justify-between px-4 py-2.5"
                        >
                          <span className="text-xs text-muted-foreground">
                            {getFieldLabel(field.fieldName)}
                          </span>
                          <div className="flex items-center gap-2">
                            <ConfidenceIndicator
                              confidence={field.confidence}
                            />
                            <span className="text-sm text-foreground">
                              {formatFieldValue(field)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
                {displayFields.map((field) => (
                  <div
                    key={field.fieldName}
                    className="flex items-center justify-between px-4 py-2.5"
                  >
                    <span className="text-xs text-muted-foreground">
                      {getFieldLabel(field.fieldName)}
                    </span>
                    <div className="flex items-center gap-2">
                      <ConfidenceIndicator confidence={field.confidence} />
                      <span className="text-sm text-foreground">
                        {formatFieldValue(field)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Foto-Timeline */}
          {detail.photos.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">
                Fotos ({detail.totalPhotoCount})
              </p>
              <PhotoGallery
                photos={detail.photos}
                totalCount={detail.totalPhotoCount}
              />
            </div>
          )}

          <div className="h-4" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}
