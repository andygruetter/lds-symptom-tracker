import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { PhotoPicker } from '@/components/capture/photo-picker'

const mockCompressImage = vi.fn(async (file: File) => {
  return new Blob([file.name], { type: 'image/jpeg' })
})

describe('PhotoPicker', () => {
  it('zeigt Kamera-Button mit aria-label', () => {
    render(
      <PhotoPicker
        pendingPhotos={[]}
        onPhotosSelected={vi.fn()}
        onRemovePhoto={vi.fn()}
        compressImage={mockCompressImage}
      />,
    )

    expect(screen.getByLabelText('Foto aufnehmen')).toBeInTheDocument()
  })

  it('zeigt hidden file input mit accept="image/*"', () => {
    render(
      <PhotoPicker
        pendingPhotos={[]}
        onPhotosSelected={vi.fn()}
        onRemovePhoto={vi.fn()}
        compressImage={mockCompressImage}
      />,
    )

    const input = screen.getByLabelText('Fotos hinzufügen')
    expect(input).toHaveAttribute('accept', 'image/*')
    expect(input).toHaveAttribute('type', 'file')
    expect(input.className).toContain('hidden')
  })

  it('zeigt Thumbnail-Vorschau wenn Fotos vorhanden', () => {
    const file = new File(['photo'], 'test.jpg', { type: 'image/jpeg' })
    global.URL.createObjectURL = vi.fn(() => 'blob:test-url')

    render(
      <PhotoPicker
        pendingPhotos={[file]}
        onPhotosSelected={vi.fn()}
        onRemovePhoto={vi.fn()}
        compressImage={mockCompressImage}
      />,
    )

    expect(screen.getByRole('list')).toBeInTheDocument()
    expect(screen.getByRole('listitem')).toBeInTheDocument()
    expect(screen.getByAltText('test.jpg')).toBeInTheDocument()
  })

  it('zeigt Entfernen-Button auf Thumbnails', () => {
    const file = new File(['photo'], 'test.jpg', { type: 'image/jpeg' })
    global.URL.createObjectURL = vi.fn(() => 'blob:test-url')
    const onRemove = vi.fn()

    render(
      <PhotoPicker
        pendingPhotos={[file]}
        onPhotosSelected={vi.fn()}
        onRemovePhoto={onRemove}
        compressImage={mockCompressImage}
      />,
    )

    const removeBtn = screen.getByLabelText('Foto test.jpg entfernen')
    expect(removeBtn).toBeInTheDocument()
    fireEvent.click(removeBtn)
    expect(onRemove).toHaveBeenCalledWith(0)
  })

  it('deaktiviert Kamera-Button bei max 5 Fotos', () => {
    const files = Array.from({ length: 5 }, (_, i) =>
      new File(['photo'], `test${i}.jpg`, { type: 'image/jpeg' }),
    )
    global.URL.createObjectURL = vi.fn(() => 'blob:test-url')

    render(
      <PhotoPicker
        pendingPhotos={files}
        onPhotosSelected={vi.fn()}
        onRemovePhoto={vi.fn()}
        compressImage={mockCompressImage}
      />,
    )

    expect(screen.getByLabelText('Foto aufnehmen')).toBeDisabled()
  })

  it('deaktiviert Kamera-Button wenn disabled=true', () => {
    render(
      <PhotoPicker
        pendingPhotos={[]}
        onPhotosSelected={vi.fn()}
        onRemovePhoto={vi.fn()}
        disabled
        compressImage={mockCompressImage}
      />,
    )

    expect(screen.getByLabelText('Foto aufnehmen')).toBeDisabled()
  })

  it('zeigt keine Vorschau-Leiste ohne Fotos', () => {
    render(
      <PhotoPicker
        pendingPhotos={[]}
        onPhotosSelected={vi.fn()}
        onRemovePhoto={vi.fn()}
        compressImage={mockCompressImage}
      />,
    )

    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })
})
