export type AmortizationLoanTermId = '30' | '20' | '15' | '10'

export type PaymentFrequencyId = 'once' | 'quarter' | 'year' | 'bi-annual' | 'bi-monthly'

export interface AmortizationLoanTermOption {
  id: AmortizationLoanTermId
  label: string
  years: number
}

export interface PaymentFrequencyOption {
  id: PaymentFrequencyId
  label: string
  /** Number of months between recurring payments, or null for a one-time payment. */
  months: number | null
}

export const amortizationLoanTerms: AmortizationLoanTermOption[] = [
  { id: '30', label: '30-Year Term', years: 30 },
  { id: '20', label: '20-Year Term', years: 20 },
  { id: '15', label: '15-Year Term', years: 15 },
  { id: '10', label: '10-Year Term', years: 10 },
]

export const paymentFrequencies: PaymentFrequencyOption[] = [
  { id: 'once', label: 'Once', months: null },
  { id: 'quarter', label: 'Quarter', months: 3 },
  { id: 'year', label: 'Year', months: 12 },
  { id: 'bi-annual', label: 'Bi-Annual', months: 6 },
  { id: 'bi-monthly', label: 'Bi-Monthly', months: 2 },
]

/**
 * Estimated annual PMI rate applied to the original loan amount. PMI is only
 * charged for the first 5 years of the loan, or until the balance falls to
 * 80% of the original loan amount, whichever comes first — matching the
 * common lender practice of automatic removal at 78-80% LTV.
 */
export const PMI_ANNUAL_RATE = 0.0055
export const PMI_MAX_MONTHS = 60
export const PMI_LTV_THRESHOLD = 0.8

export interface AmortizationInputs {
  loanAmount: number
  termYears: number
  annualInterestRate: number
  /** ISO date string (yyyy-mm-dd) for the first payment. */
  startDate: string
  annualHoa: number
  annualPropertyTax: number
  annualInsurance: number
  includePmi: boolean
  additionalMonthly: number
  intervalPayment: number
  /** ISO date string (yyyy-mm-dd) for the first interval/lump-sum payment. */
  intervalInitialDate: string
  intervalFrequency: PaymentFrequencyId
}

export interface AmortizationRow {
  paymentNumber: number
  date: Date
  payment: number
  principal: number
  interest: number
  totalInterestPaid: number
  balance: number
}

export interface AmortizationSummary {
  monthlyPrincipalAndInterest: number
  totalMonthlyPayment: number
  principalPaid: number
  interestPaid: number
  hoaPaid: number
  propertyTaxPaid: number
  insurancePaid: number
  pmiPaid: number
  otherExpensesPaid: number
  balanceRemaining: number
  payoffDate: Date | null
  timeElapsedMonths: number
  scheduledMonths: number
  rows: AmortizationRow[]
}

