import { useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { ArrowLeft, HelpCircle, Printer, RotateCcw, TrendingUp } from 'lucide-react'
import { calculateHomeEquity } from '../lib/homeEquity'

interface HomeEquityCalculatorProps {
  onBack: () => void
}

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const preciseCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function safeNumber(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

function FieldLabel({ label, help }: { label: string; help?: string }) {
  return (
    <span className="field-label">
      {label}
      {help && (
        <span className="field-help" aria-label={help}>
          <HelpCircle size={13} />
          <span className="field-help__tooltip">{help}</span>
        </span>
      )}
    </span>
  )
}

interface MoneyFieldProps {
  id: string
  label: string
  value: number
  onChange: (value: number) => void
  help?: string
}

function MoneyField({ id, label, value, onChange, help }: MoneyFieldProps) {
  const [focused, setFocused] = useState(false)
  const displayValue = focused ? (value === 0 ? '' : String(value)) : (value === 0 ? '' : value.toLocaleString('en-US'))
  return (
    <label className="mortgage-field" htmlFor={id}>
      <FieldLabel label={label} help={help} />
      <span className="mortgage-input">
        <span className="mortgage-input__prefix" aria-hidden="true">$</span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(event) => onChange(safeNumber(Number(event.target.value.replace(/,/g, ''))))}
        />
      </span>
    </label>
  )
}

function PercentField({
  id,
  label,
  value,
  onChange,
  step = '0.1',
  help,
}: {
  id: string
  label: string
  value: number
  onChange: (value: number) => void
  step?: string
  help?: string
}) {
  const [rawInput, setRawInput] = useState<string | null>(null)
  const displayValue = rawInput !== null ? rawInput : String(value)
  return (
    <label className="mortgage-field" htmlFor={id}>
      <FieldLabel label={label} help={help} />
      <span className="mortgage-input">
        <span className="mortgage-input__prefix" aria-hidden="true">%</span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onFocus={() => setRawInput(value === 0 ? '' : String(value))}
          onBlur={() => setRawInput(null)}
          onChange={(event) => {
            const raw = event.target.value
            setRawInput(raw)
            const num = Number(raw)
            if (!Number.isNaN(num)) {
              onChange(safeNumber(num))
            }
          }}
        />
      </span>
    </label>
  )
}

function NumberField({
  id,
  label,
  value,
  onChange,
  help,
}: {
  id: string
  label: string
  value: number
  onChange: (value: number) => void
  help?: string
}) {
  return (
    <label className="mortgage-field" htmlFor={id}>
      <FieldLabel label={label} help={help} />
      <span className="mortgage-input">
        <input
          id={id}
          type="number"
          min="1"
          step="1"
          inputMode="numeric"
          value={value}
          onChange={(event) => onChange(Math.max(1, Math.round(safeNumber(event.target.valueAsNumber))))}
        />
      </span>
    </label>
  )
}

const CHART_WIDTH = 680
const CHART_HEIGHT = 300
const PADDING_LEFT = 66
const PADDING_RIGHT = 16
const PADDING_TOP = 20
const PADDING_BOTTOM = 34
const PLOT_WIDTH = CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT
const PLOT_HEIGHT = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM

const VALUE_COLOR = '#2f81f7'
const BALANCE_COLOR = '#f0883e'
const EQUITY_COLOR = '#3fb950'

export function HomeEquityCalculator({ onBack }: HomeEquityCalculatorProps) {
  const [currentHomeValue, setCurrentHomeValue] = useState(550_000)
  const [currentMortgageBalance, setCurrentMortgageBalance] = useState(320_000)
  const [interestRate, setInterestRate] = useState(6.2)
  const [remainingTermYears, setRemainingTermYears] = useState(25)
  const [homeAppreciationRate, setHomeAppreciationRate] = useState(3.5)
  const [yearsToProject, setYearsToProject] = useState(10)

  const [hoveredYear, setHoveredYear] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const result = useMemo(
    () =>
      calculateHomeEquity({
        currentHomeValue,
        currentMortgageBalance,
        interestRate,
        remainingTermYears,
        homeAppreciationRate,
        yearsToProject,
      }),
    [currentHomeValue, currentMortgageBalance, interestRate, remainingTermYears, homeAppreciationRate, yearsToProject],
  )

  function resetCalculator() {
    setCurrentHomeValue(550_000)
    setCurrentMortgageBalance(320_000)
    setInterestRate(6.2)
    setRemainingTermYears(25)
    setHomeAppreciationRate(3.5)
    setYearsToProject(10)
  }

  const maxYear = result.points[result.points.length - 1]?.year ?? 1
  const maxValue = Math.max(1, ...result.points.map((point) => point.homeValue))
  const niceMax = (() => {
    const exponent = Math.floor(Math.log10(maxValue))
    const magnitude = 10 ** exponent
    const residual = maxValue / magnitude
    const niceResidual = residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 5 ? 5 : 10
    return niceResidual * magnitude
  })()

  function toPoint(year: number, value: number) {
    return {
      x: PADDING_LEFT + (year / maxYear) * PLOT_WIDTH,
      y: PADDING_TOP + PLOT_HEIGHT - (value / niceMax) * PLOT_HEIGHT,
    }
  }

  const homeValuePath = result.points
    .map((point, index) => {
      const { x, y } = toPoint(point.year, point.homeValue)
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
  const loanBalancePath = result.points
    .map((point, index) => {
      const { x, y } = toPoint(point.year, point.loanBalance)
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')

  const equityAreaPath = `${homeValuePath} L${toPoint(maxYear, result.points[result.points.length - 1].loanBalance).x.toFixed(2)},${toPoint(maxYear, result.points[result.points.length - 1].loanBalance).y.toFixed(2)} ${result.points
    .slice()
    .reverse()
    .map((point) => {
      const { x, y } = toPoint(point.year, point.loanBalance)
      return `L${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')} Z`

  const yearStep = maxYear > 20 ? 5 : maxYear > 10 ? 2 : 1
  const xAxisYears = Array.from({ length: Math.floor(maxYear / yearStep) + 1 }, (_, i) => i * yearStep)

  function handleChartMouseMove(event: ReactMouseEvent<SVGSVGElement>) {
    const svg = svgRef.current
    if (!svg) return

    const rect = svg.getBoundingClientRect()
    const scaleX = CHART_WIDTH / rect.width
    const xInViewBox = (event.clientX - rect.left) * scaleX
    const yearFraction = ((xInViewBox - PADDING_LEFT) / PLOT_WIDTH) * maxYear
    const nearestYear = Math.round(Math.min(maxYear, Math.max(0, yearFraction)))
    setHoveredYear(nearestYear)
  }

  const hoveredPoint = hoveredYear === null ? null : result.points[hoveredYear] ?? null

  return (
    <main className="mortgage-page home-equity-page" id="home-equity">
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
        <div className="mortgage-heading__icon"><TrendingUp size={24} /></div>
        <div>
          <p className="eyebrow">PROPERTY INSIGHTS</p>
          <h1>Home equity</h1>
          <p>Estimate your current equity and model future appreciation scenarios.</p>
        </div>
      </header>

      <section className="seller-proceeds-panel home-equity-panel">
        <div className="mortgage-expense-grid">
          <MoneyField
            id="he-home-value"
            label="Current home value"
            value={currentHomeValue}
            onChange={setCurrentHomeValue}
            help="Your home's estimated current market value — from a recent appraisal, comparable sales, or an online estimate."
          />
          <MoneyField
            id="he-mortgage-balance"
            label="Current mortgage balance"
            value={currentMortgageBalance}
            onChange={setCurrentMortgageBalance}
            help="How much you still owe on your mortgage today — found on your latest statement. Include second mortgages or HELOC balances for a full picture."
          />
        </div>
        <div className="mortgage-expense-grid">
          <PercentField
            id="he-interest-rate"
            label="Interest rate"
            value={interestRate}
            onChange={setInterestRate}
            step="0.01"
            help="The interest rate on your current mortgage."
          />
          <NumberField
            id="he-remaining-term"
            label="Remaining term (years)"
            value={remainingTermYears}
            onChange={setRemainingTermYears}
            help="Years left until your current mortgage is paid off."
          />
        </div>
        <div className="mortgage-expense-grid">
          <PercentField
            id="he-appreciation"
            label="Home appreciation /yr"
            value={homeAppreciationRate}
            onChange={setHomeAppreciationRate}
            help="How much home values rise per year in your area. The long-term US average is roughly 3–4%, but local markets vary widely."
          />
          <NumberField
            id="he-years-to-project"
            label="Years to project"
            value={yearsToProject}
            onChange={setYearsToProject}
            help="How far into the future to forecast your equity."
          />
        </div>

        <div className="seller-proceeds-divider" />

        <div className="amortization-summary-list home-equity-summary">
          <div>
            <dt>
              <FieldLabel
                label="Current equity"
                help="Your home's value minus what you still owe — the portion of the home you truly own."
              />
            </dt>
            <dd>{currency.format(result.currentEquity)}</dd>
          </div>
          <div>
            <dt>
              <FieldLabel
                label="Equity share of value"
                help="Your equity as a percentage of the home's value. 100% means the home is paid off."
              />
            </dt>
            <dd>{(result.currentEquityPercent * 100).toFixed(1)}%</dd>
          </div>
          <div>
            <dt>
              <FieldLabel
                label="Current loan-to-value"
                help="LTV — your mortgage balance divided by the home's value. Lower is better; below 80% you can usually drop PMI and qualify for better loan terms."
              />
            </dt>
            <dd>{(result.currentLoanToValue * 100).toFixed(1)}%</dd>
          </div>
          <div>
            <dt>
              <FieldLabel
                label="Available at 80% CLTV"
                help="CLTV = combined loan-to-value. Most lenders let you borrow against your home (HELOC or home equity loan) until total debt reaches 80% of its value — this is the equity you could tap today."
              />
            </dt>
            <dd>{currency.format(result.availableEquityAt80Percent)}</dd>
          </div>
          <div>
            <dt>
              <FieldLabel
                label={`Projected equity in ${yearsToProject} ${yearsToProject === 1 ? 'year' : 'years'}`}
                help="Estimated future home value (at your assumed appreciation rate) minus the projected remaining loan balance at that point."
              />
            </dt>
            <dd>{currency.format(result.projectedEquity)}</dd>
          </div>
        </div>

        <div className="mortgage-insight">
          <p>
            Your equity is projected to grow by {currency.format(result.equityGrowth)} over the next{' '}
            {yearsToProject} {yearsToProject === 1 ? 'year' : 'years'}, reaching {currency.format(result.projectedEquity)}{' '}
            as the home appreciates and the loan balance pays down.
          </p>
        </div>

        <figure className="rent-vs-buy-chart home-equity-chart">
          <figcaption className="rent-vs-buy-chart__title">Home value, loan balance & equity over time</figcaption>
          <div className="rent-vs-buy-chart__wrap">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              role="img"
              aria-label="Chart showing projected home value, loan balance, and equity over time"
              onMouseMove={handleChartMouseMove}
              onMouseLeave={() => setHoveredYear(null)}
            >
              {xAxisYears.map((year) => {
                const { x } = toPoint(year, 0)
                return (
                  <line
                    key={year}
                    className="rent-vs-buy-chart__gridline"
                    x1={x}
                    x2={x}
                    y1={PADDING_TOP}
                    y2={PADDING_TOP + PLOT_HEIGHT}
                  />
                )
              })}

              <path d={equityAreaPath} fill={EQUITY_COLOR} opacity={0.14} stroke="none" />
              <path d={homeValuePath} fill="none" stroke={VALUE_COLOR} strokeWidth={2} />
              <path d={loanBalancePath} fill="none" stroke={BALANCE_COLOR} strokeWidth={2} />

              {[niceMax, niceMax / 2, 0].map((value) => {
                const { y } = toPoint(0, value)
                return (
                  <text key={value} className="rent-vs-buy-chart__y-tick" x={PADDING_LEFT - 10} y={y + 4} textAnchor="end">
                    {currency.format(Math.round(value))}
                  </text>
                )
              })}

              {xAxisYears.map((year) => {
                const { x } = toPoint(year, 0)
                return (
                  <text key={year} className="rent-vs-buy-chart__x-tick" x={x} y={CHART_HEIGHT - 8} textAnchor="middle">
                    {year}
                  </text>
                )
              })}

              <text className="rent-vs-buy-chart__axis-label" x={PADDING_LEFT + PLOT_WIDTH / 2} y={CHART_HEIGHT} textAnchor="middle">
                Year
              </text>

              {hoveredPoint && (
                <>
                  <line
                    className="rent-vs-buy-chart__hover-line"
                    x1={toPoint(hoveredPoint.year, 0).x}
                    x2={toPoint(hoveredPoint.year, 0).x}
                    y1={PADDING_TOP}
                    y2={PADDING_TOP + PLOT_HEIGHT}
                  />
                  <circle
                    cx={toPoint(hoveredPoint.year, hoveredPoint.homeValue).x}
                    cy={toPoint(hoveredPoint.year, hoveredPoint.homeValue).y}
                    r={4.5}
                    fill={VALUE_COLOR}
                  />
                  <circle
                    cx={toPoint(hoveredPoint.year, hoveredPoint.loanBalance).x}
                    cy={toPoint(hoveredPoint.year, hoveredPoint.loanBalance).y}
                    r={4.5}
                    fill={BALANCE_COLOR}
                  />
                </>
              )}
            </svg>

            {hoveredPoint && (
              <div
                className="rent-vs-buy-tooltip"
                style={{
                  left: `${(toPoint(hoveredPoint.year, 0).x / CHART_WIDTH) * 100}%`,
                  top: `${(toPoint(hoveredPoint.year, hoveredPoint.homeValue).y / CHART_HEIGHT) * 100}%`,
                }}
              >
                <strong>Year {hoveredPoint.year}</strong>
                <span><i style={{ background: VALUE_COLOR }} />{preciseCurrency.format(hoveredPoint.homeValue)}</span>
                <span><i style={{ background: BALANCE_COLOR }} />{preciseCurrency.format(hoveredPoint.loanBalance)}</span>
                <span><i style={{ background: EQUITY_COLOR }} />{preciseCurrency.format(hoveredPoint.equity)} equity</span>
              </div>
            )}
          </div>

          <figcaption className="rent-vs-buy-legend">
            <span><i style={{ background: VALUE_COLOR }} /> Home value</span>
            <span><i style={{ background: BALANCE_COLOR }} /> Loan balance</span>
            <span><i style={{ background: EQUITY_COLOR }} /> Equity</span>
          </figcaption>
        </figure>
      </section>

      <p className="mortgage-disclaimer">
        Results are estimates for educational purposes only. Actual home values, loan balances,
        and appreciation will vary.
      </p>
    </main>
  )
}
