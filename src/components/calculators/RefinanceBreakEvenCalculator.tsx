import { useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { ArrowLeft, HelpCircle, KeyRound, Printer, RotateCcw } from 'lucide-react'
import { calculateRefinanceBreakEven } from '../../lib/refinanceBreakEven'

interface RefinanceBreakEvenCalculatorProps {
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

function MoneyField({
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
  help,
}: {
  id: string
  label: string
  value: number
  onChange: (value: number) => void
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

const SAVINGS_COLOR = '#3fb950'
const COST_COLOR = '#f0883e'

export function RefinanceBreakEvenCalculator({ onBack }: RefinanceBreakEvenCalculatorProps) {
  const [currentLoanBalance, setCurrentLoanBalance] = useState(380_000)
  const [currentInterestRate, setCurrentInterestRate] = useState(7.25)
  const [currentRemainingTermYears, setCurrentRemainingTermYears] = useState(27)
  const [newInterestRate, setNewInterestRate] = useState(6.25)
  const [newLoanTermYears, setNewLoanTermYears] = useState(30)
  const [refinanceClosingCosts, setRefinanceClosingCosts] = useState(6_000)
  const [cashOutAmount, setCashOutAmount] = useState(0)

  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const result = useMemo(
    () =>
      calculateRefinanceBreakEven({
        currentLoanBalance,
        currentInterestRate,
        currentRemainingTermYears,
        newInterestRate,
        newLoanTermYears,
        refinanceClosingCosts,
        cashOutAmount,
      }),
    [
      currentLoanBalance,
      currentInterestRate,
      currentRemainingTermYears,
      newInterestRate,
      newLoanTermYears,
      refinanceClosingCosts,
      cashOutAmount,
    ],
  )

  function resetCalculator() {
    setCurrentLoanBalance(380_000)
    setCurrentInterestRate(7.25)
    setCurrentRemainingTermYears(27)
    setNewInterestRate(6.25)
    setNewLoanTermYears(30)
    setRefinanceClosingCosts(6_000)
    setCashOutAmount(0)
  }

  const maxSavingsValue = Math.max(...result.points.map((point) => point.cumulativeSavings), refinanceClosingCosts)
  const minSavingsValue = Math.min(0, ...result.points.map((point) => point.cumulativeSavings))
  const axisMax = Math.max(1, maxSavingsValue)
  const axisMin = Math.min(0, minSavingsValue)
  const axisRange = axisMax - axisMin || 1

  function toPoint(month: number, value: number) {
    return {
      x: PADDING_LEFT + (month / result.chartMonths) * PLOT_WIDTH,
      y: PADDING_TOP + PLOT_HEIGHT - ((value - axisMin) / axisRange) * PLOT_HEIGHT,
    }
  }

  const savingsPath = result.points
    .map((point, index) => {
      const { x, y } = toPoint(point.month, point.cumulativeSavings)
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')

  const costLineY = toPoint(0, refinanceClosingCosts).y

  const monthStep = result.chartMonths > 120 ? 24 : result.chartMonths > 60 ? 12 : 6
  const xAxisMonths = Array.from({ length: Math.floor(result.chartMonths / monthStep) + 1 }, (_, i) => i * monthStep)

  function handleChartMouseMove(event: ReactMouseEvent<SVGSVGElement>) {
    const svg = svgRef.current
    if (!svg) return

    const rect = svg.getBoundingClientRect()
    const scaleX = CHART_WIDTH / rect.width
    const xInViewBox = (event.clientX - rect.left) * scaleX
    const monthFraction = ((xInViewBox - PADDING_LEFT) / PLOT_WIDTH) * result.chartMonths
    const nearestMonth = Math.round(Math.min(result.chartMonths, Math.max(0, monthFraction)))
    setHoveredMonth(nearestMonth)
  }

  const hoveredSavings = hoveredMonth === null ? null : result.monthlySavings * hoveredMonth

  const noSavings = result.monthlySavings <= 0

  return (
    <main className="mortgage-page refinance-break-even-page" id="refinance-break-even">
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
        <div className="mortgage-heading__icon"><KeyRound size={24} /></div>
        <div>
          <p className="eyebrow">PROPERTY INSIGHTS</p>
          <h1>Refinance break-even</h1>
          <p>Find the point when monthly savings recover your refinance costs.</p>
        </div>
      </header>

      <section className="seller-proceeds-panel refinance-break-even-panel">
        <div className="mortgage-expense-grid">
          <MoneyField
            id="rbe-current-balance"
            label="Current loan balance"
            value={currentLoanBalance}
            onChange={setCurrentLoanBalance}
            help="The remaining principal balance on your existing mortgage today."
          />
          <PercentField
            id="rbe-current-rate"
            label="Current interest rate"
            value={currentInterestRate}
            onChange={setCurrentInterestRate}
            help="The interest rate on your existing mortgage."
          />
        </div>
        <div className="mortgage-expense-grid">
          <NumberField
            id="rbe-current-term"
            label="Current remaining term (years)"
            value={currentRemainingTermYears}
            onChange={setCurrentRemainingTermYears}
            help="Years left until your current mortgage is paid off. E.g., 3 years into a 30-year loan = 27 remaining."
          />
          <PercentField
            id="rbe-new-rate"
            label="New interest rate"
            value={newInterestRate}
            onChange={setNewInterestRate}
            help="The interest rate you'd get on the new refinanced loan."
          />
        </div>
        <div className="mortgage-expense-grid">
          <NumberField
            id="rbe-new-term"
            label="New loan term (years)"
            value={newLoanTermYears}
            onChange={setNewLoanTermYears}
            help="Length of the new loan. Restarting at 30 years lowers the payment but extends your payoff date — part of the 'savings' comes from stretching the loan, not the lower rate."
          />
          <MoneyField
            id="rbe-closing-costs"
            label="Refinance closing costs"
            value={refinanceClosingCosts}
            onChange={setRefinanceClosingCosts}
            help="Lender, appraisal, title, and recording fees for the new loan — typically 2–5% of the balance. This is the cost the monthly savings must recover to break even."
          />
        </div>
        <MoneyField
          id="rbe-cash-out"
          label="Cash-out amount (optional)"
          value={cashOutAmount}
          onChange={setCashOutAmount}
          help="Extra cash borrowed against your home equity at closing. It's added to the new loan balance, which raises the new payment."
        />

        <div className="seller-proceeds-divider" />

        <div className="amortization-summary-list refinance-break-even-summary">
          <div>
            <dt>
              <FieldLabel label="Current monthly payment" help="Principal & interest on your existing mortgage at its current balance, rate, and remaining term." />
            </dt>
            <dd>{preciseCurrency.format(result.currentMonthlyPI)}</dd>
          </div>
          <div>
            <dt>
              <FieldLabel label="New monthly payment" help="Principal & interest on the proposed new loan, including any cash-out amount added to the balance." />
            </dt>
            <dd>{preciseCurrency.format(result.newMonthlyPI)}</dd>
          </div>
          <div>
            <dt>
              <FieldLabel
                label="Monthly savings"
                help="Current payment minus the new payment (principal & interest only). Note: if the new loan has a longer term, some of this saving comes from extending the loan, not the rate."
              />
            </dt>
            <dd className={noSavings ? 'is-negative' : ''}>{preciseCurrency.format(result.monthlySavings)}</dd>
          </div>
          <div>
            <dt>
              <FieldLabel
                label={`Lifetime interest ${result.lifetimeInterestSavings >= 0 ? 'savings' : 'cost'}`}
                help="Total interest you'd pay over the full life of each loan, compared. This accounts for the term change — a lower payment can still cost more interest overall if the loan runs longer."
              />
            </dt>
            <dd className={result.lifetimeInterestSavings < 0 ? 'is-negative' : ''}>
              {currency.format(Math.abs(result.lifetimeInterestSavings))}
            </dd>
          </div>
        </div>

        <div className={`mortgage-insight ${noSavings ? 'is-warning' : ''}`}>
          <p>
            {noSavings
              ? "This refinance wouldn't lower your monthly payment, so there's no break-even point to reach."
              : result.breakEvenMonths !== null && result.breakEvenMonths <= 0
                ? `With no closing costs, the ${currency.format(result.monthlySavings)}/month savings starts immediately — there's nothing to recover.`
                : result.breakEvenMonths !== null
                  ? `You'd break even in about ${Math.ceil(result.breakEvenMonths)} months (${(result.breakEvenMonths / 12).toFixed(1)} years) — after that, the ${currency.format(result.monthlySavings)}/month savings is money in your pocket.`
                  : 'Enter your refinance closing costs to see a break-even estimate.'}
            {!noSavings && newLoanTermYears > currentRemainingTermYears && (
              <>
                {' '}Keep in mind the new loan runs {newLoanTermYears - currentRemainingTermYears} years longer than
                your current one, so check the lifetime interest figure above before deciding.
              </>
            )}
          </p>
        </div>

        <figure className="rent-vs-buy-chart refinance-break-even-chart">
          <figcaption className="rent-vs-buy-chart__title">Cumulative savings vs. refinance closing costs</figcaption>
          <div className="rent-vs-buy-chart__wrap">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              role="img"
              aria-label="Chart showing cumulative refinance savings over time crossing the closing cost threshold"
              onMouseMove={handleChartMouseMove}
              onMouseLeave={() => setHoveredMonth(null)}
            >
              {xAxisMonths.map((month) => {
                const { x } = toPoint(month, axisMin)
                return (
                  <line
                    key={month}
                    className="rent-vs-buy-chart__gridline"
                    x1={x}
                    x2={x}
                    y1={PADDING_TOP}
                    y2={PADDING_TOP + PLOT_HEIGHT}
                  />
                )
              })}

              <line
                className="rent-vs-buy-chart__zero-line"
                x1={PADDING_LEFT}
                x2={PADDING_LEFT + PLOT_WIDTH}
                y1={costLineY}
                y2={costLineY}
                stroke={COST_COLOR}
              />

              <path d={savingsPath} fill="none" stroke={SAVINGS_COLOR} strokeWidth={2} />

              {result.breakEvenMonths !== null && result.breakEvenMonths <= result.chartMonths && (
                <circle
                  cx={toPoint(result.breakEvenMonths, refinanceClosingCosts).x}
                  cy={toPoint(result.breakEvenMonths, refinanceClosingCosts).y}
                  r={5}
                  fill={SAVINGS_COLOR}
                  stroke="#0d1117"
                  strokeWidth={2}
                />
              )}

              {[axisMax, 0, axisMin].filter((value, index, array) => array.indexOf(value) === index).map((value) => {
                const { y } = toPoint(0, value)
                return (
                  <text key={value} className="rent-vs-buy-chart__y-tick" x={PADDING_LEFT - 10} y={y + 4} textAnchor="end">
                    {Math.round(value).toLocaleString()}
                  </text>
                )
              })}

              {xAxisMonths.map((month) => {
                const { x } = toPoint(month, axisMin)
                return (
                  <text key={month} className="rent-vs-buy-chart__x-tick" x={x} y={CHART_HEIGHT - 8} textAnchor="middle">
                    {month}
                  </text>
                )
              })}

              <text className="rent-vs-buy-chart__axis-label" x={PADDING_LEFT + PLOT_WIDTH / 2} y={CHART_HEIGHT} textAnchor="middle">
                Month
              </text>

              {hoveredMonth !== null && hoveredSavings !== null && (
                <>
                  <line
                    className="rent-vs-buy-chart__hover-line"
                    x1={toPoint(hoveredMonth, 0).x}
                    x2={toPoint(hoveredMonth, 0).x}
                    y1={PADDING_TOP}
                    y2={PADDING_TOP + PLOT_HEIGHT}
                  />
                  <circle
                    cx={toPoint(hoveredMonth, hoveredSavings).x}
                    cy={toPoint(hoveredMonth, hoveredSavings).y}
                    r={4.5}
                    fill={SAVINGS_COLOR}
                  />
                </>
              )}
            </svg>

            {hoveredMonth !== null && hoveredSavings !== null && (
              <div
                className="rent-vs-buy-tooltip"
                style={{
                  left: `${(toPoint(hoveredMonth, 0).x / CHART_WIDTH) * 100}%`,
                  top: `${(toPoint(hoveredMonth, hoveredSavings).y / CHART_HEIGHT) * 100}%`,
                }}
              >
                <strong>Month {hoveredMonth}</strong>
                <span><i style={{ background: SAVINGS_COLOR }} />{preciseCurrency.format(hoveredSavings)} saved</span>
                <span><i style={{ background: COST_COLOR }} />{currency.format(refinanceClosingCosts)} closing costs</span>
              </div>
            )}
          </div>

          <figcaption className="rent-vs-buy-legend">
            <span><i style={{ background: SAVINGS_COLOR }} /> Cumulative savings</span>
            <span><i style={{ background: COST_COLOR }} /> Closing costs</span>
          </figcaption>
        </figure>
      </section>

      <p className="mortgage-disclaimer">
        Results are estimates for educational purposes only and do not include lender-specific
        fees, points, or tax implications. Actual refinance terms will vary.
      </p>
    </main>
  )
}
