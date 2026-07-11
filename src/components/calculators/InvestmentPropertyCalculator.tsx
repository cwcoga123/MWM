import { useMemo, useState } from 'react'
import { ArrowLeft, HelpCircle, Landmark, Printer, RotateCcw } from 'lucide-react'
import { loanTerms, type LoanTermId } from '../../lib/mortgage'
import { calculateInvestmentProperty, conicGradient, downPaymentAmountFor, type AmountMode } from '../../lib/investmentProperty'
import { ShareWithAdvisor } from '../shared/ShareWithAdvisor'
import type { ShareSection } from '../../lib/share'

interface InvestmentPropertyCalculatorProps {
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

export function InvestmentPropertyCalculator({ onBack }: InvestmentPropertyCalculatorProps) {
  const [purchasePrice, setPurchasePrice] = useState(320_000)
  const [downPayment, setDownPayment] = useState(25)
  const [downPaymentMode, setDownPaymentMode] = useState<AmountMode>('percent')
  const [interestRate, setInterestRate] = useState(6.75)
  const [loanTermId, setLoanTermId] = useState<LoanTermId>('fixed-30')
  const [closingCostRate, setClosingCostRate] = useState(3)
  const [monthlyRent, setMonthlyRent] = useState(2_800)
  const [vacancyRate, setVacancyRate] = useState(5)
  const [managementRate, setManagementRate] = useState(8)
  const [annualPropertyTax, setAnnualPropertyTax] = useState(3_800)
  const [annualInsurance, setAnnualInsurance] = useState(1_400)
  const [monthlyHoa, setMonthlyHoa] = useState(0)
  const [maintenanceRate, setMaintenanceRate] = useState(1)
  const [otherMonthlyExpenses, setOtherMonthlyExpenses] = useState(0)
  const [showAdvanced, setShowAdvanced] = useState(true)
  const [downPaymentFocused, setDownPaymentFocused] = useState(false)

  const loanTerm = loanTerms.find((term) => term.id === loanTermId) ?? loanTerms[0]

  const result = useMemo(
    () =>
      calculateInvestmentProperty(
        {
          purchasePrice,
          downPayment,
          interestRate,
          amortizationYears: loanTerm.amortizationYears,
          closingCostRate,
          monthlyRent,
          vacancyRate,
          managementRate,
          annualPropertyTax,
          annualInsurance,
          monthlyHoa,
          maintenanceRate,
          otherMonthlyExpenses,
        },
        downPaymentMode,
      ),
    [
      purchasePrice,
      downPayment,
      downPaymentMode,
      interestRate,
      loanTerm.amortizationYears,
      closingCostRate,
      monthlyRent,
      vacancyRate,
      managementRate,
      annualPropertyTax,
      annualInsurance,
      monthlyHoa,
      maintenanceRate,
      otherMonthlyExpenses,
    ],
  )

  function changeDownPaymentMode(nextMode: AmountMode) {
    if (nextMode === downPaymentMode) return

    const currentAmount = downPaymentAmountFor(purchasePrice, downPayment, downPaymentMode)
    setDownPayment(
      nextMode === 'percent'
        ? purchasePrice > 0
          ? Number(((currentAmount / purchasePrice) * 100).toFixed(2))
          : 0
        : currentAmount,
    )
    setDownPaymentMode(nextMode)
  }

  function resetCalculator() {
    setPurchasePrice(320_000)
    setDownPayment(25)
    setDownPaymentMode('percent')
    setInterestRate(6.75)
    setLoanTermId('fixed-30')
    setClosingCostRate(3)
    setMonthlyRent(2_800)
    setVacancyRate(5)
    setManagementRate(8)
    setAnnualPropertyTax(3_800)
    setAnnualInsurance(1_400)
    setMonthlyHoa(0)
    setMaintenanceRate(1)
    setOtherMonthlyExpenses(0)
  }

  const isNegativeCashFlow = result.monthlyCashFlow < 0
  const donutItems = result.breakdown.filter((item) => item.amount > 0)
  const gradient = conicGradient(result.breakdown)

  function getShareSections(): ShareSection[] {
    return [
      {
        title: 'My inputs',
        entries: [
          { label: 'Purchase price', value: currency.format(purchasePrice) },
          { label: 'Down payment', value: currency.format(result.downPaymentAmount) },
          { label: 'Interest rate', value: `${interestRate}%` },
          { label: 'Loan term', value: loanTerm.label },
          { label: 'Monthly rent', value: currency.format(monthlyRent) },
          { label: 'Vacancy rate', value: `${vacancyRate}%` },
          { label: 'Management fee', value: `${managementRate}%` },
          { label: 'Annual property tax', value: currency.format(annualPropertyTax) },
          { label: 'Annual insurance', value: currency.format(annualInsurance) },
          { label: 'Monthly HOA', value: currency.format(monthlyHoa) },
          { label: 'Maintenance', value: `${maintenanceRate}% of value / year` },
          { label: 'Other monthly expenses', value: currency.format(otherMonthlyExpenses) },
          { label: 'Estimated closing costs', value: `${closingCostRate}% of price` },
        ],
      },
      {
        title: 'Results',
        entries: [
          { label: 'Cap rate', value: `${(result.capRate * 100).toFixed(2)}%` },
          {
            label: 'Cash-on-cash return',
            value: `${(result.cashOnCashReturn * 100).toFixed(2)}%`,
          },
          {
            label: 'Monthly cash flow',
            value: `${preciseCurrency.format(result.monthlyCashFlow)} / month`,
          },
          { label: 'Loan amount', value: currency.format(result.loanAmount) },
          { label: 'Total cash invested', value: currency.format(result.totalCashInvested) },
          { label: 'Net operating income (annual)', value: currency.format(result.noiAnnual) },
          {
            label: 'Rent-to-price ratio',
            value: `${(result.onePercentRuleRatio * 100).toFixed(2)}%`,
          },
        ],
      },
    ]
  }

  return (
    <main className="mortgage-page investment-property-page" id="investment-property">
      <div className="mortgage-breadcrumb">
        <button type="button" onClick={onBack}>
          <ArrowLeft size={16} /> All calculators
        </button>
        <div className="mortgage-actions">
          <ShareWithAdvisor tool="Investment property" getSections={getShareSections} />
          <button type="button" onClick={resetCalculator}>
            <RotateCcw size={15} /> Reset
          </button>
          <button type="button" onClick={() => window.print()}>
            <Printer size={15} /> Print
          </button>
        </div>
      </div>

      <header className="mortgage-heading">
        <div className="mortgage-heading__icon"><Landmark size={24} /></div>
        <div>
          <p className="eyebrow">PROPERTY INSIGHTS</p>
          <h1>Investment property</h1>
          <p>Model operating income, expenses, cash flow, and cash-on-cash return.</p>
        </div>
      </header>

      <section className="seller-proceeds-panel investment-property-panel">
        <div className="mortgage-expense-grid">
          <MoneyField
            id="ip-purchase-price"
            label="Purchase price"
            value={purchasePrice}
            onChange={setPurchasePrice}
            help="The price you're paying (or considering) for the investment property."
          />
          <fieldset className="mortgage-down-payment">
            <legend>
              <FieldLabel
                label="Down payment"
                help="Cash paid upfront. Investment property loans usually require 20–25% down — more than a primary residence."
              />
            </legend>
            <div className="mortgage-down-payment__row">
              <span className="mortgage-input">
                <span className="mortgage-input__prefix" aria-hidden="true">
                  {downPaymentMode === 'dollars' ? '$' : '%'}
                </span>
                <input
                  id="ip-down-payment"
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
          <PercentField
            id="ip-interest-rate"
            label="Interest rate"
            value={interestRate}
            onChange={setInterestRate}
            step="0.01"
            help="Your expected annual mortgage interest rate. Investment property loans typically carry a slightly higher rate than owner-occupied loans."
          />
          <label className="mortgage-field" htmlFor="ip-loan-term">
            <FieldLabel label="Loan term" help="How many years you'll take to pay off the loan — 30-year fixed is most common for rental financing." />
            <span className="mortgage-select">
              <select id="ip-loan-term" value={loanTermId} onChange={(event) => setLoanTermId(event.target.value as LoanTermId)}>
                {loanTerms.map((term) => (
                  <option value={term.id} key={term.id}>{term.label}</option>
                ))}
              </select>
            </span>
          </label>
        </div>

        <MoneyField
          id="ip-monthly-rent"
          label="Monthly rent"
          value={monthlyRent}
          onChange={setMonthlyRent}
          help="The gross monthly rent you expect to collect before vacancy and expenses."
        />

        <p className="seller-proceeds-note">
          You can increase the accuracy of this calculator by filling in additional fields.
        </p>

        {showAdvanced && (
          <div className="closing-cost-sections">
            <div className="mortgage-expense-grid">
              <PercentField
                id="ip-vacancy-rate"
                label="Vacancy rate"
                value={vacancyRate}
                onChange={setVacancyRate}
                help="Percent of the year you expect the property to sit empty between tenants. 5–8% (about 3–4 weeks/year) is a common assumption."
              />
              <PercentField
                id="ip-management-rate"
                label="Management fee"
                value={managementRate}
                onChange={setManagementRate}
                help="What a property manager charges, as a percent of collected rent — typically 8–10%. Enter 0 if you'll self-manage."
              />
            </div>
            <div className="mortgage-expense-grid">
              <MoneyField
                id="ip-property-tax"
                label="Annual property tax"
                value={annualPropertyTax}
                onChange={setAnnualPropertyTax}
                help="Yearly property tax billed by the county for this property."
              />
              <MoneyField
                id="ip-insurance"
                label="Annual insurance"
                value={annualInsurance}
                onChange={setAnnualInsurance}
                help="Yearly landlord/hazard insurance premium for the property."
              />
            </div>
            <div className="mortgage-expense-grid">
              <MoneyField
                id="ip-hoa"
                label="Monthly HOA"
                value={monthlyHoa}
                onChange={setMonthlyHoa}
                help="Homeowners association dues, if any. Enter 0 if none."
              />
              <PercentField
                id="ip-maintenance-rate"
                label="Maintenance /yr"
                value={maintenanceRate}
                onChange={setMaintenanceRate}
                help="Annual repairs and upkeep budget, as a percent of the property's value. 1% per year is a common rule of thumb."
              />
            </div>
            <div className="mortgage-expense-grid">
              <MoneyField
                id="ip-other-expenses"
                label="Other monthly expenses"
                value={otherMonthlyExpenses}
                onChange={setOtherMonthlyExpenses}
                help="Anything else you'll pay monthly — utilities, landscaping, pest control, advertising, etc."
              />
              <PercentField
                id="ip-closing-cost-rate"
                label="Estimated closing costs"
                value={closingCostRate}
                onChange={setClosingCostRate}
                help="Lender, title, escrow, and government fees paid at closing — typically 2–5% of the purchase price. In California the county transfer tax ($1.10 per $1,000) is customarily seller-paid; some cities (e.g. Oakland, LA, San Jose) add sizable city transfer taxes — factor those in when you sell the property."
              />
            </div>
          </div>
        )}

        <div className="seller-proceeds-toggle-row">
          <button type="button" className="seller-proceeds-toggle" onClick={() => setShowAdvanced((current) => !current)}>
            {showAdvanced ? 'Hide advanced controls' : 'Show advanced controls'}
          </button>
        </div>

        <div className="seller-proceeds-divider" />

        <div className="investment-property-metrics">
          <div>
            <span>
              <FieldLabel
                label="Cap rate"
                help="Capitalization rate — the property's annual net operating income divided by the purchase price. It measures the return the property itself earns, ignoring the mortgage. Useful for comparing properties. 5–8% is typical in many markets."
              />
            </span>
            <strong>{(result.capRate * 100).toFixed(2)}%</strong>
          </div>
          <div>
            <span>
              <FieldLabel
                label="Cash-on-cash return"
                help="Annual cash flow divided by the actual cash you invested (down payment + closing costs). This is the return on your out-of-pocket money after the mortgage is paid."
              />
            </span>
            <strong className={isNegativeCashFlow ? 'is-negative' : ''}>{(result.cashOnCashReturn * 100).toFixed(2)}%</strong>
          </div>
          <div>
            <span>
              <FieldLabel
                label="Monthly cash flow"
                help="What's left of the rent each month after vacancy, all operating expenses, and the mortgage payment. Negative means you'd pay out of pocket to hold the property."
              />
            </span>
            <strong className={isNegativeCashFlow ? 'is-negative' : ''}>{preciseCurrency.format(result.monthlyCashFlow)}</strong>
          </div>
        </div>

        <div className="amortization-summary-list investment-property-summary">
          <div>
            <dt>
              <FieldLabel label="Loan amount" help="Purchase price minus your down payment — the amount financed by the mortgage." />
            </dt>
            <dd>{currency.format(result.loanAmount)}</dd>
          </div>
          <div>
            <dt>
              <FieldLabel
                label="Total cash invested"
                help="Down payment plus closing costs — the cash you'd bring to the deal."
              />
            </dt>
            <dd>{currency.format(result.totalCashInvested)}</dd>
          </div>
          <div>
            <dt>
              <FieldLabel
                label="Net operating income (annual)"
                help="NOI — yearly rent (after vacancy) minus operating expenses like taxes, insurance, maintenance, and management. It excludes the mortgage payment."
              />
            </dt>
            <dd>{currency.format(result.noiAnnual)}</dd>
          </div>
          <div>
            <dt>
              <FieldLabel
                label="Rent-to-price ratio"
                help="Monthly rent divided by purchase price. The '1% rule' of thumb says properties renting at 1%+ of their price tend to cash flow well."
              />
            </dt>
            <dd>{(result.onePercentRuleRatio * 100).toFixed(2)}%</dd>
          </div>
        </div>

        <div className={`mortgage-insight ${isNegativeCashFlow ? 'is-warning' : ''}`}>
          <p>
            {isNegativeCashFlow
              ? `This property doesn't cash flow at these terms — you'd need to cover about ${preciseCurrency.format(Math.abs(result.monthlyCashFlow))}/month from other funds.`
              : `At these terms, this property nets about ${preciseCurrency.format(result.monthlyCashFlow)}/month after all expenses and debt service.`}{' '}
            {result.onePercentRuleRatio >= 0.01
              ? 'It also clears the traditional 1% rule of thumb.'
              : 'It falls short of the traditional 1% rule of thumb (monthly rent ÷ price).'}
          </p>
        </div>

        <div className="seller-proceeds-chart">
          <div className="seller-proceeds-donut" style={{ background: `conic-gradient(${gradient})` }}>
            <div className="seller-proceeds-donut__hole">
              <span>{isNegativeCashFlow ? 'Monthly outflow' : 'Monthly rent'}</span>
              <strong>
                {currency.format(isNegativeCashFlow ? monthlyRent - result.monthlyCashFlow : monthlyRent)}
              </strong>
            </div>
          </div>

          <ul className="seller-proceeds-legend">
            {donutItems.map((item) => (
              <li key={item.id}>
                <i style={{ background: item.color }} />
                <span>{item.label}</span>
                <strong>{preciseCurrency.format(item.amount)}</strong>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <p className="mortgage-disclaimer">
        Results are estimates for educational purposes only and do not account for taxes,
        depreciation, or financing details specific to investment properties. Actual returns
        will vary.
      </p>
    </main>
  )
}
