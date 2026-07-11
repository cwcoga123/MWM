import { useMemo, useState, type ReactNode } from 'react'
import { ArrowLeft, ChevronDown, ChevronUp, HelpCircle, Printer, ReceiptText, RotateCcw } from 'lucide-react'
import {
  CA_CLOSING_CUSTOMS_SOURCE,
  caClosingCustoms,
  cityTransferTaxAmount,
  countyCustomsFor,
  countyTransferTaxAmount,
  customaryShare,
  payerLabel,
} from '../../data/caClosingCustoms'
import { loanTerms, type LoanTermId } from '../../lib/mortgage'
import {
  calculateBuyerClosingCosts,
  conicGradient,
  defaultFirstPaymentDue,
  downPaymentAmount,
  type AmountMode,
} from '../../lib/buyerClosingCosts'
import { ShareWithAdvisor } from '../shared/ShareWithAdvisor'
import type { ShareSection } from '../../lib/share'

interface BuyerClosingCostsCalculatorProps {
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

interface MoneyFieldProps {
  id: string
  label: string
  value: number
  onChange?: (value: number) => void
  help?: string
  readOnly?: boolean
}

function MoneyField({ id, label, value, onChange, help, readOnly }: MoneyFieldProps) {
  const [focused, setFocused] = useState(false)
  const roundedValue = Math.round(value)
  const displayValue = focused && !readOnly
    ? (roundedValue === 0 ? '' : String(roundedValue))
    : (roundedValue === 0 ? '' : roundedValue.toLocaleString('en-US'))
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
          readOnly={readOnly}
          onFocus={() => !readOnly && setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(event) => onChange?.(safeNumber(Number(event.target.value.replace(/,/g, ''))))}
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

function DateField({
  id,
  label,
  value,
  onChange,
  help,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  help?: string
}) {
  return (
    <label className="mortgage-field" htmlFor={id}>
      <FieldLabel label={label} help={help} />
      <span className="mortgage-input">
        <input id={id} type="date" value={value} onChange={(event) => onChange(event.target.value)} />
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
          min="0"
          step="1"
          inputMode="numeric"
          value={value}
          onChange={(event) => onChange(Math.max(0, Math.round(safeNumber(event.target.valueAsNumber))))}
        />
      </span>
    </label>
  )
}

function ClosingCostSection({
  title,
  subtotal,
  collapsed,
  onToggle,
  children,
}: {
  title: string
  subtotal: number
  collapsed: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <div className="closing-cost-card">
      <button type="button" className="closing-cost-card__header" onClick={onToggle} aria-expanded={!collapsed}>
        <h3>{title}</h3>
        <span className="closing-cost-card__meta">
          <strong>{currency.format(subtotal)}</strong>
          <span className="closing-cost-card__chevron">
            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </span>
        </span>
      </button>
      {!collapsed && <div className="closing-cost-card__body">{children}</div>}
    </div>
  )
}

const DEFAULT_CLOSING_DATE = '2026-07-31'

export function BuyerClosingCostsCalculator({ onBack }: BuyerClosingCostsCalculatorProps) {
  const [purchasePrice, setPurchasePrice] = useState(1_250_000)
  const [downPayment, setDownPayment] = useState(250_000)
  const [downPaymentMode, setDownPaymentMode] = useState<AmountMode>('dollars')
  const [downPaymentFocused, setDownPaymentFocused] = useState(false)
  const [estimatedClosingDate, setEstimatedClosingDate] = useState(DEFAULT_CLOSING_DATE)
  const [firstPaymentDue, setFirstPaymentDue] = useState(defaultFirstPaymentDue(DEFAULT_CLOSING_DATE))

  const [interestRate, setInterestRate] = useState(6.49)
  const [loanTermId, setLoanTermId] = useState<LoanTermId>('fixed-30')
  const [mortgageInsurancePMI, setMortgageInsurancePMI] = useState(0)
  const [prepaidInterestOverride, setPrepaidInterestOverride] = useState<number | null>(null)
  const [principalAndInterest, setPrincipalAndInterest] = useState(0)
  const [annualHomeownersInsurance, setAnnualHomeownersInsurance] = useState(1_839)
  const [annualAdditionalInsurance, setAnnualAdditionalInsurance] = useState(795)
  const [annualPropertyTax, setAnnualPropertyTax] = useState(1_200)
  const [monthlyAssociationDues, setMonthlyAssociationDues] = useState(0)
  const [monthsOfEscrow, setMonthsOfEscrow] = useState(3)

  const [closingCostsPaidBySeller, setClosingCostsPaidBySeller] = useState(0)
  const [commitmentFee, setCommitmentFee] = useState(0)
  const [earnestDeposit, setEarnestDeposit] = useState(25_000)
  const [otherCredits, setOtherCredits] = useState(0)
  const [pointsPaidBySellerPercent, setPointsPaidBySellerPercent] = useState(3)
  const [propertyTaxesPaidThrough, setPropertyTaxesPaidThrough] = useState(DEFAULT_CLOSING_DATE)

  const [applicationFee, setApplicationFee] = useState(300)
  const [appraisalFee, setAppraisalFee] = useState(500)
  const [assumptionFee, setAssumptionFee] = useState(0)
  const [creditReport, setCreditReport] = useState(45)
  const [lendersAttorneyFee, setLendersAttorneyFee] = useState(750)
  const [lendersInspectionFee, setLendersInspectionFee] = useState(250)
  const [originationFee, setOriginationFee] = useState(0)
  const [otherLoanCosts, setOtherLoanCosts] = useState(0)
  const [pointsPaidByBuyerPercent, setPointsPaidByBuyerPercent] = useState(3)

  const [abstractOrTitleSearch, setAbstractOrTitleSearch] = useState(600)
  const [attorneysFees, setAttorneysFees] = useState(0)
  const [documentPreparation, setDocumentPreparation] = useState(250)
  const [notaryFees, setNotaryFees] = useState(100)
  const [otherTitleFees, setOtherTitleFees] = useState(0)
  const [titleExamination, setTitleExamination] = useState(275)
  const [titleInsurance, setTitleInsurance] = useState(9_375)

  const [cityCountyTaxOrStamps, setCityCountyTaxOrStamps] = useState(1_875)
  const [otherGovernmentFees, setOtherGovernmentFees] = useState(0)
  const [recordingFees, setRecordingFees] = useState(95)
  const [stateTaxOrStamps, setStateTaxOrStamps] = useState(1_875)

  const [floodDeterminationFee, setFloodDeterminationFee] = useState(25)
  const [mortgageBrokerFees, setMortgageBrokerFees] = useState(0)
  const [otherAdditionalCosts, setOtherAdditionalCosts] = useState(0)
  const [pestInspection, setPestInspection] = useState(100)
  const [settlementOrClosingFee, setSettlementOrClosingFee] = useState(1_000)
  const [survey, setSurvey] = useState(475)

  const [showAdvanced, setShowAdvanced] = useState(true)
  const [showMath, setShowMath] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})

