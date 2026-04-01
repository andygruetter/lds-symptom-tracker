export const DURATION_STEPS = [0, 1, 5, 15, 30, 60, 120, 240, 480, 720, 1440]

export function stepIndexToMinutes(index: number): number {
  return DURATION_STEPS[Math.max(0, Math.min(index, DURATION_STEPS.length - 1))]
}

export function minutesToStepIndex(minutes: number): number {
  let closest = 0
  let minDiff = Math.abs(minutes - DURATION_STEPS[0])
  for (let i = 1; i < DURATION_STEPS.length; i++) {
    const diff = Math.abs(minutes - DURATION_STEPS[i])
    if (diff < minDiff) {
      minDiff = diff
      closest = i
    }
  }
  return closest
}

export function formatStepLabel(minutes: number): string {
  if (minutes === 0) return '< 30 Sek.'
  if (minutes < 60) return `${minutes} Min.`
  const hours = Math.floor(minutes / 60)
  return `${hours} Std.`
}
