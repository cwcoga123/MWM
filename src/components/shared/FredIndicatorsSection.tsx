import { Fragment, useState } from 'react'
import { ChevronDown, Minus, Star, TrendingDown, TrendingUp } from 'lucide-react'
import { fredIndicatorCategories, fredIndicators, type FredIndicatorCategory } from '../../data/fredIndicators'
import fredSnapshot from '../../data/fredSnapshot.json'
import {
  formatFredDate,
  formatFredValue,
  formatShortDate,
  formatSnapshotTimestamp,
  formatTrendDelta,
  formatTrendPeriodLabel,
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
 * "Indicators worth watching" — curated FRED series rendered as an economic-
 * calendar-style table (Time / Cur. / Event / Imp. / Actual / Forecast /
 * Previous), one row per series, grouped by category. Forecast is always a
 * dash: FRED reports actuals only, it doesn't carry consensus estimates.
 * Click a row to expand the recent-history trend and the What/Why context.
 * See src/data/fredIndicators.ts and docs/FRED_DATA.md for how the data flows.
 */
export function FredIndicatorsSection() {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <section className="overview-section">
      <div className="overview-section__heading">
        <span className="eyebrow">INDICATORS WORTH WATCHING</span>
        <h2>The numbers behind every rate conversation</h2>
      </div>
      {categoryOrder.map((category) => {
        const indicatorsInCategory = fredIndicators.filter((indicator) => indicator.category === category)
        if (indicatorsInCategory.length === 0) return null

        return (
          <div className="indicator-group" key={category}>
            <h3 className="indicator-group__title">{fredIndicatorCategories[category]}</h3>
            <div className="econ-table-wrap">
              <table className="econ-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Cur.</th>
                    <th>Event</th>
                    <th>Imp.</th>
                    <th>Actual</th>
                    <th>Forecast</th>
                    <th>Previous</th>
                  </tr>
                </thead>
                <tbody>
                  {indicatorsInCategory.map((indicator) => {
                    const snapshotValue = fredSnapshotValues[indicator.id]
                    const direction: FredTrendDirection = snapshotValue
                      ? getTrendDirection(snapshotValue.value, snapshotValue.previousValue)
                      : 'flat'
                    const TrendIcon = TREND_ICON[direction]
                    const isExpanded = expandedId === indicator.id

                    return (
                      <Fragment key={indicator.id}>
                        <tr
                          className="econ-table__row"
                          onClick={() => setExpandedId(isExpanded ? null : indicator.id)}
                          aria-expanded={isExpanded}
                        >
                          <td className="econ-table__time">
                            {snapshotValue ? formatFredDate(snapshotValue.date) : '—'}
                          </td>
                          <td className="econ-table__flag" aria-label="United States">
                            🇺🇸
                          </td>
                          <td className="econ-table__event">
                            <ChevronDown size={13} className="econ-table__chevron" />
                            <span className="econ-table__event-name">{indicator.label}</span>
                            <span className="econ-table__series">{indicator.seriesId}</span>
                          </td>
                          <td>
                            <ImportanceStars importance={indicator.importance} />
                          </td>
                          <td className={`econ-table__actual econ-table__actual--${direction}`}>
                            {snapshotValue ? (
                              <>
                                {formatFredValue(indicator.unit, snapshotValue.value)}
                                <TrendIcon size={11} />
                              </>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="econ-table__muted">—</td>
                          <td className="econ-table__muted">
                            {snapshotValue ? formatFredValue(indicator.unit, snapshotValue.previousValue) : '—'}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="econ-table__detail-row">
                            <td colSpan={7}>
                              <div className="econ-table__detail">
                                <p>
                                  <strong>What:</strong> {indicator.what}
                                </p>
                                <p>
                                  <strong>Why:</strong> {indicator.why}
                                </p>
                                {snapshotValue && (
                                  <>
                                    <p className="econ-table__detail-delta">
                                      {formatTrendDelta(indicator.unit, snapshotValue.value, snapshotValue.previousValue)}{' '}
                                      from {formatShortDate(snapshotValue.previousDate)}
                                    </p>
                                    <div className="econ-table__history">
                                      {snapshotValue.recentTrend.map((point) => (
                                        <div className="econ-table__history-row" key={point.date}>
                                          <span>{formatTrendPeriodLabel(indicator.cadence, point.date)}</span>
                                          <span>{formatFredValue(indicator.unit, point.value)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </>
                                )}
                                <a
                                  className="econ-table__link"
                                  href={indicator.fredUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  View live on FRED ({indicator.cadence.toLowerCase()})
                                </a>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
      <p className="overview-section__footnote">
        Values are pulled from FRED and snapshotted at build time (not a live browser feed — FRED doesn't
        support that safely). Last refreshed {formatSnapshotTimestamp(fredSnapshot.generatedAt)}. Click any row
        for the definition, why it matters, and recent history — or follow the link out to verify on FRED
        directly.
      </p>
    </section>
  )
}