function safeNumber(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

function addMonths(date: Date, months: number) {
  const result = new Date(date.getTime())
  result.setMonth(result.getMonth() + months)
  return result
}

function parseDateInput(value: string, fallback: Date) {
  if (!value) return fallback
  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? fallback : parsed
}

function monthsBetween(from: Date, to: Date) {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
}

export function generateAmortizationSchedule(inputs: AmortizationInputs): AmortizationSummary {
  const loanAmount = safeNumber(inputs.loanAmount)
  const numberOfPayments = Math.max(1, Math.round(safeNumber(inputs.termYears) * 12))
  const monthlyRate = safeNumber(inputs.annualInterestRate) / 1200
  const startDate = parseDateInput(inputs.startDate, new Date())
  const intervalStartDate = parseDateInput(inputs.intervalInitialDate, startDate)
  const frequency =
    paymentFrequencies.find((option) => option.id === inputs.intervalFrequency) ??
    paymentFrequencies[0]

  const basePayment =
    loanAmount === 0
      ? 0
      : monthlyRate === 0
        ? loanAmount / numberOfPayments
        : (loanAmount * monthlyRate * (1 + monthlyRate) ** numberOfPayments) /
          ((1 + monthlyRate) ** numberOfPayments - 1)

  const monthlyHoa = safeNumber(inputs.annualHoa) / 12
  const monthlyPropertyTax = safeNumber(inputs.annualPropertyTax) / 12
  const monthlyInsurance = safeNumber(inputs.annualInsurance) / 12
  const additionalMonthly = safeNumber(inputs.additionalMonthly)
  const intervalPayment = safeNumber(inputs.intervalPayment)
  const monthlyPmi = inputs.includePmi && loanAmount > 0 ? (loanAmount * PMI_ANNUAL_RATE) / 12 : 0

  const rows: AmortizationRow[] = []
  let balance = loanAmount
  let totalInterestPaid = 0
  let hoaPaid = 0
  let propertyTaxPaid = 0
  let insurancePaid = 0
  let pmiPaid = 0

  for (let i = 0; i < numberOfPayments && balance > 0.005; i += 1) {
    const paymentDate = addMonths(startDate, i)
    const interestPortion = balance * monthlyRate
    const scheduledPrincipal = Math.max(0, basePayment - interestPortion)

    let extraPayment = additionalMonthly

    if (intervalPayment > 0 && paymentDate.getTime() >= intervalStartDate.getTime()) {
      if (frequency.months === null) {
        if (
          paymentDate.getFullYear() === intervalStartDate.getFullYear() &&
          paymentDate.getMonth() === intervalStartDate.getMonth()
        ) {
          extraPayment += intervalPayment
        }
      } else {
        const elapsed = monthsBetween(intervalStartDate, paymentDate)
        if (elapsed >= 0 && elapsed % frequency.months === 0) {
          extraPayment += intervalPayment
        }
      }
    }

    let principalPortion = scheduledPrincipal + extraPayment
    if (principalPortion > balance) principalPortion = balance

    const pmiActive =
      inputs.includePmi && i < PMI_MAX_MONTHS && balance > loanAmount * PMI_LTV_THRESHOLD
    const pmiPortion = pmiActive ? monthlyPmi : 0

    balance -= principalPortion
    totalInterestPaid += interestPortion
    hoaPaid += monthlyHoa
    propertyTaxPaid += monthlyPropertyTax
    insurancePaid += monthlyInsurance
    pmiPaid += pmiPortion

    rows.push({
      paymentNumber: i + 1,
      date: paymentDate,
      payment: interestPortion + principalPortion,
      principal: principalPortion,
      interest: interestPortion,
      totalInterestPaid,
      balance: Math.max(0, balance),
    })
  }

  const lastRow = rows[rows.length - 1] ?? null
  const firstMonthPmi =
    inputs.includePmi && loanAmount > 0 && loanAmount > loanAmount * PMI_LTV_THRESHOLD
      ? monthlyPmi
      : 0

  return {
    monthlyPrincipalAndInterest: basePayment,
    totalMonthlyPayment: basePayment + monthlyHoa + monthlyPropertyTax + monthlyInsurance + firstMonthPmi,
    principalPaid: loanAmount - (lastRow ? lastRow.balance : loanAmount),
    interestPaid: totalInterestPaid,
    hoaPaid,
    propertyTaxPaid,
    insurancePaid,
    pmiPaid,
    otherExpensesPaid: hoaPaid + propertyTaxPaid + insurancePaid,
    balanceRemaining: lastRow ? lastRow.balance : loanAmount,
    payoffDate: lastRow ? lastRow.date : null,
    timeElapsedMonths: rows.length,
    scheduledMonths: numberOfPayments,
    rows,
  }
}

export function formatElapsedDuration(totalMonths: number) {
  const years = Math.floor(totalMonths / 12)
  const months = totalMonths % 12

  if (years === 0) return `${months} ${months === 1 ? 'month' : 'months'}`
  if (months === 0) return `${years} ${years === 1 ? 'year' : 'years'}`
  return `${years} ${years === 1 ? 'year' : 'years'}, ${months} ${months === 1 ? 'month' : 'months'}`
}

export interface AmortizationYearlyPoint {
  year: number
  balance: number
  cumulativePrincipal: number
  cumulativeInterest: number
}

export function summarizeByYear(rows: AmortizationRow[]): AmortizationYearlyPoint[] {
  if (rows.length === 0) return [{ year: 0, balance: 0, cumulativePrincipal: 0, cumulativeInterest: 0 }]

  const points: AmortizationYearlyPoint[] = [
    { year: 0, balance: rows[0].balance + rows[0].principal, cumulativePrincipal: 0, cumulativeInterest: 0 },
  ]

  let cumulativePrincipal = 0

  rows.forEach((row, index) => {
    cumulativePrincipal += row.principal
    const isYearEnd = (index + 1) % 12 === 0
    const isLastRow = index === rows.length - 1

    if (isYearEnd || isLastRow) {
      points.push({
        year: Math.ceil((index + 1) / 12),
        balance: row.balance,
        cumulativePrincipal,
        cumulativeInterest: row.totalInterestPaid,
      })
    }
  })

  return points
}
