'use server'

import { z } from 'zod'

import { createServerClient } from '@/lib/db/client'
import {
  getDayEvents,
  getChronologicalFeed,
  getEventDetail,
  getMonthlyTimeline,
  getSymptomEvents,
  getSymptomRanking,
} from '@/lib/db/insights'
import type {
  EventDetail,
  FeedEvent,
  MonthTimeline,
  PaginatedFeed,
  SymptomRanking,
} from '@/types/analytics'
import type { ActionResult } from '@/types/common'

const loadMoreFeedEventsSchema = z.object({
  cursor: z.string().datetime(),
  limit: z.number().int().min(1).max(50).default(20),
})

export async function loadMoreFeedEvents(
  cursor: string,
  limit?: number,
): Promise<ActionResult<PaginatedFeed>> {
  const parsed = loadMoreFeedEventsSchema.safeParse({
    cursor,
    limit: limit ?? 20,
  })
  if (!parsed.success) {
    return {
      data: null,
      error: { error: 'Ungültiger Cursor', code: 'VALIDATION_ERROR' },
    }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      data: null,
      error: { error: 'Nicht authentifiziert', code: 'AUTH_REQUIRED' },
    }
  }

  const feed = await getChronologicalFeed(supabase, user.id, {
    cursor: parsed.data.cursor,
    limit: parsed.data.limit,
  })

  return { data: feed, error: null }
}

const loadMonthTimelineSchema = z.object({
  year: z.number().int().min(2020).max(2030),
  month: z.number().int().min(1).max(12),
})

export async function loadMonthTimeline(
  year: number,
  month: number,
): Promise<ActionResult<MonthTimeline>> {
  const parsed = loadMonthTimelineSchema.safeParse({ year, month })
  if (!parsed.success) {
    return {
      data: null,
      error: { error: 'Ungültiges Jahr oder Monat', code: 'VALIDATION_ERROR' },
    }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      data: null,
      error: { error: 'Nicht authentifiziert', code: 'AUTH_REQUIRED' },
    }
  }

  const timeline = await getMonthlyTimeline(
    supabase,
    user.id,
    parsed.data.year,
    parsed.data.month,
  )
  return { data: timeline, error: null }
}

const loadDayEventsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function loadDayEvents(
  date: string,
): Promise<ActionResult<FeedEvent[]>> {
  const parsed = loadDayEventsSchema.safeParse({ date })
  if (!parsed.success) {
    return {
      data: null,
      error: { error: 'Ungültiges Datum', code: 'VALIDATION_ERROR' },
    }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      data: null,
      error: { error: 'Nicht authentifiziert', code: 'AUTH_REQUIRED' },
    }
  }

  const events = await getDayEvents(supabase, user.id, parsed.data.date)
  return { data: events, error: null }
}

const loadSymptomRankingSchema = z.object({
  timeRange: z.enum(['30d', '3m', '6m', 'all']),
})

export async function loadSymptomRanking(
  timeRange: string,
): Promise<ActionResult<SymptomRanking>> {
  const parsed = loadSymptomRankingSchema.safeParse({ timeRange })
  if (!parsed.success) {
    return {
      data: null,
      error: { error: 'Ungültiger Zeitraum', code: 'VALIDATION_ERROR' },
    }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      data: null,
      error: { error: 'Nicht authentifiziert', code: 'AUTH_REQUIRED' },
    }
  }

  const ranking = await getSymptomRanking(
    supabase,
    user.id,
    parsed.data.timeRange,
  )
  return { data: ranking, error: null }
}

const loadSymptomEventsSchema = z.object({
  symptomName: z.string().min(1).max(200),
  timeRange: z.enum(['30d', '3m', '6m', 'all']),
})

export async function loadSymptomEvents(
  symptomName: string,
  timeRange: string,
): Promise<ActionResult<FeedEvent[]>> {
  const parsed = loadSymptomEventsSchema.safeParse({ symptomName, timeRange })
  if (!parsed.success) {
    return {
      data: null,
      error: { error: 'Ungültige Parameter', code: 'VALIDATION_ERROR' },
    }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      data: null,
      error: { error: 'Nicht authentifiziert', code: 'AUTH_REQUIRED' },
    }
  }

  const events = await getSymptomEvents(
    supabase,
    user.id,
    parsed.data.symptomName,
    parsed.data.timeRange,
  )
  return { data: events, error: null }
}

const loadEventDetailSchema = z.object({
  eventId: z.string().uuid(),
})

export async function loadEventDetail(
  eventId: string,
): Promise<ActionResult<EventDetail>> {
  const parsed = loadEventDetailSchema.safeParse({ eventId })
  if (!parsed.success) {
    return {
      data: null,
      error: { error: 'Ungültige Event-ID', code: 'VALIDATION_ERROR' },
    }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      data: null,
      error: { error: 'Nicht authentifiziert', code: 'AUTH_REQUIRED' },
    }
  }

  const detail = await getEventDetail(supabase, parsed.data.eventId, user.id)

  if (!detail) {
    return {
      data: null,
      error: { error: 'Event nicht gefunden', code: 'NOT_FOUND' },
    }
  }

  return { data: detail, error: null }
}
