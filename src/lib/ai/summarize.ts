import type { SummaryEventData, SummaryProvider } from '@/types/summary'

import { claudeSummaryProvider } from './providers/claude'

const defaultProvider: SummaryProvider =
  process.env.E2E_MOCK_SUMMARY === 'true'
    ? {
        summarize: async (events: SummaryEventData[]) =>
          `Mock-Zusammenfassung: ${events.length} Events im Zeitraum.`,
      }
    : claudeSummaryProvider

export async function generateSummary(
  events: SummaryEventData[],
): Promise<string> {
  return defaultProvider.summarize(events)
}
