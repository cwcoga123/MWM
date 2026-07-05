import { useMemo, useState, type CSSProperties } from 'react'
import { ArrowLeft, Printer, RotateCcw, WalletCards } from 'lucide-react'
import {
  affordabilityZone,
  calculateAffordability,
  calculateInterestRate,
  creditScores,
  GAUGE_MAX_DTI,
  gaugeFillPercent,
  loanTerms,
  TARGET_DTI,
  type CreditScoreId,
  type LoanTermId,
} from '../lib/affordability'

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

interface MoneyFieldProps {
  id: string
  label: string
  value: number
  onChange: (value: number) => void
}

function MoneyField({ id, label, value, onChange }: MoneyFieldProps) {
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
}

function PercentField({ id, label, value, onChange, step = '0.01' }: PercentFieldProps) {
  return (
    <label className="mortgage-field" htmlFor={id}>
      <span>{label}</span>
      <span className="mortgage-input">
        <span className="mortgage-input__prefix" aria-hidden="true">%</span>
        <input
          id={id}
          type="number"
          min="0"
          step={step}
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(safeNumber(event.target.valueAsNumber))}
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
  const [grossAnnualIncome, setGrossAnnualIncome] = useState(90_000)
  const [monthlyDebt, setMonthlyDebt] = useState(600)
  const [downPayment, setDownPayment] = useState(15_000)
  const [propertyTaxRate, setPropertyTaxRate] = useState(0.74)
  const [creditScoreId, setCreditScoreId] = useState<CreditScoreId>('excellent')
  const [loanTermId, setLoanTermId] = useState<LoanTermId>('fixed-30')
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

  return (
    <main className="mortgage-page" id="affordability">
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
              <dt>Estimated mortgage rate</dt>
              <dd>{interestRate.toFixed(3)}%<span aria-hidden="true"> *</span></dd>
            </div>
            <div>
              <dt>Monthly payment estimate</dt>
              <dd>{currency.format(result.totalMonthlyPayment)}</dd>
            </div>
            <div>
              <dt>Debt to income ratio</dt>
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
            />
            <MoneyField
              id="affordability-debt"
              label="Monthly debt"
              value={monthlyDebt}
              onChange={setMonthlyDebt}
            />
          </div>

          <div className="mortgage-expense-grid">
            <MoneyField
              id="affordability-down-payment"
              label="Down payment"
              value={downPayment}
              onChange={setDownPayment}
            />
            <PercentField
              id="affordability-property-tax"
              label="Property tax"
              value={propertyTaxRate}
              onChange={setPropertyTaxRate}
            />
          </div>

          <label className="mortgage-field" htmlFor="affordability-credit-score">
            <span>Credit score</span>
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
            <span>Loan term</span>
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
            <span>Use custom interest rate</span>
          </label>

          {useCustomRate ? (
            <PercentField
              id="affordability-custom-rate"
              label="Custom interest rate"
              value={customRate}
              onChange={setCustomRate}
            />
          ) : (
            <label className="mortgage-field" htmlFor="affordability-computed-rate">
              <span>Estimated interest rate</span>
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
            <span>Remove mortgage insurance</span>
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
