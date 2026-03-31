'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface UseLongPressOptions {
  delay?: number
  onStart?: () => void
  onCancel?: () => void
}

interface UseLongPressResult {
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void
    onTouchEnd: () => void
    onTouchCancel: () => void
    onContextMenu: (e: React.SyntheticEvent) => void
  }
  isPressed: boolean
  progress: number // 0–1
}

export function useLongPress(
  onLongPress: () => void,
  options?: UseLongPressOptions,
): UseLongPressResult {
  const delay = options?.delay ?? 1500

  // Keep callbacks in refs so handlers don't need to change on every render
  const onLongPressRef = useRef(onLongPress)
  const onStartRef = useRef(options?.onStart)
  const onCancelRef = useRef(options?.onCancel)
  useEffect(() => {
    onLongPressRef.current = onLongPress
    onStartRef.current = options?.onStart
    onCancelRef.current = options?.onCancel
  })

  const [isPressed, setIsPressed] = useState(false)
  const [progress, setProgress] = useState(0)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)
  const firedRef = useRef(false)

  const cleanup = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    setIsPressed(false)
    setProgress(0)
    firedRef.current = false
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return cleanup
  }, [cleanup])

  const onTouchStart = useCallback(
    (_e: React.TouchEvent) => {
      cleanup()

      startTimeRef.current = Date.now()
      firedRef.current = false
      setIsPressed(true)
      setProgress(0)
      onStartRef.current?.()

      // Smooth progress via rAF
      const updateProgress = () => {
        const elapsed = Date.now() - startTimeRef.current
        const p = Math.min(elapsed / delay, 1)
        setProgress(p)
        if (p < 1) {
          rafRef.current = requestAnimationFrame(updateProgress)
        } else {
          rafRef.current = null // Loop natürlich abgeschlossen
        }
      }
      rafRef.current = requestAnimationFrame(updateProgress)

      // Long-press timer
      timerRef.current = setTimeout(() => {
        firedRef.current = true
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(50)
        }
        setIsPressed(false)
        setProgress(0)
        onLongPressRef.current()
      }, delay)
    },
    [delay, cleanup],
  )

  const onTouchEnd = useCallback(() => {
    if (!firedRef.current) {
      onCancelRef.current?.()
    }
    cleanup()
  }, [cleanup])

  const onTouchCancel = useCallback(() => {
    onCancelRef.current?.()
    cleanup()
  }, [cleanup])

  const onContextMenu = useCallback((e: React.SyntheticEvent) => {
    e.preventDefault()
  }, [])

  return {
    handlers: { onTouchStart, onTouchEnd, onTouchCancel, onContextMenu },
    isPressed,
    progress,
  }
}
