import { useState } from 'react'
import { ArrowLeft, HandCoins, HelpCircle, Printer, RotateCcw, ShieldCheck } from 'lucide-react'
import {
  calculateInterestRate,
  calculateMortgagePayment,
  creditScores,
  loanTerms,
  type CreditScoreId,
  type LoanTermId,
} from '../../lib/mortgage'
import { ShareWithAdvisor } from '../shared/ShareWithAdvisor'
import type { ShareSection } from '../../lib/share'

interface CashOutRefinanceCalculatorProps {
  onBack: () => void
}

const MAX_LTV = 0.85
const MORTGAGE_INSURANCE_RATE = 0.0056

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
  return Math.max(11, Math.min(42, Math.floor(336 / formattedAmount.length)))
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

interface RefinanceMoneyFieldProps {
  id: string
  label: string
  value: number
  onChange: (value: number) => void
  suffix?: string
  describedBy?: string
  help?: string
}

function RefinanceMoneyField({
  id,
  label,
  value,
  onChange,
  suffix,
  describedBy,
  help,
}: RefinanceMoneyFieldProps) {
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
          aria-describedby={describedBy}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(event) => onChange(safeNumber(Number(event.target.value.replace(/,/g, ''))))}
        />
        {suffix && <span className="mortgage-input__suffix">{suffix}</span>}
      </span>
    </label>
  )
}

