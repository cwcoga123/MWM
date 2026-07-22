import { useMemo, useState, type CSSProperties } from 'react'
import { ArrowLeft, HelpCircle, Printer, RotateCcw, WalletCards } from 'lucide-react'
import {
  affordabilityZone,
  calculateAffordability,
  calculateInterestRate,
  creditScores,
  GAUGE_MAX_DTI,
  gaugeFillPercent,
  loanTerms,
  pmiRates,
  TARGET_DTI,
  type CreditScoreId,
  type LoanTermId,
} from '../../lib/affordability'
import { ShareWithAdvisor } from '../shared/ShareWithAdvisor'
import type { ShareSection } from '../../lib/share'
import { useClientActivity } from '../shared/clientActivityContext'

interface AffordabilityCalculatorProps {
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

function PercentField({ id, label, value, onChange, help }: PercentFieldProps) {
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

const ZONE_LABEL: Record<ReturnType<typeof affordabilityZone>, string> = {
  affordable: 'Affordable',
  stretching: 'Stretching',
  aggressive: 'Aggressive',
}

export function AffordabilityCalculator({ onBack }: AffordabilityCalculatorProps) {
  const clientActivity = useClientActivity()
  const plan = clientActivity?.user.preferences
  const targetBudget = clientActivity?.user.targetBudget ?? 950_000
  const defaultDownPayment = plan?.downPaymentAmount ?? targetBudget * ((plan?.downPaymentPercent ?? 20) / 100)
  const defaultLoanTerm: LoanTermId = plan?.loanTermYears === 15 ? 'fixed-15' : plan?.loanTermYears === 20 ? 'fixed-20' : 'fixed-30'
  const [grossAnnualIncome, setGrossAnnualIncome] = useState(plan?.grossAnnualIncome ?? 90_000)
  const [monthlyDebt, setMonthlyDebt] = useState(plan?.monthlyDebt ?? 600)
  const [downPayment, setDownPayment] = useState(defaultDownPayment)
  const [propertyTaxRate, setPropertyTaxRate] = useState(plan?.annualPropertyTaxRate ?? 0.74)
  const [creditScoreId, setCreditScoreId] = useState<CreditScoreId>('excellent')
  const [loanTermId, setLoanTermId] = useState<LoanTermId>(defaultLoanTerm)
  const [useCustomRate, setUseCustomRate] = useState(false)
  const [customRate, setCustomRate] = useState(6.49)
  const [removeMortgageInsurance, setRemoveMortgageInsurance] = useState(false)
  const [targetDti, setTargetDti] = useState(TARGET_DTI)

  const loanTerm = loanTerms.find((term) => term.id === loanTermId) ?? loanTerms[0]
  const creditScore = creditScores.find((score) => score.id === creditScoreId) ?? creditScores[0]
  const computedRate = calculateInterestRate(loanTerm, creditScore)
  const interestRate = useCustomRate ? safeNumber(customRate) : computedRate

  const result = useMemo(
    () =>
      calculateAffordability({
        grossAnnualIncome,
        monthlyDebt,
        downPayment,
        propertyTaxRatePercent: propertyTaxRate,
        annualInterestRate: interestRate,
        termYears: loanTerm.amortizationYears,
        removeMortgageInsurance,
        creditScoreId,
        targetDti,
      }),
    [
      grossAnnualIncome,
      monthlyDebt,
      downPayment,
      propertyTaxRate,
      interestRate,
      loanTerm.amortizationYears,
      removeMortgageInsurance,
      creditScoreId,
      targetDti,
    ],
  )

  const zone = affordabilityZone(result.debtToIncomeRatio)
  const fillPercent = gaugeFillPercent(result.debtToIncomeRatio)

  function resetCalculator() {
    setGrossAnnualIncome(90_000)
    setMonthlyDebt(600)
    setDownPayment(15_000)
    setPropertyTaxRate(0.74)
    setCreditScoreId('excellent')
    setLoanTermId('fixed-30')
    setUseCustomRate(false)
    setCustomRate(6.49)
    setRemoveMortgageInsurance(false)
    setTargetDti(TARGET_DTI)
  }

  function getShareSections(): ShareSection[] {
    return [
      {
        title: 'My inputs',
        entries: [
          { label: 'Gross annual income', value: currency.format(grossAnnualIncome) },
          { label: 'Monthly debt', value: currency.format(monthlyDebt) },
          { label: 'Down payment', value: currency.format(downPayment) },
          { label: 'Property tax rate', value: `${propertyTaxRate}% / year` },
          { label: 'Credit score', value: creditScore.label },
          { label: 'Loan term', value: loanTerm.label },
          {
            label: useCustomRate ? 'Custom interest rate' : 'Estimated interest rate',
            value: `${interestRate.toFixed(3)}%`,
          },
          { label: 'Target debt-to-income', value: `${Math.round(targetDti * 100)}%` },
          ...(removeMortgageInsurance
            ? [{ label: 'Mortgage insurance', value: 'Excluded' }]
            : []),
        ],
      },
      {
        title: 'Results',
        entries: [
          { label: 'Affordable home price', value: currency.format(result.affordablePrice) },
          {
            label: 'Monthly payment estimate',
            value: `${currency.format(result.totalMonthlyPayment)} / month`,
          },
          ...(result.pmiActive
            ? [{ label: 'Monthly PMI', value: `${currency.format(result.monthlyPmi)} / month` }]
            : []),
          {
            label: 'Debt-to-income ratio',
            value: `${Math.round(result.debtToIncomeRatio * 100)}% (${ZONE_LABEL[zone]})`,
          },
        ],
      },
    ]
  }

  return (
    <main className="mortgage-page" id="affordability">
      <div className="mortgage-breadcrumb">
        <button type="button" onClick={onBack}>
          <ArrowLeft size={16} /> All calculators
        </button>
        <div className="mortgage-actions">
          <ShareWithAdvisor tool="Affordability calculator" getSections={getShareSections} />
          <button type="button" onClick={resetCalculator}>
            <RotateCcw size={15} /> Reset
          </button>
          <button type="button" onClick={() => window.print()}>
            <Printer size={15} /> Print
          </button>
        </div>
      </div>

      <header className="mortgage-heading">
        <div className="mortgage-heading__icon"><WalletCards size={24} /></div>
        <div>
          <p className="eyebrow">MORTGAGE & FINANCING</p>
          <h1>Affordability calculator</h1>
          <p>Affordability calculator based on income, debt, etc.</p>
        </div>
      </header>

      <section className="mortgage-workspace">
        <section className="mortgage-result-panel" aria-labelledby="affordability-title">
          <div className="mortgage-result__header">
            <div>
              <span className="eyebrow">PURCHASE POWER</span>
              <h2 id="affordability-title">How much can I afford?</h2>
            </div>
            <span className="mortgage-loan-pill">{currency.format(result.affordablePrice)}</span>
          </div>

          <dl className="affordability-summary-list">
            <div>
              <dt>
                <FieldLabel label="Estimated mortgage rate" help="An average rate for your chosen loan term and credit score, or your custom rate if you've entered one." />
              </dt>
              <dd>{interestRate.toFixed(3)}%<span aria-hidden="true"> *</span></dd>
            </div>
            <div>
              <dt>
                <FieldLabel label="Monthly payment estimate" help="Principal, interest, taxes, insurance, and PMI (if applicable) combined at the target debt-to-income ratio. This stays pinned to your budget — it's the affordable price (below) that moves with your credit score, not this total." />
              </dt>
              <dd>{currency.format(result.totalMonthlyPayment)}</dd>
            </div>
            {result.pmiActive && (
              <div>
                <dt>
                  <FieldLabel
                    label="Monthly PMI"
                    help={`Private mortgage insurance, included in the total above. Estimated at ${(pmiRates[creditScoreId] * 100).toFixed(2)}%/yr for your selected credit score band — this is the line that actually moves when you change credit score, since a worse rate buys a cheaper home to hold the same total payment.`}
                  />
                </dt>
                <dd>{currency.format(result.monthlyPmi)}</dd>
              </div>
            )}
            <div>
              <dt>
                <FieldLabel label="Debt to income ratio" help="DTI — your monthly debt payments (including the new mortgage) divided by your gross monthly income. Lenders typically want this at 36% or below." />
              </dt>
              <dd>{Math.round(result.debtToIncomeRatio * 100)}%</dd>
            </div>
          </dl>

          <div className="affordability-gauge">
            <input
              type="range"
              className={`affordability-gauge__input affordability-gauge__input--${zone}`}
              style={{ '--fill-percent': `${fillPercent}%` } as CSSProperties}
              min={0}
              max={Math.round(GAUGE_MAX_DTI * 1000)}
              step={5}
              value={Math.round(targetDti * 1000)}
              onChange={(event) => setTargetDti(Number(event.target.value) / 1000)}
              aria-label="Target debt-to-income ratio"
              aria-valuetext={`${Math.round(result.debtToIncomeRatio * 100)}% — ${ZONE_LABEL[zone]}`}
            />
            <div className="affordability-gauge__labels">
              <span className={zone === 'affordable' ? 'is-active' : ''}>Affordable</span>
              <span className={zone === 'stretching' ? 'is-active' : ''}>Stretching</span>
              <span className={zone === 'aggressive' ? 'is-active' : ''}>Aggressive</span>
            </div>
          </div>

          <div className="mortgage-insight">
            <p>
              Drag the slider to trade off purchase price against your debt-to-income ratio.
              The conventional guideline lenders use for a comfortable purchase is 36% or less.
              {result.pmiActive && ' This estimate includes mortgage insurance since your down payment is under 20%.'}
            </p>
          </div>
        </section>

        <form className="mortgage-form-panel" onSubmit={(event) => event.preventDefault()}>
          <div className="mortgage-form__heading">
            <span className="eyebrow">YOUR FINANCES</span>
            <h2>Adjust your estimate</h2>
          </div>

          <div className="mortgage-expense-grid">
            <MoneyField
              id="affordability-income"
              label="Gross annual income"
              value={grossAnnualIncome}
              onChange={setGrossAnnualIncome}
              help="Your total household income before taxes and deductions."
            />
            <MoneyField
              id="affordability-debt"
              label="Monthly debt"
              value={monthlyDebt}
              onChange={setMonthlyDebt}
              help="Other required monthly payments — car loans, student loans, credit card minimums, etc. Don't include rent or the mortgage you're solving for."
            />
          </div>

          <div className="mortgage-expense-grid">
            <MoneyField
              id="affordability-down-payment"
              label="Down payment"
              value={downPayment}
              onChange={setDownPayment}
              help="Cash you plan to pay upfront toward the purchase."
            />
            <PercentField
              id="affordability-property-tax"
              label="Property tax"
              value={propertyTaxRate}
              onChange={setPropertyTaxRate}
              help="Annual property tax rate as a percent of the home price, used to estimate your monthly escrow payment."
            />
          </div>

          <label className="mortgage-field" htmlFor="affordability-credit-score">
            <FieldLabel label="Credit score" help="Your approximate credit score range — used to estimate the interest rate you'd qualify for." />
            <span className="mortgage-select">
              <select
                id="affordability-credit-score"
                value={creditScoreId}
                onChange={(event) => setCreditScoreId(event.target.value as CreditScoreId)}
              >
                {creditScores.map((score) => (
                  <option value={score.id} key={score.id}>{score.label}</option>
                ))}
              </select>
            </span>
          </label>

          <label className="mortgage-field" htmlFor="affordability-loan-term">
            <FieldLabel label="Loan term" help="How many years you'd take to pay off the loan — affects both the rate estimate and the monthly payment." />
            <span className="mortgage-select">
              <select
                id="affordability-loan-term"
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

          <label className="affordability-checkbox">
            <input
              type="checkbox"
              checked={useCustomRate}
              onChange={(event) => setUseCustomRate(event.target.checked)}
            />
            <FieldLabel label="Use custom interest rate" help="Turn this on to enter your own rate instead of the rate estimated from your loan term and credit score." />
          </label>

          {useCustomRate ? (
            <PercentField
              id="affordability-custom-rate"
              label="Custom interest rate"
              value={customRate}
              onChange={setCustomRate}
              help="Enter the specific rate you've been quoted or want to model."
            />
          ) : (
            <label className="mortgage-field" htmlFor="affordability-computed-rate">
              <FieldLabel label="Estimated interest rate" help="Automatically estimated from your selected loan term and credit score." />
              <span className="mortgage-input mortgage-input--rate">
                <span className="mortgage-input__prefix" aria-hidden="true">%</span>
                <input
                  id="affordability-computed-rate"
                  type="text"
                  value={computedRate.toFixed(3)}
                  readOnly
                  aria-describedby="affordability-rate-explanation"
                />
              </span>
              <small id="affordability-rate-explanation" className="mortgage-rate-note">
                Updates automatically for loan term and credit score
              </small>
            </label>
          )}

          <label className="affordability-checkbox">
            <input
              type="checkbox"
              checked={removeMortgageInsurance}
              onChange={(event) => setRemoveMortgageInsurance(event.target.checked)}
            />
            <FieldLabel label="Remove mortgage insurance" help="Check this to exclude PMI from the estimate, as if you already have 20% equity or your loan doesn't require it." />
          </label>
        </form>
      </section>

      <p className="mortgage-disclaimer">
        Rates shown are for comparison only and are an average of the rates taken from multiple
        lenders and do not include all costs of borrowing. Actual rates and terms will vary.
      </p>
    </main>
  )
}
