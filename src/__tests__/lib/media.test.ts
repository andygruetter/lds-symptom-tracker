import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockUpload = vi.fn()
const mockCreateSignedUrl = vi.fn()

const mockSupabase = {
  storage: {
    from: vi.fn(() => ({
      upload: mockUpload,
      createSignedUrl: mockCreateSignedUrl,
    })),
  },
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('uploadAudio', () => {
  it('lädt Audio mit korrektem Pfad hoch', async () => {
    mockUpload.mockResolvedValue({ error: null })

    const { uploadAudio } = await import('@/lib/db/media')
    const blob = new Blob(['audio'], { type: 'audio/webm' })
    const path = await uploadAudio(
      mockSupabase as never,
      'user-1',
      'event-1',
      blob,
      'audio/webm',
    )

    expect(path).toBe('user-1/event-1.webm')
    expect(mockSupabase.storage.from).toHaveBeenCalledWith('audio')
    expect(mockUpload).toHaveBeenCalledWith(
      'user-1/event-1.webm',
      blob,
      expect.objectContaining({
        contentType: 'audio/webm',
        upsert: false,
      }),
    )
  })

  it('verwendet korrekte Extension für audio/mp4', async () => {
    mockUpload.mockResolvedValue({ error: null })

    const { uploadAudio } = await import('@/lib/db/media')
    const blob = new Blob(['audio'], { type: 'audio/mp4' })
    const path = await uploadAudio(
      mockSupabase as never,
      'user-1',
      'event-1',
      blob,
      'audio/mp4',
    )

    expect(path).toBe('user-1/event-1.m4a')
  })

  it('handlet MIME-Type mit codecs (audio/webm;codecs=opus)', async () => {
    mockUpload.mockResolvedValue({ error: null })

    const { uploadAudio } = await import('@/lib/db/media')
    const blob = new Blob(['audio'], { type: 'audio/webm' })
    const path = await uploadAudio(
      mockSupabase as never,
      'user-1',
      'event-1',
      blob,
      'audio/webm;codecs=opus',
    )

    expect(path).toBe('user-1/event-1.webm')
    expect(mockUpload).toHaveBeenCalledWith(
      'user-1/event-1.webm',
      blob,
      expect.objectContaining({ contentType: 'audio/webm' }),
    )
  })

  it('wirft Fehler bei Upload-Fehler', async () => {
    mockUpload.mockResolvedValue({
      error: { message: 'Storage error' },
    })

    const { uploadAudio } = await import('@/lib/db/media')
    const blob = new Blob(['audio'], { type: 'audio/webm' })

    await expect(
      uploadAudio(mockSupabase as never, 'user-1', 'event-1', blob, 'audio/webm'),
    ).rejects.toThrow('Audio upload fehlgeschlagen')
  })

  it('verwendet .webm als Fallback für unbekannten MIME-Type', async () => {
    mockUpload.mockResolvedValue({ error: null })

    const { uploadAudio } = await import('@/lib/db/media')
    const blob = new Blob(['audio'], { type: 'audio/unknown' })
    const path = await uploadAudio(
      mockSupabase as never,
      'user-1',
      'event-1',
      blob,
      'audio/unknown',
    )

    expect(path).toBe('user-1/event-1.webm')
  })
})

describe('getSignedAudioUrl', () => {
  it('generiert Signed URL mit 15min TTL', async () => {
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://storage.supabase.co/signed/audio/user-1/event-1.webm' },
      error: null,
    })

    const { getSignedAudioUrl } = await import('@/lib/db/media')
    const url = await getSignedAudioUrl(
      mockSupabase as never,
      'user-1/event-1.webm',
    )

    expect(url).toContain('signed')
    expect(mockCreateSignedUrl).toHaveBeenCalledWith('user-1/event-1.webm', 900)
  })

  it('wirft Fehler bei Signed-URL-Fehler', async () => {
    mockCreateSignedUrl.mockResolvedValue({
      data: null,
      error: { message: 'Not found' },
    })

    const { getSignedAudioUrl } = await import('@/lib/db/media')

    await expect(
      getSignedAudioUrl(mockSupabase as never, 'nonexistent'),
    ).rejects.toThrow('Signed URL Generierung fehlgeschlagen')
  })

  it('akzeptiert custom expiresIn', async () => {
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://url.test/signed' },
      error: null,
    })

    const { getSignedAudioUrl } = await import('@/lib/db/media')
    await getSignedAudioUrl(mockSupabase as never, 'path.webm', 3600)

    expect(mockCreateSignedUrl).toHaveBeenCalledWith('path.webm', 3600)
  })
})

