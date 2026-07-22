export type HomeGoal = 'researching' | 'buying' | 'selling' | 'refinancing' | 'investing'
export type PropertyType = 'any' | 'single-family' | 'condo-townhome' | 'multi-unit'
export type LoanType = 'conventional' | 'FHA' | 'VA' | 'jumbo' | 'cash'
export type MarketRange = '1Y' | '5Y' | '10Y' | '20Y'
export type DefaultView = 'overview' | 'calendar' | 'calculators' | 'resources' | 'market-scanner' | 'cost-watch'
export type DigestFrequency = 'instant' | 'daily' | 'weekly'

export interface NotificationPreferences {
  advisorMessages: boolean
  rateAlerts: boolean
  marketAlerts: boolean
  calendarReminders: boolean
  digestFrequency: DigestFrequency
  quietHoursStart: string
  quietHoursEnd: string
}

export interface AppearancePreferences {
  theme: 'light' | 'dark' | 'system'
  density: 'comfortable' | 'compact'
  reduceMotion: boolean
}

export interface MyPlanPreferences {
  preferredName: string
  homeGoal: HomeGoal
  timeline: string
  propertyType: PropertyType
  savedAreas: string[]
  bedrooms: number | null
  bathrooms: number | null
  comfortableMonthlyPayment: number | null
  grossAnnualIncome: number | null
  monthlyDebt: number | null
  currentHomeValue: number | null
  currentMortgageBalance: number | null
  targetSalePrice: number | null
  sellingCostPercent: number
  repairsBudget: number | null
  downPaymentAmount: number | null
  downPaymentPercent: number
  loanType: LoanType
  loanTermYears: 15 | 20 | 30
  annualPropertyTaxRate: number
  annualHomeInsurance: number
  monthlyHoa: number
  cashReserve: number | null
  mustHaves: string
  dealBreakers: string
  defaultView: DefaultView
  marketRange: MarketRange
  pinnedCalculatorIds: string[]
  savedCostWatchIds: string[]
  notifications: NotificationPreferences
  appearance: AppearancePreferences
}