  const [county, setCounty] = useState('')
  const [city, setCity] = useState('')

  const customs = county ? countyCustomsFor(county) : undefined
  const cityTax = customs?.cityTaxes?.find((entry) => entry.city === city)

  /** Buyer's customary share of transfer taxes per the Fidelity guide. */
  const buyerTransferTaxShare = useMemo(() => {
    if (!customs) return null
    const countyTax = countyTransferTaxAmount(customs, purchasePrice)
    // County tax is customarily seller-paid statewide; the city of Alameda splits it.
    const buyerCountyShare = customs.county === 'Alameda' && city === 'Alameda' ? countyTax / 2 : 0
    const cityAmount = cityTax ? cityTransferTaxAmount(cityTax, purchasePrice) : 0
    return Math.round(buyerCountyShare + customaryShare(cityTax?.payer ?? null, cityAmount, 'buyer'))
  }, [customs, cityTax, city, purchasePrice])

  function applyCustomaryTransferTax() {
    if (buyerTransferTaxShare === null) return
    setCityCountyTaxOrStamps(buyerTransferTaxShare)
    setStateTaxOrStamps(0) // California has no separate state transfer stamp.
  }

  const loanTerm = loanTerms.find((term) => term.id === loanTermId) ?? loanTerms[0]

  const result = useMemo(
    () =>
      calculateBuyerClosingCosts(
        {
          purchasePrice,
          downPayment,
          interestRate,
          amortizationYears: loanTerm.amortizationYears,
          estimatedClosingDate,
          mortgageInsurancePMI,
          prepaidInterestOverride,
          principalAndInterest,
          annualHomeownersInsurance,
          annualAdditionalInsurance,
          annualPropertyTax,
          monthlyAssociationDues,
          monthsOfEscrow,
          closingCostsPaidBySeller,
          commitmentFee,
          earnestDeposit,
          otherCredits,
          pointsPaidBySellerPercent,
          propertyTaxesPaidThrough,
          applicationFee,
          appraisalFee,
          assumptionFee,
          creditReport,
          lendersAttorneyFee,
          lendersInspectionFee,
          originationFee,
          otherLoanCosts,
          pointsPaidByBuyerPercent,
          abstractOrTitleSearch,
          attorneysFees,
          documentPreparation,
          notaryFees,
          otherTitleFees,
          titleExamination,
          titleInsurance,
          cityCountyTaxOrStamps,
          otherGovernmentFees,
          recordingFees,
          stateTaxOrStamps,
          floodDeterminationFee,
          mortgageBrokerFees,
          otherAdditionalCosts,
          pestInspection,
          settlementOrClosingFee,
          survey,
        },
        downPaymentMode,
      ),
    [
      purchasePrice,
      downPayment,
      downPaymentMode,
      interestRate,
      loanTerm.amortizationYears,
      estimatedClosingDate,
      mortgageInsurancePMI,
      prepaidInterestOverride,
      principalAndInterest,
      annualHomeownersInsurance,
      annualAdditionalInsurance,
      annualPropertyTax,
      monthlyAssociationDues,
      monthsOfEscrow,
      closingCostsPaidBySeller,
      commitmentFee,
      earnestDeposit,
      otherCredits,
      pointsPaidBySellerPercent,
      propertyTaxesPaidThrough,
      applicationFee,
      appraisalFee,
      assumptionFee,
      creditReport,
      lendersAttorneyFee,
      lendersInspectionFee,
      originationFee,
      otherLoanCosts,
      pointsPaidByBuyerPercent,
      abstractOrTitleSearch,
      attorneysFees,
      documentPreparation,
      notaryFees,
      otherTitleFees,
      titleExamination,
      titleInsurance,
      cityCountyTaxOrStamps,
      otherGovernmentFees,
      recordingFees,
      stateTaxOrStamps,
      floodDeterminationFee,
      mortgageBrokerFees,
      otherAdditionalCosts,
      pestInspection,
      settlementOrClosingFee,
      survey,
    ],
  )

