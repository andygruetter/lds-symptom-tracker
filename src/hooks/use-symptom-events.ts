'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { createBrowserClient } from '@/lib/db/client'
import type { ExtractedData } from '@/types/ai'
import type { EventPhoto, SymptomEvent } from '@/types/symptom'

export function useSymptomEvents() {
  const [events, setEvents] = useState<SymptomEvent[]>([])
  const [extractedDataMap, setExtractedDataMap] = useState<
    Record<string, ExtractedData[]>
  >({})
  const [photosMap, setPhotosMap] = useState<Record<string, EventPhoto[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const supabaseRef = useRef(createBrowserClient())

  const loadPhotos = useCallback(async (eventIds: string[]) => {
    if (eventIds.length === 0) return

    const { data } = await supabaseRef.current
      .from('event_photos')
      .select('*')
      .in('symptom_event_id', eventIds)

    if (data) {
      const grouped: Record<string, EventPhoto[]> = {}
      for (const row of data as EventPhoto[]) {
        if (!grouped[row.symptom_event_id]) {
          grouped[row.symptom_event_id] = []
        }
        grouped[row.symptom_event_id].push(row)
      }
      setPhotosMap((prev) => ({ ...prev, ...grouped }))
    }
  }, [])

  const loadEvents = useCallback(async () => {
    const { data } = await supabaseRef.current
      .from('symptom_events')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) {
      setEvents(data as SymptomEvent[])

      const eventIds = (data as SymptomEvent[]).map((e) => e.id)

      // Lade extracted_data für bereits extrahierte Events
      const extractedIds = (data as SymptomEvent[])
        .filter((e) => e.status === 'extracted' || e.status === 'confirmed')
        .map((e) => e.id)

      if (extractedIds.length > 0) {
        loadExtractedData(extractedIds)
      }

      // Lade event_photos für alle Events
      if (eventIds.length > 0) {
        loadPhotos(eventIds)
      }
    }
    setIsLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadExtractedData = useCallback(async (eventIds: string[]) => {
    if (eventIds.length === 0) return

    const { data } = await supabaseRef.current
      .from('extracted_data')
      .select('*')
      .in('symptom_event_id', eventIds)

    if (data) {
      const grouped: Record<string, ExtractedData[]> = {}
      for (const row of data as ExtractedData[]) {
        if (!grouped[row.symptom_event_id]) {
          grouped[row.symptom_event_id] = []
        }
        grouped[row.symptom_event_id].push(row)
      }
      setExtractedDataMap((prev) => ({ ...prev, ...grouped }))
    }
  }, [])

  const addOptimisticEvent = useCallback(
    (rawInput: string | null, eventType: string = 'symptom'): string => {
      const id = `optimistic-${Date.now()}`
      const optimistic: SymptomEvent = {
        id,
        account_id: '',
        event_type: eventType,
        raw_input: rawInput,
        audio_url: null,
        status: 'pending',
        created_at: new Date().toISOString(),
        ended_at: null,
        deleted_at: null,
      }
      setEvents((prev) => [optimistic, ...prev])
      return id
    },
    [],
  )

  const removeOptimisticEvent = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id))
  }, [])

  useEffect(() => {
    const supabase = supabaseRef.current

    loadEvents()

    const channel = supabase
      .channel('symptom_events_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'symptom_events',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newEvent = payload.new as SymptomEvent
            setEvents((prev) => {
              const withoutOptimistic = prev.filter(
                (e) => !e.id.startsWith('optimistic-'),
              )
              return [newEvent, ...withoutOptimistic]
            })
            // Lade Fotos für neues Event
            loadPhotos([newEvent.id])
            // Lade extrahierte Daten falls Event bereits extrahiert ist (Multi-Symptom)
            if (
              newEvent.status === 'extracted' ||
              newEvent.status === 'confirmed'
            ) {
              loadExtractedData([newEvent.id])
            }
          }
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as SymptomEvent
            setEvents((prev) =>
              prev.map((e) => (e.id === updated.id ? updated : e)),
            )
            // Lade extrahierte Daten wenn Status auf 'extracted' oder 'confirmed' wechselt
            if (
              updated.status === 'extracted' ||
              updated.status === 'confirmed'
            ) {
              loadExtractedData([updated.id])
            }
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadEvents, loadExtractedData, loadPhotos])

  return {
    events,
    extractedDataMap,
    photosMap,
    isLoading,
    addOptimisticEvent,
    removeOptimisticEvent,
    refreshExtractedData: loadExtractedData,
    refreshPhotos: loadPhotos,
  }
}
