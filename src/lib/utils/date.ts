import type { FeedEvent } from '@/types/analytics'

export function toLocalDateKey(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function groupEventsByDay(
  events: FeedEvent[],
): Map<string, FeedEvent[]> {
  const groups = new Map<string, FeedEvent[]>()

  for (const event of events) {
    const key = toLocalDateKey(new Date(event.occurredAt))
    const existing = groups.get(key)
    if (existing) {
      existing.push(event)
    } else {
      groups.set(key, [event])
    }
  }

  return groups
}