  const downPaymentAmt = downPaymentAmount(purchasePrice, downPayment, downPaymentMode)
  const isOverage = result.netAtClosing < 0
  const donutSections = result.sections.filter((section) => section.subtotal > 0)
  const gradient = conicGradient(result.sections)

  function toggleSection(id: string) {
    setCollapsedSections((current) => ({ ...current, [id]: !current[id] }))
  }

  function changeClosingDate(value: string) {
    setEstimatedClosingDate(value)
    setFirstPaymentDue(defaultFirstPaymentDue(value))
    setPrepaidInterestOverride(null)
  }

  function changeDownPaymentMode(nextMode: AmountMode) {
    if (nextMode === downPaymentMode) return

    setDownPayment(
      nextMode === 'percent'
        ? purchasePrice > 0
          ? Number(((downPaymentAmt / purchasePrice) * 100).toFixed(2))
          : 0
        : downPaymentAmt,
    )
    setDownPaymentMode(nextMode)
  }

  function resetCalculator() {
    setPurchasePrice(1_250_000)
    setDownPayment(250_000)
    setDownPaymentMode('dollars')
    setEstimatedClosingDate(DEFAULT_CLOSING_DATE)
    setFirstPaymentDue(defaultFirstPaymentDue(DEFAULT_CLOSING_DATE))
    setInterestRate(6.49)
    setLoanTermId('fixed-30')
    setMortgageInsurancePMI(0)
    setPrepaidInterestOverride(null)
    setPrincipalAndInterest(0)
    setAnnualHomeownersInsurance(1_839)
    setAnnualAdditionalInsurance(795)
    setAnnualPropertyTax(1_200)
    setMonthlyAssociationDues(0)
    setMonthsOfEscrow(3)
    setClosingCostsPaidBySeller(0)
    setCommitmentFee(0)
    setEarnestDeposit(25_000)
    setOtherCredits(0)
    setPointsPaidBySellerPercent(3)
    setPropertyTaxesPaidThrough(DEFAULT_CLOSING_DATE)
    setApplicationFee(300)
    setAppraisalFee(500)
    setAssumptionFee(0)
    setCreditReport(45)
    setLendersAttorneyFee(750)
    setLendersInspectionFee(250)
    setOriginationFee(0)
    setOtherLoanCosts(0)
    setPointsPaidByBuyerPercent(3)
    setAbstractOrTitleSearch(600)
    setAttorneysFees(0)
    setDocumentPreparation(250)
    setNotaryFees(100)
    setOtherTitleFees(0)
    setTitleExamination(275)
    setTitleInsurance(9_375)
    setCityCountyTaxOrStamps(1_875)
    setOtherGovernmentFees(0)
    setRecordingFees(95)
    setStateTaxOrStamps(1_875)
    setFloodDeterminationFee(25)
    setMortgageBrokerFees(0)
    setOtherAdditionalCosts(0)
    setPestInspection(100)
    setSettlementOrClosingFee(1_000)
    setSurvey(475)
    setCounty('')
    setCity('')
  }

