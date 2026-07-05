import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  ChartNoAxesCombined,
  Download,
  Printer,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import {
  amortizationLoanTerms,
  formatElapsedDuration,
  generateAmortizationSchedule,
  paymentFrequencies,
  summarizeByYear,
  type AmortizationLoanTermId,
  type PaymentFrequencyId,
} from '../lib/amortization'

interface AmortizationCalculatorProps {
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

const monthYear = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' })
const fullDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' })

const CHART_COLORS = {
  balance: '#c88ce0',
  principal: '#3fb950',
  interest: '#d29922',
}

function safeNumber(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

interface MoneyFieldProps {
  id: string
  label: string
  value: number
  onChange: (value: number) => void
  suffix?: string
}

function MoneyField({ id, label, value, onChange, suffix }: MoneyFieldProps) {
  const [focused, setFocused] = useState(false)
  const displayValue = focused ? (value === 0 ? '' : String(value)) : (value === 0 ? '' : value.toLocaleString('en-US'))
  return (
    <label className="mortgage-field" htmlFor={id}>
      <span>{label}</span>
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
        {suffix && <span className="mortgage-input__suffix">{suffix}</span>}
      </span>
    </label>
  )
}

interface PercentFieldProps {
  id: string
  label: string
  value: number
  onChange: (value: number) => void
}

function PercentField({ id, label, value, onChange }: PercentFieldProps) {
  return (
    <label className="mortgage-field" htmlFor={id}>
      <span>{label}</span>
      <span className="mortgage-input">
        <span className="mortgage-input__prefix" aria-hidden="true">%</span>
        <input
          id={id}
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(safeNumber(event.target.valueAsNumber))}
        />
      </span>
    </label>
  )
}

interface DateFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}

function DateField({ id, label, value, onChange }: DateFieldProps) {
  return (
    <label className="mortgage-field" htmlFor={id}>
      <span>{label}</span>
      <span className="mortgage-input">
        <input
          id={id}
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
    </label>
  )
}

function buildChartPath(points: { x: number; y: number }[]) {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ')
}

