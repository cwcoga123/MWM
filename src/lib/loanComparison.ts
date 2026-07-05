import { loanTerms, type LoanTermId } from './mortgage'

export type ComparisonDownPaymentMode = 'dollars' | 'percent'

export interface ComparisonLoanInput {
  homePrice: number
  downPayment: number
  downPaymentMode: ComparisonDownPaymentMode
  loanTermId: LoanTermId
  annualInterestRate: number
}

export interface ComparisonLoanResult {
  loanAmount: number
  monthlyPayment: number
  totalInterest: number
  totalCost: number
}

const ARM_MARGIN = 2
const ARM_STARTING_INDEX = 1
const ARM_ANNUAL_INDEX_INCREASE = 0.5
const ARM_ADJUSTMENT_CAP = 2
const ARM_LIFETIME_CAP = 5

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

function paymentForBalance(
  balance: number,
  annualInterestRate: number,
  remainingMonths: number,
) {
  if (balance <= 0 || remainingMonths <= 0) return 0

  const monthlyRate = Math.max(0, annualInterestRate) / 1200
  if (monthlyRate === 0) return balance / remainingMonths

  return (
    (balance * monthlyRate * (1 + monthlyRate) ** remainingMonths) /
    ((1 + monthlyRate) ** remainingMonths - 1)
  )
}

function armFixedYears(loanTermId: LoanTermId) {
  if (loanTermId === 'arm-5') return 5
  if (loanTermId === 'arm-7') return 7
  if (loanTermId === 'arm-10') return 10
  return null
}

export function comparisonDownPaymentAmount(input: ComparisonLoanInput) {
  const homePrice = Math.max(0, input.homePrice)
  const requestedAmount =
    input.downPaymentMode === 'percent'
      ? homePrice * (clamp(input.downPayment, 0, 100) / 100)
      : Math.max(0, input.downPayment)

  return Math.min(homePrice, requestedAmount)
}

export function calculateComparisonLoan(
  input: ComparisonLoanInput,
): ComparisonLoanResult {
  const term =
    loanTerms.find((option) => option.id === input.loanTermId) ?? loanTerms[0]
  const loanAmount = Math.max(
    0,
    Math.max(0, input.homePrice) - comparisonDownPaymentAmount(input),
  )
  const totalMonths = Math.max(1, term.amortizationYears * 12)
  const initialRate = Math.min(100, Math.max(0, input.annualInterestRate))
  const monthlyPayment = paymentForBalance(loanAmount, initialRate, totalMonths)
  const fixedYears = armFixedYears(input.loanTermId)

  if (fixedYears === null) {
    const totalInterest = Math.max(0, monthlyPayment * totalMonths - loanAmount)
    return {
      loanAmount,
      monthlyPayment,
      totalInterest,
      totalCost: loanAmount + totalInterest,
    }
  }

  let balance = loanAmount
  let currentRate = initialRate
  let currentPayment = monthlyPayment
  let totalInterest = 0
  const firstAdjustmentMonth = fixedYears * 12 + 1

  for (let paymentNumber = 1; paymentNumber <= totalMonths && balance > 0; paymentNumber += 1) {
    const isAdjustmentMonth =
      paymentNumber >= firstAdjustmentMonth &&
      (paymentNumber - firstAdjustmentMonth) % 12 === 0

    if (isAdjustmentMonth) {
      const adjustmentNumber =
        Math.floor((paymentNumber - firstAdjustmentMonth) / 12) + 1
      const estimatedIndex =
        ARM_STARTING_INDEX +
        (adjustmentNumber - 1) * ARM_ANNUAL_INDEX_INCREASE
      const fullyIndexedRate = ARM_MARGIN + estimatedIndex
      currentRate = clamp(
        fullyIndexedRate,
        Math.max(0, currentRate - ARM_ADJUSTMENT_CAP),
        Math.min(
          currentRate + ARM_ADJUSTMENT_CAP,
          initialRate + ARM_LIFETIME_CAP,
        ),
      )
      currentPayment = paymentForBalance(
        balance,
        currentRate,
        totalMonths - paymentNumber + 1,
      )
    }

    const interest = balance * (currentRate / 1200)
    const principal = Math.min(balance, Math.max(0, currentPayment - interest))
    totalInterest += interest
    balance = Math.max(0, balance - principal)
  }

  return {
    loanAmount,
    monthlyPayment,
    totalInterest,
    totalCost: loanAmount + totalInterest,
  }
}