export const defaultMyPlanPreferences: MyPlanPreferences = {
  preferredName: '',
  homeGoal: 'researching',
  timeline: 'Exploring',
  propertyType: 'any',
  savedAreas: [],
  bedrooms: null,
  bathrooms: null,
  comfortableMonthlyPayment: null,
  grossAnnualIncome: null,
  monthlyDebt: null,
  currentHomeValue: null,
  currentMortgageBalance: null,
  targetSalePrice: null,
  sellingCostPercent: 7,
  repairsBudget: null,
  downPaymentAmount: null,
  downPaymentPercent: 20,
  loanType: 'conventional',
  loanTermYears: 30,
  annualPropertyTaxRate: 0.86,
  annualHomeInsurance: 1300,
  monthlyHoa: 0,
  cashReserve: null,
  mustHaves: '',
  dealBreakers: '',
  defaultView: 'overview',
  marketRange: '20Y',
  pinnedCalculatorIds: [],
  savedCostWatchIds: [],
  notifications: {
    advisorMessages: true,
    rateAlerts: true,
    marketAlerts: true,
    calendarReminders: true,
    digestFrequency: 'daily',
    quietHoursStart: '21:00',
    quietHoursEnd: '08:00',
  },
  appearance: {
    theme: 'light',
    density: 'comfortable',
    reduceMotion: false,
  },
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asNullableNumber(value: unknown, fallback: number | null) {
  if (value === null || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function asString(value: unknown, fallback: string) {
  return typeof value === 'string' ? value : fallback
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

export function normalizeMyPlanPreferences(value: unknown): MyPlanPreferences {
  if (!isRecord(value)) return { ...defaultMyPlanPreferences }

  const notifications = isRecord(value.notifications) ? value.notifications : {}
  const appearance = isRecord(value.appearance) ? value.appearance : {}
  const homeGoal = ['researching', 'buying', 'selling', 'refinancing', 'investing'].includes(String(value.homeGoal))
    ? (value.homeGoal as HomeGoal)
    : defaultMyPlanPreferences.homeGoal
  const propertyType = ['any', 'single-family', 'condo-townhome', 'multi-unit'].includes(String(value.propertyType))
    ? (value.propertyType as PropertyType)
    : defaultMyPlanPreferences.propertyType
  const loanType = ['conventional', 'FHA', 'VA', 'jumbo', 'cash'].includes(String(value.loanType))
    ? (value.loanType as LoanType)
    : defaultMyPlanPreferences.loanType
  const loanTermYears = [15, 20, 30].includes(Number(value.loanTermYears))
    ? (Number(value.loanTermYears) as 15 | 20 | 30)
    : defaultMyPlanPreferences.loanTermYears
  const marketRange = ['1Y', '5Y', '10Y', '20Y'].includes(String(value.marketRange))
    ? (value.marketRange as MarketRange)
    : defaultMyPlanPreferences.marketRange
  const defaultView = ['overview', 'calendar', 'calculators', 'resources', 'market-scanner', 'cost-watch'].includes(String(value.defaultView))
    ? (value.defaultView as DefaultView)
    : defaultMyPlanPreferences.defaultView
  const digestFrequency = ['instant', 'daily', 'weekly'].includes(String(notifications.digestFrequency))
    ? (notifications.digestFrequency as DigestFrequency)
    : defaultMyPlanPreferences.notifications.digestFrequency

  return {
    ...defaultMyPlanPreferences,
    preferredName: asString(value.preferredName, defaultMyPlanPreferences.preferredName).slice(0, 80),
    homeGoal,
    timeline: asString(value.timeline, defaultMyPlanPreferences.timeline).slice(0, 80),
    propertyType,
    savedAreas: asStringArray(value.savedAreas).map((area) => area.trim()).filter(Boolean).slice(0, 20),
    bedrooms: asNullableNumber(value.bedrooms, null),
    bathrooms: asNullableNumber(value.bathrooms, null),
    comfortableMonthlyPayment: asNullableNumber(value.comfortableMonthlyPayment, null),
    grossAnnualIncome: asNullableNumber(value.grossAnnualIncome, null),
    monthlyDebt: asNullableNumber(value.monthlyDebt, null),
    currentHomeValue: asNullableNumber(value.currentHomeValue, null),
    currentMortgageBalance: asNullableNumber(value.currentMortgageBalance, null),
    targetSalePrice: asNullableNumber(value.targetSalePrice, null),
    sellingCostPercent: Math.min(20, Math.max(0, Number(value.sellingCostPercent) || defaultMyPlanPreferences.sellingCostPercent)),
    repairsBudget: asNullableNumber(value.repairsBudget, null),
    downPaymentAmount: asNullableNumber(value.downPaymentAmount, null),
    downPaymentPercent: Math.min(100, Math.max(0, Number(value.downPaymentPercent) || defaultMyPlanPreferences.downPaymentPercent)),
    loanType,
    loanTermYears,
    annualPropertyTaxRate: Math.max(0, Number(value.annualPropertyTaxRate) || defaultMyPlanPreferences.annualPropertyTaxRate),
    annualHomeInsurance: Math.max(0, Number(value.annualHomeInsurance) || defaultMyPlanPreferences.annualHomeInsurance),
    monthlyHoa: Math.max(0, Number(value.monthlyHoa) || 0),
    cashReserve: asNullableNumber(value.cashReserve, null),
    mustHaves: asString(value.mustHaves, '').slice(0, 1000),
    dealBreakers: asString(value.dealBreakers, '').slice(0, 1000),
    defaultView,
    marketRange,
    pinnedCalculatorIds: asStringArray(value.pinnedCalculatorIds).slice(0, 12),
    savedCostWatchIds: asStringArray(value.savedCostWatchIds).slice(0, 30),
    notifications: {
      advisorMessages: notifications.advisorMessages !== false,
      rateAlerts: notifications.rateAlerts !== false,
      marketAlerts: notifications.marketAlerts !== false,
      calendarReminders: notifications.calendarReminders !== false,
      digestFrequency,
      quietHoursStart: asString(notifications.quietHoursStart, defaultMyPlanPreferences.notifications.quietHoursStart),
      quietHoursEnd: asString(notifications.quietHoursEnd, defaultMyPlanPreferences.notifications.quietHoursEnd),
    },
    appearance: {
      theme: ['light', 'dark', 'system'].includes(String(appearance.theme))
        ? (appearance.theme as AppearancePreferences['theme'])
        : defaultMyPlanPreferences.appearance.theme,
      density: appearance.density === 'compact' ? 'compact' : 'comfortable',
      reduceMotion: appearance.reduceMotion === true,
    },
  }
}

export function mergeMyPlanPreferences(
  current: MyPlanPreferences,
  patch: Partial<MyPlanPreferences>,
): MyPlanPreferences {
  return normalizeMyPlanPreferences({
    ...current,
    ...patch,
    notifications: { ...current.notifications, ...patch.notifications },
    appearance: { ...current.appearance, ...patch.appearance },
  })
}