function downloadScheduleCsv(
  rows: ReturnType<typeof generateAmortizationSchedule>['rows'],
) {
  const header = [
    'Payment date',
    'Payment',
    'Principal portion',
    'Interest portion',
    'Total interest paid',
    'Balance',
  ]
  const lines = rows.map((row) =>
    [
      `"${fullDate.format(row.date)}"`,
      row.payment.toFixed(2),
      row.principal.toFixed(2),
      row.interest.toFixed(2),
      row.totalInterestPaid.toFixed(2),
      row.balance.toFixed(2),
    ].join(','),
  )
  const csv = [header.join(','), ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'amortization-schedule.csv'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function AmortizationCalculator({ onBack }: AmortizationCalculatorProps) {
  const [loanAmount, setLoanAmount] = useState(240_000)
  const [loanTermId, setLoanTermId] = useState<AmortizationLoanTermId>('30')
  const [interestRate, setInterestRate] = useState(6.69)
  const [startDate, setStartDate] = useState(todayIso)
  const [annualHoa, setAnnualHoa] = useState(0)
  const [annualPropertyTax, setAnnualPropertyTax] = useState(1_200)
  const [annualInsurance, setAnnualInsurance] = useState(0)
  const [includePmi, setIncludePmi] = useState(false)
  const [additionalMonthly, setAdditionalMonthly] = useState(0)
  const [intervalPayment, setIntervalPayment] = useState(0)
  const [intervalInitialDate, setIntervalInitialDate] = useState(todayIso)
  const [intervalFrequency, setIntervalFrequency] = useState<PaymentFrequencyId>('once')
  const [scheduleVisible, setScheduleVisible] = useState(false)

  const loanTerm = amortizationLoanTerms.find((term) => term.id === loanTermId) ?? amortizationLoanTerms[0]

  const summary = useMemo(
    () =>
      generateAmortizationSchedule({
        loanAmount,
        termYears: loanTerm.years,
        annualInterestRate: interestRate,
        startDate,
        annualHoa,
        annualPropertyTax,
        annualInsurance,
        includePmi,
        additionalMonthly,
        intervalPayment,
        intervalInitialDate,
        intervalFrequency,
      }),
    [
      loanAmount,
      loanTerm.years,
      interestRate,
      startDate,
      annualHoa,
      annualPropertyTax,
      annualInsurance,
      includePmi,
      additionalMonthly,
      intervalPayment,
      intervalInitialDate,
      intervalFrequency,
    ],
  )

  const yearlyPoints = useMemo(() => summarizeByYear(summary.rows), [summary.rows])

  const chartWidth = 640
  const chartHeight = 240
  const paddingLeft = 8
  const paddingRight = 8
  const paddingTop = 12
  const paddingBottom = 28
  const plotWidth = chartWidth - paddingLeft - paddingRight
  const plotHeight = chartHeight - paddingTop - paddingBottom
  const maxYear = Math.max(1, yearlyPoints[yearlyPoints.length - 1]?.year ?? loanTerm.years)
  const maxValue = Math.max(
    1,
    ...yearlyPoints.map((point) => Math.max(point.balance, point.cumulativePrincipal, point.cumulativeInterest)),
  )

  function toPoint(year: number, value: number) {
    return {
      x: paddingLeft + (year / maxYear) * plotWidth,
      y: paddingTop + plotHeight - (value / maxValue) * plotHeight,
    }
  }

  const balancePath = buildChartPath(yearlyPoints.map((point) => toPoint(point.year, point.balance)))
  const principalPath = buildChartPath(yearlyPoints.map((point) => toPoint(point.year, point.cumulativePrincipal)))
  const interestPath = buildChartPath(yearlyPoints.map((point) => toPoint(point.year, point.cumulativeInterest)))

  const xAxisStep = maxYear > 20 ? 2 : maxYear > 10 ? 2 : 1
  const xAxisYears = Array.from(
    { length: Math.floor(maxYear / xAxisStep) + 1 },
    (_, index) => index * xAxisStep,
  )

  function resetCalculator() {
    setLoanAmount(240_000)
    setLoanTermId('30')
    setInterestRate(6.69)
    setStartDate(todayIso())
    setAnnualHoa(0)
    setAnnualPropertyTax(1_200)
    setAnnualInsurance(0)
    setIncludePmi(false)
    setAdditionalMonthly(0)
    setIntervalPayment(0)
    setIntervalInitialDate(todayIso())
    setIntervalFrequency('once')
  }

  return (
    <main className="mortgage-page amortization-page" id="amortization-schedule">
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
        <div className="mortgage-heading__icon"><ChartNoAxesCombined size={24} /></div>
        <div>
          <p className="eyebrow">MORTGAGE & FINANCING</p>
          <h1>Amortization calculator</h1>
          <p>Interest vs. principal payments over time.</p>
        </div>
      </header>

      <section className="mortgage-workspace">
        <section className="mortgage-result-panel" aria-labelledby="amortization-title">
          <div className="mortgage-result__header">
            <div>
              <span className="eyebrow">PAYMENT ESTIMATE</span>
              <h2 id="amortization-title">Amortization overview</h2>
            </div>
            <span className="mortgage-loan-pill">{currency.format(loanAmount)} loan</span>
          </div>

          <figure className="amortization-chart">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              role="img"
              aria-label="Line chart of balance, principal paid, and interest paid over the life of the loan"
            >
              {xAxisYears.map((year) => {
                const { x } = toPoint(year, 0)
                return (
                  <line
                    key={year}
                    className="amortization-chart__gridline"
                    x1={x}
                    x2={x}
                    y1={paddingTop}
                    y2={paddingTop + plotHeight}
                  />
                )
              })}
              <line
                className="amortization-chart__axis"
                x1={paddingLeft}
                x2={paddingLeft}
                y1={paddingTop}
                y2={paddingTop + plotHeight}
              />
              <line
                className="amortization-chart__axis"
                x1={paddingLeft}
                x2={paddingLeft + plotWidth}
                y1={paddingTop + plotHeight}
                y2={paddingTop + plotHeight}
              />
              <path d={balancePath} fill="none" stroke={CHART_COLORS.balance} strokeWidth={2} />
              <path d={principalPath} fill="none" stroke={CHART_COLORS.principal} strokeWidth={2} />
              <path d={interestPath} fill="none" stroke={CHART_COLORS.interest} strokeWidth={2} />
              {xAxisYears.map((year) => {
                const { x } = toPoint(year, 0)
                return (
                  <text
                    key={year}
                    className="amortization-chart__tick"
                    x={x}
                    y={chartHeight - 6}
                    textAnchor="middle"
                  >
                    {year}
                  </text>
                )
              })}
              <text
                className="amortization-chart__axis-label"
                x={paddingLeft + plotWidth / 2}
                y={chartHeight}
                textAnchor="middle"
              >
                Year
              </text>
            </svg>
            <figcaption className="amortization-legend">
              <span><i style={{ background: CHART_COLORS.balance }} /> Balance</span>
              <span><i style={{ background: CHART_COLORS.principal }} /> Principal</span>
              <span><i style={{ background: CHART_COLORS.interest }} /> Interest</span>
            </figcaption>
          </figure>

          <dl className="amortization-summary-list">
            <div>
              <dt>Time elapsed</dt>
              <dd>{formatElapsedDuration(summary.timeElapsedMonths)}</dd>
            </div>
            <div>
              <dt>Monthly P+I</dt>
              <dd>{currency.format(summary.monthlyPrincipalAndInterest)}/month</dd>
            </div>
            <div>
              <dt>Total monthly payment</dt>
              <dd>{currency.format(summary.totalMonthlyPayment)}/month</dd>
            </div>
            <div>
              <dt>Principal paid</dt>
              <dd>{currency.format(summary.principalPaid)}</dd>
            </div>
            <div>
              <dt>Interest paid</dt>
              <dd>{currency.format(summary.interestPaid)}</dd>
            </div>
            <div className="amortization-summary-list__group">
              <div>
                <dt>Other expenses</dt>
                <dd>{currency.format(summary.otherExpensesPaid)}</dd>
              </div>
              <div className="amortization-summary-list__sub">
                <span>HOA</span>
                <span>{currency.format(summary.hoaPaid)}</span>
              </div>
              <div className="amortization-summary-list__sub">
                <span>Property taxes</span>
                <span>{currency.format(summary.propertyTaxPaid)}</span>
              </div>
              <div className="amortization-summary-list__sub">
                <span>Insurance</span>
                <span>{currency.format(summary.insurancePaid)}</span>
              </div>
              {includePmi && (
                <div className="amortization-summary-list__sub">
                  <span>PMI</span>
                  <span>{currency.format(summary.pmiPaid)}</span>
                </div>
              )}
            </div>
            <div>
              <dt>Balance remaining</dt>
              <dd>{currency.format(summary.balanceRemaining)}</dd>
            </div>
            <div>
              <dt>Payoff date</dt>
              <dd>{summary.payoffDate ? monthYear.format(summary.payoffDate) : '—'}</dd>
            </div>
          </dl>

          <div className="mortgage-insight">
            <Sparkles size={17} aria-hidden="true" />
            <p>
              Total interest is {Math.round(
                summary.principalPaid + summary.interestPaid
                  ? (summary.interestPaid / (summary.principalPaid + summary.interestPaid)) * 100
                  : 0,
              )}% of what you'll pay toward principal and interest combined.
            </p>
          </div>
        </section>

        <form className="mortgage-form-panel" onSubmit={(event) => event.preventDefault()}>
          <div className="mortgage-form__heading">
            <span className="eyebrow">LOAN DETAILS</span>
            <h2>Adjust your estimate</h2>
          </div>

          <MoneyField id="amort-loan-amount" label="Loan amount" value={loanAmount} onChange={setLoanAmount} />

          <label className="mortgage-field" htmlFor="amort-loan-term">
            <span>Loan term</span>
            <span className="mortgage-select">
              <select
                id="amort-loan-term"
                value={loanTermId}
                onChange={(event) => setLoanTermId(event.target.value as AmortizationLoanTermId)}
              >
                {amortizationLoanTerms.map((term) => (
                  <option value={term.id} key={term.id}>{term.label}</option>
                ))}
              </select>
            </span>
          </label>

          <PercentField id="amort-interest-rate" label="Interest rate *" value={interestRate} onChange={setInterestRate} />

          <DateField id="amort-start-date" label="Start date" value={startDate} onChange={setStartDate} />

          <MoneyField id="amort-hoa" label="HOA (Annual)" value={annualHoa} onChange={setAnnualHoa} />

          <div className="mortgage-expense-grid">
            <MoneyField
              id="amort-property-tax"
              label="Property taxes (Annual)"
              value={annualPropertyTax}
              onChange={setAnnualPropertyTax}
            />
            <MoneyField
              id="amort-insurance"
              label="Insurance (Annual)"
              value={annualInsurance}
              onChange={setAnnualInsurance}
            />
          </div>

          <label className="amortization-checkbox">
            <input
              type="checkbox"
              checked={includePmi}
              onChange={(event) => setIncludePmi(event.target.checked)}
            />
            <span>
              <strong>Include PMI</strong>
              <small>
                PMI applies for the first 5 years of the loan, or until the balance drops to 80%
                of the original loan amount — whichever happens first.
              </small>
            </span>
          </label>

          <div className="mortgage-form__divider" />

          <MoneyField
            id="amort-additional-monthly"
            label="Additional monthly"
            value={additionalMonthly}
            onChange={setAdditionalMonthly}
          />

          <div className="amortization-interval-grid">
            <MoneyField
              id="amort-interval-payment"
              label="Interval payment(s)"
              value={intervalPayment}
              onChange={setIntervalPayment}
            />
            <DateField
              id="amort-interval-initial-date"
              label="Initial payment"
              value={intervalInitialDate}
              onChange={setIntervalInitialDate}
            />
            <label className="mortgage-field" htmlFor="amort-interval-frequency">
              <span>Frequency</span>
              <span className="mortgage-select">
                <select
                  id="amort-interval-frequency"
                  value={intervalFrequency}
                  onChange={(event) => setIntervalFrequency(event.target.value as PaymentFrequencyId)}
                >
                  {paymentFrequencies.map((option) => (
                    <option value={option.id} key={option.id}>{option.label}</option>
                  ))}
                </select>
              </span>
            </label>
          </div>
        </form>
      </section>

      <section className="amortization-schedule-section">
        <div className="amortization-schedule__heading">
          <h2>Amortization schedule</h2>
          <button
            type="button"
            className="amortization-toggle"
            aria-pressed={scheduleVisible}
            onClick={() => setScheduleVisible((visible) => !visible)}
          >
            <span>{scheduleVisible ? 'Hide' : 'Show'}</span>
            <span className="amortization-toggle__track">
              <span className="amortization-toggle__thumb" />
            </span>
          </button>
        </div>

        {scheduleVisible && (
          <>
            <div className="amortization-schedule__actions">
              <button
                type="button"
                className="button button--light"
                onClick={() => downloadScheduleCsv(summary.rows)}
              >
                <Download size={14} /> Download CSV
              </button>
            </div>
            <div className="amortization-table-wrap">
              <table className="amortization-table">
                <thead>
                  <tr>
                    <th>Payment date</th>
                    <th>Payment</th>
                    <th>Principal portion</th>
                    <th>Interest portion</th>
                    <th>Total interest paid</th>
                    <th>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.rows.map((row) => (
                    <tr key={row.paymentNumber}>
                      <td>{monthYear.format(row.date)}</td>
                      <td>{preciseCurrency.format(row.payment)}</td>
                      <td>{preciseCurrency.format(row.principal)}</td>
                      <td>{preciseCurrency.format(row.interest)}</td>
                      <td>{preciseCurrency.format(row.totalInterestPaid)}</td>
                      <td>{preciseCurrency.format(row.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <p className="mortgage-disclaimer">
        Rates shown are for comparison only and are an average of the rates taken from multiple
        lenders and do not include all costs of borrowing. Actual rates and terms will vary.
      </p>
    </main>
  )
}
