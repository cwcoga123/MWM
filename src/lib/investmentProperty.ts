export type AmountMode = 'dollars' | 'percent'

export interface InvestmentPropertyInputs {
  purchasePrice: number
  downPayment: number
  interestRate: number
  amortizationYears: number
  closingCostRate: number
  monthlyRent: number
  vacancyRate: number
  managementRate: number
  annualPropertyTax: number
  annualInsurance: number
  monthlyHoa: number
  maintenanceRate: number
  otherMonthlyExpenses: number
}

export interface IncomeBreakdownItem {
  id: string
  label: string
  amount: number
  color: string
}

export interface InvestmentPropertyResult {
  downPaymentAmount: number
  loanAmount: number
  monthlyPI: number
  closingCosts: number
  totalCashInvested: number
  vacancyLoss: number
  effectiveMonthlyRent: number
  managementFee: number
  monthlyTax: number
  monthlyInsurance: number
  monthlyMaintenance: number
  totalOperatingExpenses: number
  noiAnnual: number
  monthlyCashFlow: number
  annualCashFlow: number
  capRate: number
  cashOnCashReturn: number
  onePercentRuleRatio: number
  breakdown: IncomeBreakdownItem[]
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

export function downPaymentAmountFor(purchasePrice: number, downPayment: number, mode: AmountMode) {
  if (mode === 'dollars') return Math.min(purchasePrice, Math.max(0, downPayment))
  return purchasePrice * (Math.min(100, Math.max(0, downPayment)) / 100)
}

export function calculateInvestmentProperty(
  inputs: InvestmentPropertyInputs,
  downPaymentMode: AmountMode,
): InvestmentPropertyResult {
  const purchasePrice = safeNumber(inputs.purchasePrice)
  const downPaymentAmt = downPaymentAmountFor(purchasePrice, inputs.downPayment, downPaymentMode)
  const loanAmount = Math.max(0, purchasePrice - downPaymentAmt)
  const monthlyPI = loanAmount * paymentFactor(inputs.interestRate, inputs.amortizationYears)

  const closingCosts = purchasePrice * (safeNumber(inputs.closingCostRate) / 100)
  const totalCashInvested = downPaymentAmt + closingCosts

  const monthlyRent = safeNumber(inputs.monthlyRent)
  const vacancyLoss = monthlyRent * (safeNumber(inputs.vacancyRate) / 100)
  const effectiveMonthlyRent = monthlyRent - vacancyLoss
  const managementFee = effectiveMonthlyRent * (safeNumber(inputs.managementRate) / 100)

  const monthlyTax = safeNumber(inputs.annualPropertyTax) / 12
  const monthlyInsurance = safeNumber(inputs.annualInsurance) / 12
  const monthlyHoa = safeNumber(inputs.monthlyHoa)
  const monthlyMaintenance = (purchasePrice * (safeNumber(inputs.maintenanceRate) / 100)) / 12
  const otherMonthlyExpenses = safeNumber(inputs.otherMonthlyExpenses)

  const totalOperatingExpenses =
    monthlyTax + monthlyInsurance + monthlyHoa + monthlyMaintenance + managementFee + otherMonthlyExpenses

  const noiAnnual = (effectiveMonthlyRent - totalOperatingExpenses) * 12
  const monthlyCashFlow = effectiveMonthlyRent - totalOperatingExpenses - monthlyPI
  const annualCashFlow = monthlyCashFlow * 12
  const capRate = purchasePrice > 0 ? noiAnnual / purchasePrice : 0
  const cashOnCashReturn = totalCashInvested > 0 ? annualCashFlow / totalCashInvested : 0
  const onePercentRuleRatio = purchasePrice > 0 ? monthlyRent / purchasePrice : 0

  const breakdown: IncomeBreakdownItem[] = [
    { id: 'debt-service', label: 'Mortgage principal & interest', amount: monthlyPI, color: '#2f81f7' },
    { id: 'tax', label: 'Property tax', amount: monthlyTax, color: '#d9c02a' },
    { id: 'insurance', label: 'Insurance', amount: monthlyInsurance, color: '#f0883e' },
    { id: 'hoa', label: 'HOA', amount: monthlyHoa, color: '#a371f7' },
    { id: 'maintenance', label: 'Maintenance', amount: monthlyMaintenance, color: '#f778ba' },
    { id: 'management', label: 'Management fee', amount: managementFee, color: '#ff7b72' },
    { id: 'vacancy', label: 'Vacancy loss', amount: vacancyLoss, color: '#8b949e' },
    { id: 'other', label: 'Other expenses', amount: otherMonthlyExpenses, color: '#6e7681' },
    { id: 'cash-flow', label: 'Net cash flow', amount: Math.max(0, monthlyCashFlow), color: '#3fb950' },
  ]

  return {
    downPaymentAmount: downPaymentAmt,
    loanAmount,
    monthlyPI,
    closingCosts,
    totalCashInvested,
    vacancyLoss,
    effectiveMonthlyRent,
    managementFee,
    monthlyTax,
    monthlyInsurance,
    monthlyMaintenance,
    totalOperatingExpenses,
    noiAnnual,
    monthlyCashFlow,
    annualCashFlow,
    capRate,
    cashOnCashReturn,
    onePercentRuleRatio,
    breakdown,
  }
}

export function conicGradient(items: IncomeBreakdownItem[]) {
  const positive = items.filter((item) => item.amount > 0)
  const total = positive.reduce((sum, item) => sum + item.amount, 0)

  if (total <= 0) return `${items[0]?.color ?? '#2f81f7'} 0% 100%`

  let cumulative = 0
  const stops = positive.map((item) => {
    const start = (cumulative / total) * 100
    cumulative += item.amount
    const end = (cumulative / total) * 100
    return `${item.color} ${start.toFixed(3)}% ${end.toFixed(3)}%`
  })

  return stops.join(', ')
}
