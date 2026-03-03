/**
 * Formats minutes as a human-readable time string.
 * E.g. 135 → "2t 15m", 60 → "1t", 0 → "0m"
 */
export function minutesToDisplay(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}t`
  return `${h}t ${m}m`
}
