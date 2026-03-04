import type {
  ExtractionContext,
  ExtractionProvider,
  ExtractionResult,
} from '@/types/ai'

import { claudeProvider } from './providers/claude'
import { mockProvider } from './providers/mock'

const defaultProvider: ExtractionProvider =
  process.env.E2E_MOCK_EXTRACTION === 'true' ? mockProvider : claudeProvider

export async function extractSymptomData(
  rawInput: string,
  context?: ExtractionContext,
): Promise<ExtractionResult> {
  return defaultProvider.extract(rawInput, context)
}
