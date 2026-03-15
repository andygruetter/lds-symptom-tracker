'use client'

import { useState } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { ArrowLeft, Trash2 } from 'lucide-react'

import { AudioPlayer } from '@/components/event/audio-player'
import { DeleteEventDialog } from '@/components/event/delete-event-dialog'
import { PhotoGallery } from '@/components/event/photo-gallery'
import { cn } from '@/lib/utils'
import { formatDuration } from '@/lib/utils/duration'
import type { EventDetail, ExtractedField } from '@/types/analytics'

const FIELD_LABELS: Record<string, string> = {
  symptom_name: 'Symptomname',
  body_region: 'Körperregion',
  side: 'Seite',
  symptom_type: 'Symptomtyp',
  intensity: 'Intensität',
  symptom_time: 'Zeitpunkt',
  duration: 'Dauer',
  medication: 'Medikament',
  dosage: 'Dosierung',
}

/** Per-symptom fields (shown per group in multi-symptom) */
const PER_SYMPTOM_FIELDS = ['body_region', 'side', 'symptom_type', 'intensity']

/** Shared fields (shown once for the whole event) */
const SHARED_FIELDS = ['symptom_time', 'duration']

const ALL_SYMPTOM_FIELDS = [
  'symptom_name',
  ...PER_SYMPTOM_FIELDS,
  ...SHARED_FIELDS,
]
const MEDICATION_FIELDS = ['medication', 'dosage']

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

function getConfidenceColor(confidence: number): string {
  if (confidence >= 85) return 'bg-green-500'
  if (confidence >= 70) return 'bg-yellow-500'
  return 'bg-red-500'
}

