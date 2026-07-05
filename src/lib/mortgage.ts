export type LoanTermId =
  | 'fixed-30'
  | 'fixed-20'
  | 'fixed-15'
  | 'fixed-10'
  | 'arm-7'
  | 'arm-5'
  | 'arm-10'

export type CreditScoreId =
  | 'excellent'
  | 'good'
  | 'fair'
  | 'poor'
  | 'bad'

export interface LoanTermOption {
  id: LoanTermId
  label: string
  amortizationYears: number
  baseRate: number
  note: string
}

export interface CreditScoreOption {
  id: CreditScoreId
  label: string
  rateAdjustment: number
}

export interface MortgageInputs {
  homePrice: number
  downPayment: number
  annualInterestRate: number
  amortizationYears: number
  annualPropertyTax: number
  annualHomeInsurance: number
  monthlyHoa: number
}

export interface MortgagePayment {
  loanAmount: number
  principalAndInterest: number
  propertyTax: number
  homeInsurance: number
  hoa: number
  total: number
}

export const loanTerms: LoanTermOption[] = [
  {
    id: 'fixed-30',
    label: '30 Year Fixed',
    amortizationYears: 30,
    baseRate: 6.49,
    note: 'Fixed rate for 30 years',
  },
  {
    id: 'fixed-20',
    label: '20-Year Term',
    amortizationYears: 20,
    baseRate: 6.25,
    note: 'Fixed rate for 20 years',
  },
  {
    id: 'fixed-15',
    label: '15-Year Term',
    amortizationYears: 15,
    baseRate: 5.89,
    note: 'Fixed rate for 15 years',
  },
  {
    id: 'fixed-10',
    label: '10-Year Term',
    amortizationYears: 10,
    baseRate: 5.79,
    note: 'Fixed rate for 10 years',
  },
  {
    id: 'arm-7',
    label: '7-year ARM',
    amortizationYears: 30,
    baseRate: 6.1,
    note: 'Initial rate period of 7 years; 30-year amortization',
  },
  {
    id: 'arm-5',
    label: '5-year ARM',
    amortizationYears: 30,
    baseRate: 5.95,
    note: 'Initial rate period of 5 years; 30-year amortization',
  },
  {
    id: 'arm-10',
    label: '10-year ARM',
    amortizationYears: 30,
    baseRate: 6.25,
    note: 'Initial rate period of 10 years; 30-year amortization',
  },
]

export const creditScores: CreditScoreOption[] = [
  { id: 'excellent', label: '780-850 (Excellent)', rateAdjustment: 0 },
  { id: 'good', label: '660-779 (Good)', rateAdjustment: 0.25 },
  { id: 'fair', label: '600-659 (Fair)', rateAdjustment: 0.65 },
  { id: 'poor', label: '500-599 (Poor)', rateAdjustment: 1.25 },
  { id: 'bad', label: '300-499 (Bad)', rateAdjustment: 2 },
]

export function calculateInterestRate(
  term: LoanTermOption,
  creditScore: CreditScoreOption,
) {
  return Number((term.baseRate + creditScore.rateAdjustment).toFixed(3))
}

export function calculateMortgagePayment(
  inputs: MortgageInputs,
): MortgagePayment {
  const homePrice = Math.max(0, inputs.homePrice)
  const downPayment = Math.min(homePrice, Math.max(0, inputs.downPayment))
  const loanAmount = Math.max(0, homePrice - downPayment)
  const numberOfPayments = Math.max(1, inputs.amortizationYears * 12)
  const monthlyRate = Math.max(0, inputs.annualInterestRate) / 1200

  const principalAndInterest =
    loanAmount === 0
      ? 0
      : monthlyRate === 0
        ? loanAmount / numberOfPayments
        : (loanAmount * monthlyRate * (1 + monthlyRate) ** numberOfPayments) /
          ((1 + monthlyRate) ** numberOfPayments - 1)

  const propertyTax = Math.max(0, inputs.annualPropertyTax) / 12
  const homeInsurance = Math.max(0, inputs.annualHomeInsurance) / 12
  const hoa = Math.max(0, inputs.monthlyHoa)

  return {
    loanAmount,
    principalAndInterest,
    propertyTax,
    homeInsurance,
    hoa,
    total: principalAndInterest + propertyTax + homeInsurance + hoa,
  }
}

