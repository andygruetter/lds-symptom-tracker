import type {
  FeedSymptomGroup,
  MonthTimeline,
  SymptomRankingEntry,
} from '@/types/analytics'

/** Detail eines einzelnen Events für den PDF-Report */
export type PdfEventDetail = {
  id: string
  eventType: 'symptom' | 'medication'
  occurredAt: string
  endedAt: string | null
  symptomName: string | null
  medication: string | null
  bodyRegion: string | null
  side: string | null
  intensity: number | null
  rawInput: string | null
  /** Multi-Symptom-Gruppen (leer bei Medikament oder Einzel-Symptom) */
  symptoms: FeedSymptomGroup[]
  /** Base64-kodierte Foto-Thumbnails (max 200px Breite) */
  photoBase64: string[]
}

/** Aggregierte Daten für den PDF-Report */
export type PdfReportData = {
  summary: string
  ranking: SymptomRankingEntry[]
  timeline: MonthTimeline[]
  events: PdfEventDetail[]
  metadata: {
    dateFrom: string
    dateTo: string
    generatedAt: string
    totalEvents: number
  }
}