function formatDateTime(isoString: string): string {
  return new Intl.DateTimeFormat('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoString))
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

interface EventDetailViewProps {
  detail: EventDetail
}

export function EventDetailView({ detail }: EventDetailViewProps) {
  const router = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push('/insights')
    }
  }

  const isMedication = detail.eventType === 'medication'
  const relevantFieldNames = isMedication
    ? MEDICATION_FIELDS
    : ALL_SYMPTOM_FIELDS

  const symptomGroups = isMedication
    ? null
    : groupBySymptomIndex(detail.extractedFields)
  const sortedGroupKeys = symptomGroups
    ? [...symptomGroups.keys()].sort((a, b) => a - b)
    : []
  const isMultiSymptom = sortedGroupKeys.length > 1

  // For medication or single-symptom fallback
  const fieldMap = new Map(detail.extractedFields.map((f) => [f.fieldName, f]))

  const displayFields = relevantFieldNames.map((name) => {
    const field = fieldMap.get(name)
    return (
      field ?? {
        fieldName: name,
        value: null,
        confidence: null,
        confirmed: false,
        symptomIndex: 0,
      }
    )
  })

  const typeBadgeColor = isMedication ? '#4A7FA5' : '#C06A3C'
  const typeLabel = isMedication ? 'Medikament' : 'Symptom'

  return (
    <div className="flex h-dvh flex-col bg-background">
      {/* Header */}
      <div className="flex shrink-0 items-center border-b border-border px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={handleBack}
          className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors active:bg-muted/80"
          aria-label="Zurück"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </button>
        <h1 className="flex-1 text-center text-base font-semibold">
          Event-Details
        </h1>
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="flex size-11 items-center justify-center rounded-full text-destructive transition-colors active:bg-muted"
          aria-label="Event löschen"
        >
          <Trash2 className="size-5" aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Typ + Datum/Uhrzeit */}
        <div className="mb-4 flex items-start justify-between gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium text-white"
            style={{ backgroundColor: typeBadgeColor }}
          >
            <span
              className="size-2 rounded-full bg-white/70"
              aria-hidden="true"
            />
            {typeLabel}
          </span>
          <span className="text-sm text-muted-foreground">
            {formatDateTime(detail.occurredAt)}
          </span>
        </div>

        {/* Dauer */}
        {detail.endedAt && (
          <p className="mb-4 text-sm text-muted-foreground">
            Dauer:{' '}
            {formatDuration(
              new Date(detail.occurredAt),
              new Date(detail.endedAt),
            )}
          </p>
        )}

        {/* Ursprüngliche Meldung / Transkription */}
        {detail.rawInput && (
          <div className="mb-5">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              Ursprüngliche Meldung
            </p>
            <div className="rounded-xl bg-muted/50 px-4 py-3">
              <p className="text-sm text-foreground">{detail.rawInput}</p>
            </div>
          </div>
        )}

        {/* Audio-Aufnahme */}
        {detail.audioUrl && (
          <div className="mb-5">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              🔊 Audio-Aufnahme
            </p>
            <AudioPlayer audioUrl={detail.audioUrl} />
          </div>
        )}

        {/* Fotos */}
        {detail.photos.length > 0 && (
          <div className="mb-5">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              📷 Fotos ({detail.photos.length})
            </p>
            <PhotoGallery photos={detail.photos} />
          </div>
        )}

        {/* Extrahierte Daten */}
        <div className="mb-5">
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            Extrahierte Daten
          </h2>
          {isMultiSymptom ? (
            <div className="space-y-4">
              {/* Per-symptom cards */}
              {sortedGroupKeys.map((groupIdx, i) => {
                const groupFields = symptomGroups!.get(groupIdx)!
                const groupFieldMap = new Map(
                  groupFields.map((f) => [f.fieldName, f]),
                )
                const symptomName =
                  groupFieldMap.get('symptom_name')?.value ?? `Symptom ${i + 1}`
                const symptomNameConf =
                  groupFieldMap.get('symptom_name')?.confidence ?? null

                // Only show per-symptom fields that have values
                const filledFields = PER_SYMPTOM_FIELDS.map((name) =>
                  groupFieldMap.get(name),
                ).filter((f): f is ExtractedField => !!f && !!f.value)

                return (
                  <div
                    key={groupIdx}
                    className="rounded-xl border border-border"
                  >
                    {/* Symptom header */}
                    <div className="flex items-center gap-2 px-4 py-3">
                      <span className="inline-flex size-5 items-center justify-center rounded-full bg-[#C06A3C]/10 text-xs font-semibold text-[#C06A3C]">
                        {i + 1}
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {symptomName}
                      </span>
                      {symptomNameConf !== null && (
                        <span
                          className={cn(
                            'size-2 rounded-full',
                            getConfidenceColor(symptomNameConf),
                          )}
                          title={`Konfidenz: ${Math.round(symptomNameConf)}%`}
                          aria-label={`Konfidenz ${Math.round(symptomNameConf)}%`}
                        />
                      )}
                    </div>
                    {/* Detail fields — only filled ones */}
                    {filledFields.length > 0 && (
                      <div className="divide-y divide-border border-t border-border">
                        {filledFields.map((field) => (
                          <div
                            key={`${groupIdx}-${field.fieldName}`}
                            className="flex items-center justify-between px-4 py-2.5"
                          >
                            <span className="text-xs text-muted-foreground">
                              {FIELD_LABELS[field.fieldName] ?? field.fieldName}
                            </span>
                            <div className="flex items-center gap-2">
                              {field.confidence !== null && (
                                <span
                                  className={cn(
                                    'size-2 rounded-full',
                                    getConfidenceColor(field.confidence),
                                  )}
                                  title={`Konfidenz: ${Math.round(field.confidence)}%`}
                                  aria-label={`Konfidenz ${Math.round(field.confidence)}%`}
                                />
                              )}
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

              {/* Shared fields: Zeitpunkt & Dauer (once for the event) */}
              {(() => {
                const firstGroup = symptomGroups!.get(sortedGroupKeys[0])!
                const sharedFieldMap = new Map(
                  firstGroup.map((f) => [f.fieldName, f]),
                )
                const filledShared = SHARED_FIELDS.map((name) =>
                  sharedFieldMap.get(name),
                ).filter((f): f is ExtractedField => !!f && !!f.value)

                if (filledShared.length === 0) return null

                return (
                  <div className="flex flex-col divide-y divide-border rounded-xl border border-border">
                    {filledShared.map((field) => (
                      <div
                        key={field.fieldName}
                        className="flex items-center justify-between px-4 py-3"
                      >
                        <span className="text-sm text-muted-foreground">
                          {FIELD_LABELS[field.fieldName] ?? field.fieldName}
                        </span>
                        <div className="flex items-center gap-2">
                          {field.confidence !== null && (
                            <span
                              className={cn(
                                'size-2 rounded-full',
                                getConfidenceColor(field.confidence),
                              )}
                              title={`Konfidenz: ${Math.round(field.confidence)}%`}
                              aria-label={`Konfidenz ${Math.round(field.confidence)}%`}
                            />
                          )}
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
            <div className="flex flex-col divide-y divide-border rounded-xl border border-border">
              {displayFields
                .filter((f) => !!f.value)
                .map((field) => (
                  <div
                    key={field.fieldName}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <span className="text-sm text-muted-foreground">
                      {FIELD_LABELS[field.fieldName] ?? field.fieldName}
                    </span>
                    <div className="flex items-center gap-2">
                      {field.confidence !== null && (
                        <span
                          className={cn(
                            'size-2 rounded-full',
                            getConfidenceColor(field.confidence),
                          )}
                          title={`Konfidenz: ${Math.round(field.confidence)}%`}
                          aria-label={`Konfidenz ${Math.round(field.confidence)}%`}
                        />
                      )}
                      <span className="text-sm text-foreground">
                        {formatFieldValue(field)}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Bearbeiten-Link — nur für Symptom-Events */}
        {!isMedication && (
          <div className="mb-4 flex justify-center">
            <Link
              href={`/event/${detail.id}/edit`}
              className="flex h-11 items-center rounded-xl border border-border px-6 text-sm font-medium text-foreground transition-colors active:bg-muted"
            >
              Bearbeiten
            </Link>
          </div>
        )}

        <div className="h-4" aria-hidden="true" />
      </div>

      <DeleteEventDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        eventId={detail.id}
      />
    </div>
  )
}
