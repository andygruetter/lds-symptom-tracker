'use client'

import { useState } from 'react'

interface AudioPlayerProps {
  audioUrl: string
}

export function AudioPlayer({ audioUrl }: AudioPlayerProps) {
  const [error, setError] = useState(false)

  if (error) {
    return (
      <p className="text-sm text-muted-foreground">
        Audio konnte nicht geladen werden
      </p>
    )
  }

  return (
    <audio
      src={audioUrl}
      controls
      controlsList="nodownload"
      preload="metadata"
      className="w-full rounded-xl"
      onError={() => setError(true)}
      onContextMenu={(e) => e.preventDefault()}
    />
  )
}
