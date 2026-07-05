export type AmountMode = 'dollars' | 'percent'

export interface BuyerClosingCostsInputs {
  purchasePrice: number
  downPayment: number
  interestRate: number
  amortizationYears: number
  estimatedClosingDate: string

  // Mortgage closing details
  mortgageInsurancePMI: number
  prepaidInterestOverride: number | null
  principalAndInterest: number
  annualHomeownersInsurance: number
  annualAdditionalInsurance: number
  annualPropertyTax: number
  monthlyAssociationDues: number
  monthsOfEscrow: number

  // Credits
  closingCostsPaidBySeller: number
  commitmentFee: number
  earnestDeposit: number
  otherCredits: number
  pointsPaidBySellerPercent: number
  propertyTaxesPaidThrough: string

  // Loan costs
  applicationFee: number
  appraisalFee: number
  assumptionFee: number
  creditReport: number
  lendersAttorneyFee: number
  lendersInspectionFee: number
  originationFee: number
  otherLoanCosts: number
  pointsPaidByBuyerPercent: number

  // Title charges
  abstractOrTitleSearch: number
  attorneysFees: number
  documentPreparation: number
  notaryFees: number
  otherTitleFees: number
  titleExamination: number
  titleInsurance: number

  // Government fees
  cityCountyTaxOrStamps: number
  otherGovernmentFees: number
  recordingFees: number
  stateTaxOrStamps: number

  // Additional costs
  floodDeterminationFee: number
  mortgageBrokerFees: number
  otherAdditionalCosts: number
  pestInspection: number
  settlementOrClosingFee: number
  survey: number
}

