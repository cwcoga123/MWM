export type AmountMode = 'dollars' | 'percent'

export interface RentVsBuyInputs {
  homePrice: number
  monthlyRent: number
  downPayment: number
  annualInterestRate: number
  termYears: number
  annualHoa: number
  annualPropertyTax: number
  annualHomeInsurance: number
  /** Annual home value appreciation, as a percent (e.g. 3.5). */
  homeAppreciationRate: number
  /** Annual rent growth, as a percent (e.g. 3). */
  rentGrowthRate: number
  /** Annual maintenance cost, as a percent of current home value. */
  maintenanceRate: number
  /** One-time closing costs when buying, as a percent of home price. */
  closingCostRate: number
  /** Cost to sell the home (agent commission, etc.), as a percent of its value. */
  sellingCostRate: number
  /** How many years to project (and to compare at). Defaults to termYears when omitted. */
  yearsToProject?: number
}

export interface RentVsBuyYearPoint {
  year: number
  /**
   * Net worth contributed by owning: home equity (appreciated value minus
   * remaining loan) less hypothetical selling costs, closing costs, and every
   * dollar paid that does NOT build equity (interest, tax, insurance, HOA,
   * maintenance). Principal payments are intentionally excluded from the
   * subtraction since they are already reflected in the equity figure.
   */
  buyingNetPosition: number
  /**
   * Cumulative cash advantage of renting: the running total of (that
   * month's full cost of owning) minus (that month's rent). Positive means
   * owning would have cost more out of pocket than renting did, up to that
   * point — i.e. money kept in your pocket by renting instead.
   */
  rentingNetPosition: number
  homeValue: number
  loanBalance: number
  homeEquity: number
}

export interface RentVsBuyResult {
  points: RentVsBuyYearPoint[]
  monthlyPrincipalAndInterest: number
  closingCosts: number
  breakEvenYear: number | null
  finalBuyingNetPosition: number
  finalRentingNetPosition: number
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

export function calculateRentVsBuy(inputs: RentVsBuyInputs): RentVsBuyResult {
  const homePrice = safeNumber(inputs.homePrice)
  const monthlyRentStart = safeNumber(inputs.monthlyRent)
  const downPayment = Math.min(homePrice, safeNumber(inputs.downPayment))
  const loanAmount = Math.max(0, homePrice - downPayment)
  const termYears = Math.max(1, safeNumber(inputs.termYears))
  const monthlyRate = safeNumber(inputs.annualInterestRate) / 1200
  const scheduledMonths = Math.max(1, Math.round(termYears * 12))
  const horizonYears = Math.max(1, Math.round(safeNumber(inputs.yearsToProject ?? termYears)))

  const appreciationRate = safeNumber(inputs.homeAppreciationRate) / 100
  const rentGrowthRate = safeNumber(inputs.rentGrowthRate) / 100
  const maintenanceRate = safeNumber(inputs.maintenanceRate) / 100
  const closingCostRate = safeNumber(inputs.closingCostRate) / 100
  const sellingCostRate = safeNumber(inputs.sellingCostRate) / 100

  const monthlyPI = loanAmount === 0 ? 0 : loanAmount * paymentFactor(inputs.annualInterestRate, termYears)
  const closingCosts = homePrice * closingCostRate
  const monthlyHoa = safeNumber(inputs.annualHoa) / 12
  const monthlyInsurance = safeNumber(inputs.annualHomeInsurance) / 12
  const baseAnnualPropertyTax = safeNumber(inputs.annualPropertyTax)

  let loanBalance = loanAmount
  let cumulativeNonEquityCosts = 0
  let cumulativeCashDifference = 0

  const points: RentVsBuyYearPoint[] = []
  points.push({
    year: 0,
    buyingNetPosition: homePrice - loanBalance - homePrice * sellingCostRate - closingCosts,
    rentingNetPosition: 0,
    homeValue: homePrice,
    loanBalance,
    homeEquity: homePrice - loanBalance,
  })

  let month = 0
  for (let year = 1; year <= horizonYears; year += 1) {
    const homeValueAtYearStart = homePrice * (1 + appreciationRate) ** (year - 1)
    const rentAtYearStart = monthlyRentStart * (1 + rentGrowthRate) ** (year - 1)
    const monthlyPropertyTax = (baseAnnualPropertyTax * (1 + appreciationRate) ** (year - 1)) / 12
    const monthlyMaintenance = (homeValueAtYearStart * maintenanceRate) / 12

    for (let m = 0; m < 12; m += 1) {
      const interestPortion = loanBalance * monthlyRate
      let principalPortion = monthlyPI - interestPortion

      if (month < scheduledMonths) {
        if (principalPortion > loanBalance) principalPortion = loanBalance
        loanBalance = Math.max(0, loanBalance - principalPortion)
      } else {
        principalPortion = 0
      }

      const totalOwnershipCash =
        (month < scheduledMonths ? monthlyPI : 0) + monthlyPropertyTax + monthlyInsurance + monthlyHoa + monthlyMaintenance
      const nonEquityCash =
        (month < scheduledMonths ? interestPortion : 0) + monthlyPropertyTax + monthlyInsurance + monthlyHoa + monthlyMaintenance

      cumulativeNonEquityCosts += nonEquityCash
      cumulativeCashDifference += totalOwnershipCash - rentAtYearStart

      month += 1
    }

    const homeValueAtYearEnd = homePrice * (1 + appreciationRate) ** year
    const homeEquity = homeValueAtYearEnd - loanBalance
    const sellingCosts = homeValueAtYearEnd * sellingCostRate

    points.push({
      year,
      buyingNetPosition: homeEquity - sellingCosts - closingCosts - cumulativeNonEquityCosts,
      rentingNetPosition: cumulativeCashDifference,
      homeValue: homeValueAtYearEnd,
      loanBalance,
      homeEquity,
    })
  }

  let breakEvenYear: number | null = null
  for (let i = 1; i < points.length; i += 1) {
    const previous = points[i - 1]
    const current = points[i]
    const previousDiff = previous.buyingNetPosition - previous.rentingNetPosition
    const currentDiff = current.buyingNetPosition - current.rentingNetPosition

    if (previousDiff < 0 && currentDiff >= 0) {
      breakEvenYear = current.year
      break
    }
  }

  const lastPoint = points[points.length - 1]

  return {
    points,
    monthlyPrincipalAndInterest: monthlyPI,
    closingCosts,
    breakEvenYear,
    finalBuyingNetPosition: lastPoint.buyingNetPosition,
    finalRentingNetPosition: lastPoint.rentingNetPosition,
  }
}

export function downPaymentAmount(homePrice: number, downPayment: number, mode: AmountMode) {
  if (mode === 'dollars') return Math.min(homePrice, Math.max(0, downPayment))
  return homePrice * (Math.min(100, Math.max(0, downPayment)) / 100)
}

export function propertyTaxAmount(homePrice: number, propertyTax: number, mode: AmountMode) {
  if (mode === 'dollars') return Math.max(0, propertyTax)
  return homePrice * (Math.max(0, propertyTax) / 100)
}