  function getShareSections(): ShareSection[] {
    return [
      {
        title: 'My inputs',
        entries: [
          { label: 'Purchase price', value: currency.format(purchasePrice) },
          { label: 'Down payment', value: currency.format(downPaymentAmt) },
          { label: 'Loan term', value: loanTerm.label },
          { label: 'Interest rate', value: `${interestRate}%` },
          { label: 'Estimated closing date', value: estimatedClosingDate },
          ...(county
            ? [{ label: 'Location', value: city ? `${city}, ${county} County, CA` : `${county} County, CA` }]
            : []),
          { label: 'Earnest deposit', value: currency.format(earnestDeposit) },
        ],
      },
      {
        title: 'Cost breakdown',
        entries: result.sections
          .filter((section) => section.subtotal > 0)
          .map((section) => ({
            label: section.label,
            value: currency.format(section.subtotal),
          })),
      },
      {
        title: 'Results',
        entries: [
          { label: 'Loan amount', value: currency.format(result.loanAmount) },
          { label: 'Total closing costs', value: currency.format(result.totalCosts) },
          { label: 'Total credits', value: currency.format(result.totalCredits) },
          {
            label: isOverage ? 'Credit back at closing' : 'Cash needed to close',
            value: currency.format(Math.abs(result.netAtClosing)),
          },
        ],
      },
    ]
  }

