/**
 * Smoke-Test für OpenAI Whisper Transcription.
 *
 * Nur manuell ausführbar:
 *   npx vitest run --testPathPattern smoke
 *
 * Benötigt:
 *   - Echten OPENAI_API_KEY in .env.local
 *   - Audio-Fixture: src/lib/ai/__fixtures__/audio/rueckenschmerzen-schweizerdeutsch.webm
 *
 * Überspringt automatisch wenn OPENAI_API_KEY nicht gesetzt.
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const FIXTURE_PATH = join(
  process.cwd(),
  'src/lib/ai/__fixtures__/audio/rueckenschmerzen-schweizerdeutsch.webm',
)

const hasApiKey = !!process.env.OPENAI_API_KEY
const hasFixture = existsSync(FIXTURE_PATH)

describe.skipIf(!hasApiKey || !hasFixture)(
  'Whisper Smoke Test (echte API)',
  () => {
    it('transkribiert Schweizerdeutsch-Audio zu deutschem Text', async () => {
      const { whisperProvider } = await import('@/lib/ai/providers/whisper')

      const audioBuffer = readFileSync(FIXTURE_PATH)
      const result = await whisperProvider.transcribe(audioBuffer, 'audio/webm')

      expect(result.text).toBeTruthy()
      expect(result.text.length).toBeGreaterThan(5)
      // Enthält deutsche Wörter
      expect(result.text).toMatch(/[äöüÄÖÜß]|schmerz|rücken|habe|ich/i)
    }, 30_000)
  },
)
