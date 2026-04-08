import type {
  FeedSymptomGroup,
  MonthTimeline,
  SymptomRankingEntry,
} from '@/types/analytics'

/** Detail eines einzelnen Events für den PDF-Report */
export type PdfEventDetail = {
  id: string
  eventType: 'symptom'
  occurredAt: string
  endedAt: string | null
  rawInput: string | null
  /** Symptom/Medikament-Gruppen mit allen extrahierten Feldern */
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
