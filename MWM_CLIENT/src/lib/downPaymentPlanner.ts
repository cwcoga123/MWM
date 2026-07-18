export type AmountMode = 'dollars' | 'percent'

export interface DownPaymentPlannerInputs {
  homePrice: number
  downPayment: number
  interestRate: number
  amortizationYears: number
  annualPropertyTax: number
  annualHomeInsurance: number
  monthlyHoa: number
  cashReserves: number
  closingCostRate: number
}

export interface DownPaymentScenario {
  percent: number
  downPaymentAmount: number
  loanAmount: number
  monthlyPI: number
  monthlyPMI: number
  totalMonthlyPayment: number
  cashNeededAtClosing: number
  remainingReserves: number
}

export interface DownPaymentPlannerResult {
  downPaymentAmount: number
  downPaymentPercent: number
  loanAmount: number
  loanToValue: number
  pmiRequired: boolean
  monthlyPI: number
  monthlyPMI: number
  monthlyTax: number
  monthlyInsurance: number
  monthlyHoa: number
  totalMonthlyPayment: number
  closingCosts: number
  cashNeededAtClosing: number
  remainingReserves: number
  monthsOfReserves: number | null
  scenarios: DownPaymentScenario[]
}

const PMI_ANNUAL_RATE = 0.0056
const PMI_LTV_THRESHOLD = 0.8
const SCENARIO_PERCENTS = [5, 10, 15, 20, 25, 30]

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

export function downPaymentAmountFor(homePrice: number, downPayment: number, mode: AmountMode) {
  if (mode === 'dollars') return Math.min(homePrice, Math.max(0, downPayment))
  return homePrice * (Math.min(100, Math.max(0, downPayment)) / 100)
}

function scenarioFor(
  percent: number,
  homePrice: number,
  interestRate: number,
  amortizationYears: number,
  monthlyTax: number,
  monthlyInsurance: number,
  monthlyHoa: number,
  closingCosts: number,
  cashReserves: number,
): DownPaymentScenario {
  const downPaymentAmount = homePrice * (percent / 100)
  const loanAmount = Math.max(0, homePrice - downPaymentAmount)
  const monthlyPI = loanAmount * paymentFactor(interestRate, amortizationYears)
  const ltv = homePrice > 0 ? loanAmount / homePrice : 0
  const monthlyPMI = ltv > PMI_LTV_THRESHOLD ? (loanAmount * PMI_ANNUAL_RATE) / 12 : 0
  const totalMonthlyPayment = monthlyPI + monthlyPMI + monthlyTax + monthlyInsurance + monthlyHoa
  const cashNeededAtClosing = downPaymentAmount + closingCosts
  const remainingReserves = cashReserves - cashNeededAtClosing

  return {
    percent,
    downPaymentAmount,
    loanAmount,
    monthlyPI,
    monthlyPMI,
    totalMonthlyPayment,
    cashNeededAtClosing,
    remainingReserves,
  }
}

export function calculateDownPaymentPlan(
  inputs: DownPaymentPlannerInputs,
  downPaymentMode: AmountMode,
): DownPaymentPlannerResult {
  const homePrice = safeNumber(inputs.homePrice)
  const downPaymentAmt = downPaymentAmountFor(homePrice, inputs.downPayment, downPaymentMode)
  const loanAmount = Math.max(0, homePrice - downPaymentAmt)
  const loanToValue = homePrice > 0 ? loanAmount / homePrice : 0
  const pmiRequired = loanToValue > PMI_LTV_THRESHOLD

  const monthlyPI = loanAmount * paymentFactor(inputs.interestRate, inputs.amortizationYears)
  const monthlyPMI = pmiRequired ? (loanAmount * PMI_ANNUAL_RATE) / 12 : 0
  const monthlyTax = safeNumber(inputs.annualPropertyTax) / 12
  const monthlyInsurance = safeNumber(inputs.annualHomeInsurance) / 12
  const monthlyHoa = safeNumber(inputs.monthlyHoa)
  const totalMonthlyPayment = monthlyPI + monthlyPMI + monthlyTax + monthlyInsurance + monthlyHoa

  const closingCostRate = safeNumber(inputs.closingCostRate) / 100
  const closingCosts = homePrice * closingCostRate
  const cashNeededAtClosing = downPaymentAmt + closingCosts
  const cashReserves = safeNumber(inputs.cashReserves)
  const remainingReserves = cashReserves - cashNeededAtClosing
  const monthsOfReserves =
    remainingReserves >= 0 && totalMonthlyPayment > 0 ? remainingReserves / totalMonthlyPayment : null

  const scenarios = SCENARIO_PERCENTS.map((percent) =>
    scenarioFor(
      percent,
      homePrice,
      inputs.interestRate,
      inputs.amortizationYears,
      monthlyTax,
      monthlyInsurance,
      monthlyHoa,
      closingCosts,
      cashReserves,
    ),
  )

  return {
    downPaymentAmount: downPaymentAmt,
    downPaymentPercent: homePrice > 0 ? (downPaymentAmt / homePrice) * 100 : 0,
    loanAmount,
    loanToValue,
    pmiRequired,
    monthlyPI,
    monthlyPMI,
    monthlyTax,
    monthlyInsurance,
    monthlyHoa,
    totalMonthlyPayment,
    closingCosts,
    cashNeededAtClosing,
    remainingReserves,
    monthsOfReserves,
    scenarios,
  }
}
