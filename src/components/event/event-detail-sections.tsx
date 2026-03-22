import { AudioPlayer } from '@/components/event/audio-player'
import {
  EVENT_LEVEL_FIELDS,
  formatFieldValue,
  getConfidenceColor,
  groupBySymptomIndex,
} from '@/components/event/event-detail-utils'
import { PhotoGallery } from '@/components/event/photo-gallery'
import { getFieldLabel, sortByFieldOrder } from '@/lib/field-config'
import { cn } from '@/lib/utils'
import { formatDuration } from '@/lib/utils/duration'
import type { EventDetail, EventPhoto, ExtractedField } from '@/types/analytics'

/* ------------------------------------------------------------------ */
/*  ConfidenceIndicator                                                */
/* ------------------------------------------------------------------ */

function ConfidenceIndicator({
  confidence,
  showPercentage,
}: {
  confidence: number | null
  showPercentage: boolean
}) {
  if (confidence === null) return null

  if (showPercentage) {
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

  return (
    <span
      className={cn('size-2 rounded-full', getConfidenceColor(confidence))}
      title={`Konfidenz: ${Math.round(confidence)}%`}
      aria-label={`Konfidenz ${Math.round(confidence)}%`}
    />
  )
}

/* ------------------------------------------------------------------ */
/*  EventTypeBadge                                                     */
/* ------------------------------------------------------------------ */

export function EventTypeBadge({
  eventType,
  endedAt,
  occurredAt,
}: {
  eventType: string
  endedAt: string | null
  occurredAt: string
}) {
  const isMedication = eventType === 'medication'
  const typeBadgeColor = isMedication ? '#4A7FA5' : '#C06A3C'
  const typeLabel = isMedication ? 'Medikament' : 'Symptom'

  return (
    <div className="flex items-center justify-between gap-2">
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold text-white"
        style={{ backgroundColor: typeBadgeColor }}
      >
        <span className="size-2 rounded-full bg-white/70" aria-hidden="true" />
        {typeLabel}
      </span>
      {endedAt && (
        <span className="text-xs text-muted-foreground">
          Dauer: {formatDuration(new Date(occurredAt), new Date(endedAt))}
        </span>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  RawInputSection                                                    */
/* ------------------------------------------------------------------ */

export function RawInputSection({ rawInput }: { rawInput: string | null }) {
  if (!rawInput) return null
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
        Ursprüngliche Meldung
      </p>
      <div className="rounded-lg border border-border bg-muted/50 px-4 py-3">
        <p className="text-sm text-foreground">{rawInput}</p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  AudioSection                                                       */
/* ------------------------------------------------------------------ */

export function AudioSection({ audioUrl }: { audioUrl: string | null }) {
  if (!audioUrl) return null
  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-muted-foreground">
        Audio-Aufnahme
      </p>
      <AudioPlayer audioUrl={audioUrl} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  ExtractedDataSection                                               */
/* ------------------------------------------------------------------ */

interface ExtractedDataSectionProps {
  extractedFields: ExtractedField[]
  eventType: string
  showConfidencePercentage?: boolean
}

export function ExtractedDataSection({
  extractedFields,
  eventType,
  showConfidencePercentage = false,
}: ExtractedDataSectionProps) {
  const isMedication = eventType === 'medication'

  const symptomGroups = isMedication
    ? null
    : groupBySymptomIndex(extractedFields)
  const sortedGroupKeys = symptomGroups
    ? [...symptomGroups.keys()].sort((a, b) => a - b)
    : []
  const isMultiSymptom = sortedGroupKeys.length > 1

  const fieldMap = new Map(extractedFields.map((f) => [f.fieldName, f]))
  const displayFields = sortByFieldOrder(
    extractedFields.filter((f) => !!f.value).map((f) => f.fieldName),
  )
    .map((name) => fieldMap.get(name)!)
    .filter(Boolean)

  return (
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
              groupFieldMap.get('symptom_name')?.value ?? `Symptom ${i + 1}`
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
              <div key={groupIdx} className="rounded-lg border border-border">
                <div className="flex items-center gap-2 px-4 py-3">
                  <span className="inline-flex size-5 items-center justify-center rounded-full bg-[#C06A3C]/10 text-xs font-semibold text-[#C06A3C]">
                    {i + 1}
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {symptomName}
                  </span>
                  <ConfidenceIndicator
                    confidence={symptomNameConf}
                    showPercentage={showConfidencePercentage}
                  />
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
                            showPercentage={showConfidencePercentage}
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

          {/* Event-level fields (Zeitpunkt & Dauer) — once for the whole event */}
          {(() => {
            const firstGroup = symptomGroups!.get(sortedGroupKeys[0])!
            const sharedFieldMap = new Map(
              firstGroup.map((f) => [f.fieldName, f]),
            )
            const filledShared = sortByFieldOrder(
              firstGroup
                .filter((f) => !!f.value && EVENT_LEVEL_FIELDS.has(f.fieldName))
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
                        showPercentage={showConfidencePercentage}
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
                <ConfidenceIndicator
                  confidence={field.confidence}
                  showPercentage={showConfidencePercentage}
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
}

/* ------------------------------------------------------------------ */
/*  ReadOnlyPhotoSection                                               */
/* ------------------------------------------------------------------ */

export function ReadOnlyPhotoSection({
  photos,
  totalPhotoCount,
}: {
  photos: EventPhoto[]
  totalPhotoCount: number
}) {
  if (photos.length === 0) return null
  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-muted-foreground">
        Fotos ({totalPhotoCount})
      </p>
      <PhotoGallery photos={photos} totalCount={totalPhotoCount} />
    </div>
  )
}
