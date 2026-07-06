import { ArrowUpRight, Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { fredIndicatorCategories, fredIndicators, type FredIndicatorCategory } from '../data/fredIndicators'
import fredSnapshot from '../data/fredSnapshot.json'
import {
  formatFredDate,
  formatFredValue,
  formatShortDate,
  formatSnapshotTimestamp,
  formatTrendDelta,
  formatTrendPeriodLabel,
  getTrendDirection,
  type FredTrendDirection,
} from '../lib/formatFredValue'

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

/**
 * "Indicators worth watching" — curated FRED series with a live value, a
 * trend arrow + date vs. the prior reading, and a recent-period label row
 * (last 4 weeks for weekly series, last 6 months for everything else). See
 * src/data/fredIndicators.ts and docs/FRED_DATA.md for how the data flows.
 */
export function FredIndicatorsSection() {
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
            <div className="indicator-grid">
              {indicatorsInCategory.map((indicator) => {
                const snapshotValue = fredSnapshotValues[indicator.id]
                const direction: FredTrendDirection = snapshotValue
                  ? getTrendDirection(snapshotValue.value, snapshotValue.previousValue)
                  : 'flat'
                const TrendIcon = TREND_ICON[direction]

                return (
                  <a
                    className="indicator-card"
                    key={indicator.id}
                    href={indicator.fredUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <div className="indicator-card__top">
                      <span className="indicator-card__series">{indicator.seriesId}</span>
                      <div className="indicator-card__top-right">
                        <span className="indicator-card__cadence">{indicator.cadence}</span>
                        <span className="indicator-help" tabIndex={0} aria-label={`What: ${indicator.what} Why: ${indicator.why}`}>
                          ?
                          <span className="indicator-help__tooltip" role="tooltip">
                            <strong>What:</strong> {indicator.what}
                            <br />
                            <strong>Why:</strong> {indicator.why}
                          </span>
                        </span>
                      </div>
                    </div>
                    <strong>{indicator.label}</strong>
                    {snapshotValue && (
                      <>
                        <span className="indicator-card__value">
                          {formatFredValue(indicator.unit, snapshotValue.value)}
                        </span>
                        <span className={`indicator-card__trend indicator-card__trend--${direction}`}>
                          <TrendIcon size={12} />
                          {formatTrendDelta(indicator.unit, snapshotValue.value, snapshotValue.previousValue)} from{' '}
                          {formatShortDate(snapshotValue.previousDate)}
                        </span>
                        <span className="indicator-card__asof">as of {formatFredDate(snapshotValue.date)}</span>
                        <div className="indicator-card__history">
                          {snapshotValue.recentTrend.map((point) => (
                            <div className="indicator-card__history-row" key={point.date}>
                              <span className="indicator-card__history-label">
                                {formatTrendPeriodLabel(indicator.cadence, point.date)}
                              </span>
                              <span className="indicator-card__history-value">
                                {formatFredValue(indicator.unit, point.value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                    <span className="indicator-card__link">
                      View live on FRED <ArrowUpRight size={13} />
                    </span>
                  </a>
                )
              })}
            </div>
          </div>
        )
      })}
      <p className="overview-section__footnote">
        Values are pulled from FRED and snapshotted at build time (not a live browser feed — FRED doesn't
        support that safely). Last refreshed {formatSnapshotTimestamp(fredSnapshot.generatedAt)}. Every card
        still links straight to the series on FRED so you can verify or go deeper.
      </p>
    </section>
  )
}
