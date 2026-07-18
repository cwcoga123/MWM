export type ClientState = 'browsing' | 'house-hunting' | 'in-escrow' | 'homeowner'

export type PillTone = 'positive' | 'time' | 'neutral'

export interface MortgageInputs {
  homePrice: number
  downPayment: number
  annualInterestRate: number
  amortizationYears: number
  annualPropertyTax: number
  annualHomeInsurance: number
  monthlyHoa: number
}

export interface WatchlistArea {
  name: string
  medianPrice: number
  monthlyDelta: number
}

export interface OverviewClientProfile {
  id: string
  aliases: string[]
  email: string
  name: string
  clientState: ClientState
  advisorNote: string | null
  recentCalculatorIds: string[]
  preferences: {
    neighborhoods: string[]
    budgetStyle: string
    riskPosture: string
  }
  escrow?: {
    address: string
    lockedRate: number
    lockExpiresOn: string
    closingDate: string
    appraisalAt: string
    budget: number
    paymentInputs: MortgageInputs
  }
  search?: {
    matchNeighborhood: string
    newMatches: number
    preApproved: number
    targetBudget: number
    targetPaymentInputs: Omit<MortgageInputs, 'annualInterestRate'>
    watchlist: WatchlistArea[]
    openHousesSaved: number
    openHouseWindow: string
  }
  homeowner?: {
    address: string
    estimatedValue: number
    valueGrowthPercent: number
    refiAlertRate: number
    remainingBalance: number
    equityGainThisYear: number
  }
}

export const overviewDemoAccounts: OverviewClientProfile[] = [
  {
    id: 'alex-escrow',
    aliases: ['alex', 'escrow', 'in-escrow'],
    email: 'alex.escrow@mwm.local',
    name: 'Alex Morgan',
    clientState: 'in-escrow',
    advisorNote:
      "Inspection report came back clean - two small items, nothing scary. I'll walk you through them Friday.",
    recentCalculatorIds: ['buyer-closing-costs', 'mortgage-calculator'],
    preferences: {
      neighborhoods: ['Noe Valley', 'Bernal Heights'],
      budgetStyle: 'Monthly-payment anchored',
      riskPosture: 'Locked rate, low surprises',
    },
    escrow: {
      address: '742 Elm St',
      lockedRate: 6.25,
      lockExpiresOn: '2026-08-02',
      closingDate: '2026-08-21',
      appraisalAt: '2026-07-17T09:00:00',
      budget: 960000,
      paymentInputs: {
        homePrice: 960000,
        downPayment: 240000,
        annualInterestRate: 6.25,
        amortizationYears: 30,
        annualPropertyTax: 8300,
        annualHomeInsurance: 1300,
        monthlyHoa: 0,
      },
    },
  },
  {
    id: 'priya-searching',
    aliases: ['priya', 'searching', 'search', 'house-hunting', 'hunting'],
    email: 'priya.searching@mwm.local',
    name: 'Priya Shah',
    clientState: 'house-hunting',
    advisorNote:
      "The Duncan St listing is underpriced for the block - I'll send Saturday showing times.",
    recentCalculatorIds: ['affordability', 'buyer-closing-costs', 'mortgage-rates'],
    preferences: {
      neighborhoods: ['Noe Valley', 'Bernal Heights', 'Glen Park'],
      budgetStyle: 'Target below approval ceiling',
      riskPosture: 'Wants room for repairs and travel',
    },
    search: {
      matchNeighborhood: 'Noe Valley',
      newMatches: 3,
      preApproved: 1200000,
      targetBudget: 960000,
      targetPaymentInputs: {
        homePrice: 960000,
        downPayment: 240000,
        amortizationYears: 30,
        annualPropertyTax: 8300,
        annualHomeInsurance: 1300,
        monthlyHoa: 0,
      },
      watchlist: [
        { name: 'Noe Valley', medianPrice: 1420000, monthlyDelta: 1.2 },
        { name: 'Bernal Heights', medianPrice: 1180000, monthlyDelta: 0.8 },
      ],
      openHousesSaved: 4,
      openHouseWindow: 'Sat-Sun',
    },
  },
  {
    id: 'jordan-browsing',
    aliases: ['jordan', 'browsing', 'browse'],
    email: 'jordan.browsing@mwm.local',
    name: 'Jordan Lee',
    clientState: 'browsing',
    advisorNote:
      "Whenever you're ready, the affordability calculator is the gentlest first step - I'll walk you through the results.",
    recentCalculatorIds: ['affordability', 'rent-vs-buy'],
    preferences: {
      neighborhoods: ['Inner Sunset', 'Richmond', 'Daly City'],
      budgetStyle: 'Comfort first, no hard ceiling yet',
      riskPosture: 'Researching slowly',
    },
  },
  {
    id: 'mateo-homeowner',
    aliases: ['mateo', 'homeowner', 'owner'],
    email: 'mateo.homeowner@mwm.local',
    name: 'Mateo Rivera',
    clientState: 'homeowner',
    advisorNote:
      "Happy first year on Elm St! If rates drop under 5.9%, a refi starts making sense - I'm watching it for you.",
    recentCalculatorIds: ['home-equity', 'seller-net-proceeds', 'refinance-break-even'],
    preferences: {
      neighborhoods: ['Mission Dolores'],
      budgetStyle: 'Equity and refinance watch',
      riskPosture: 'No action unless savings are clear',
    },
    homeowner: {
      address: '742 Elm St',
      estimatedValue: 1310000,
      valueGrowthPercent: 4.1,
      refiAlertRate: 5.9,
      remainingBalance: 898000,
      equityGainThisYear: 58000,
    },
  },
]

export const defaultOverviewDemoAccount = overviewDemoAccounts[0]

export function findOverviewDemoAccount(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) return null

  return (
    overviewDemoAccounts.find(
      (account) =>
        account.id === normalized ||
        account.email.toLowerCase() === normalized ||
        account.clientState === normalized ||
        account.aliases.includes(normalized),
    ) ?? null
  )
}
