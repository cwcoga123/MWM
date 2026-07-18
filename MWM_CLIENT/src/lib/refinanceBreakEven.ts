export interface RefinanceBreakEvenInputs {
  currentLoanBalance: number
  currentInterestRate: number
  currentRemainingTermYears: number
  newInterestRate: number
  newLoanTermYears: number
  refinanceClosingCosts: number
  cashOutAmount: number
}

export interface SavingsPoint {
  month: number
  cumulativeSavings: number
}

export interface RefinanceBreakEvenResult {
  currentMonthlyPI: number
  newLoanAmount: number
  newMonthlyPI: number
  monthlySavings: number
  breakEvenMonths: number | null
  totalInterestCurrent: number
  totalInterestNew: number
  lifetimeInterestSavings: number
  points: SavingsPoint[]
  chartMonths: number
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

export function calculateRefinanceBreakEven(inputs: RefinanceBreakEvenInputs): RefinanceBreakEvenResult {
  const currentLoanBalance = safeNumber(inputs.currentLoanBalance)
  const currentRemainingTermYears = Math.max(1, safeNumber(inputs.currentRemainingTermYears))
  const newLoanTermYears = Math.max(1, safeNumber(inputs.newLoanTermYears))
  const cashOutAmount = safeNumber(inputs.cashOutAmount)
  const closingCosts = safeNumber(inputs.refinanceClosingCosts)

  const currentMonthlyPI = currentLoanBalance * paymentFactor(inputs.currentInterestRate, currentRemainingTermYears)
  const newLoanAmount = currentLoanBalance + cashOutAmount
  const newMonthlyPI = newLoanAmount * paymentFactor(inputs.newInterestRate, newLoanTermYears)
  const monthlySavings = currentMonthlyPI - newMonthlyPI

  const breakEvenMonths = monthlySavings > 0 ? closingCosts / monthlySavings : null

  const totalInterestCurrent = currentMonthlyPI * currentRemainingTermYears * 12 - currentLoanBalance
  const totalInterestNew = newMonthlyPI * newLoanTermYears * 12 - newLoanAmount
  const lifetimeInterestSavings = totalInterestCurrent - totalInterestNew

  const chartMonths = Math.max(
    24,
    Math.min(360, breakEvenMonths !== null ? Math.ceil(breakEvenMonths * 2.2) : Math.min(120, newLoanTermYears * 12)),
  )

  const step = Math.max(1, Math.round(chartMonths / 60))
  const points: SavingsPoint[] = []
  for (let month = 0; month <= chartMonths; month += step) {
    points.push({ month, cumulativeSavings: monthlySavings * month })
  }
  if (points[points.length - 1]?.month !== chartMonths) {
    points.push({ month: chartMonths, cumulativeSavings: monthlySavings * chartMonths })
  }

  return {
    currentMonthlyPI,
    newLoanAmount,
    newMonthlyPI,
    monthlySavings,
    breakEvenMonths,
    totalInterestCurrent,
    totalInterestNew,
    lifetimeInterestSavings,
    points,
    chartMonths,
  }
}