export function CashOutRefinanceCalculator({
  onBack,
}: CashOutRefinanceCalculatorProps) {
  const [homeValue, setHomeValue] = useState(300_000)
  const [loanBalance, setLoanBalance] = useState(60_000)
  const [requestedCashOut, setRequestedCashOut] = useState(195_000)
  const [loanTermId, setLoanTermId] = useState<LoanTermId>('fixed-30')
  const [creditScoreId, setCreditScoreId] = useState<CreditScoreId>('good')
  const [monthlyHoa, setMonthlyHoa] = useState(0)
  const [annualInsurance, setAnnualInsurance] = useState(0)
  const [annualPropertyTax, setAnnualPropertyTax] = useState(1_200)

  const loanTerm =
    loanTerms.find((term) => term.id === loanTermId) ?? loanTerms[0]
  const creditScore =
    creditScores.find((score) => score.id === creditScoreId) ?? creditScores[0]
  const interestRate = Number(
    Math.max(0, calculateInterestRate(loanTerm, creditScore) - 0.05).toFixed(3),
  )
  const maximumLoanAmount = homeValue * MAX_LTV
  const maximumCashAvailable = Math.max(0, maximumLoanAmount - loanBalance)
  const appliedCashOut = Math.min(requestedCashOut, maximumCashAvailable)
  const newLoanAmount = loanBalance + appliedCashOut
  const newLtv = homeValue > 0 ? (newLoanAmount / homeValue) * 100 : 0
  const basePayment = calculateMortgagePayment({
    homePrice: newLoanAmount,
    downPayment: 0,
    annualInterestRate: interestRate,
    amortizationYears: loanTerm.amortizationYears,
    annualPropertyTax,
    annualHomeInsurance: annualInsurance,
    monthlyHoa,
  })
  const mortgageInsurance =
    newLtv > 80 ? (newLoanAmount * MORTGAGE_INSURANCE_RATE) / 12 : 0
  const totalPayment = basePayment.total + mortgageInsurance
  const requestExceedsLimit = requestedCashOut > maximumCashAvailable

  const components = [
    {
      label: 'Principal & interest',
      value: basePayment.principalAndInterest,
      color: '#2f81f7',
      help: 'The portion of the payment that goes to the lender for the loan itself, excluding taxes, insurance, and HOA.',
    },
    {
      label: 'Property tax',
      value: basePayment.propertyTax,
      color: '#3fb950',
      help: "Monthly share of the property's annual tax bill, collected into escrow.",
    },
    {
      label: 'Home insurance',
      value: basePayment.homeInsurance,
      color: '#d29922',
      help: "Monthly share of the annual homeowner's insurance premium.",
    },
    {
      label: 'HOA',
      value: basePayment.hoa,
      color: '#f47067',
      help: 'Monthly homeowners association dues, if any.',
    },
    {
      label: 'Mortgage insurance',
      value: mortgageInsurance,
      color: '#db3b3b',
      help: 'PMI, added because the new loan-to-value is above 80%. Drops off once you regain enough equity.',
    },
  ]
  let runningPercent = 0
  const gradientStops = components.map((component) => {
    const start = runningPercent
    runningPercent += totalPayment ? (component.value / totalPayment) * 100 : 0
    return `${component.color} ${start}% ${runningPercent}%`
  })
  const donutBackground = totalPayment
    ? `conic-gradient(${gradientStops.join(', ')})`
    : 'conic-gradient(#30363d 0 100%)'
  const formattedTotal = currency.format(totalPayment)
  const paymentDescription = components
    .map((component) => `${component.label}: ${preciseCurrency.format(component.value)}`)
    .join('. ')

  function resetCalculator() {
    setHomeValue(300_000)
    setLoanBalance(60_000)
    setRequestedCashOut(195_000)
    setLoanTermId('fixed-30')
    setCreditScoreId('good')
    setMonthlyHoa(0)
    setAnnualInsurance(0)
    setAnnualPropertyTax(1_200)
  }

  function getShareSections(): ShareSection[] {
    return [
      {
        title: 'My inputs',
        entries: [
          { label: 'Home value', value: currency.format(homeValue) },
          { label: 'Current loan balance', value: currency.format(loanBalance) },
          { label: 'Requested cash out', value: currency.format(requestedCashOut) },
          { label: 'Loan term', value: loanTerm.label },
          { label: 'Credit score', value: creditScore.label },
          { label: 'Estimated interest rate', value: `${interestRate.toFixed(2)}%` },
          { label: 'Property tax', value: `${currency.format(annualPropertyTax)} / year` },
          { label: 'Home insurance', value: `${currency.format(annualInsurance)} / year` },
          { label: 'HOA fees', value: `${currency.format(monthlyHoa)} / month` },
        ],
      },
      {
        title: 'Results',
        entries: [
          { label: 'Maximum cash available', value: currency.format(maximumCashAvailable) },
          { label: 'Cash applied', value: currency.format(appliedCashOut) },
          { label: 'New loan amount', value: currency.format(newLoanAmount) },
          { label: 'New loan-to-value', value: `${newLtv.toFixed(1)}%` },
          ...(mortgageInsurance > 0
            ? [
                {
                  label: 'Mortgage insurance',
                  value: `${preciseCurrency.format(mortgageInsurance)} / month`,
                },
              ]
            : []),
          {
            label: 'New monthly payment',
            value: `${preciseCurrency.format(totalPayment)} / month`,
          },
        ],
      },
    ]
  }

  return (
    <main className="mortgage-page" id="cash-out-refinance">
      <div className="mortgage-breadcrumb">
        <button type="button" onClick={onBack}>
          <ArrowLeft size={16} /> All calculators
        </button>
        <div className="mortgage-actions">
          <ShareWithAdvisor tool="Cash-out refinance" getSections={getShareSections} />
          <button type="button" onClick={resetCalculator}>
            <RotateCcw size={15} /> Reset
          </button>
          <button type="button" onClick={() => window.print()}>
            <Printer size={15} /> Print
          </button>
        </div>
      </div>

      <header className="mortgage-heading">
        <div className="mortgage-heading__icon"><HandCoins size={24} /></div>
        <div>
          <p className="eyebrow">MORTGAGE & FINANCING</p>
          <h1>Cash-out refinance</h1>
          <p>
            Replace your current mortgage with a larger loan and receive the
            difference in cash.
          </p>
        </div>
      </header>

      <section className="mortgage-workspace">
        <section className="mortgage-result-panel" aria-labelledby="cash-available-title">
          <div className="mortgage-result__header refinance-result__header">
            <div>
              <span className="eyebrow">ESTIMATED EQUITY ACCESS</span>
              <h2 id="cash-available-title">
                <FieldLabel label="Cash available" help="The most you could receive in cash, keeping the new loan at or below 85% of your home's value." />
              </h2>
              <strong className="refinance-cash-amount">
                {currency.format(maximumCashAvailable)}
              </strong>
            </div>
            <span className="mortgage-loan-pill">
              {currency.format(newLoanAmount)} new loan
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
                aria-label={`${preciseCurrency.format(totalPayment)} estimated monthly payment. ${paymentDescription}.`}
              >
                <div className="mortgage-donut__center" aria-hidden="true">
                  <strong style={{ fontSize: getPaymentFontSize(formattedTotal) }}>
                    {formattedTotal}
                  </strong>
                  <span>per month</span>
                </div>
              </div>
              <figcaption>
                Estimated payment on the new loan, including property expenses
                and estimated mortgage insurance.
              </figcaption>
            </figure>
          </div>

          <div className="mortgage-insight">
            <ShieldCheck size={17} aria-hidden="true" />
            <p>
              This estimate limits the new loan to 85% LTV, retaining at least
              15% of the home's value as equity.
            </p>
          </div>
        </section>

        <form className="mortgage-form-panel" onSubmit={(event) => event.preventDefault()}>
          <div className="mortgage-form__heading">
            <span className="eyebrow">REFINANCE DETAILS</span>
            <h2>Explore your cash-out</h2>
          </div>

          <RefinanceMoneyField
            id="refinance-home-value"
            label="Home value"
            value={homeValue}
            onChange={setHomeValue}
            help="Your home's estimated current market value."
          />
          <RefinanceMoneyField
            id="current-loan-balance"
            label="Current loan balance"
            value={loanBalance}
            onChange={setLoanBalance}
            help="What you still owe on your existing mortgage today."
          />
          <RefinanceMoneyField
            id="requested-cash-out"
            label="Cash out"
            value={requestedCashOut}
            onChange={setRequestedCashOut}
            describedBy="cash-out-limit"
            help="How much cash you'd like to receive. Capped at what keeps the new loan at or below 85% of the home's value."
          />

          <div
            className={`refinance-ltv ${requestExceedsLimit ? 'refinance-ltv--warning' : ''}`}
            id="cash-out-limit"
            role="status"
          >
            <span>
              <small>
                <FieldLabel label="New loan-to-value" help="LTV — the new loan amount (old balance plus cash out) divided by the home's value. Capped at 85% in this estimate." />
              </small>
              <strong>{newLtv.toFixed(1)}%</strong>
            </span>
            <span>
              <small>
                <FieldLabel label="Cash applied" help="The actual cash-out amount used in the calculation — your requested amount, capped at the maximum available." />
              </small>
              <strong>{currency.format(appliedCashOut)}</strong>
            </span>
            {requestExceedsLimit && (
              <p>Cash out is capped at {currency.format(maximumCashAvailable)}.</p>
            )}
          </div>

          <label className="mortgage-field" htmlFor="refinance-loan-term">
            <FieldLabel label="Loan term" help="How many years you'll take to pay off the new loan." />
            <span className="mortgage-select">
              <select
                id="refinance-loan-term"
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

          <label className="mortgage-field" htmlFor="refinance-credit-score">
            <FieldLabel label="Credit score" help="Your approximate credit score range — used to estimate the interest rate you'd qualify for." />
            <span className="mortgage-select">
              <select
                id="refinance-credit-score"
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

          <label className="mortgage-field" htmlFor="refinance-interest-rate">
            <FieldLabel label="Estimated interest rate" help="Automatically estimated from your selected loan term and credit score, with a small discount applied for cash-out refinances in this model." />
            <span className="mortgage-input mortgage-input--rate">
              <span className="mortgage-input__prefix" aria-hidden="true">%</span>
              <input
                id="refinance-interest-rate"
                type="text"
                value={interestRate.toFixed(2)}
                readOnly
                aria-describedby="refinance-rate-explanation"
              />
            </span>
            <small id="refinance-rate-explanation" className="mortgage-rate-note">
              Updates automatically for loan term and credit score
            </small>
          </label>

          <div className="mortgage-form__divider" />

          <div className="mortgage-expense-grid">
            <RefinanceMoneyField
              id="refinance-property-tax"
              label="Property tax"
              value={annualPropertyTax}
              onChange={setAnnualPropertyTax}
              suffix="/ year"
              help="Yearly property tax billed by the county."
            />
            <RefinanceMoneyField
              id="refinance-home-insurance"
              label="Home insurance"
              value={annualInsurance}
              onChange={setAnnualInsurance}
              suffix="/ year"
              help="Yearly homeowner's insurance premium."
            />
          </div>
          <RefinanceMoneyField
            id="refinance-hoa"
            label="HOA fees"
            value={monthlyHoa}
            onChange={setMonthlyHoa}
            suffix="/ month"
            help="Monthly homeowners association dues, if any. Enter 0 if none."
          />
        </form>
      </section>

      <p className="mortgage-disclaimer">
        Rates and mortgage insurance are illustrative estimates, not live lender
        quotes or a loan offer. Closing costs, eligibility, actual rates, and terms
        may vary.
      </p>
    </main>
  )
}

