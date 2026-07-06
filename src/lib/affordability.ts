export {
  loanTerms,
  creditScores,
  calculateInterestRate,
  pmiRates,
  type LoanTermId,
  type CreditScoreId,
  type LoanTermOption,
  type CreditScoreOption,
} from './mortgage'
import { pmiRates } from './mortgage'

/**
 * Conventional back-end debt-to-income guideline used to size "how much can
 * you afford." The calculator solves for the home price whose monthly
 * housing payment, combined with existing monthly debt, lands right at this
 * ratio of gross monthly income.
 */
export const TARGET_DTI = 0.36

/** Zone boundaries used for the affordability gauge and its labels. */
export const AFFORDABLE_DTI_MAX = 0.36
export const STRETCHING_DTI_MAX = 0.43
/** DTI value that fills 100% of the gauge bar. */
export const GAUGE_MAX_DTI = 0.6

/**
 * Estimated annual mortgage insurance rate applied to the loan amount when
 * the down payment is under 20% of the home price — matches the convention
 * used elsewhere in this app (see CashOutRefinanceCalculator).
 */
export const PMI_ANNUAL_RATE = 0.0056
export const PMI_DOWN_PAYMENT_THRESHOLD = 0.2

export type AffordabilityZone = 'affordable' | 'stretching' | 'aggressive'

export interface AffordabilityInputs {
  grossAnnualIncome: number
  monthlyDebt: number
  downPayment: number
  /** Annual property tax rate, as a percent of home price (e.g. 0.74 for 0.74%). */
  propertyTaxRatePercent: number
  annualInterestRate: number
  termYears: number
  removeMortgageInsurance: boolean
  /** Credit score band used to select the appropriate PMI rate. */
  creditScoreId: import('./mortgage').CreditScoreId
  /**
   * Target back-end debt-to-income ratio (0-1) driving how much home the
   * budget can support. Defaults to TARGET_DTI when omitted. Exposed so the
   * gauge slider can drive affordability directly.
   */
  targetDti?: number
}

export interface AffordabilityResult {
  affordablePrice: number
  loanAmount: number
  monthlyPrincipalAndInterest: number
  monthlyPropertyTax: number
  monthlyPmi: number
  totalMonthlyPayment: number
  debtToIncomeRatio: number
  pmiActive: boolean
  downPaymentPercent: number
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

/**
 * Solves for the home price where:
 *   budget = (homePrice - downPayment) * factor        (principal & interest)
 *          + homePrice * taxMonthlyRate                (property tax)
 *          + (homePrice - downPayment) * pmiMonthlyRate (mortgage insurance, if any)
 * which is linear in homePrice.
 */
function solveHomePrice(
  budget: number,
  downPayment: number,
  factor: number,
  taxMonthlyRate: number,
  pmiMonthlyRate: number,
) {
  const coefficient = factor + taxMonthlyRate + pmiMonthlyRate
  if (coefficient <= 0) return downPayment

  const homePrice = (budget + downPayment * (factor + pmiMonthlyRate)) / coefficient
  return Math.max(0, homePrice)
}

export function calculateAffordability(inputs: AffordabilityInputs): AffordabilityResult {
  const grossAnnualIncome = safeNumber(inputs.grossAnnualIncome)
  const monthlyDebt = safeNumber(inputs.monthlyDebt)
  const downPayment = safeNumber(inputs.downPayment)
  const taxMonthlyRate = safeNumber(inputs.propertyTaxRatePercent) / 100 / 12
  const annualPmiRate = pmiRates[inputs.creditScoreId] ?? PMI_ANNUAL_RATE
  const pmiMonthlyRate = annualPmiRate / 12

  const targetDti = safeNumber(inputs.targetDti ?? TARGET_DTI)
  const grossMonthlyIncome = grossAnnualIncome / 12
  const housingBudget = Math.max(0, grossMonthlyIncome * targetDti - monthlyDebt)
  const factor = paymentFactor(inputs.annualInterestRate, inputs.termYears)

  let affordablePrice: number
  let pmiActive: boolean

  const priceWithPmi = solveHomePrice(housingBudget, downPayment, factor, taxMonthlyRate, pmiMonthlyRate)
  const downRatioWithPmi = priceWithPmi > 0 ? downPayment / priceWithPmi : 1
  const wouldNeedPmi = downRatioWithPmi < PMI_DOWN_PAYMENT_THRESHOLD

  if (!wouldNeedPmi) {
    // Down payment already ≥ 20% — no PMI regardless of the toggle
    affordablePrice = solveHomePrice(housingBudget, downPayment, factor, taxMonthlyRate, 0)
    pmiActive = false
  } else if (inputs.removeMortgageInsurance) {
    // PMI would apply but the user opted out. Lock the price to the
    // PMI-inclusive value so the payment DROP from removing PMI is visible
    // (instead of being silently absorbed into a higher purchase price).
    affordablePrice = priceWithPmi
    pmiActive = false
  } else {
    affordablePrice = priceWithPmi
    pmiActive = true
  }

  const loanAmount = Math.max(0, affordablePrice - downPayment)
  const monthlyPrincipalAndInterest = loanAmount * factor
  const monthlyPropertyTax = affordablePrice * taxMonthlyRate
  const monthlyPmi = pmiActive ? loanAmount * pmiMonthlyRate : 0
  const totalMonthlyPayment = monthlyPrincipalAndInterest + monthlyPropertyTax + monthlyPmi
  const debtToIncomeRatio =
    grossMonthlyIncome > 0 ? (totalMonthlyPayment + monthlyDebt) / grossMonthlyIncome : 0
  const downPaymentPercent = affordablePrice > 0 ? (downPayment / affordablePrice) * 100 : 0

  return {
    affordablePrice,
    loanAmount,
    monthlyPrincipalAndInterest,
    monthlyPropertyTax,
    monthlyPmi,
    totalMonthlyPayment,
    debtToIncomeRatio,
    pmiActive,
    downPaymentPercent,
  }
}

export function affordabilityZone(debtToIncomeRatio: number): AffordabilityZone {
  if (debtToIncomeRatio <= AFFORDABLE_DTI_MAX) return 'affordable'
  if (debtToIncomeRatio <= STRETCHING_DTI_MAX) return 'stretching'
  return 'aggressive'
}

export function gaugeFillPercent(debtToIncomeRatio: number) {
  return Math.min(100, Math.max(0, (debtToIncomeRatio / GAUGE_MAX_DTI) * 100))
}
