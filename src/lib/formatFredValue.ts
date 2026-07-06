import type { FredIndicatorUnit } from '../data/fredIndicators'

/** Formats a raw FRED observation value for display, based on the series' unit. */
export function formatFredValue(unit: FredIndicatorUnit, value: number): string {
  switch (unit) {
    case 'percent':
      return `${value.toFixed(2)}%`
    case 'currency':
      return `$${Math.round(value).toLocaleString('en-US')}`
    case 'days':
      return `${Math.round(value)} days`
    case 'count':
      return Math.round(value).toLocaleString('en-US')
    case 'index':
      return value.toFixed(1)
    default:
      return String(value)
  }
}

/** Formats a FRED observation date ('YYYY-MM-DD') as e.g. "Jul 2, 2026". Parsed as UTC to avoid off-by-one drift. */
export function formatFredDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

/** Formats a FRED observation date without the year, e.g. "Jun 25". Used for the trend "from" date. */
export function formatShortDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

/**
 * Labels a single point in an indicator's recent-trend row: a short "M/D"
 * date for weekly-cadence series (last 4 weeks), "Q1 26" style for
 * quarterly-cadence series, or just the month abbreviation for everything
 * else (last 6 months).
 */
export function formatTrendPeriodLabel(cadence: string, isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  const lowerCadence = cadence.toLowerCase()

  if (lowerCadence.includes('week')) {
    return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', timeZone: 'UTC' })
  }
  if (lowerCadence.includes('quarter')) {
    const quarter = Math.floor(date.getUTCMonth() / 3) + 1
    const shortYear = date.getUTCFullYear().toString().slice(-2)
    return `Q${quarter} '${shortYear}`
  }
  return date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })
}

/** Formats the snapshot's generatedAt timestamp as e.g. "Jul 6, 2026, 6:05 AM UTC". */
export function formatSnapshotTimestamp(isoTimestamp: string): string {
  const date = new Date(isoTimestamp)
  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })} UTC`
}

export type FredTrendDirection = 'up' | 'down' | 'flat'

/** Direction of the latest reading vs. the immediately prior one. Treats sub-0.005 moves as flat. */
export function getTrendDirection(current: number, previous: number): FredTrendDirection {
  const delta = current - previous
  if (Math.abs(delta) < 0.005) return 'flat'
  return delta > 0 ? 'up' : 'down'
}

/** Short, signed delta vs. the prior reading, e.g. "+0.06%", "-$1,750", "+13", "+5 days", "-1.29". */
export function formatTrendDelta(unit: FredIndicatorUnit, current: number, previous: number): string {
  const delta = current - previous
  const sign = delta > 0 ? '+' : delta < 0 ? '-' : '±'
  return `${sign}${formatFredValue(unit, Math.abs(delta))}`
}
