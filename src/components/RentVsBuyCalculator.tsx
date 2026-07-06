import { useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { ArrowLeft, HelpCircle, Printer, RotateCcw, Scale } from 'lucide-react'
import { loanTerms, type LoanTermId } from '../lib/mortgage'
import {
  calculateRentVsBuy,
  downPaymentAmount,
  propertyTaxAmount,
  type AmountMode,
} from '../lib/rentVsBuy'

interface RentVsBuyCalculatorProps {
  onBack: () => void
}

type Tab = 'basic' | 'advanced'

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

interface PercentFieldProps {
  id: string
  label: string
  value: number
  onChange: (value: number) => void
  step?: string
  help?: string
}

function PercentField({ id, label, value, onChange, step = '0.1', help }: PercentFieldProps) {
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

interface ToggleAmountFieldProps {
  legend: string
  idPrefix: string
  value: number
  mode: AmountMode
  amount: number
  /** The value percent mode is a share of (e.g. home price). */
  basis: number
  onValueChange: (value: number) => void
  onModeChange: (mode: AmountMode) => void
  help?: string
}

function ToggleAmountField({
  legend,
  idPrefix,
  value,
  mode,
  amount,
  basis,
  onValueChange,
  onModeChange,
  help,
}: ToggleAmountFieldProps) {
  const [focused, setFocused] = useState(false)
  function changeMode(nextMode: AmountMode) {
    if (nextMode === mode) return

    onValueChange(
      nextMode === 'percent'
        ? basis > 0
          ? Number(((amount / basis) * 100).toFixed(2))
          : 0
        : amount,
    )
    onModeChange(nextMode)
  }

  const displayValue = mode === 'dollars' && !focused
    ? (value === 0 ? '' : value.toLocaleString('en-US'))
    : (value === 0 ? '' : String(value))

  return (
    <fieldset className="mortgage-down-payment">
      <legend>
        <FieldLabel label={legend} help={help} />
      </legend>
      <div className="mortgage-down-payment__row">
        <span className="mortgage-input">
          <span className="mortgage-input__prefix" aria-hidden="true">
            {mode === 'dollars' ? '$' : '%'}
          </span>
          <input
            id={idPrefix}
            aria-label={`${legend} in ${mode}`}
            type="text"
            inputMode="decimal"
            value={displayValue}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={(event) => onValueChange(safeNumber(Number(event.target.value.replace(/,/g, ''))))}
          />
        </span>
        <div className="mortgage-mode-toggle" aria-label={`${legend} unit`}>
          <button
            type="button"
            className={mode === 'dollars' ? 'is-active' : ''}
            aria-pressed={mode === 'dollars'}
            onClick={() => changeMode('dollars')}
          >
            $
          </button>
          <button
            type="button"
            className={mode === 'percent' ? 'is-active' : ''}
            aria-pressed={mode === 'percent'}
            onClick={() => changeMode('percent')}
          >
            %
          </button>
        </div>
      </div>
      <small>{currency.format(amount)} applied</small>
    </fieldset>
  )
}

function niceCeiling(value: number) {
  if (value <= 0) return 1
  const exponent = Math.floor(Math.log10(value))
  const magnitude = 10 ** exponent
  const residual = value / magnitude
  let niceResidual = 10
  if (residual <= 1) niceResidual = 1
  else if (residual <= 2) niceResidual = 2
  else if (residual <= 5) niceResidual = 5
  return niceResidual * magnitude
}

const CHART_WIDTH = 680
const CHART_HEIGHT = 300
const PADDING_LEFT = 60
const PADDING_RIGHT = 16
const PADDING_TOP = 20
const PADDING_BOTTOM = 34
const PLOT_WIDTH = CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT
const PLOT_HEIGHT = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM

const BUYING_COLOR = '#2f81f7'
const RENTING_COLOR = '#f0883e'

export function RentVsBuyCalculator({ onBack }: RentVsBuyCalculatorProps) {
  const [activeTab, setActiveTab] = useState<Tab>('basic')
  const [homePrice, setHomePrice] = useState(300_000)
  const [monthlyRent, setMonthlyRent] = useState(1_800)
  const [downPayment, setDownPayment] = useState(15_000)
  const [downPaymentMode, setDownPaymentMode] = useState<AmountMode>('dollars')
  const [interestRate, setInterestRate] = useState(6.69)
  const [loanTermId, setLoanTermId] = useState<LoanTermId>('fixed-30')
  const [annualHoa, setAnnualHoa] = useState(0)
  const [propertyTax, setPropertyTax] = useState(1_200)
  const [propertyTaxMode, setPropertyTaxMode] = useState<AmountMode>('dollars')
  const [annualHomeInsurance, setAnnualHomeInsurance] = useState(0)

  const [homeAppreciationRate, setHomeAppreciationRate] = useState(3.5)
  const [rentGrowthRate, setRentGrowthRate] = useState(3)
  const [maintenanceRate, setMaintenanceRate] = useState(1)
  const [closingCostRate, setClosingCostRate] = useState(3)
  const [sellingCostRate, setSellingCostRate] = useState(7)
  const [lengthOfStay, setLengthOfStay] = useState(30)

  const [hoveredYear, setHoveredYear] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const loanTerm = loanTerms.find((term) => term.id === loanTermId) ?? loanTerms[0]
  const downPaymentAmt = downPaymentAmount(homePrice, downPayment, downPaymentMode)
  const propertyTaxAmt = propertyTaxAmount(homePrice, propertyTax, propertyTaxMode)

  const result = useMemo(
    () =>
      calculateRentVsBuy({
        homePrice,
        monthlyRent,
        downPayment: downPaymentAmt,
        annualInterestRate: interestRate,
        termYears: loanTerm.amortizationYears,
        annualHoa,
        annualPropertyTax: propertyTaxAmt,
        annualHomeInsurance,
        homeAppreciationRate,
        rentGrowthRate,
        maintenanceRate,
        closingCostRate,
        sellingCostRate,
        yearsToProject: lengthOfStay,
      }),
    [
      homePrice,
      monthlyRent,
      downPaymentAmt,
      interestRate,
      loanTerm.amortizationYears,
      annualHoa,
      propertyTaxAmt,
      annualHomeInsurance,
      homeAppreciationRate,
      rentGrowthRate,
      maintenanceRate,
      closingCostRate,
      sellingCostRate,
      lengthOfStay,
    ],
  )

  const maxYear = result.points[result.points.length - 1]?.year ?? 1
  const maxAbsValue = Math.max(
    1,
    ...result.points.flatMap((point) => [Math.abs(point.buyingNetPosition), Math.abs(point.rentingNetPosition)]),
  )
  const axisLimit = niceCeiling(maxAbsValue)

  function toPoint(year: number, value: number) {
    return {
      x: PADDING_LEFT + (year / maxYear) * PLOT_WIDTH,
      y: PADDING_TOP + PLOT_HEIGHT - ((value + axisLimit) / (axisLimit * 2)) * PLOT_HEIGHT,
    }
  }

  const buyingPath = result.points
    .map((point, index) => {
      const { x, y } = toPoint(point.year, point.buyingNetPosition)
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
  const rentingPath = result.points
    .map((point, index) => {
      const { x, y } = toPoint(point.year, point.rentingNetPosition)
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')

  const yearStep = maxYear > 20 ? 5 : maxYear > 10 ? 2 : 1
  const xAxisYears = Array.from({ length: Math.floor(maxYear / yearStep) + 1 }, (_, i) => i * yearStep)
  const zeroY = toPoint(0, 0).y

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

  function resetCalculator() {
    setHomePrice(300_000)
    setMonthlyRent(1_800)
    setDownPayment(15_000)
    setDownPaymentMode('dollars')
    setInterestRate(6.69)
    setLoanTermId('fixed-30')
    setAnnualHoa(0)
    setPropertyTax(1_200)
    setPropertyTaxMode('dollars')
    setAnnualHomeInsurance(0)
    setHomeAppreciationRate(3.5)
    setRentGrowthRate(3)
    setMaintenanceRate(1)
    setClosingCostRate(3)
    setSellingCostRate(7)
    setLengthOfStay(30)
  }

  const finalDiff = result.finalBuyingNetPosition - result.finalRentingNetPosition
  const leaderLabel = finalDiff >= 0 ? 'Buying' : 'Renting'
  const leaderAmount = Math.abs(finalDiff)

  return (
    <main className="mortgage-page rent-vs-buy-page" id="rent-vs-buy">
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
        <div className="mortgage-heading__icon"><Scale size={24} /></div>
        <div>
          <p className="eyebrow">BUYING & SELLING</p>
          <h1>Rent vs. buy calculator</h1>
          <p>Renting costs versus the real cost of buying a home.</p>
        </div>
      </header>

      <section className="rent-vs-buy-panel">
        <figure className="rent-vs-buy-chart">
          <figcaption className="rent-vs-buy-chart__title">
            Net financial position over time
          </figcaption>
          <div className="rent-vs-buy-chart__wrap">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              role="img"
              aria-label="Line chart comparing the net financial position of buying versus renting over time"
              onMouseMove={handleChartMouseMove}
              onMouseLeave={() => setHoveredYear(null)}
            >
              {xAxisYears.map((year) => {
                const { x } = toPoint(year, -axisLimit)
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
              <line
                className="rent-vs-buy-chart__zero-line"
                x1={PADDING_LEFT}
                x2={PADDING_LEFT + PLOT_WIDTH}
                y1={zeroY}
                y2={zeroY}
              />

              <path d={buyingPath} fill="none" stroke={BUYING_COLOR} strokeWidth={2} />
              <path d={rentingPath} fill="none" stroke={RENTING_COLOR} strokeWidth={2} />

              {[axisLimit, 0, -axisLimit].map((value) => {
                const { y } = toPoint(0, value)
                return (
                  <text key={value} className="rent-vs-buy-chart__y-tick" x={PADDING_LEFT - 10} y={y + 4} textAnchor="end">
                    {Math.round(value).toLocaleString()}
                  </text>
                )
              })}

              {xAxisYears.map((year) => {
                const { x } = toPoint(year, -axisLimit)
                return (
                  <text key={year} className="rent-vs-buy-chart__x-tick" x={x} y={CHART_HEIGHT - 8} textAnchor="middle">
                    {year}
                  </text>
                )
              })}

              <text
                className="rent-vs-buy-chart__axis-label"
                x={PADDING_LEFT + PLOT_WIDTH / 2}
                y={CHART_HEIGHT}
                textAnchor="middle"
              >
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
                    cx={toPoint(hoveredPoint.year, hoveredPoint.buyingNetPosition).x}
                    cy={toPoint(hoveredPoint.year, hoveredPoint.buyingNetPosition).y}
                    r={4.5}
                    fill={BUYING_COLOR}
                  />
                  <circle
                    cx={toPoint(hoveredPoint.year, hoveredPoint.rentingNetPosition).x}
                    cy={toPoint(hoveredPoint.year, hoveredPoint.rentingNetPosition).y}
                    r={4.5}
                    fill={RENTING_COLOR}
                  />
                </>
              )}
            </svg>

            {hoveredPoint && (
              <div
                className="rent-vs-buy-tooltip"
                style={{
                  left: `${(toPoint(hoveredPoint.year, 0).x / CHART_WIDTH) * 100}%`,
                  top: `${(Math.min(
                    toPoint(hoveredPoint.year, hoveredPoint.buyingNetPosition).y,
                    toPoint(hoveredPoint.year, hoveredPoint.rentingNetPosition).y,
                  ) / CHART_HEIGHT) * 100}%`,
                }}
              >
                <strong>Year {hoveredPoint.year}</strong>
                <span>
                  <i style={{ background: BUYING_COLOR }} />
                  {preciseCurrency.format(hoveredPoint.buyingNetPosition)}
                </span>
                <span>
                  <i style={{ background: RENTING_COLOR }} />
                  {preciseCurrency.format(hoveredPoint.rentingNetPosition)}
                </span>
              </div>
            )}
          </div>

          <figcaption className="rent-vs-buy-legend">
            <span><i style={{ background: BUYING_COLOR }} /> Buying</span>
            <span><i style={{ background: RENTING_COLOR }} /> Renting</span>
          </figcaption>
        </figure>

        <div className="mortgage-insight">
          <p>
            After {lengthOfStay} {lengthOfStay === 1 ? 'year' : 'years'}, <strong>{leaderLabel}</strong> comes
            out ahead by {currency.format(leaderAmount)}.
            {result.breakEvenYear !== null && (
              <> Buying overtakes renting around year {result.breakEvenYear}.</>
            )}
          </p>
        </div>

        <div className="rent-vs-buy-tabs">
          <button
            type="button"
            className={activeTab === 'basic' ? 'is-active' : ''}
            onClick={() => setActiveTab('basic')}
          >
            Basic Details
          </button>
          <button
            type="button"
            className={activeTab === 'advanced' ? 'is-active' : ''}
            onClick={() => setActiveTab('advanced')}
          >
            Advanced Options
          </button>
        </div>

        {activeTab === 'basic' ? (
          <form className="rent-vs-buy-form" onSubmit={(event) => event.preventDefault()}>
            <div className="mortgage-expense-grid">
              <MoneyField
                id="rvb-home-price"
                label="Home price"
                value={homePrice}
                onChange={setHomePrice}
                help="The purchase price of the home you'd buy instead of renting."
              />
              <MoneyField
                id="rvb-monthly-rent"
                label="Monthly rent"
                value={monthlyRent}
                onChange={setMonthlyRent}
                help="What you'd pay in rent per month for a comparable home."
              />
            </div>

            <ToggleAmountField
              legend="Down payment"
              idPrefix="rvb-down-payment"
              value={downPayment}
              mode={downPaymentMode}
              amount={downPaymentAmt}
              basis={homePrice}
              onValueChange={setDownPayment}
              onModeChange={setDownPaymentMode}
              help="Cash paid upfront toward the purchase, in dollars or as a percent of the home price."
            />

            <PercentField
              id="rvb-interest-rate"
              label="Interest rate *"
              value={interestRate}
              onChange={setInterestRate}
              step="0.01"
              help="Your expected annual mortgage interest rate."
            />

            <div className="mortgage-expense-grid">
              <label className="mortgage-field" htmlFor="rvb-loan-term">
                <FieldLabel label="Loan term" help="How many years you'll take to pay off the loan." />
                <span className="mortgage-select">
                  <select
                    id="rvb-loan-term"
                    value={loanTermId}
                    onChange={(event) => setLoanTermId(event.target.value as LoanTermId)}
                  >
                    {loanTerms.map((term) => (
                      <option value={term.id} key={term.id}>{term.label}</option>
                    ))}
                  </select>
                </span>
              </label>
              <MoneyField
                id="rvb-hoa"
                label="HOA"
                value={annualHoa}
                onChange={setAnnualHoa}
                help="Annual homeowners association dues, if the property has them. Enter 0 if none."
              />
            </div>

            <ToggleAmountField
              legend="Property tax"
              idPrefix="rvb-property-tax"
              value={propertyTax}
              mode={propertyTaxMode}
              amount={propertyTaxAmt}
              basis={homePrice}
              onValueChange={setPropertyTax}
              onModeChange={setPropertyTaxMode}
              help="Yearly property tax, in dollars or as a percent of the home price."
            />

            <MoneyField
              id="rvb-home-insurance"
              label="Home insurance /yr"
              value={annualHomeInsurance}
              onChange={setAnnualHomeInsurance}
              help="Yearly homeowner's insurance premium you'd pay if you bought."
            />
          </form>
        ) : (
          <form className="rent-vs-buy-form" onSubmit={(event) => event.preventDefault()}>
            <div className="mortgage-expense-grid">
              <PercentField
                id="rvb-appreciation"
                label="Home appreciation /yr"
                value={homeAppreciationRate}
                onChange={setHomeAppreciationRate}
                help="How much home values rise per year in your area. The long-term US average is roughly 3–4%, but local markets vary widely."
              />
              <PercentField
                id="rvb-rent-growth"
                label="Rent growth /yr"
                value={rentGrowthRate}
                onChange={setRentGrowthRate}
                help="How much rent is expected to increase each year."
              />
            </div>
            <div className="mortgage-expense-grid">
              <PercentField
                id="rvb-maintenance"
                label="Maintenance /yr"
                value={maintenanceRate}
                onChange={setMaintenanceRate}
                help="Annual repairs and upkeep budget, as a percent of the home's value. 1% per year is a common rule of thumb."
              />
              <PercentField
                id="rvb-closing-costs"
                label="Closing costs"
                value={closingCostRate}
                onChange={setClosingCostRate}
                help="One-time costs to buy the home — lender, title, escrow, and government fees — as a percent of the price."
              />
            </div>
            <div className="mortgage-expense-grid">
              <PercentField
                id="rvb-selling-costs"
                label="Selling costs"
                value={sellingCostRate}
                onChange={setSellingCostRate}
                help="What it would cost to sell the home at the end of the comparison period — agent commissions and closing costs, as a percent of sale price."
              />
              <label className="mortgage-field" htmlFor="rvb-length-of-stay">
                <FieldLabel label="Length of stay (years)" help="How many years you'd stay before selling (if buying) or continue renting — the time horizon for this comparison." />
                <span className="mortgage-input">
                  <input
                    id="rvb-length-of-stay"
                    type="number"
                    min="1"
                    max="40"
                    step="1"
                    inputMode="numeric"
                    value={lengthOfStay}
                    onChange={(event) => setLengthOfStay(Math.max(1, Math.round(safeNumber(event.target.valueAsNumber))))}
                  />
                </span>
              </label>
            </div>
            <p className="rent-vs-buy-advanced-note">
              These assumptions drive the comparison above: how fast the home appreciates, how
              fast rent rises, ongoing maintenance as a share of home value, one-time closing
              costs when buying, and what it would cost to sell.
            </p>
          </form>
        )}
      </section>

      <p className="mortgage-disclaimer">
        * Rates shown are for comparison only and are an average of the rates taken from
        multiple lenders and do not include all costs of borrowing. Actual rates and terms will
        vary.
      </p>
    </main>
  )
}
