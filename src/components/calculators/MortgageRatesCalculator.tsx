import { useState } from 'react'
import { ArrowLeft, Percent, Printer, RotateCcw } from 'lucide-react'
import {
  calculateProductRate,
  creditBandForScore,
  creditBandWidthPercent,
  creditBands,
  CREDIT_SCORE_MAX,
  CREDIT_SCORE_MIN,
  formatRate,
  rateProducts,
} from '../../lib/mortgageRates'

interface MortgageRatesCalculatorProps {
  onBack: () => void
}

const DEFAULT_SCORE = 815

function safeScore(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_SCORE
  return Math.min(CREDIT_SCORE_MAX, Math.max(CREDIT_SCORE_MIN, Math.round(value)))
}

const boundaries: number[] = [creditBands[0].min, ...creditBands.map((band) => band.max)]
let cumulative = 0
const boundaryPositions = boundaries.map((value, index) => {
  if (index === 0) return 0
  cumulative += creditBandWidthPercent(creditBands[index - 1])
  return cumulative
})

export function MortgageRatesCalculator({ onBack }: MortgageRatesCalculatorProps) {
  const [score, setScore] = useState(DEFAULT_SCORE)

  const activeBand = creditBandForScore(score)

  function resetCalculator() {
    setScore(DEFAULT_SCORE)
  }

  return (
    <main className="mortgage-page mortgage-rates-page" id="mortgage-rates">
      <div className="mortgage-breadcrumb">
        <button type="button" onClick={onBack}>
          <ArrowLeft size={16} /> All calculators
        </button>
        <div className="mortgage-actions">
          <button type="button" onClick={resetCalculator}>
            <RotateCcw size={15} /> Reset
          </button>
          <button type="button" onClick={() => window.print()}>
            <Printer size={15} /> Print
          </button>
        </div>
      </div>

      <header className="mortgage-heading">
        <div className="mortgage-heading__icon"><Percent size={24} /></div>
        <div>
          <p className="eyebrow">MORTGAGE & FINANCING</p>
          <h1>Mortgage rates</h1>
          <p>Current mortgage rates offered by popular lenders.</p>
        </div>
      </header>

      <section className="mortgage-rates-panel">
        <p className="mortgage-rates-intro">
          Credit score health can have a big impact on mortgage payments. Enter your credit
          score below to see how it may impact mortgage rates.
        </p>

        <div className="mortgage-rates-score">
          <label htmlFor="mortgage-rates-score-input">Enter your credit score</label>
          <input
            id="mortgage-rates-score-input"
            type="number"
            min={CREDIT_SCORE_MIN}
            max={CREDIT_SCORE_MAX}
            step={1}
            inputMode="numeric"
            value={score}
            onChange={(event) => setScore(safeScore(event.target.valueAsNumber))}
            style={{ borderColor: activeBand.color, boxShadow: `0 0 0 4px ${activeBand.color}26` }}
          />
          <p className="mortgage-rates-score__rating" key={activeBand.id}>
            RATING &ndash; <span style={{ color: activeBand.color }}>{activeBand.label.toUpperCase()}</span>
          </p>
        </div>

        <div className="mortgage-rates-bar">
          <div className="mortgage-rates-bar__track">
            {creditBands.map((band) => (
              <div
                key={band.id}
                className={`mortgage-rates-bar__segment ${band.id === activeBand.id ? 'is-active' : ''}`}
                style={{ width: `${creditBandWidthPercent(band)}%`, background: band.color }}
              >
                {band.label}
              </div>
            ))}
          </div>
          <div className="mortgage-rates-bar__ticks">
            {boundaries.map((value, index) => {
              const transform =
                index === 0
                  ? 'translateX(0)'
                  : index === boundaries.length - 1
                    ? 'translateX(-100%)'
                    : 'translateX(-50%)'
              return (
                <span key={value} style={{ left: `${boundaryPositions[index]}%`, transform }}>
                  {value}
                </span>
              )
            })}
          </div>
        </div>

        <div className="mortgage-rates-list">
          {rateProducts.map((product) => {
            const rate = calculateProductRate(product, score)
            const delta = Number((rate - product.baseRate).toFixed(2))

            return (
              <div className="rate-row" key={product.id}>
                <span className="rate-row__label">{product.label}</span>
                <span className="rate-row__leader" aria-hidden="true" />
                {delta > 0 ? (
                  <span
                    className="rate-row__delta"
                    key={`delta-${product.id}-${score}`}
                    style={{ color: activeBand.color, borderColor: `${activeBand.color}55` }}
                  >
                    +{delta.toFixed(2)}%
                  </span>
                ) : (
                  <span className="rate-row__delta rate-row__delta--best" key={`best-${product.id}-${score}`}>
                    Best rate
                  </span>
                )}
                <strong className="rate-row__value" key={`${product.id}-${score}`}>
                  {formatRate(rate)}
                  <span aria-hidden="true">*</span>
                </strong>
              </div>
            )
          })}
        </div>

        <div className="mortgage-rates-note">
          <h2>What you need to know:</h2>
          <p>
            There are various types of credit scores. The score you receive is the{' '}
            <strong>VantageScore 3.0</strong> and may not be the score used by your lender for
            lending decisions. Rates shown are for comparison only and are an average of the
            rates taken from multiple lenders and do not include all costs of borrowing. Actual
            rates and terms will vary.
          </p>
        </div>
      </section>

      <p className="mortgage-disclaimer">
        * Rates shown are for comparison only and are an average of the rates taken from
        multiple lenders and do not include all costs of borrowing. Actual rates and terms will
        vary.
      </p>
    </main>
  )
}
