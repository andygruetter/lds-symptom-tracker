export type DayEventSummary = {
  date: string /** YYYY-MM-DD lokaler Datumsschlüssel */
  symptomCount: number
  medicationCount: number
  totalCount: number
  maxIntensity: number | null
}

export type MonthTimeline = {
  year: number
  month: number
  days: DayEventSummary[]
  totalEvents: number
}

export type FeedEvent = {
  id: string
  eventType: 'symptom' | 'medication'
  occurredAt: string
  createdAt: string
  endedAt: string | null
  rawInput: string | null
  symptomName: string | null
  bodyRegion: string | null
  side: string | null
  symptomType: string | null
  intensity: number | null
  medication: string | null
  dosage: string | null
  photoCount: number
  hasAudio: boolean
}

export type FeedFilter = {
  eventType?: 'symptom' | 'medication' | 'all'
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

export type MedicationRankingEntry = {
  name: string
  totalCount: number
  monthlyCounts: MonthlyCount[]
  trend: 'increasing' | 'stable' | 'decreasing'
}

export type SymptomRanking = {
  symptoms: SymptomRankingEntry[]
  medications: MedicationRankingEntry[]
  timeRange: TimeRange
  totalSymptomEvents: number
  totalMedicationEvents: number
}

export type PaginatedFeed = {
  events: FeedEvent[]
  nextCursor: string | null
  hasMore: boolean
}
