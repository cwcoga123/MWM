import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Minus, TrendingDown, TrendingUp, ArrowUpRight, HelpCircle, Star } from 'lucide-react'
import { fredIndicatorCategories, fredIndicators, type FredIndicatorCategory } from '../../data/fredIndicators'
import fredSnapshot from '../../data/fredSnapshot.json'
import { getNextRelease } from '../../lib/nextRelease'
import {
  formatFredDate,
  formatFredValue,
  getTrendDirection,
  type FredTrendDirection,
} from '../../lib/formatFredValue'

interface FredSnapshotEntry {
  seriesId: string
  value: number
  date: string
  previousValue: number
  previousDate: string
  recentTrend: { date: string; value: number }[]
}

const fredSnapshotValues = fredSnapshot.values as Record<string, FredSnapshotEntry>
const categoryOrder = Object.keys(fredIndicatorCategories) as FredIndicatorCategory[]

const TREND_ICON: Record<FredTrendDirection, typeof TrendingUp> = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
}

/** Renders a 3-star importance rating, e.g. ★★☆ for importance 2. */
function ImportanceStars({ importance }: { importance: 1 | 2 | 3 }) {
  return (
    <span className="econ-table__stars" aria-label={`Importance: ${importance} of 3`}>
      {[1, 2, 3].map((n) => (
        <Star key={n} size={11} className={n <= importance ? 'is-filled' : ''} />
      ))}
    </span>
  )
}

/**
 * The "?" help icon — hovering (or focusing, for keyboard use) reveals what
 * this is, why it matters, what to watch for next, and what it means for a
 * buyer. Rendered through a portal straight into <body> and positioned with
 * fixed coordinates from the icon's own bounding box, so it can never get
 * clipped by the scrollable table box around it (a plain CSS absolute
 * tooltip was getting hidden that way — this fixes it for good).
 */
function IndicatorHelp({
  what,
  why,
  watchFor,
  impact,
}: {
  what: string
  why: string
  watchFor: string
  impact: string
}) {
  const iconRef = useRef<HTMLSpanElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  function show() {
    const rect = iconRef.current?.getBoundingClientRect()
    if (!rect) return
    const width = 240
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8)
    setPosition({ top: rect.bottom + 8, left })
  }

  function hide() {
    setPosition(null)
  }

  return (
    <span
      className="econ-help"
      ref={iconRef}
      tabIndex={0}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      aria-label={`What: ${what} Why it matters: ${why} What to watch for: ${watchFor} What it means for you: ${impact}`}
    >
      <HelpCircle size={14} />
      {position &&
        createPortal(
          <span
            className="econ-tooltip-portal"
            role="tooltip"
            style={{ top: position.top, left: position.left }}
          >
            <p>
              <strong>What it is:</strong> {what}
            </p>
            <p>
              <strong>Why it's important:</strong> {why}
            </p>
            <p>
              <strong>What to watch for:</strong> {watchFor}
            </p>
            <p>
              <strong>What it means for you:</strong> {impact}
            </p>
          </span>,
          document.body,
        )}
    </span>
  )
}

/**
 * "Rate Watch" — curated FRED series rendered as an economic-calendar-style
 * table (Last Release / Next Release / Cur. / Event / Imp. / Actual /
 * Forecast / Previous), one row per series, grouped by category. Forecast is
 * always a dash: FRED reports actuals only, it doesn't carry consensus
 * estimates. Each row is a single line — hover the "?" for the definition,
 * why it matters, what to watch for next, and what it means for a buyer, or
 * follow the arrow icon straight out to FRED to verify. See
 * src/data/fredIndicators.ts, src/lib/nextRelease.ts and docs/FRED_DATA.md
 * for how the data flows.
 */
export function FredIndicatorsSection() {
  return (
    <section className="overview-section">
      <div className="overview-section__heading">
        <h2>RATE WATCH</h2>
      </div>
      {categoryOrder.map((category) => {
        const indicatorsInCategory = fredIndicators.filter((indicator) => indicator.category === category)
        if (indicatorsInCategory.length === 0) return null

        return (
          <div className="indicator-group" key={category}>
            <h3 className="indicator-group__title">{fredIndicatorCategories[category]}</h3>
            <div className="econ-table-wrap econ-table-wrap--indicator">
              <table className="econ-table econ-table--indicator">
                <colgroup>
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '5%' }} />
                  <col style={{ width: '30%' }} />
                  <col style={{ width: '7%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '5%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th className="econ-table__th--left">Last Release</th>
                    <th className="econ-table__th--left">Next Release</th>
                    <th className="econ-table__th--center">Cur.</th>
                    <th className="econ-table__th--left">Event</th>
                    <th className="econ-table__th--center">Imp.</th>
                    <th className="econ-table__th--right">Actual</th>
                    <th className="econ-table__th--right">Forecast</th>
                    <th className="econ-table__th--right">Previous</th>
                    <th className="econ-table__th--link" aria-label="FRED link" />
                  </tr>
                </thead>
                <tbody>
                  {indicatorsInCategory.map((indicator) => {
                    const snapshotValue = fredSnapshotValues[indicator.id]
                    const direction: FredTrendDirection = snapshotValue
                      ? getTrendDirection(snapshotValue.value, snapshotValue.previousValue)
                      : 'flat'
                    const TrendIcon = TREND_ICON[direction]
                    const nextRelease = getNextRelease(indicator, snapshotValue?.date)

                    return (
                      <tr className="econ-table__row econ-table__row--indicator" key={indicator.id}>
                        <td className="econ-table__time">
                          {snapshotValue ? formatFredDate(snapshotValue.date) : '—'}
                        </td>
                        <td className="econ-table__time">
                          {nextRelease ? (
                            <>
                              {nextRelease.estimated && <span className="econ-table__est-mark">~</span>}
                              {nextRelease.dateLabel}
                              {nextRelease.time && <span className="econ-table__time-detail">{nextRelease.time}</span>}
                            </>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="econ-table__flag" aria-label="United States">
                          🇺🇸
                        </td>
                        <td className="econ-table__event econ-table__event--indicator">
                          <span className="econ-table__event-name">{indicator.label}</span>
                          <IndicatorHelp
                            what={indicator.what}
                            why={indicator.why}
                            watchFor={indicator.watchFor}
                            impact={indicator.impact}
                          />
                        </td>
                        <td className="econ-table__cell--center">
                          <ImportanceStars importance={indicator.importance} />
                        </td>
                        <td className={`econ-table__actual econ-table__cell--right econ-table__actual--${direction}`}>
                          {snapshotValue ? (
                            <>
                              {formatFredValue(indicator.unit, snapshotValue.value)}
                              <TrendIcon size={11} />
                            </>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="econ-table__muted econ-table__cell--right">—</td>
                        <td className="econ-table__muted econ-table__cell--right">
                          {snapshotValue ? formatFredValue(indicator.unit, snapshotValue.previousValue) : '—'}
                        </td>
                        <td className="econ-table__cell--link">
                          <a
                            className="econ-table__fred-link"
                            href={indicator.fredUrl}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`View ${indicator.label} live on FRED`}
                            title="View live on FRED"
                          >
                            <ArrowUpRight size={14} />
                          </a>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </section>
  )
}
