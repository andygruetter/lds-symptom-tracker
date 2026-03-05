import type {
  ExtractionContext,
  ExtractionProvider,
  MultiExtractionResult,
} from '@/types/ai'

import { claudeProvider } from './providers/claude'
import { mockProvider } from './providers/mock'

const defaultProvider: ExtractionProvider =
  process.env.E2E_MOCK_EXTRACTION === 'true' ? mockProvider : claudeProvider

export async function extractSymptomData(
  rawInput: string,
  context?: ExtractionContext,
): Promise<MultiExtractionResult> {
  return defaultProvider.extract(rawInput, context)
}
