import { realEstateCalendarEvents } from '../data/realEstateCalendar'
import type { FredIndicator } from '../data/fredIndicators'
import { formatFredDate } from './formatFredValue'

/**
 * Maps a FRED indicator id to a keyword we can match against
 * realEstateCalendarEvents[].event, so "Next Release" can show a confirmed
 * date/time straight from the manually-curated calendar instead of a guess —
 * for the handful of series that actually appear there (CPI, PCE, jobs
 * report, jobless claims, FOMC, Freddie Mac PMMS, Case-Shiller, metro
 * unemployment). Everything else falls back to cadence math below.
 */
const CALENDAR_KEYWORD: Record<string, string> = {
  'mortgage-30': 'mortgage rates',
  'mortgage-15': 'mortgage rates',
  'fed-funds': 'fomc',
  cpi: 'consumer price index',
  'core-pce': 'core pce',
  'unemployment-rate': 'employment situation',
  'nonfarm-payrolls': 'employment situation',
  'jobless-claims': 'jobless claims',
  'sf-case-shiller': 'case-shiller',
  'san-jose-unemployment': 'metro unemployment',
  'sf-unemployment': 'metro unemployment',
}

export interface NextReleaseResult {
  /** Formatted date, e.g. "Jul 28, 2026". */
  dateLabel: string
  /** Release time, if known, e.g. "8:30 AM ET". */
  time?: string
  /** True when this is cadence-math guesswork rather than a confirmed schedule date. */
  estimated: boolean
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date)
  next.setUTCMonth(next.getUTCMonth() + months)
  return next
}

/** Nudges a computed weekday off Sat/Sun onto the following Monday — most economic releases are weekday-only. */
function nextWeekday(date: Date): Date {
  const day = date.getUTCDay()
  if (day === 6) return addDays(date, 2)
  if (day === 0) return addDays(date, 1)
  return date
}

function fallbackNextDate(cadence: string, lastReleaseIso: string): Date {
  const last = new Date(`${lastReleaseIso}T00:00:00Z`)
  const lower = cadence.toLowerCase()

  if (lower.includes('daily')) return nextWeekday(addDays(last, 1))
  if (lower.includes('week')) return addDays(last, 7)
  if (lower.includes('quarter')) return addMonths(last, 3)
  if (lower.includes('fomc') || lower.includes('8x')) return addDays(last, 47) // ~8 meetings/year
  return addMonths(last, 1) // monthly default
}

/**
 * Computes the "Next Release" cell for an indicator: a confirmed date pulled
 * from the real-estate calendar when this series has an entry there, or a
 * cadence-based estimate (prefixed with "~" in the UI) otherwise. Returns
 * null when there's no last-release date to project from (no snapshot data).
 */
export function getNextRelease(indicator: FredIndicator, lastReleaseIso: string | undefined): NextReleaseResult | null {
  if (!lastReleaseIso) return null

  const keyword = CALENDAR_KEYWORD[indicator.id]
  if (keyword) {
    const match = realEstateCalendarEvents
      .filter((event) => event.event.toLowerCase().includes(keyword) && event.date > lastReleaseIso)
      .sort((a, b) => a.date.localeCompare(b.date))[0]
    if (match) {
      return {
        dateLabel: formatFredDate(match.date),
        time: match.time,
        estimated: Boolean(match.estimated),
      }
    }
  }

  const estimatedDate = fallbackNextDate(indicator.cadence, lastReleaseIso)
  const isoEstimate = estimatedDate.toISOString().slice(0, 10)
  return {
    dateLabel: formatFredDate(isoEstimate),
    time: indicator.releaseTime,
    estimated: true,
  }
}
