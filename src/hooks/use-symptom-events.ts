'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { createBrowserClient } from '@/lib/db/client'
import type { ExtractedData } from '@/types/ai'
import type { SymptomEvent } from '@/types/symptom'

export function useSymptomEvents() {
  const [events, setEvents] = useState<SymptomEvent[]>([])
  const [extractedDataMap, setExtractedDataMap] = useState<
    Record<string, ExtractedData[]>
  >({})
  const [isLoading, setIsLoading] = useState(true)
  const supabaseRef = useRef(createBrowserClient())

  const loadEvents = useCallback(async () => {
    const { data } = await supabaseRef.current
      .from('symptom_events')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) {
      setEvents(data as SymptomEvent[])

      // Lade extracted_data für bereits extrahierte Events
      const extractedIds = (data as SymptomEvent[])
        .filter(
          (e) => e.status === 'extracted' || e.status === 'confirmed',
        )
        .map((e) => e.id)

      if (extractedIds.length > 0) {
        loadExtractedData(extractedIds)
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

  const addOptimisticEvent = useCallback((rawInput: string): string => {
    const id = `optimistic-${Date.now()}`
    const optimistic: SymptomEvent = {
      id,
      account_id: '',
      event_type: 'symptom',
      raw_input: rawInput,
      status: 'pending',
      created_at: new Date().toISOString(),
      ended_at: null,
      deleted_at: null,
    }
    setEvents((prev) => [optimistic, ...prev])
    return id
  }, [])

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
            setEvents((prev) => {
              const withoutOptimistic = prev.filter(
                (e) => !e.id.startsWith('optimistic-'),
              )
              return [payload.new as SymptomEvent, ...withoutOptimistic]
            })
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
  }, [loadEvents, loadExtractedData])

  return {
    events,
    extractedDataMap,
    isLoading,
    addOptimisticEvent,
    removeOptimisticEvent,
  }
}
