export function formatDuration(start: Date, end: Date): string {
  const diffMs = end.getTime() - start.getTime()
  const minutes = Math.floor(diffMs / (1000 * 60))
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days} Tag${days > 1 ? 'e' : ''}`
  if (hours > 0) {
    const remainMinutes = minutes % 60
    if (remainMinutes === 0)
      return `${hours} Stunde${hours > 1 ? 'n' : ''}`
    return `${hours} Std. ${remainMinutes} Min.`
  }
  return `${minutes} Minute${minutes !== 1 ? 'n' : ''}`
}

export function formatActiveSince(start: Date): string {
  return `Aktiv seit ${formatDuration(start, new Date())}`
}