describe('uploadPhoto', () => {
  it('lädt Foto mit korrektem Pfad hoch', async () => {
    mockUpload.mockResolvedValue({ error: null })

    const { uploadPhoto } = await import('@/lib/db/media')
    const blob = new Blob(['photo'], { type: 'image/jpeg' })
    const path = await uploadPhoto(
      mockSupabase as never,
      'user-1',
      'event-1',
      blob,
      'IMG_1234',
    )

    expect(path).toMatch(/^user-1\/event-1\/\d+-IMG_1234\.jpg$/)
    expect(mockSupabase.storage.from).toHaveBeenCalledWith('photos')
    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^user-1\/event-1\/\d+-IMG_1234\.jpg$/),
      blob,
      expect.objectContaining({
        contentType: 'image/jpeg',
        upsert: false,
      }),
    )
  })

  it('verwendet korrekte Extension für image/png', async () => {
    mockUpload.mockResolvedValue({ error: null })

    const { uploadPhoto } = await import('@/lib/db/media')
    const blob = new Blob(['photo'], { type: 'image/png' })
    const path = await uploadPhoto(
      mockSupabase as never,
      'user-1',
      'event-1',
      blob,
      'screenshot',
    )

    expect(path).toMatch(/\.png$/)
  })

  it('verwendet korrekte Extension für image/webp', async () => {
    mockUpload.mockResolvedValue({ error: null })

    const { uploadPhoto } = await import('@/lib/db/media')
    const blob = new Blob(['photo'], { type: 'image/webp' })
    const path = await uploadPhoto(
      mockSupabase as never,
      'user-1',
      'event-1',
      blob,
      'photo',
    )

    expect(path).toMatch(/\.webp$/)
  })

  it('wirft Fehler bei ungültigem MIME-Type', async () => {
    const { uploadPhoto } = await import('@/lib/db/media')
    const blob = new Blob(['photo'], { type: 'application/pdf' })

    await expect(
      uploadPhoto(mockSupabase as never, 'user-1', 'event-1', blob, 'doc'),
    ).rejects.toThrow('Ungültiger Bild-MIME-Type')
  })

  it('wirft Fehler bei Upload-Fehler', async () => {
    mockUpload.mockResolvedValue({
      error: { message: 'Storage error' },
    })

    const { uploadPhoto } = await import('@/lib/db/media')
    const blob = new Blob(['photo'], { type: 'image/jpeg' })

    await expect(
      uploadPhoto(mockSupabase as never, 'user-1', 'event-1', blob, 'test'),
    ).rejects.toThrow('Foto-Upload fehlgeschlagen')
  })

  it('verwendet .jpg als Fallback für unbekannten Bild-MIME-Type', async () => {
    mockUpload.mockResolvedValue({ error: null })

    const { uploadPhoto } = await import('@/lib/db/media')
    const blob = new Blob(['photo'], { type: 'image/jpeg' })
    const path = await uploadPhoto(
      mockSupabase as never,
      'user-1',
      'event-1',
      blob,
      'photo',
    )

    expect(path).toMatch(/\.jpg$/)
  })
})

describe('getSignedPhotoUrl', () => {
  it('generiert Signed URL mit 15min TTL', async () => {
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://storage.supabase.co/signed/photos/user-1/photo.jpg' },
      error: null,
    })

    const { getSignedPhotoUrl } = await import('@/lib/db/media')
    const url = await getSignedPhotoUrl(
      mockSupabase as never,
      'user-1/event-1/123-photo.jpg',
    )

    expect(url).toContain('signed')
    expect(mockSupabase.storage.from).toHaveBeenCalledWith('photos')
    expect(mockCreateSignedUrl).toHaveBeenCalledWith('user-1/event-1/123-photo.jpg', 900)
  })

  it('wirft Fehler bei Signed-URL-Fehler', async () => {
    mockCreateSignedUrl.mockResolvedValue({
      data: null,
      error: { message: 'Not found' },
    })

    const { getSignedPhotoUrl } = await import('@/lib/db/media')

    await expect(
      getSignedPhotoUrl(mockSupabase as never, 'nonexistent'),
    ).rejects.toThrow('Foto Signed URL Generierung fehlgeschlagen')
  })

  it('akzeptiert custom expiresIn', async () => {
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://url.test/signed' },
      error: null,
    })

    const { getSignedPhotoUrl } = await import('@/lib/db/media')
    await getSignedPhotoUrl(mockSupabase as never, 'path.jpg', 3600)

    expect(mockCreateSignedUrl).toHaveBeenCalledWith('path.jpg', 3600)
  })
})
