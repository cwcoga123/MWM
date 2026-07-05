export interface HomeEquityInputs {
  currentHomeValue: number
  currentMortgageBalance: number
  interestRate: number
  remainingTermYears: number
  homeAppreciationRate: number
  yearsToProject: number
}

export interface HomeEquityYearPoint {
  year: number
  homeValue: number
  loanBalance: number
  equity: number
}

export interface HomeEquityResult {
  currentEquity: number
  currentEquityPercent: number
  currentLoanToValue: number
  availableEquityAt80Percent: number
  points: HomeEquityYearPoint[]
  projectedEquity: number
  projectedHomeValue: number
  equityGrowth: number
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

export function calculateHomeEquity(inputs: HomeEquityInputs): HomeEquityResult {
  const currentHomeValue = safeNumber(inputs.currentHomeValue)
  const currentMortgageBalance = Math.min(currentHomeValue, safeNumber(inputs.currentMortgageBalance))
  const currentEquity = currentHomeValue - currentMortgageBalance
  const currentEquityPercent = currentHomeValue > 0 ? currentEquity / currentHomeValue : 0
  const currentLoanToValue = currentHomeValue > 0 ? currentMortgageBalance / currentHomeValue : 0
  const availableEquityAt80Percent = Math.max(0, currentHomeValue * 0.8 - currentMortgageBalance)

  const remainingTermYears = Math.max(1, safeNumber(inputs.remainingTermYears))
  const monthlyRate = safeNumber(inputs.interestRate) / 1200
  const monthlyPayment = currentMortgageBalance * paymentFactor(inputs.interestRate, remainingTermYears)
  const appreciationRate = safeNumber(inputs.homeAppreciationRate) / 100
  const horizonYears = Math.max(1, Math.round(safeNumber(inputs.yearsToProject)))
  const scheduledMonths = Math.max(1, Math.round(remainingTermYears * 12))

  let loanBalance = currentMortgageBalance
  const points: HomeEquityYearPoint[] = [
    { year: 0, homeValue: currentHomeValue, loanBalance, equity: currentEquity },
  ]

  let month = 0
  for (let year = 1; year <= horizonYears; year += 1) {
    for (let m = 0; m < 12; m += 1) {
      if (month < scheduledMonths && loanBalance > 0) {
        const interestPortion = loanBalance * monthlyRate
        let principalPortion = monthlyPayment - interestPortion
        if (principalPortion > loanBalance) principalPortion = loanBalance
        loanBalance = Math.max(0, loanBalance - principalPortion)
      }
      month += 1
    }

    const homeValue = currentHomeValue * (1 + appreciationRate) ** year
    points.push({ year, homeValue, loanBalance, equity: homeValue - loanBalance })
  }

  const lastPoint = points[points.length - 1]

  return {
    currentEquity,
    currentEquityPercent,
    currentLoanToValue,
    availableEquityAt80Percent,
    points,
    projectedEquity: lastPoint.equity,
    projectedHomeValue: lastPoint.homeValue,
    equityGrowth: lastPoint.equity - currentEquity,
  }
}