function safeNumber(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

function paymentFactor(annualInterestRate: number, termYears: number) {
  const monthlyRate = safeNumber(annualInterestRate) / 1200
  const numberOfPayments = Math.max(1, Math.round(safeNumber(termYears) * 12))

  return monthlyRate === 0
    ? 1 / numberOfPayments
    : (monthlyRate * (1 + monthlyRate) ** numberOfPayments) /
        ((1 + monthlyRate) ** numberOfPayments - 1)
}

/** Days of per-diem interest a buyer prepays: closing day through the end of that month. */
export function daysOfPrepaidInterest(estimatedClosingDate: string): number {
  const closing = new Date(`${estimatedClosingDate}T00:00:00`)
  if (Number.isNaN(closing.getTime())) return 0

  const lastDayOfMonth = new Date(closing.getFullYear(), closing.getMonth() + 1, 0).getDate()
  return Math.max(1, lastDayOfMonth - closing.getDate() + 1)
}

/** First payment is due the 1st of the second month following closing (the month after is "free"). */
export function defaultFirstPaymentDue(estimatedClosingDate: string): string {
  const closing = new Date(`${estimatedClosingDate}T00:00:00`)
  if (Number.isNaN(closing.getTime())) return estimatedClosingDate

  const firstPayment = new Date(closing.getFullYear(), closing.getMonth() + 2, 1)
  return firstPayment.toISOString().slice(0, 10)
}

export function downPaymentAmount(purchasePrice: number, downPayment: number, mode: AmountMode) {
  if (mode === 'dollars') return Math.min(purchasePrice, Math.max(0, downPayment))
  return purchasePrice * (Math.min(100, Math.max(0, downPayment)) / 100)
}

export interface ClosingSection {
  id: string
  label: string
  subtotal: number
  color: string
}

export interface BuyerClosingCostsResult {
  loanAmount: number
  prepaidInterest: number
  prepaidInterestDays: number
  perDiemInterest: number
  escrowDeposit: number
  mortgageClosingSubtotal: number
  creditsSubtotal: number
  pointsPaidBySeller: number
  loanCostsSubtotal: number
  pointsPaidByBuyer: number
  titleChargesSubtotal: number
  governmentFeesSubtotal: number
  additionalCostsSubtotal: number
  totalCosts: number
  totalCredits: number
  netAtClosing: number
  cashToClose: number
  sections: ClosingSection[]
}

export function calculateBuyerClosingCosts(
  inputs: BuyerClosingCostsInputs,
  downPaymentMode: AmountMode,
): BuyerClosingCostsResult {
  const purchasePrice = safeNumber(inputs.purchasePrice)
  const downPaymentAmt = downPaymentAmount(purchasePrice, inputs.downPayment, downPaymentMode)
  const loanAmount = Math.max(0, purchasePrice - downPaymentAmt)

  const prepaidInterestDays = daysOfPrepaidInterest(inputs.estimatedClosingDate)
  const perDiemInterest = (loanAmount * (safeNumber(inputs.interestRate) / 100)) / 365
  const computedPrepaidInterest = perDiemInterest * prepaidInterestDays
  const prepaidInterest =
    inputs.prepaidInterestOverride !== null ? safeNumber(inputs.prepaidInterestOverride) : computedPrepaidInterest

  const monthsOfEscrow = Math.max(0, Math.round(safeNumber(inputs.monthsOfEscrow)))
  const monthlyEscrowCost =
    safeNumber(inputs.annualHomeownersInsurance) / 12 +
    safeNumber(inputs.annualAdditionalInsurance) / 12 +
    safeNumber(inputs.annualPropertyTax) / 12 +
    safeNumber(inputs.monthlyAssociationDues) +
    safeNumber(inputs.mortgageInsurancePMI)
  const escrowDeposit = monthsOfEscrow * monthlyEscrowCost

  // Rounded to whole dollars per-component before summing, matching the convention
  // that reproduces the reference tool's displayed subtotal exactly (e.g. $178 + $959 = $1,137).
  const mortgageClosingSubtotal =
    Math.round(prepaidInterest) +
    Math.round(escrowDeposit) +
    safeNumber(inputs.mortgageInsurancePMI) +
    safeNumber(inputs.principalAndInterest)

  const pointsPaidBySeller = (safeNumber(inputs.pointsPaidBySellerPercent) / 100) * purchasePrice
  const creditsSubtotal =
    safeNumber(inputs.closingCostsPaidBySeller) +
    safeNumber(inputs.commitmentFee) +
    safeNumber(inputs.earnestDeposit) +
    safeNumber(inputs.otherCredits) +
    pointsPaidBySeller

  const pointsPaidByBuyer = (safeNumber(inputs.pointsPaidByBuyerPercent) / 100) * purchasePrice
  const loanCostsSubtotal =
    safeNumber(inputs.applicationFee) +
    safeNumber(inputs.appraisalFee) +
    safeNumber(inputs.assumptionFee) +
    safeNumber(inputs.creditReport) +
    safeNumber(inputs.lendersAttorneyFee) +
    safeNumber(inputs.lendersInspectionFee) +
    safeNumber(inputs.originationFee) +
    safeNumber(inputs.otherLoanCosts) +
    pointsPaidByBuyer

  const titleChargesSubtotal =
    safeNumber(inputs.abstractOrTitleSearch) +
    safeNumber(inputs.attorneysFees) +
    safeNumber(inputs.documentPreparation) +
    safeNumber(inputs.notaryFees) +
    safeNumber(inputs.otherTitleFees) +
    safeNumber(inputs.titleExamination) +
    safeNumber(inputs.titleInsurance)

  const governmentFeesSubtotal =
    safeNumber(inputs.cityCountyTaxOrStamps) +
    safeNumber(inputs.otherGovernmentFees) +
    safeNumber(inputs.recordingFees) +
    safeNumber(inputs.stateTaxOrStamps)

  const additionalCostsSubtotal =
    safeNumber(inputs.floodDeterminationFee) +
    safeNumber(inputs.mortgageBrokerFees) +
    safeNumber(inputs.otherAdditionalCosts) +
    safeNumber(inputs.pestInspection) +
    safeNumber(inputs.settlementOrClosingFee) +
    safeNumber(inputs.survey)

  const totalCosts =
    mortgageClosingSubtotal + loanCostsSubtotal + titleChargesSubtotal + governmentFeesSubtotal + additionalCostsSubtotal
  const totalCredits = creditsSubtotal
  const netAtClosing = totalCosts - totalCredits
  const cashToClose = downPaymentAmt + netAtClosing

  const sections: ClosingSection[] = [
    { id: 'mortgage', label: 'Mortgage closing details', subtotal: mortgageClosingSubtotal, color: '#2f81f7' },
    { id: 'loan-costs', label: 'Loan costs', subtotal: loanCostsSubtotal, color: '#d9c02a' },
    { id: 'title-charges', label: 'Title charges', subtotal: titleChargesSubtotal, color: '#a371f7' },
    { id: 'government', label: 'Government fees', subtotal: governmentFeesSubtotal, color: '#f0883e' },
    { id: 'additional', label: 'Additional costs', subtotal: additionalCostsSubtotal, color: '#f778ba' },
  ]

  return {
    loanAmount,
    prepaidInterest,
    prepaidInterestDays,
    perDiemInterest,
    escrowDeposit,
    mortgageClosingSubtotal,
    creditsSubtotal,
    pointsPaidBySeller,
    loanCostsSubtotal,
    pointsPaidByBuyer,
    titleChargesSubtotal,
    governmentFeesSubtotal,
    additionalCostsSubtotal,
    totalCosts,
    totalCredits,
    netAtClosing,
    cashToClose,
    sections,
  }
}

export function conicGradient(sections: ClosingSection[]) {
  const positive = sections.filter((section) => section.subtotal > 0)
  const total = positive.reduce((sum, section) => sum + section.subtotal, 0)

  if (total <= 0) return `${sections[0]?.color ?? '#2f81f7'} 0% 100%`

  let cumulative = 0
  const stops = positive.map((section) => {
    const start = (cumulative / total) * 100
    cumulative += section.subtotal
    const end = (cumulative / total) * 100
    return `${section.color} ${start.toFixed(3)}% ${end.toFixed(3)}%`
  })

  return stops.join(', ')
}
