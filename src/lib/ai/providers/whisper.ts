import OpenAI, { toFile } from 'openai'

import { audioExtensionFromMime } from '@/lib/utils/mime'
import type {
  TranscriptionContext,
  TranscriptionProvider,
  TranscriptionResult,
} from '@/types/ai'

const WHISPER_MODEL = 'gpt-4o-transcribe'

const BASE_PROMPT =
  'Transkribiere in Hochdeutsch. Schweizerdeutsch und Dialekt immer in korrektes Standarddeutsch übersetzen. Beispiel: "Chopfweh" wird zu "Kopfschmerzen", "Buuchschmerze" wird zu "Bauchschmerzen".'

const MEDICAL_DOMAIN_TERMS = [
  // Allgemeine Symptome
  'Kopfschmerzen',
  'Migräne',
  'Rückenschmerzen',
  'Nackenschmerzen',
  'Schulterschmerzen',
  'Gelenkschmerzen',
  'Bauchschmerzen',
  'Schwindel',
  'Übelkeit',
  'Erbrechen',
  'Müdigkeit',
  'Erschöpfung',
  'Herzrasen',
  'Atemnot',
  // Kardiovaskulär (LDS/Marfan-typisch)
  'Brustschmerzen',
  'Herzrhythmusstörungen',
  'Herzflimmern',
  'Herzstolpern',
  'Herzklopfen',
  'Aorta',
  'Aortenschmerzen',
  'Dissektion',
  'Aneurysma',
  'Mitralklappenprolaps',
  'Blutdruckschwankungen',
  // Muskuloskelettal (Bindegewebserkrankungen)
  'Gelenkinstabilität',
  'Hypermobilität',
  'Überstreckbarkeit',
  'Subluxation',
  'Gelenk ausgerenkt',
  'Skoliose',
  'Pectus excavatum',
  'Trichterbrust',
  'Pectus carinatum',
  'Kielbrust',
  'Plattfüsse',
  'Fussschmerzen',
  'Kieferschmerzen',
  'Kiefergelenk',
  // Okulär (Marfan/LDS)
  'Sehstörungen',
  'verschwommen sehen',
  'Doppeltsehen',
  'Lichtempfindlichkeit',
  'Mouches volantes',
  'Augenflimmern',
  'Linsensubluxation',
  // Zerebrovaskulär (Kopfgefäss-Dissektion/Aneurysma)
  'Rauschen im Kopf',
  'Rauschen im Ohr',
  'pulsierender Tinnitus',
  'Ohrensausen',
  'Tinnitus',
  'Halsschlagader',
  'Karotis',
  'Vernichtungskopfschmerz',
  'Sprachstörungen',
  'Schluckstörungen',
  'Gesichtsfeldausfall',
  'Augenlid hängt',
  // Neurologisch (Durale Ektasie)
  'Taubheitsgefühl',
  'Kribbeln',
  'Nervenschmerzen',
  'Gesichtstaubheit',
  // Allergisch/Entzündlich (LDS-typisch)
  'Asthma',
  'Asthmaanfall',
  'Ekzem',
  'Neurodermitis',
  'allergische Reaktion',
  'Nahrungsmittelallergie',
  'Heuschnupfen',
  // Haut (Bindegewebe)
  'Dehnungsstreifen',
  'blaue Flecken',
  'Hämatome',
  'Wundheilungsstörung',
  'Hautüberdehnbarkeit',
  // Allgemein
  'Belastungsintoleranz',
  'Schlafstörungen',
  'Fieber',
  // Medikamente (allgemein + LDS/Marfan-spezifisch)
  'Ibuprofen',
  'Paracetamol',
  'Aspirin',
  'Dafalgan',
  'Voltaren',
  'Novalgin',
  'Losartan',
  'Irbesartan',
  'Candesartan',
  'Valsartan',
  'Metoprolol',
  'Bisoprolol',
  'Atenolol',
  'Celiprolol',
  'Enalapril',
  'Ramipril',
  'Amlodipin',
  // Schmerzqualitäten
  'stechend',
  'ziehend',
  'dumpf',
  'pochend',
  'brennend',
  'kribbelnd',
  'drückend',
  'reissend',
  'zerreissend',
  'ausstrahlend',
  'pulsierend',
]

/**
 * Baut einen dynamischen Whisper-Prompt mit medizinischem Domain-Priming
 * und optionalem patientenspezifischem Vokabular.
 */
export function buildWhisperPrompt(context?: TranscriptionContext): string {
  const parts = [BASE_PROMPT]

  // Medizinische Domain-Begriffe als Priming
  const domainTerms = [...MEDICAL_DOMAIN_TERMS]

  // Patientenspezifisches Vokabular hinzufügen (gemappte Begriffe)
  if (context?.vocabularyTerms && context.vocabularyTerms.length > 0) {
    // Deduplizieren gegen Domain-Begriffe
    const existingLower = new Set(domainTerms.map((t) => t.toLowerCase()))
    const uniquePatientTerms = context.vocabularyTerms.filter(
      (t) => !existingLower.has(t.toLowerCase()),
    )
    domainTerms.push(...uniquePatientTerms)
  }

  parts.push(`Medizinische Begriffe: ${domainTerms.join(', ')}.`)

  return parts.join(' ')
}

function createClient(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

export const whisperProvider: TranscriptionProvider = {
  async transcribe(
    audioBuffer: Buffer,
    mimeType: string,
    context?: TranscriptionContext,
  ): Promise<TranscriptionResult> {
    const client = createClient()
    const extension = audioExtensionFromMime(mimeType)

    const file = await toFile(audioBuffer, `audio.${extension}`, {
      type: mimeType,
    })

    const result = await client.audio.transcriptions.create({
      file,
      model: WHISPER_MODEL,
      language: 'de',
      temperature: 0,
      prompt: buildWhisperPrompt(context),
    })

    return { text: result.text }
  },
}
