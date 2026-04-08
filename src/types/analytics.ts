export type DayEventSummary = {
  date: string /** YYYY-MM-DD lokaler Datumsschlüssel */
  symptomCount: number
  totalCount: number
  maxIntensity: number | null
}

export type MonthTimeline = {
  year: number
  month: number
  days: DayEventSummary[]
  totalEvents: number
}

export type FeedSymptomGroup = {
  /** Display title: symptom_name des Symptoms */
  displayName: string | null
  /** All extracted fields as key-value pairs */
  fields: Record<string, string>
}

export type FeedEvent = {
  id: string
  eventType: 'symptom'
  occurredAt: string
  createdAt: string
  endedAt: string | null
  rawInput: string | null
  photoCount: number
  hasAudio: boolean
  /** Symptom-Gruppen — immer vorhanden */
  symptoms: FeedSymptomGroup[]
}

export type FeedFilter = {
  timeRange?: '30d' | '3m' | '6m' | 'all'
}

export type TimeRange = '30d' | '3m' | '6m' | 'all'

export type MonthlyCount = {
  year: number
  month: number
  count: number
}

export type SymptomRankingEntry = {
  name: string
  totalCount: number
  monthlyCounts: MonthlyCount[]
  trend: 'increasing' | 'stable' | 'decreasing'
  avgIntensity: number | null
}

export type SymptomRanking = {
  symptoms: SymptomRankingEntry[]
  timeRange: TimeRange
  totalSymptomEvents: number
}

export type PaginatedFeed = {
  events: FeedEvent[]
  nextCursor: string | null
  hasMore: boolean
}

export type ExtractedField = {
  fieldName: string
  value: string | null
  confidence: number | null
  confirmed: boolean
  symptomIndex: number
  medicationIndex: number | null
}

export type EventPhoto = {
  id: string
  signedUrl: string
  createdAt: string
}

export type EventDetail = {
  id: string
  eventType: 'symptom'
  occurredAt: string
  createdAt: string
  endedAt: string | null
  rawInput: string | null
  audioUrl: string | null
  extractedFields: ExtractedField[]
  photos: EventPhoto[]
  totalPhotoCount: number
  eventStatus: string
}
