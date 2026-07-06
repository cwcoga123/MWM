import { useState } from 'react'
import { ArrowLeft, HelpCircle, House, Printer, RotateCcw, Sparkles } from 'lucide-react'
import {
  calculateInterestRate,
  calculateMortgagePayment,
  calculatePmiRate,
  creditScores,
  loanTerms,
  pmiRates,
  type CreditScoreId,
  type LoanTermId,
} from '../../lib/mortgage'

type DownPaymentMode = 'dollars' | 'percent'

interface MortgageCalculatorProps {
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

function getPaymentFontSize(formattedAmount: string) {
  const referenceLength = 8
  const fullSize = 42

  return Math.max(
    11,
    Math.min(fullSize, Math.floor((fullSize * referenceLength) / formattedAmount.length)),
  )
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
  suffix?: string
  help?: string
}

function MoneyField({ id, label, value, onChange, suffix, help }: MoneyFieldProps) {
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
        {suffix && <span className="mortgage-input__suffix">{suffix}</span>}
      </span>
    </label>
  )
}

export function MortgageCalculator({ onBack }: MortgageCalculatorProps) {
  const [homePrice, setHomePrice] = useState(1_250_000)
  const [downPayment, setDownPayment] = useState(250_000)
  const [downPaymentMode, setDownPaymentMode] =
    useState<DownPaymentMode>('dollars')
  const [loanTermId, setLoanTermId] = useState<LoanTermId>('fixed-30')
  const [creditScoreId, setCreditScoreId] =
    useState<CreditScoreId>('excellent')
  const [monthlyHoa, setMonthlyHoa] = useState(0)
  const [annualInsurance, setAnnualInsurance] = useState(0)
  const [annualPropertyTax, setAnnualPropertyTax] = useState(1_200)
  const [downPaymentFocused, setDownPaymentFocused] = useState(false)
  const [removePmi, setRemovePmi] = useState(false)

  const loanTerm =
    loanTerms.find((term) => term.id === loanTermId) ?? loanTerms[0]
  const creditScore =
    creditScores.find((score) => score.id === creditScoreId) ?? creditScores[0]
  const interestRate = calculateInterestRate(loanTerm, creditScore)
  const downPaymentAmount =
    downPaymentMode === 'dollars'
      ? Math.min(homePrice, downPayment)
      : homePrice * (Math.min(100, downPayment) / 100)
  const payment = calculateMortgagePayment({
    homePrice,
    downPayment: downPaymentAmount,
    annualInterestRate: interestRate,
    amortizationYears: loanTerm.amortizationYears,
    annualPropertyTax,
    annualHomeInsurance: annualInsurance,
    monthlyHoa,
  })

  const ltv = homePrice > 0 ? payment.loanAmount / homePrice : 0
  const pmiEligible = ltv > 0.8
  const annualPmiRate = calculatePmiRate(creditScoreId, ltv)
  const monthlyPmi = pmiEligible && !removePmi ? (payment.loanAmount * annualPmiRate) / 12 : 0
  const totalMonthly = payment.total + monthlyPmi

  const components = [
    {
      label: 'Principal & interest',
      value: payment.principalAndInterest,
      color: '#2f81f7',
      help: 'The portion of the payment that goes to the lender for the loan itself, excluding taxes, insurance, and HOA.',
    },
    ...(pmiEligible ? [{
      label: 'Mortgage insurance',
      value: monthlyPmi,
      color: '#a371f7',
      help: `Private mortgage insurance (PMI) is required when your down payment is below 20%. Your estimated rate is ${(annualPmiRate * 100).toFixed(2)}% per year based on your credit score. Formula: loan amount × ${(annualPmiRate * 100).toFixed(2)}% ÷ 12.`,
    }] : []),
    {
      label: 'Property tax',
      value: payment.propertyTax,
      color: '#3fb950',
      help: "Monthly share of the property's annual tax bill, collected into escrow.",
    },
    {
      label: 'Home insurance',
      value: payment.homeInsurance,
      color: '#d29922',
      help: "Monthly share of the annual homeowner's insurance premium.",
    },
    {
      label: 'HOA',
      value: payment.hoa,
      color: '#f47067',
      help: 'Monthly homeowners association dues, if any.',
    },
  ]
  let runningPercent = 0
  const gradientStops = components.map((component) => {
    const start = runningPercent
    runningPercent += totalMonthly ? (component.value / totalMonthly) * 100 : 0
    return `${component.color} ${start}% ${runningPercent}%`
  })
  const donutBackground = totalMonthly
    ? `conic-gradient(${gradientStops.join(', ')})`
    : 'conic-gradient(#30363d 0 100%)'
  const paymentDescription = components
    .map((component) => `${component.label}: ${preciseCurrency.format(component.value)}`)
    .join('. ')
  const formattedTotal = currency.format(totalMonthly)

  function changeDownPaymentMode(nextMode: DownPaymentMode) {
    if (nextMode === downPaymentMode) return

    setDownPayment(
      nextMode === 'percent'
        ? homePrice > 0
          ? Number(((downPayment / homePrice) * 100).toFixed(2))
          : 0
        : (homePrice * downPayment) / 100,
    )
    setDownPaymentMode(nextMode)
  }

  function resetCalculator() {
    setHomePrice(1_250_000)
    setDownPayment(250_000)
    setDownPaymentMode('dollars')
    setLoanTermId('fixed-30')
    setCreditScoreId('excellent')
    setMonthlyHoa(0)
    setAnnualInsurance(0)
    setAnnualPropertyTax(1_200)
    setRemovePmi(false)
  }

  return (
    <main className="mortgage-page" id="mortgage-calculator">
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
        <div className="mortgage-heading__icon"><House size={24} /></div>
        <div>
          <p className="eyebrow">MORTGAGE & FINANCING</p>
          <h1>Mortgage calculator</h1>
          <p>Estimate your complete monthly mortgage payment.</p>
        </div>
      </header>

      <section className="mortgage-workspace">
        <section className="mortgage-result-panel" aria-labelledby="payment-title">
          <div className="mortgage-result__header">
            <div>
              <span className="eyebrow">PAYMENT ESTIMATE</span>
              <h2 id="payment-title">Your monthly payment</h2>
            </div>
            <span className="mortgage-loan-pill">
              {currency.format(payment.loanAmount)} loan
            </span>
          </div>

          <div className="mortgage-visual">
            <div className="mortgage-legend" aria-label="Monthly payment breakdown">
              {components.map((component) => (
                <div className="mortgage-legend__item" key={component.label}>
                  <span
                    className="mortgage-legend__swatch"
                    style={{ backgroundColor: component.color }}
                    aria-hidden="true"
                  />
                  <span>
                    <small>
                      <FieldLabel label={component.label} help={component.help} />
                    </small>
                    <strong>{preciseCurrency.format(component.value)}</strong>
                  </span>
                </div>
              ))}
            </div>

            <figure className="mortgage-chart">
              <div
                className="mortgage-donut"
                style={{ background: donutBackground }}
                role="img"
              aria-label={`${preciseCurrency.format(totalMonthly)} estimated monthly payment. ${paymentDescription}.`}
              >
                <div className="mortgage-donut__center" aria-hidden="true">
                  <strong style={{ fontSize: getPaymentFontSize(formattedTotal) }}>
                    {formattedTotal}
                  </strong>
                  <span>per month</span>
                </div>
              </div>
              <figcaption>
                Estimated payment including principal, interest, property tax,
                home insurance, and HOA fees.
              </figcaption>
            </figure>
          </div>

          <div className="mortgage-insight">
            <Sparkles size={17} aria-hidden="true" />
            <p>
              Principal and interest are {Math.round(
                totalMonthly
                  ? (payment.principalAndInterest / totalMonthly) * 100
                  : 0,
              )}% of this estimate.
            </p>
          </div>
        </section>

        <form className="mortgage-form-panel" onSubmit={(event) => event.preventDefault()}>
          <div className="mortgage-form__heading">
            <span className="eyebrow">LOAN DETAILS</span>
            <h2>Adjust your estimate</h2>
          </div>

          <MoneyField
            id="home-price"
            label="Home price"
            value={homePrice}
            onChange={setHomePrice}
            help="The purchase price you're targeting or under contract for."
          />

          <fieldset className="mortgage-down-payment">
            <legend>
              <FieldLabel label="Down payment" help="Cash you pay upfront toward the purchase. Below 20% down, lenders typically add PMI (mortgage insurance) to your monthly payment." />
            </legend>
            <div className="mortgage-down-payment__row">
              <span className="mortgage-input">
                <span className="mortgage-input__prefix" aria-hidden="true">
                  {downPaymentMode === 'dollars' ? '$' : '%'}
                </span>
                <input
                  id="down-payment"
                  aria-label={`Down payment in ${downPaymentMode}`}
                  type="text"
                  inputMode="decimal"
                  value={downPaymentMode === 'dollars' && !downPaymentFocused ? (downPayment === 0 ? '' : downPayment.toLocaleString('en-US')) : (downPayment === 0 ? '' : String(downPayment))}
                  onFocus={() => setDownPaymentFocused(true)}
                  onBlur={() => setDownPaymentFocused(false)}
                  onChange={(event) =>
                    setDownPayment(safeNumber(Number(event.target.value.replace(/,/g, ''))))
                  }
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
            <small>{currency.format(downPaymentAmount)} applied</small>
          </fieldset>

          <label className="mortgage-field" htmlFor="loan-term">
            <FieldLabel label="Loan term" help="How many years you'll take to pay off the loan. A 30-year term has lower monthly payments; a 15-year term costs less interest overall." />
            <span className="mortgage-select">
              <select
                id="loan-term"
                value={loanTermId}
                onChange={(event) => setLoanTermId(event.target.value as LoanTermId)}
              >
                {loanTerms.map((term) => (
                  <option value={term.id} key={term.id}>{term.label}</option>
                ))}
              </select>
            </span>
            <small>{loanTerm.note}</small>
          </label>

          <label className="mortgage-field" htmlFor="credit-score">
            <FieldLabel label="Credit score" help="Your approximate credit score range — used to estimate the interest rate you'd qualify for." />
            <span className="mortgage-select">
              <select
                id="credit-score"
                value={creditScoreId}
                onChange={(event) =>
                  setCreditScoreId(event.target.value as CreditScoreId)
                }
              >
                {creditScores.map((score) => (
                  <option value={score.id} key={score.id}>{score.label}</option>
                ))}
              </select>
            </span>
          </label>

          <label className="mortgage-field" htmlFor="interest-rate">
            <FieldLabel label="Estimated interest rate" help="Automatically estimated from your selected loan term and credit score." />
            <span className="mortgage-input mortgage-input--rate">
              <span className="mortgage-input__prefix" aria-hidden="true">%</span>
              <input
                id="interest-rate"
                type="text"
                value={interestRate.toFixed(2)}
                readOnly
                aria-describedby="rate-explanation"
              />
            </span>
            <small id="rate-explanation" className="mortgage-rate-note">
              Updates automatically for loan term and credit score
            </small>
          </label>

          {pmiEligible && (
            <label className="mortgage-pmi-toggle">
              <input
                type="checkbox"
                checked={removePmi}
                onChange={(e) => setRemovePmi(e.target.checked)}
              />
              <span>
                Remove mortgage insurance (PMI)
                <small>
                  {removePmi
                    ? 'PMI excluded — estimated savings of ' + preciseCurrency.format((payment.loanAmount * annualPmiRate) / 12) + '/mo'
                    : preciseCurrency.format(monthlyPmi) + '/mo · ' + (pmiRates[creditScoreId] * 100).toFixed(2) + '% annual rate for your credit score'}
                </small>
              </span>
            </label>
          )}

          <div className="mortgage-form__divider" />

          <div className="mortgage-expense-grid">
            <MoneyField
              id="property-tax"
              label="Property tax"
              value={annualPropertyTax}
              onChange={setAnnualPropertyTax}
              suffix="/ year"
              help="Yearly property tax billed by the county, usually collected monthly by the lender through escrow."
            />
            <MoneyField
              id="home-insurance"
              label="Home insurance"
              value={annualInsurance}
              onChange={setAnnualInsurance}
              suffix="/ year"
              help="Yearly homeowner's insurance premium, also usually collected monthly through escrow."
            />
          </div>

          <MoneyField
            id="hoa"
            label="HOA fees"
            value={monthlyHoa}
            onChange={setMonthlyHoa}
            suffix="/ month"
            help="Homeowners association dues, if the property has them. Enter 0 if none."
          />
        </form>
      </section>

      <p className="mortgage-disclaimer">
        Rates are illustrative comparison estimates, not live lender quotes or a
        loan offer. Actual rates, mortgage insurance, fees, and terms may vary.
      </p>
    </main>
  )
}
