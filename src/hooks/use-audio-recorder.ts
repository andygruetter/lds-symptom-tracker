'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type RecordingState = 'idle' | 'recording' | 'processing'
export type PermissionState = 'prompt' | 'granted' | 'denied' | 'unsupported'

const MIN_DURATION_MS = 500
const MAX_DURATION_S = 60
const WARNING_DURATION_S = 50

// MIME-Type Prioritätsliste
const MIME_PRIORITIES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']

function getSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  return MIME_PRIORITIES.find((mime) => MediaRecorder.isTypeSupported(mime))
}

export interface AudioRecorderResult {
  state: RecordingState
  permission: PermissionState
  duration: number
  isWarning: boolean
  analyserData: Uint8Array | null
  mimeType: string | null
  startRecording: () => Promise<void>
  stopRecording: () => Promise<Blob | null>
  cancelRecording: () => void
}

export function useAudioRecorder(): AudioRecorderResult {
  const [state, setState] = useState<RecordingState>('idle')
  const [permission, setPermission] = useState<PermissionState>('prompt')
  const [duration, setDuration] = useState(0)
  const [analyserData, setAnalyserData] = useState<Uint8Array | null>(null)
  const [mimeType, setMimeType] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef<number>(0)
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  )
  const animationFrameRef = useRef<number>(0)
  const resolveStopRef = useRef<((blob: Blob | null) => void) | null>(null)

  const isWarning = duration >= WARNING_DURATION_S

  // Check browser support
  useEffect(() => {
    if (typeof navigator === 'undefined') return
    if (!('mediaDevices' in navigator) || !('MediaRecorder' in window)) {
      setPermission('unsupported')
    }
  }, [])

  const cleanup = useCallback(() => {
    // Stop duration timer
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }

    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = 0
    }

    // Stop media tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
      analyserRef.current = null
    }

    mediaRecorderRef.current = null
    chunksRef.current = []
    setDuration(0)
    setAnalyserData(null)
    setState('idle')
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  const updateAnalyserData = useCallback(function tick() {
    if (!analyserRef.current) return

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteTimeDomainData(dataArray)
    setAnalyserData(new Uint8Array(dataArray))

    animationFrameRef.current = requestAnimationFrame(tick)
  }, [])

  const startRecording = useCallback(async () => {
    if (state !== 'idle' || permission === 'unsupported') return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      setPermission('granted')

      // Check if stream is active (iOS App-Switch Recovery)
      if (!stream.active) {
        cleanup()
        return
      }

      const supportedMime = getSupportedMimeType()
      const recorder = new MediaRecorder(
        stream,
        supportedMime ? { mimeType: supportedMime } : undefined,
      )
      mediaRecorderRef.current = recorder
      setMimeType(recorder.mimeType)
      chunksRef.current = []

      // Setup AudioContext + AnalyserNode for waveform
      const audioContext = new AudioContext()
      audioContextRef.current = audioContext

      // iOS Safari: AudioContext starts suspended, must resume with user gesture
      if (audioContext.state === 'suspended') {
        await audioContext.resume()
      }

      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      // Start waveform animation
      updateAnalyserData()

      // Collect chunks
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
        const recordDuration = Date.now() - startTimeRef.current

        if (recordDuration < MIN_DURATION_MS) {
          // Too short — silently discard with vibration
          if (navigator.vibrate) {
            navigator.vibrate(50)
          }
          cleanup()
          resolveStopRef.current?.(null)
          resolveStopRef.current = null
          return
        }

        setState('processing')
        resolveStopRef.current?.(blob)
        resolveStopRef.current = null
      }

      // Start recording — NO timeslice parameter (Safari bug!)
      recorder.start()
      startTimeRef.current = Date.now()
      setState('recording')

      // Duration counter via setInterval + Date.now()
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
        setDuration(elapsed)

        // Auto-stop at max duration
        if (elapsed >= MAX_DURATION_S) {
          if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop()
          }
        }
      }, 200)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        setPermission('denied')
      }
      cleanup()
    }
  }, [state, permission, cleanup, updateAnalyserData])

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (mediaRecorderRef.current?.state !== 'recording') {
        resolve(null)
        return
      }

      resolveStopRef.current = resolve
      mediaRecorderRef.current.stop()

      // Stop duration timer and animation but keep state as 'processing'
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
        durationIntervalRef.current = null
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = 0
      }

      // Stop media tracks
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop())
        mediaStreamRef.current = null
      }

      // Close audio context
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {})
        audioContextRef.current = null
        analyserRef.current = null
      }
    })
  }, [])

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      // Remove onstop handler to prevent processing
      mediaRecorderRef.current.onstop = null
      mediaRecorderRef.current.stop()
    }
    resolveStopRef.current?.(null)
    resolveStopRef.current = null
    cleanup()
  }, [cleanup])

  return {
    state,
    permission,
    duration,
    isWarning,
    analyserData,
    mimeType,
    startRecording,
    stopRecording,
    cancelRecording,
  }
}
