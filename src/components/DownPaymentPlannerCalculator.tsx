import { useMemo, useState } from 'react'
import { ArrowLeft, Banknote, HelpCircle, Printer, RotateCcw } from 'lucide-react'
import { loanTerms, type LoanTermId } from '../lib/mortgage'
import { calculateDownPaymentPlan, downPaymentAmountFor, type AmountMode } from '../lib/downPaymentPlanner'

interface DownPaymentPlannerCalculatorProps {
  onBack: () => void
}

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

function safeNumber(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

function FieldLabel({ label, help }: { label: string; help?: string }) {
  return (
    <span className="field-label">
      {label}
      {help && (
        <span className="field-help" title={help} aria-label={help}>
          <HelpCircle size={13} />
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

export function DownPaymentPlannerCalculator({ onBack }: DownPaymentPlannerCalculatorProps) {
  const [homePrice, setHomePrice] = useState(450_000)
  const [downPayment, setDownPayment] = useState(10)
  const [downPaymentMode, setDownPaymentMode] = useState<AmountMode>('percent')
  const [interestRate, setInterestRate] = useState(6.49)
  const [loanTermId, setLoanTermId] = useState<LoanTermId>('fixed-30')
  const [annualPropertyTax, setAnnualPropertyTax] = useState(5_400)
  const [annualHomeInsurance, setAnnualHomeInsurance] = useState(1_800)
  const [monthlyHoa, setMonthlyHoa] = useState(0)
  const [cashReserves, setCashReserves] = useState(75_000)
  const [closingCostRate, setClosingCostRate] = useState(3)
  const [showAdvanced, setShowAdvanced] = useState(true)
  const [downPaymentFocused, setDownPaymentFocused] = useState(false)

  const loanTerm = loanTerms.find((term) => term.id === loanTermId) ?? loanTerms[0]

  const result = useMemo(
    () =>
      calculateDownPaymentPlan(
        {
          homePrice,
          downPayment,
          interestRate,
          amortizationYears: loanTerm.amortizationYears,
          annualPropertyTax,
          annualHomeInsurance,
          monthlyHoa,
          cashReserves,
          closingCostRate,
        },
        downPaymentMode,
      ),
    [
      homePrice,
      downPayment,
      downPaymentMode,
      interestRate,
      loanTerm.amortizationYears,
      annualPropertyTax,
      annualHomeInsurance,
      monthlyHoa,
      cashReserves,
      closingCostRate,
    ],
  )

  function changeDownPaymentMode(nextMode: AmountMode) {
    if (nextMode === downPaymentMode) return

    const currentAmount = downPaymentAmountFor(homePrice, downPayment, downPaymentMode)
    setDownPayment(
      nextMode === 'percent'
        ? homePrice > 0
          ? Number(((currentAmount / homePrice) * 100).toFixed(2))
          : 0
        : currentAmount,
    )
    setDownPaymentMode(nextMode)
  }

  function resetCalculator() {
    setHomePrice(450_000)
    setDownPayment(10)
    setDownPaymentMode('percent')
    setInterestRate(6.49)
    setLoanTermId('fixed-30')
    setAnnualPropertyTax(5_400)
    setAnnualHomeInsurance(1_800)
    setMonthlyHoa(0)
    setCashReserves(75_000)
    setClosingCostRate(3)
  }

  const reservesWarning = result.monthsOfReserves !== null && result.monthsOfReserves < 3

  return (
    <main className="mortgage-page down-payment-page" id="down-payment">
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
        <div className="mortgage-heading__icon"><Banknote size={24} /></div>
        <div>
          <p className="eyebrow">BUYING & SELLING</p>
          <h1>Down payment planner</h1>
          <p>Compare down payment options and see the effect on cash reserves.</p>
        </div>
      </header>

      <section className="seller-proceeds-panel down-payment-panel">
        <div className="mortgage-expense-grid">
          <MoneyField id="dpp-home-price" label="Home price" value={homePrice} onChange={setHomePrice} />
          <fieldset className="mortgage-down-payment">
            <legend>
              <FieldLabel
                label="Down payment"
                help="Cash you pay upfront toward the purchase. Below 20% down, lenders typically add PMI (mortgage insurance) to your monthly payment."
              />
            </legend>
            <div className="mortgage-down-payment__row">
              <span className="mortgage-input">
                <span className="mortgage-input__prefix" aria-hidden="true">
                  {downPaymentMode === 'dollars' ? '$' : '%'}
                </span>
                <input
                  id="dpp-down-payment"
                  aria-label={`Down payment in ${downPaymentMode}`}
                  type="text"
                  inputMode="decimal"
                  value={downPaymentMode === 'dollars' && !downPaymentFocused ? (downPayment === 0 ? '' : downPayment.toLocaleString('en-US')) : (downPayment === 0 ? '' : String(downPayment))}
                  onFocus={() => setDownPaymentFocused(true)}
                  onBlur={() => setDownPaymentFocused(false)}
                  onChange={(event) => setDownPayment(safeNumber(Number(event.target.value.replace(/,/g, ''))))}
                />
              </span>
              <div className="mortgage-mode-toggle" aria-label="Down payment unit">
                <button
                  type="button"
                  className={downPaymentMode === 'dollars' ? 'is-active' : ''}
                  aria-pressed={downPaymentMode === 'dollars'}
                  onClick={() => changeDownPaymentMode('dollars')}
                >
                  $
                </button>
                <button
                  type="button"
                  className={downPaymentMode === 'percent' ? 'is-active' : ''}
                  aria-pressed={downPaymentMode === 'percent'}
                  onClick={() => changeDownPaymentMode('percent')}
                >
                  %
                </button>
              </div>
            </div>
            <small>{currency.format(result.downPaymentAmount)} applied</small>
          </fieldset>
        </div>

        <div className="mortgage-expense-grid">
          <PercentField id="dpp-interest-rate" label="Interest rate *" value={interestRate} onChange={setInterestRate} />
          <label className="mortgage-field" htmlFor="dpp-loan-term">
            <span>Loan term</span>
            <span className="mortgage-select">
              <select id="dpp-loan-term" value={loanTermId} onChange={(event) => setLoanTermId(event.target.value as LoanTermId)}>
                {loanTerms.map((term) => (
                  <option value={term.id} key={term.id}>{term.label}</option>
                ))}
              </select>
            </span>
          </label>
        </div>

        <MoneyField
          id="dpp-cash-reserves"
          label="Cash reserves available"
          value={cashReserves}
          onChange={setCashReserves}
          help="Total cash you have on hand for the down payment, closing costs, and the savings cushion left over afterward. Lenders like to see 2–6 months of payments remaining after closing."
        />

        <p className="seller-proceeds-note">
          You can increase the accuracy of this calculator by filling in additional fields.
        </p>

        {showAdvanced && (
          <div className="mortgage-expense-grid">
            <MoneyField id="dpp-property-tax" label="Annual property tax" value={annualPropertyTax} onChange={setAnnualPropertyTax} />
            <MoneyField id="dpp-home-insurance" label="Annual home insurance" value={annualHomeInsurance} onChange={setAnnualHomeInsurance} />
            <MoneyField
              id="dpp-hoa"
              label="Monthly HOA"
              value={monthlyHoa}
              onChange={setMonthlyHoa}
              help="Homeowners association dues, if the property has them. Enter 0 if none."
            />
            <PercentField
              id="dpp-closing-cost-rate"
              label="Estimated closing costs"
              value={closingCostRate}
              onChange={setClosingCostRate}
              help="Lender, title, escrow, and government fees paid at closing — typically 2–5% of the home price. Doesn't include prepaid taxes and insurance."
            />
          </div>
        )}

        <div className="seller-proceeds-toggle-row">
          <button type="button" className="seller-proceeds-toggle" onClick={() => setShowAdvanced((current) => !current)}>
            {showAdvanced ? 'Hide advanced controls' : 'Show advanced controls'}
          </button>
        </div>

        <div className="seller-proceeds-divider" />

        <div className="down-payment-summary">
          <div className="amortization-summary-list">
            <div>
              <dt>Loan amount</dt>
              <dd>{currency.format(result.loanAmount)}</dd>
            </div>
            <div>
              <dt>
                <FieldLabel
                  label="Loan-to-value"
                  help="LTV — the loan amount divided by the home price. Above 80% LTV (less than 20% down), lenders usually require PMI."
                />
              </dt>
              <dd>{(result.loanToValue * 100).toFixed(1)}%</dd>
            </div>
            <div className="amortization-summary-list__group">
              <div>
                <dt>Total monthly payment</dt>
                <dd>{currency.format(result.totalMonthlyPayment)}</dd>
              </div>
              <div className="amortization-summary-list__sub">
                <span>Principal & interest</span>
                <span>{currency.format(result.monthlyPI)}</span>
              </div>
              {result.pmiRequired && (
                <div className="amortization-summary-list__sub">
                  <span>
                    <FieldLabel
                      label="Mortgage insurance (PMI)"
                      help="Private mortgage insurance — protects the lender when you put less than 20% down. Estimated here at 0.56%/yr of the loan; your actual rate depends on credit score and LTV. It can be removed once you reach 20% equity."
                    />
                  </span>
                  <span>{currency.format(result.monthlyPMI)}</span>
                </div>
              )}
              <div className="amortization-summary-list__sub">
                <span>Tax, insurance & HOA</span>
                <span>{currency.format(result.monthlyTax + result.monthlyInsurance + result.monthlyHoa)}</span>
              </div>
            </div>
            <div>
              <dt>
                <FieldLabel
                  label="Cash needed at closing"
                  help="Down payment plus estimated closing costs — the total cash due on closing day."
                />
              </dt>
              <dd>{currency.format(result.cashNeededAtClosing)}</dd>
            </div>
            <div>
              <dt>
                <FieldLabel
                  label="Remaining reserves"
                  help="Cash left in your savings after paying the down payment and closing costs — your emergency cushion as a new homeowner."
                />
              </dt>
              <dd className={result.remainingReserves < 0 ? 'is-negative' : ''}>
                {currency.format(result.remainingReserves)}
              </dd>
            </div>
          </div>

          <div className={`mortgage-insight ${reservesWarning || result.remainingReserves < 0 ? 'is-warning' : ''}`}>
            <p>
              {result.monthsOfReserves === null
                ? 'This down payment and closing costs would exceed your available cash reserves.'
                : `After closing, you'd have about ${result.monthsOfReserves.toFixed(1)} months of this payment left in reserves.`}
            </p>
          </div>
        </div>

        <div className="down-payment-scenarios">
          <h3>Compare down payment scenarios</h3>
          <div className="amortization-table-wrap">
            <table className="amortization-table down-payment-table">
              <thead>
                <tr>
                  <th>Down payment</th>
                  <th>Loan amount</th>
                  <th>Monthly payment</th>
                  <th>
                    <FieldLabel
                      label="PMI"
                      help="Private mortgage insurance — added to the payment when the down payment is under 20%. Estimated at a flat 0.56%/yr; actual PMI rates drop as the down payment grows."
                    />
                  </th>
                  <th>Cash needed</th>
                  <th>Reserves after</th>
                </tr>
              </thead>
              <tbody>
                {result.scenarios.map((scenario) => (
                  <tr
                    key={scenario.percent}
                    className={Math.round(result.downPaymentPercent) === scenario.percent ? 'is-current' : ''}
                  >
                    <td>{scenario.percent}% ({currency.format(scenario.downPaymentAmount)})</td>
                    <td>{currency.format(scenario.loanAmount)}</td>
                    <td>{currency.format(scenario.totalMonthlyPayment)}</td>
                    <td>{scenario.monthlyPMI > 0 ? currency.format(scenario.monthlyPMI) : '—'}</td>
                    <td>{currency.format(scenario.cashNeededAtClosing)}</td>
                    <td className={scenario.remainingReserves < 0 ? 'is-negative' : ''}>
                      {currency.format(scenario.remainingReserves)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
