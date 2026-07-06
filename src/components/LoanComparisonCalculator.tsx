import { useState, type FormEvent } from 'react'
import { ArrowLeft, Columns3, Printer, RotateCcw } from 'lucide-react'
import {
  calculateComparisonLoan,
  comparisonDownPaymentAmount,
  type ComparisonDownPaymentMode,
  type ComparisonLoanInput,
  type ComparisonLoanResult,
} from '../lib/loanComparison'
import { loanTerms, type LoanTermId } from '../lib/mortgage'

interface LoanComparisonCalculatorProps {
  onBack: () => void
}

interface ComparisonResults {
  loan1: ComparisonLoanResult
  loan2: ComparisonLoanResult
}

interface LoanEditorProps {
  number: 1 | 2
  loan: ComparisonLoanInput
  onChange: (loan: ComparisonLoanInput) => void
}

const INITIAL_LOAN_1: ComparisonLoanInput = {
  homePrice: 300_000,
  downPayment: 60_000,
  downPaymentMode: 'dollars',
  loanTermId: 'fixed-30',
  annualInterestRate: 6.69,
}

const INITIAL_LOAN_2: ComparisonLoanInput = {
  homePrice: 300_000,
  downPayment: 60_000,
  downPaymentMode: 'dollars',
  loanTermId: 'fixed-30',
  annualInterestRate: 5.875,
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

function resultDifferenceLabel(value1: number, value2: number) {
  if (Math.abs(value1 - value2) < 0.005) return 'Same amount'
  return value1 < value2 ? 'Loan 1 is lower' : 'Loan 2 is lower'
}

function LoanEditor({ number, loan, onChange }: LoanEditorProps) {
  const idPrefix = `comparison-loan-${number}`
  const downPaymentAmount = comparisonDownPaymentAmount(loan)
  const [homePriceFocused, setHomePriceFocused] = useState(false)
  const [downPaymentFocused, setDownPaymentFocused] = useState(false)
  const [rateRawInput, setRateRawInput] = useState<string | null>(null)

  function update(patch: Partial<ComparisonLoanInput>) {
    onChange({ ...loan, ...patch })
  }

  function changeDownPaymentMode(nextMode: ComparisonDownPaymentMode) {
    if (nextMode === loan.downPaymentMode) return

    update({
      downPaymentMode: nextMode,
      downPayment:
        nextMode === 'percent'
          ? loan.homePrice > 0
            ? Number(((downPaymentAmount / loan.homePrice) * 100).toFixed(2))
            : 0
          : downPaymentAmount,
    })
  }

  return (
    <fieldset className="loan-comparison__loan">
      <legend>Loan {number}</legend>

      <label className="mortgage-field" htmlFor={`${idPrefix}-price`}>
        <span>Home price</span>
        <span className="mortgage-input">
          <span className="mortgage-input__prefix" aria-hidden="true">$</span>
          <input
            id={`${idPrefix}-price`}
            type="text"
            inputMode="decimal"
            value={homePriceFocused ? (loan.homePrice === 0 ? '' : String(loan.homePrice)) : (loan.homePrice === 0 ? '' : loan.homePrice.toLocaleString('en-US'))}
            onFocus={() => setHomePriceFocused(true)}
            onBlur={() => setHomePriceFocused(false)}
            onChange={(event) => update({ homePrice: safeNumber(Number(event.target.value.replace(/,/g, ''))) })}
          />
        </span>
      </label>

      <fieldset className="mortgage-down-payment">
        <legend>Down payment</legend>
        <div className="mortgage-down-payment__row">
          <span className="mortgage-input">
            <span className="mortgage-input__prefix" aria-hidden="true">
              {loan.downPaymentMode === 'dollars' ? '$' : '%'}
            </span>
            <input
              id={`${idPrefix}-down-payment`}
              aria-label={`Loan ${number} down payment in ${loan.downPaymentMode}`}
              type="text"
              inputMode="decimal"
              value={loan.downPaymentMode === 'dollars' && !downPaymentFocused ? (loan.downPayment === 0 ? '' : loan.downPayment.toLocaleString('en-US')) : (loan.downPayment === 0 ? '' : String(loan.downPayment))}
              onFocus={() => setDownPaymentFocused(true)}
              onBlur={() => setDownPaymentFocused(false)}
              onChange={(event) => update({ downPayment: safeNumber(Number(event.target.value.replace(/,/g, ''))) })}
            />
          </span>
          <div className="mortgage-mode-toggle" aria-label={`Loan ${number} down payment unit`}>
            <button
              type="button"
              className={loan.downPaymentMode === 'dollars' ? 'is-active' : ''}
              aria-pressed={loan.downPaymentMode === 'dollars'}
              onClick={() => changeDownPaymentMode('dollars')}
            >
              $
            </button>
            <button
              type="button"
              className={loan.downPaymentMode === 'percent' ? 'is-active' : ''}
              aria-pressed={loan.downPaymentMode === 'percent'}
              onClick={() => changeDownPaymentMode('percent')}
            >
              %
            </button>
          </div>
        </div>
        <small>{currency.format(downPaymentAmount)} applied</small>
      </fieldset>

      <label className="mortgage-field" htmlFor={`${idPrefix}-term`}>
        <span>Loan term</span>
        <span className="mortgage-select">
          <select
            id={`${idPrefix}-term`}
            value={loan.loanTermId}
            onChange={(event) => update({ loanTermId: event.target.value as LoanTermId })}
          >
            {loanTerms.map((term) => (
              <option value={term.id} key={term.id}>{term.label}</option>
            ))}
          </select>
        </span>
      </label>

      <label className="mortgage-field" htmlFor={`${idPrefix}-rate`}>
        <span>Annual interest rate *</span>
        <span className="mortgage-input">
          <input
            id={`${idPrefix}-rate`}
            type="text"
            inputMode="decimal"
            value={rateRawInput !== null ? rateRawInput : String(loan.annualInterestRate)}
            onFocus={() => setRateRawInput(loan.annualInterestRate === 0 ? '' : String(loan.annualInterestRate))}
            onBlur={() => setRateRawInput(null)}
            onChange={(event) => {
              const raw = event.target.value
              setRateRawInput(raw)
              const num = Number(raw)
              if (!Number.isNaN(num)) {
                update({ annualInterestRate: safeNumber(num) })
              }
            }}
          />
          <span className="mortgage-input__suffix" aria-hidden="true">%</span>
        </span>
      </label>
    </fieldset>
  )
}

function ComparisonMetric({
  title,
  description,
  value1,
  value2,
}: {
  title: string
  description?: string
  value1: number
  value2: number
}) {
  return (
    <section className="loan-comparison__metric">
      <header>
        <h3>{title}</h3>
        {description && <p>{description}</p>}
      </header>
      <div className="loan-comparison__metric-grid">
        <div>
          <span>Loan 1</span>
          <strong>{preciseCurrency.format(value1)}</strong>
        </div>
        <div>
          <span>Loan 2</span>
          <strong>{preciseCurrency.format(value2)}</strong>
        </div>
        <div className="loan-comparison__difference">
          <strong>{preciseCurrency.format(Math.abs(value1 - value2))}</strong>
          <span>difference</span>
          <small>{resultDifferenceLabel(value1, value2)}</small>
        </div>
      </div>
    </section>
  )
}

export function LoanComparisonCalculator({ onBack }: LoanComparisonCalculatorProps) {
  const [loan1, setLoan1] = useState<ComparisonLoanInput>(INITIAL_LOAN_1)
  const [loan2, setLoan2] = useState<ComparisonLoanInput>(INITIAL_LOAN_2)
  const [results, setResults] = useState<ComparisonResults | null>(null)

  function updateLoan1(nextLoan: ComparisonLoanInput) {
    setLoan1(nextLoan)
    setResults(null)
  }

  function updateLoan2(nextLoan: ComparisonLoanInput) {
    setLoan2(nextLoan)
    setResults(null)
  }

  function compareLoans(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setResults({
      loan1: calculateComparisonLoan(loan1),
      loan2: calculateComparisonLoan(loan2),
    })
  }

  function resetCalculator() {
    setLoan1(INITIAL_LOAN_1)
    setLoan2(INITIAL_LOAN_2)
    setResults(null)
  }

  return (
    <main className="mortgage-page loan-comparison-page" id="loan-comparison">
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
        <div className="mortgage-heading__icon"><Columns3 size={24} /></div>
        <div>
          <p className="eyebrow">MORTGAGE & FINANCING</p>
          <h1>Loan comparison</h1>
          <p>Compare monthly payments and long-term borrowing costs side by side.</p>
        </div>
      </header>

      <form className="loan-comparison__form" onSubmit={compareLoans}>
        <div className="loan-comparison__intro">
          <span className="eyebrow">SIDE-BY-SIDE ESTIMATE</span>
          <h2>Compare your mortgage loans</h2>
          <p>Enter two loan scenarios to see which structure costs less over time.</p>
        </div>

        <div className="loan-comparison__inputs">
          <LoanEditor number={1} loan={loan1} onChange={updateLoan1} />
          <LoanEditor number={2} loan={loan2} onChange={updateLoan2} />
        </div>

        <button className="button button--light loan-comparison__submit" type="submit">
          Compare loans
        </button>
      </form>

      {results && (
        <section className="loan-comparison__results" aria-live="polite" aria-labelledby="comparison-results-title">
          <header className="loan-comparison__results-heading">
            <span className="eyebrow">COMPARISON RESULTS</span>
            <h2 id="comparison-results-title">Loan 1 vs. Loan 2</h2>
            <p>Figures below include principal and interest only.</p>
          </header>

          <ComparisonMetric
            title="Monthly payment"
            value1={results.loan1.monthlyPayment}
            value2={results.loan2.monthlyPayment}
          />
          <ComparisonMetric
            title="Total interest paid"
            description="Over the life of the loan"
            value1={results.loan1.totalInterest}
            value2={results.loan2.totalInterest}
          />
          <ComparisonMetric
            title="Total cost of the loan"
            description="Principal plus interest"
            value1={results.loan1.totalCost}
            value2={results.loan2.totalCost}
          />

          <aside className="loan-comparison__arm-note">
            <strong>Adjustable-rate assumption</strong>
            <p>
              ARM estimates use the selected initial fixed period, a 2% margin, an index
              starting at 1% and rising 0.5% per year, a 2% annual adjustment cap, and a
              5% lifetime cap. Fixed-rate comparisons are unaffected.
            </p>
          </aside>
        </section>
      )}

      <p className="mortgage-disclaimer">
        Rates shown are illustrative comparison estimates and do not include taxes,
        insurance, mortgage insurance, lender fees, or other borrowing costs. Actual
        rates and terms may vary.
      </p>
    </main>
  )
}
