// Canonical audio MIME type ↔ extension mappings (Single Source of Truth)

const AUDIO_MIME_TO_EXT: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
}

const AUDIO_EXT_TO_MIME: Record<string, string> = {
  webm: 'audio/webm',
  mp4: 'audio/mp4',
  m4a: 'audio/mp4',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
}

/** MIME type → extension (without dot). Strips codec suffix. Default: 'webm' */
export function audioExtensionFromMime(mimeType: string): string {
  const base = mimeType.split(';')[0].trim()
  return AUDIO_MIME_TO_EXT[base] ?? 'webm'
}

/** File path → MIME type from extension. Default: 'audio/webm' */
export function audioMimeFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase()
  return AUDIO_EXT_TO_MIME[ext ?? ''] ?? 'audio/webm'
}

/** MIME type → extension with dot prefix (for storage paths). Default: '.webm' */
export function audioStorageExtension(mimeType: string): string {
  return `.${audioExtensionFromMime(mimeType)}`
}
