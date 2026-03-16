// Types für KI-Zusammenfassung (Story 6.1)

/** Extrahierte Daten eines einzelnen Events für die Summary-Generierung */
export interface SummaryEventData {
  id: string
  eventType: string
  occurredAt: string
  endedAt: string | null
  rawInput: string | null
  extractedFields: {
    fieldName: string
    value: string
    confidence: number
  }[]
}

/** Gecachte Summary aus der DB */
export interface CachedSummary {
  summaryText: string
  generatedAt: string
  eventCount: number
}

/** Provider-Interface für Summary-Generierung */
export interface SummaryProvider {
  summarize(events: SummaryEventData[]): Promise<string>
}