  return (
    <main className="mortgage-page buyer-closing-costs-page" id="buyer-closing-costs">
      <div className="mortgage-breadcrumb">
        <button type="button" onClick={onBack}>
          <ArrowLeft size={16} /> All calculators
        </button>
        <div className="mortgage-actions">
          <ShareWithAdvisor tool="Buyer's closing costs" getSections={getShareSections} />
          <button type="button" onClick={resetCalculator}>
            <RotateCcw size={15} /> Reset
          </button>
          <button type="button" onClick={() => window.print()}>
            <Printer size={15} /> Print
          </button>
        </div>
      </div>

      <header className="mortgage-heading">
        <div className="mortgage-heading__icon"><ReceiptText size={24} /></div>
        <div>
          <p className="eyebrow">BUYING & SELLING</p>
          <h1>Buyer's closing costs</h1>
          <p>Summary of the costs a buyer must pay during the closing process.</p>
        </div>
      </header>

      <section className="seller-proceeds-panel buyer-closing-costs-panel">
        <div className="seller-proceeds-panel__heading">
          <h2>Buyer closing costs calculator</h2>
          <p>Input sale price and amount paid.</p>
        </div>

        <div className="mortgage-expense-grid">
          <MoneyField
            id="bcc-purchase-price"
            label="Purchase price"
            value={purchasePrice}
            onChange={setPurchasePrice}
            help="The agreed sale price of the home."
          />
          <fieldset className="mortgage-down-payment">
            <legend>
              <FieldLabel label="Down payment" help="How much you're paying upfront, in dollars or as a percent of the purchase price." />
            </legend>
            <div className="mortgage-down-payment__row">
              <span className="mortgage-input">
                <span className="mortgage-input__prefix" aria-hidden="true">
                  {downPaymentMode === 'dollars' ? '$' : '%'}
                </span>
                <input
                  id="bcc-down-payment"
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
            <small>{currency.format(downPaymentAmt)} applied</small>
          </fieldset>
        </div>

        <div className="mortgage-expense-grid">
          <DateField
            id="bcc-closing-date"
            label="Estimated closing date"
            value={estimatedClosingDate}
            onChange={changeClosingDate}
            help="The day you expect to sign and take ownership."
          />
          <DateField
            id="bcc-first-payment"
            label="First payment due"
            value={firstPaymentDue}
            onChange={setFirstPaymentDue}
            help="When your first mortgage payment is due — typically the 1st of the second month after closing."
          />
        </div>

        <div className="mortgage-expense-grid">
          <label className="mortgage-field" htmlFor="bcc-county">
            <FieldLabel
              label="California county"
              help="Select the county to see who customarily pays escrow, title, and transfer taxes there, and to estimate your share of the transfer tax."
            />
            <span className="mortgage-select">
              <select id="bcc-county" value={county} onChange={(event) => { setCounty(event.target.value); setCity('') }}>
                <option value="">Select county (optional)</option>
                {caClosingCustoms.map((entry) => (
                  <option value={entry.county} key={entry.county}>{entry.county}</option>
                ))}
              </select>
            </span>
          </label>
          {customs?.cityTaxes && customs.cityTaxes.length > 0 && (
            <label className="mortgage-field" htmlFor="bcc-city">
              <FieldLabel
                label="City"
                help="Some cities charge their own transfer tax on top of the county's. Select the city if the property is inside its limits."
              />
              <span className="mortgage-select">
                <select id="bcc-city" value={city} onChange={(event) => setCity(event.target.value)}>
                  <option value="">No city transfer tax / other city</option>
                  {customs.cityTaxes.map((entry) => (
                    <option value={entry.city} key={entry.city}>{entry.city}</option>
                  ))}
                </select>
              </span>
            </label>
          )}
        </div>

        {customs && (
          <div className="mortgage-insight buyer-closing-costs-customs">
            <p>
              <strong>Customary practice in {customs.county} County:</strong>{' '}
              escrow fees — {payerLabel(customs.escrow)}{customs.escrowNote ? ` (${customs.escrowNote})` : ''};{' '}
              owner's title policy — {payerLabel(customs.title)}{customs.titleNote ? ` (${customs.titleNote})` : ''};{' '}
              county transfer tax — customarily seller-paid{customs.countyTaxNote ? ` (${customs.countyTaxNote})` : ''}.
              {cityTax && (
                <>
                  {' '}{cityTax.city} city transfer tax — {payerLabel(cityTax.payer)}
                  {cityTax.note ? ` (${cityTax.note})` : ''}.
                </>
              )}{' '}
              Your customary share of transfer taxes as the buyer:{' '}
              <strong>{currency.format(buyerTransferTaxShare ?? 0)}</strong>.{' '}
              <button type="button" className="seller-proceeds-toggle" onClick={applyCustomaryTransferTax}>
                Apply to government fees
              </button>
            </p>
          </div>
        )}

        <p className="seller-proceeds-note">
          You can increase the accuracy of this calculator by filling in additional fields.
        </p>

        {showAdvanced && (
          <div className="closing-cost-sections">
            <ClosingCostSection
              title="Mortgage closing details"
              subtotal={result.mortgageClosingSubtotal}
              collapsed={!!collapsedSections.mortgage}
              onToggle={() => toggleSection('mortgage')}
            >
              <div className="mortgage-expense-grid">
                <PercentField id="bcc-interest-rate" label="Interest rate *" value={interestRate} onChange={setInterestRate} help="Your expected mortgage interest rate." />
                <MoneyField id="bcc-loan-amount" label="Loan amount" value={result.loanAmount} readOnly help="Purchase price minus down payment." />
              </div>
              <div className="mortgage-expense-grid">
                <label className="mortgage-field" htmlFor="bcc-loan-term">
                  <FieldLabel label="Loan term" help="How many years you'll take to pay off the loan — 30-year fixed is most common." />
                  <span className="mortgage-select">
                    <select id="bcc-loan-term" value={loanTermId} onChange={(event) => setLoanTermId(event.target.value as LoanTermId)}>
                      {loanTerms.map((term) => (
                        <option value={term.id} key={term.id}>{term.label}</option>
                      ))}
                    </select>
                  </span>
                </label>
                <MoneyField
                  id="bcc-pmi"
                  label="Mortgage insurance (PMI)"
                  value={mortgageInsurancePMI}
                  onChange={setMortgageInsurancePMI}
                  help="Monthly mortgage insurance, if your down payment is under 20%."
                />
              </div>
              <div className="mortgage-expense-grid">
                <MoneyField
                  id="bcc-prepaid-interest"
                  label="Prepaid interest"
                  value={result.prepaidInterest}
                  onChange={(value) => setPrepaidInterestOverride(value)}
                  help="Per-diem interest from closing through the end of that month, calculated automatically from your dates (editable)."
                />
                <MoneyField
                  id="bcc-principal-interest"
                  label="Principal and interest"
                  value={principalAndInterest}
                  onChange={setPrincipalAndInterest}
                  help="Any additional principal paid at closing. Leave at $0 unless you're curtailing the loan."
                />
              </div>
              <div className="mortgage-expense-grid">
                <MoneyField
                  id="bcc-homeowners-insurance"
                  label="Annual homeowner's insurance"
                  value={annualHomeownersInsurance}
                  onChange={setAnnualHomeownersInsurance}
                  help="Yearly hazard insurance premium. The lender typically collects a prorated portion at closing to fund your escrow account."
                />
                <MoneyField
                  id="bcc-additional-insurance"
                  label="Annual additional insurance"
                  value={annualAdditionalInsurance}
                  onChange={setAnnualAdditionalInsurance}
                  help="Any extra required coverage, such as flood or earthquake insurance, billed yearly."
                />
              </div>
              <div className="mortgage-expense-grid">
                <MoneyField
                  id="bcc-property-tax"
                  label="Annual property tax"
                  value={annualPropertyTax}
                  onChange={setAnnualPropertyTax}
                  help="Yearly property tax billed by the county, prorated and collected into escrow at closing."
                />
                <MoneyField
                  id="bcc-hoa-dues"
                  label="Monthly association dues"
                  value={monthlyAssociationDues}
                  onChange={setMonthlyAssociationDues}
                  help="Homeowners association dues, if the property has them. Enter 0 if none."
                />
              </div>
              <NumberField id="bcc-escrow-months" label="Months of escrow" value={monthsOfEscrow} onChange={setMonthsOfEscrow} help="How many months of insurance and tax the lender collects upfront." />
            </ClosingCostSection>

            <div className="closing-cost-math-row">
              <button type="button" className="closing-cost-math-toggle" onClick={() => setShowMath((current) => !current)}>
                {showMath ? 'Hide the math' : 'Show me the math'}
              </button>
              {showMath && (
                <div className="closing-cost-math-panel">
                  <p>
                    Prepaid interest: {preciseCurrency.format(result.perDiemInterest)}/day &times; {result.prepaidInterestDays}{' '}
                    day{result.prepaidInterestDays === 1 ? '' : 's'} = {preciseCurrency.format(result.prepaidInterest)}, rounded to{' '}
                    {currency.format(Math.round(result.prepaidInterest))}
                  </p>
                  <p>
                    Escrow deposit: {monthsOfEscrow} month{monthsOfEscrow === 1 ? '' : 's'} &times; {preciseCurrency.format(result.escrowDeposit / Math.max(1, monthsOfEscrow))}/month
                    (insurance + tax + HOA + PMI) = {preciseCurrency.format(result.escrowDeposit)}, rounded to{' '}
                    {currency.format(Math.round(result.escrowDeposit))}
                  </p>
                  <p>
                    Points paid by seller: {pointsPaidBySellerPercent}% &times; {currency.format(purchasePrice)} = {currency.format(result.pointsPaidBySeller)}
                  </p>
                  <p>
                    Points paid by buyer: {pointsPaidByBuyerPercent}% &times; {currency.format(purchasePrice)} = {currency.format(result.pointsPaidByBuyer)}
                  </p>
                </div>
              )}
            </div>

            <ClosingCostSection
              title="Credits"
              subtotal={result.creditsSubtotal}
              collapsed={!!collapsedSections.credits}
              onToggle={() => toggleSection('credits')}
            >
              <div className="mortgage-expense-grid">
                <MoneyField
                  id="bcc-closing-costs-by-seller"
                  label="Closing costs paid by seller"
                  value={closingCostsPaidBySeller}
                  onChange={setClosingCostsPaidBySeller}
                  help="Seller-paid credit toward your closing costs, as negotiated in the purchase contract."
                />
                <MoneyField
                  id="bcc-commitment-fee"
                  label="Commitment fee"
                  value={commitmentFee}
                  onChange={setCommitmentFee}
                  help="A fee some lenders charge to lock in your loan terms — credited here if it's being refunded or offset."
                />
              </div>
              <div className="mortgage-expense-grid">
                <MoneyField id="bcc-earnest-deposit" label="Earnest deposit" value={earnestDeposit} onChange={setEarnestDeposit} help="Your good-faith deposit, credited back at closing." />
                <MoneyField
                  id="bcc-other-credits"
                  label="Other credits"
                  value={otherCredits}
                  onChange={setOtherCredits}
                  help="Any other credits reducing your cash due at closing, such as a lender or builder credit."
                />
              </div>
              <div className="mortgage-expense-grid">
                <PercentField
                  id="bcc-points-by-seller"
                  label="Points paid by seller"
                  value={pointsPaidBySellerPercent}
                  onChange={setPointsPaidBySellerPercent}
                  help="Percent of purchase price the seller credits toward buying down your rate."
                />
                <DateField id="bcc-taxes-paid-through" label="Property taxes paid through" value={propertyTaxesPaidThrough} onChange={setPropertyTaxesPaidThrough} help="For proration reference only — doesn't affect the totals." />
              </div>
              <p className="closing-cost-card__note">{currency.format(result.pointsPaidBySeller)} credited from seller-paid points</p>
            </ClosingCostSection>

            <ClosingCostSection
              title="Loan costs"
              subtotal={result.loanCostsSubtotal}
              collapsed={!!collapsedSections['loan-costs']}
              onToggle={() => toggleSection('loan-costs')}
            >
              <div className="mortgage-expense-grid">
                <MoneyField
                  id="bcc-application-fee"
                  label="Application fee"
                  value={applicationFee}
                  onChange={setApplicationFee}
                  help="What the lender charges to process your loan application."
                />
                <MoneyField
                  id="bcc-appraisal-fee"
                  label="Appraisal fee"
                  value={appraisalFee}
                  onChange={setAppraisalFee}
                  help="Cost of the independent appraisal the lender requires to confirm the home's value."
                />
              </div>
              <div className="mortgage-expense-grid">
                <MoneyField
                  id="bcc-assumption-fee"
                  label="Assumption fee"
                  value={assumptionFee}
                  onChange={setAssumptionFee}
                  help="Charged only if you're assuming the seller's existing mortgage instead of getting a new loan. Usually $0."
                />
                <MoneyField
                  id="bcc-credit-report"
                  label="Credit report"
                  value={creditReport}
                  onChange={setCreditReport}
                  help="Fee for the lender to pull your credit report and score."
                />
              </div>
              <div className="mortgage-expense-grid">
                <MoneyField
                  id="bcc-lenders-attorney-fee"
                  label="Lender's attorney fee"
                  value={lendersAttorneyFee}
                  onChange={setLendersAttorneyFee}
                  help="Legal fee for the attorney who prepares the lender's loan documents."
                />
                <MoneyField
                  id="bcc-lenders-inspection-fee"
                  label="Lender's inspection fee"
                  value={lendersInspectionFee}
                  onChange={setLendersInspectionFee}
                  help="Cost of any inspection the lender requires beyond the appraisal, such as a final walkthrough for new construction."
                />
              </div>
              <div className="mortgage-expense-grid">
                <MoneyField
                  id="bcc-origination-fee"
                  label="Origination fee"
                  value={originationFee}
                  onChange={setOriginationFee}
                  help="What the lender charges to originate and underwrite the loan, often expressed as a percent of the loan amount."
                />
                <MoneyField
                  id="bcc-other-loan-costs"
                  label="Other loan costs"
                  value={otherLoanCosts}
                  onChange={setOtherLoanCosts}
                  help="Any other lender fees not itemized above."
                />
              </div>
              <PercentField
                id="bcc-points-by-buyer"
                label="Points paid by buyer"
                value={pointsPaidByBuyerPercent}
                onChange={setPointsPaidByBuyerPercent}
                help="Percent of purchase price paid to buy down your rate."
              />
              <p className="closing-cost-card__note">{currency.format(result.pointsPaidByBuyer)} in buyer-paid points</p>
            </ClosingCostSection>

            <ClosingCostSection
              title="Title charges"
              subtotal={result.titleChargesSubtotal}
              collapsed={!!collapsedSections['title-charges']}
              onToggle={() => toggleSection('title-charges')}
            >
              <div className="mortgage-expense-grid">
                <MoneyField
                  id="bcc-abstract-title-search"
                  label="Abstract or title search"
                  value={abstractOrTitleSearch}
                  onChange={setAbstractOrTitleSearch}
                  help="Cost of researching the property's ownership history to confirm the title is clear."
                />
                <MoneyField
                  id="bcc-attorneys-fees"
                  label="Attorney's fees"
                  value={attorneysFees}
                  onChange={setAttorneysFees}
                  help="Legal fees for an attorney representing you in the transaction, where required or requested."
                />
              </div>
              <div className="mortgage-expense-grid">
                <MoneyField
                  id="bcc-document-preparation"
                  label="Document preparation"
                  value={documentPreparation}
                  onChange={setDocumentPreparation}
                  help="Fee for preparing the closing documents and deed."
                />
                <MoneyField
                  id="bcc-notary-fees"
                  label="Notary fees"
                  value={notaryFees}
                  onChange={setNotaryFees}
                  help="Cost to have closing documents notarized."
                />
              </div>
              <div className="mortgage-expense-grid">
                <MoneyField
                  id="bcc-other-title-fees"
                  label="Other fees"
                  value={otherTitleFees}
                  onChange={setOtherTitleFees}
                  help="Any other title-related charges not itemized above."
                />
                <MoneyField
                  id="bcc-title-examination"
                  label="Title examination"
                  value={titleExamination}
                  onChange={setTitleExamination}
                  help="Fee for a title company or attorney to review the abstract and confirm there are no liens or ownership disputes."
                />
              </div>
              <MoneyField
                id="bcc-title-insurance"
                label="Title insurance"
                value={titleInsurance}
                onChange={setTitleInsurance}
                help="One-time premium for lender's (and often owner's) title insurance, protecting against title defects discovered after closing."
              />
            </ClosingCostSection>

            <ClosingCostSection
              title="Government fees"
              subtotal={result.governmentFeesSubtotal}
              collapsed={!!collapsedSections.government}
              onToggle={() => toggleSection('government')}
            >
              <div className="mortgage-expense-grid">
                <MoneyField
                  id="bcc-city-county-tax"
                  label="City/county tax or stamps"
                  value={cityCountyTaxOrStamps}
                  onChange={setCityCountyTaxOrStamps}
                  help="Documentary transfer taxes. In California the county tax ($1.10 per $1,000) is customarily paid by the seller; city taxes vary — select a county above to estimate your customary share."
                />
                <MoneyField
                  id="bcc-other-gov-fees"
                  label="Other government fees"
                  value={otherGovernmentFees}
                  onChange={setOtherGovernmentFees}
                  help="Any other municipal or county fees not itemized above."
                />
              </div>
              <div className="mortgage-expense-grid">
                <MoneyField
                  id="bcc-recording-fees"
                  label="Recording fees"
                  value={recordingFees}
                  onChange={setRecordingFees}
                  help="Charged by the county to officially record the deed and mortgage in public records."
                />
                <MoneyField
                  id="bcc-state-tax"
                  label="State tax or stamps"
                  value={stateTaxOrStamps}
                  onChange={setStateTaxOrStamps}
                  help="California has no separate state transfer stamp — transfer taxes are levied at the county and city level. Leave 0 for CA purchases."
                />
              </div>
            </ClosingCostSection>

            <ClosingCostSection
              title="Additional costs"
              subtotal={result.additionalCostsSubtotal}
              collapsed={!!collapsedSections.additional}
              onToggle={() => toggleSection('additional')}
            >
              <div className="mortgage-expense-grid">
                <MoneyField
                  id="bcc-flood-determination"
                  label="Flood determination fee"
                  value={floodDeterminationFee}
                  onChange={setFloodDeterminationFee}
                  help="Cost to determine whether the property sits in a FEMA flood zone, which affects whether flood insurance is required."
                />
                <MoneyField
                  id="bcc-mortgage-broker"
                  label="Mortgage broker fees"
                  value={mortgageBrokerFees}
                  onChange={setMortgageBrokerFees}
                  help="Fee paid to a mortgage broker, if you used one to shop and arrange your loan."
                />
              </div>
              <div className="mortgage-expense-grid">
                <MoneyField
                  id="bcc-other-cost"
                  label="Other"
                  value={otherAdditionalCosts}
                  onChange={setOtherAdditionalCosts}
                  help="Any other closing cost not itemized elsewhere in this calculator."
                />
                <MoneyField
                  id="bcc-pest-inspection"
                  label="Pest inspection"
                  value={pestInspection}
                  onChange={setPestInspection}
                  help="Cost of the termite/pest inspection some lenders or states require."
                />
              </div>
              <div className="mortgage-expense-grid">
                <MoneyField
                  id="bcc-settlement-fee"
                  label="Settlement or closing fee"
                  value={settlementOrClosingFee}
                  onChange={setSettlementOrClosingFee}
                  help="What the title or escrow company charges to conduct and administer the closing."
                />
                <MoneyField
                  id="bcc-survey"
                  label="Survey"
                  value={survey}
                  onChange={setSurvey}
                  help="Cost of a property survey confirming boundaries, easements, and encroachments."
                />
              </div>
            </ClosingCostSection>
          </div>
        )}

        <div className="seller-proceeds-toggle-row">
          <button type="button" className="seller-proceeds-toggle" onClick={() => setShowAdvanced((current) => !current)}>
            {showAdvanced ? 'Hide advanced controls' : 'Show advanced controls'}
          </button>
        </div>

        <div className="seller-proceeds-divider" />

        <div className="seller-proceeds-result">
          <p className="seller-proceeds-result__lede">Based off of the information you've provided us&hellip;</p>
          <h3>Here's what we've calculated for you</h3>
          <div className="buyer-closing-costs-totals">
            <div>
              <span>
                <FieldLabel label="Total costs" help="Sum of every closing cost line item above: mortgage closing details, loan costs, title charges, government fees, and additional costs." />
              </span>
              <strong>{currency.format(result.totalCosts)}</strong>
            </div>
            <div>
              <span>
                <FieldLabel label="Total credits" help="Sum of everything reducing your cash to close: seller-paid costs, earnest deposit, other credits, and seller-paid points." />
              </span>
              <strong>{currency.format(result.totalCredits)}</strong>
            </div>
          </div>
          <p className="seller-proceeds-result__lede">{isOverage ? 'Credit overage of' : 'Estimated cash due at closing'}</p>
          <p className={`seller-proceeds-result__amount ${isOverage ? 'is-overage' : ''}`}>
            {isOverage ? '-' : ''}
            {currency.format(Math.abs(result.netAtClosing))}
          </p>
          <p className="buyer-closing-costs-cash-to-close">
            Including your {currency.format(downPaymentAmt)} down payment, estimated total cash to close is{' '}
            <strong>{currency.format(Math.max(0, result.cashToClose))}</strong>.
          </p>
        </div>

        <div className="seller-proceeds-chart">
          <div className="seller-proceeds-donut" style={{ background: `conic-gradient(${gradient})` }}>
            <div className="seller-proceeds-donut__hole">
              <span>
                <FieldLabel label="Total costs" help="Sum of every closing cost line item: mortgage closing details, loan costs, title charges, government fees, and additional costs." />
              </span>
              <strong>{currency.format(result.totalCosts)}</strong>
            </div>
          </div>

          <ul className="seller-proceeds-legend">
            {donutSections.map((section) => (
              <li key={section.id}>
                <i style={{ background: section.color }} />
                <span>{section.label}</span>
                <strong>{currency.format(section.subtotal)}</strong>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <p className="mortgage-disclaimer">
        * Rates shown are for comparison only and are an average of the rates taken from
        multiple lenders and do not include all costs of borrowing. Actual rates and terms will
        vary. County customs source: {CA_CLOSING_CUSTOMS_SOURCE}
      </p>
    </main>
  )
}
