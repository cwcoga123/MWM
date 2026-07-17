import type { ReactNode } from 'react'
import { ArrowRight, BellRing } from 'lucide-react'
import type { HubUser } from '../shell/AuthGate'
import { calculators } from '../../data/calculators'
import { quickActions } from '../../data/quickActions'
import fredSnapshot from '../../data/fredSnapshot.json'
import {
  defaultOverviewDemoAccount,
  findOverviewDemoAccount,
  overviewDemoAccounts,
  type OverviewClientProfile,
  type PillTone,
} from '../../data/overviewPersonalization'
import { calculateMortgagePayment, type MortgageInputs } from '../../lib/mortgage'
import {
  formatHomeCostDisplayValue,
  getChangeSummary,
  getDisplayLatestPoint,
  getDisplayPoints,
  getHomeCostRecord,
  getLatestPoint,
  getRangePoints,
  type HistoryPoint,
} from '../../lib/homeCostWatch'
import { useClientActivity } from '../shared/clientActivityContext'

interface OverviewTabProps {
  user: HubUser
  onOpenCalculator: (calculatorId: string) => void
  onOpenCalculators: () => void
  onOpenCostWatch: (indicatorId?: string) => void
  onOpenAdvisorCard: () => void
}

interface MarketSnapshot {
  rate: {
    value: number
    delta: number
    points: HistoryPoint[]
  }
  listing: {
    valueLabel: string
    changeLabel: string
    points: HistoryPoint[]
  }
  inventory: {
    changeLabel: string
    percent: number
    points: HistoryPoint[]
  }
  updatedLabel: string
}

const calculatorIds = new Set(calculators.map((calculator) => calculator.id))
const quickActionFallbackIds = quickActions.map((action) => action.calculatorId).slice(0, 2)

function firstName(name: string) {
  return name.trim().split(' ')[0] || name
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function daysUntil(value: string) {
  const today = startOfDay(new Date())
  const target = startOfDay(parseLocalDate(value))
  const dayInMs = 24 * 60 * 60 * 1000

  return Math.max(0, Math.round((target.getTime() - today.getTime()) / dayInMs))
}

function salutation(clientState: OverviewClientProfile['clientState']) {
  if (clientState === 'browsing') return 'Welcome back'

  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function briefingDateLabel() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function formatShortDate(value: string) {
  return parseLocalDate(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function formatEventTime(value: string) {
  const eventDate = new Date(value)
  const dateOnly = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(
    eventDate.getDate(),
  ).padStart(2, '0')}`
  const distance = daysUntil(dateOnly)
  const dayLabel =
    distance === 0
      ? 'today'
      : distance === 1
        ? 'tomorrow'
        : eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const timeLabel = eventDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

  return `${dayLabel}, ${timeLabel}`
}

function formatCompactMoney(value: number) {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000
    const maximumFractionDigits = value % 100_000 === 0 ? 1 : 2

    return `$${millions.toLocaleString('en-US', {
      maximumFractionDigits,
    })}M`
  }

  return `$${Math.round(value / 1000).toLocaleString('en-US')}k`
}

function formatMonthlyPayment(inputs: MortgageInputs) {
  const payment = calculateMortgagePayment(inputs)
  const rounded = Math.round(payment.total / 10) * 10

  return `$${rounded.toLocaleString('en-US')}/mo`
}

function formatSignedPercent(value: number, digits = 1) {
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''
  return `${sign}${Math.abs(value).toFixed(digits)}%`
}

function updatedLabel(value: string | null) {
  if (!value) return 'Refresh pending'

  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

function uniqueValidCalculatorIds(ids: string[]) {
  return Array.from(new Set(ids)).filter((id) => calculatorIds.has(id))
}

function readRecentCalculatorIds(profile: OverviewClientProfile) {
  const fallback = uniqueValidCalculatorIds(profile.recentCalculatorIds).length
    ? uniqueValidCalculatorIds(profile.recentCalculatorIds)
    : uniqueValidCalculatorIds(quickActionFallbackIds)

  return fallback.slice(0, 4)
}

function currentOverviewProfile(user: HubUser) {
  const demoProfile = user.isDemo
    ? findOverviewDemoAccount(user.overviewProfileId) ?? findOverviewDemoAccount(user.email)
    : null
  if (demoProfile) return demoProfile

  const stateTemplate =
    overviewDemoAccounts.find((account) => account.clientState === user.clientState) ??
    defaultOverviewDemoAccount
  const neighborhoods = user.neighborhoods.length
    ? user.neighborhoods
    : stateTemplate.preferences.neighborhoods
  const targetBudget =
    user.targetBudget ??
    stateTemplate.search?.targetBudget ??
    stateTemplate.escrow?.budget ??
    950_000
  const liveProfile: OverviewClientProfile = {
    ...stateTemplate,
    id: user.id,
    email: user.email,
    name: user.name,
    clientState: user.clientState,
    advisorNote: user.advisorNote,
    recentCalculatorIds: user.recentCalculatorIds,
    preferences: {
      ...stateTemplate.preferences,
      neighborhoods,
      budgetStyle: user.targetBudget ? 'Advisor-set target budget' : stateTemplate.preferences.budgetStyle,
      riskPosture: user.refiThreshold ? 'Rate watch configured' : stateTemplate.preferences.riskPosture,
    },
  }

  if (user.clientState === 'house-hunting') {
    liveProfile.search = {
      matchNeighborhood: neighborhoods[0] ?? 'your saved area',
      newMatches: 2,
      preApproved: Math.round(targetBudget * 1.18),
      targetBudget,
      targetPaymentInputs: {
        homePrice: targetBudget,
        downPayment: Math.round(targetBudget * 0.2),
        amortizationYears: 30,
        annualPropertyTax: Math.round(targetBudget * 0.0086),
        annualHomeInsurance: 1300,
        monthlyHoa: 0,
      },
      watchlist: neighborhoods.slice(0, 3).map((area, index) => ({
        name: area,
        medianPrice: Math.round(targetBudget * (1 + index * 0.06)),
        monthlyDelta: index === 0 ? 1.1 : 0.7,
      })),
      openHousesSaved: 3,
      openHouseWindow: 'This weekend',
    }
  }

  if (user.clientState === 'in-escrow') {
    const closingDate = user.closingDate ?? stateTemplate.escrow?.closingDate ?? '2026-08-21'
    const lockedRate = user.lockedRate ?? stateTemplate.escrow?.lockedRate ?? 6.25

    liveProfile.escrow = {
      address: neighborhoods[0] ?? stateTemplate.escrow?.address ?? 'Target property',
      lockedRate,
      lockExpiresOn: closingDate,
      closingDate,
      appraisalAt: `${closingDate}T09:00:00`,
      budget: targetBudget,
      paymentInputs: {
        homePrice: targetBudget,
        downPayment: Math.round(targetBudget * 0.2),
        annualInterestRate: lockedRate,
        amortizationYears: 30,
        annualPropertyTax: Math.round(targetBudget * 0.0086),
        annualHomeInsurance: 1300,
        monthlyHoa: 0,
      },
    }
  }

  if (user.clientState === 'homeowner') {
    const estimatedValue = Math.round(targetBudget * 1.1)

    liveProfile.homeowner = {
      address: neighborhoods[0] ?? stateTemplate.homeowner?.address ?? 'Saved property',
      estimatedValue,
      valueGrowthPercent: stateTemplate.homeowner?.valueGrowthPercent ?? 3.2,
      refiAlertRate: user.refiThreshold ?? stateTemplate.homeowner?.refiAlertRate ?? 6,
      remainingBalance: Math.round(estimatedValue * 0.68),
      equityGainThisYear: Math.round(estimatedValue * 0.04),
    }
  }

  return liveProfile
}

function buildSparklinePath(points: HistoryPoint[], width: number, height: number) {
  const values = points.map((point) => point.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min
  const coordinates = points.map((point, index) => {
    const x = points.length === 1 ? width / 2 : 2 + (index / (points.length - 1)) * (width - 4)
    const y = range === 0 ? height / 2 : height - 3 - ((point.value - min) / range) * (height - 6)

    return { x, y }
  })

  return {
    path: coordinates.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' '),
    latest: coordinates[coordinates.length - 1],
  }
}

function MiniSparkline({ points }: { points: HistoryPoint[] }) {
  const displayPoints = points.slice(-9)
  if (displayPoints.length < 2) return <span className="briefing-sparkline briefing-sparkline--empty" aria-hidden="true" />

  const width = 72
  const height = 26
  const { path, latest } = buildSparklinePath(displayPoints, width, height)

  return (
    <svg className="briefing-sparkline" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path d={path} />
      <circle cx={latest.x} cy={latest.y} r="2.6" />
    </svg>
  )
}

function buildMarketSnapshot(): MarketSnapshot {
  const rateData = fredSnapshot.values['mortgage-30']
  const ratePoints = rateData.recentTrend.map((point) => ({
    date: point.date,
    value: point.value,
  }))
  const listingRecord = getHomeCostRecord('sf-median-listing-price')
  const inventoryRecord = getHomeCostRecord('sf-listings')
  const listingPoints = listingRecord ? getRangePoints(getDisplayPoints(listingRecord), '1Y') : []
  const listingLatest = listingRecord ? getDisplayLatestPoint(listingRecord) : undefined
  const listingChange = getChangeSummary(listingPoints, '1Y')
  const inventoryPoints = inventoryRecord ? getDisplayPoints(inventoryRecord).slice(-6) : []
  const inventoryLatest = inventoryRecord ? getLatestPoint(inventoryRecord) : undefined
  const inventoryPrevious = inventoryPoints.at(-2)
  const inventoryPercent =
    inventoryLatest && inventoryPrevious && inventoryPrevious.value !== 0
      ? ((inventoryLatest.value - inventoryPrevious.value) / Math.abs(inventoryPrevious.value)) * 100
      : 0

  return {
    rate: {
      value: rateData.value,
      delta: rateData.value - rateData.previousValue,
      points: ratePoints,
    },
    listing: {
      valueLabel: listingRecord && listingLatest ? formatHomeCostDisplayValue(listingRecord, listingLatest.value) : '--',
      changeLabel: listingChange.label,
      points: listingPoints,
    },
    inventory: {
      changeLabel: formatSignedPercent(inventoryPercent),
      percent: inventoryPercent,
      points: inventoryPoints,
    },
    updatedLabel: updatedLabel(fredSnapshot.generatedAt),
  }
}

function heroCopy(profile: OverviewClientProfile, market: MarketSnapshot) {
  const name = firstName(profile.name)
  const greeting = salutation(profile.clientState)

  if (profile.clientState === 'in-escrow' && profile.escrow) {
    return {
      title: `${greeting}, ${name} - ${daysUntil(profile.escrow.closingDate)} days to closing.`,
      subline: 'The 60-second version of what matters today: everything is on track, and one date is coming up fast.',
    }
  }

  if (profile.clientState === 'house-hunting' && profile.search) {
    return {
      title: `${greeting}, ${name} - ${profile.search.newMatches} new matches in ${profile.search.matchNeighborhood}.`,
      subline: 'Your Saturday shortlist is shaping up - two open houses this weekend look worth your time.',
    }
  }

  if (profile.clientState === 'homeowner' && profile.homeowner) {
    return {
      title: `${greeting}, ${name} - your home is up about ${Math.round(profile.homeowner.valueGrowthPercent)}% this year.`,
      subline: 'All quiet. This is your yearly check-in - nothing needs doing.',
    }
  }

  return {
    title: `${greeting}, ${name} - rates dipped while you were away.`,
    subline: `No hurry on anything. Today's 30-year rate is ${market.rate.value.toFixed(2)}%, and this is the lay of the land.`,
  }
}

interface ClientAlert {
  id: string
  title: string
  detail: string
}

function buildClientAlerts(
  user: HubUser,
  profile: OverviewClientProfile,
  market: MarketSnapshot,
): ClientAlert[] {
  const alerts: ClientAlert[] = []
  const refiThreshold = user.refiThreshold ?? profile.homeowner?.refiAlertRate
  const lockDate = profile.escrow?.lockExpiresOn ?? user.closingDate
  const targetArea = profile.preferences.neighborhoods[0]

  if (refiThreshold !== null && refiThreshold !== undefined && market.rate.value <= refiThreshold) {
    alerts.push({
      id: 'rate-threshold',
      title: 'Rate dropped below your watch threshold',
      detail: `30-year rate is ${market.rate.value.toFixed(2)}%; your watch threshold is ${refiThreshold.toFixed(2)}%.`,
    })
  }

  if (profile.clientState === 'in-escrow' && lockDate) {
    const days = daysUntil(lockDate)

    if (days <= 10) {
      alerts.push({
        id: 'lock-expiry',
        title: days === 10 ? 'Lock expires in 10 days' : `Lock expires in ${days} days`,
        detail: `Locked at ${(user.lockedRate ?? profile.escrow?.lockedRate ?? 0).toFixed(2)}% through ${formatShortDate(lockDate)}.`,
      })
    }
  }

  if (targetArea && market.inventory.percent > 0) {
    alerts.push({
      id: 'inventory-up',
      title: 'Inventory is up in your target area',
      detail: `${targetArea} watch: SF metro active listings are ${formatSignedPercent(market.inventory.percent)} month over month.`,
    })
  }

  return alerts
}

function ClientAlerts({ alerts }: { alerts: ClientAlert[] }) {
  if (!alerts.length) return null

  return (
    <section className="client-alerts" aria-label="Personalized alerts">
      {alerts.map((alert) => (
        <article className="client-alert" key={alert.id}>
          <BellRing size={16} />
          <span>
            <strong>{alert.title}</strong>
            <small>{alert.detail}</small>
          </span>
        </article>
      ))}
    </section>
  )
}

function StatCard({
  label,
  value,
  pill,
  tone,
  children,
}: {
  label: string
  value: string
  pill: string
  tone: PillTone
  children: ReactNode
}) {
  return (
    <article className="personal-stat-card">
      <span className="personal-stat-card__label">{label}</span>
      <div className="personal-stat-card__value-row">
        <strong>{value}</strong>
        <span className={`personal-stat-card__pill personal-stat-card__pill--${tone}`}>{pill}</span>
      </div>
      <div className="personal-stat-card__caption">{children}</div>
    </article>
  )
}

function InlineCalculatorLink({
  calculatorId,
  children,
  onOpen,
}: {
  calculatorId: string
  children: ReactNode
  onOpen: (calculatorId: string) => void
}) {
  return (
    <button type="button" className="overview-briefing-link" onClick={() => onOpen(calculatorId)}>
      {children}
    </button>
  )
}

function PersonalStatCards({
  profile,
  market,
  onOpenCalculator,
}: {
  profile: OverviewClientProfile
  market: MarketSnapshot
  onOpenCalculator: (calculatorId: string) => void
}) {
  if (profile.clientState === 'in-escrow' && profile.escrow) {
    const escrow = profile.escrow
    const rateAdvantage = Math.max(0, market.rate.value - escrow.lockedRate)

    return (
      <section className="personal-stat-grid" aria-label="Your numbers">
        <StatCard
          label="Your locked rate"
          value={`${escrow.lockedRate.toFixed(2)}%`}
          pill={`${rateAdvantage.toFixed(2)} ahead of market`}
          tone="positive"
        >
          Market is at <strong>{market.rate.value.toFixed(2)}%</strong> today. Your lock holds through{' '}
          <strong>{formatShortDate(escrow.lockExpiresOn)}</strong> - {daysUntil(escrow.lockExpiresOn)} days of cushion.
        </StatCard>
        <StatCard
          label="Closing"
          value={formatShortDate(escrow.closingDate)}
          pill={`${daysUntil(escrow.closingDate)} days out`}
          tone="time"
        >
          Next up: appraisal <strong>{formatEventTime(escrow.appraisalAt)}</strong> at {escrow.address}. Nothing for you
          to prepare.
        </StatCard>
        <StatCard
          label="Your budget"
          value={formatCompactMoney(escrow.budget)}
          pill={`~ ${formatMonthlyPayment(escrow.paymentInputs)}`}
          tone="neutral"
        >
          At your locked rate, taxes and insurance included.{' '}
          <InlineCalculatorLink calculatorId="mortgage-calculator" onOpen={onOpenCalculator}>
            Re-run the numbers
          </InlineCalculatorLink>
        </StatCard>
      </section>
    )
  }

  if (profile.clientState === 'house-hunting' && profile.search) {
    const search = profile.search
    const paymentInputs = {
      ...search.targetPaymentInputs,
      annualInterestRate: market.rate.value,
    }

    return (
      <section className="personal-stat-grid" aria-label="Your numbers">
        <StatCard
          label="Pre-approved"
          value={formatCompactMoney(search.preApproved)}
          pill={`target ${formatCompactMoney(search.targetBudget)}`}
          tone="neutral"
        >
          Staying near your target keeps payments around <strong>{formatMonthlyPayment(paymentInputs)}</strong> at
          today's {market.rate.value.toFixed(2)}%.
        </StatCard>
        <article className="personal-stat-card">
          <span className="personal-stat-card__label">Your watchlist</span>
          <div className="personal-watchlist">
            {search.watchlist.map((area) => (
              <div className="personal-watchlist__row" key={area.name}>
                <span>{area.name}</span>
                <strong>{formatCompactMoney(area.medianPrice)}</strong>
                <em>{formatSignedPercent(area.monthlyDelta)}</em>
              </div>
            ))}
          </div>
          <p className="personal-stat-card__caption">
            Median listing, past month. <a href="#market-scanner">Edit your list</a>
          </p>
        </article>
        <StatCard
          label="Open houses"
          value={`${search.openHousesSaved} saved`}
          pill={search.openHouseWindow}
          tone="time"
        >
          Two overlap on Saturday afternoon. <a href="#calendar">Plan the route</a>
        </StatCard>
      </section>
    )
  }

  if (profile.clientState === 'homeowner' && profile.homeowner) {
    const homeowner = profile.homeowner
    const equity = Math.max(0, homeowner.estimatedValue - homeowner.remainingBalance)

    return (
      <section className="personal-stat-grid" aria-label="Your numbers">
        <StatCard
          label="Est. home value"
          value={formatCompactMoney(homeowner.estimatedValue)}
          pill={`${formatSignedPercent(homeowner.valueGrowthPercent)} since you bought`}
          tone="positive"
        >
          Based on SF metro movement for homes like {homeowner.address} - a compass, not an appraisal.
        </StatCard>
        <StatCard
          label="Refi watch"
          value={`${market.rate.value.toFixed(2)}%`}
          pill={`alert set at ${homeowner.refiAlertRate.toFixed(2)}%`}
          tone="time"
        >
          When rates cross your threshold, your advisor flags it - you don't need to watch this page.
        </StatCard>
        <StatCard
          label="Your equity"
          value={`~ ${formatCompactMoney(equity)}`}
          pill={`up ${formatCompactMoney(homeowner.equityGainThisYear)} this year`}
          tone="neutral"
        >
          Value minus your remaining balance.{' '}
          <InlineCalculatorLink calculatorId="seller-net-proceeds" onOpen={onOpenCalculator}>
            See net proceeds if you sold
          </InlineCalculatorLink>
        </StatCard>
      </section>
    )
  }

  return (
    <section className="personal-stat-grid" aria-label="Your numbers">
      <StatCard
        label="Today's 30-yr rate"
        value={`${market.rate.value.toFixed(2)}%`}
        pill={`${market.rate.delta < 0 ? 'down' : 'up'} ${Math.abs(market.rate.delta).toFixed(2)} this week`}
        tone="positive"
      >
        Drifting down for three weeks now - worth knowing, not worth rushing for.
      </StatCard>
      <StatCard label="A comfortable payment" value="?" pill="5 minutes to find out" tone="neutral">
        Pre-approval letters say what a bank will lend - not what feels good.{' '}
        <InlineCalculatorLink calculatorId="affordability" onOpen={onOpenCalculator}>
          Find your real number
        </InlineCalculatorLink>
      </StatCard>
      <StatCard label="Worth knowing" value={market.inventory.changeLabel} pill="SF inventory, m/m" tone="neutral">
        More homes on the market means a little more room to negotiate when you're ready.
      </StatCard>
    </section>
  )
}

function MarketDigest({
  market,
  onOpenCostWatch,
}: {
  market: MarketSnapshot
  onOpenCostWatch: (indicatorId?: string) => void
}) {
  const rateMove = market.rate.delta < 0 ? 'down' : market.rate.delta > 0 ? 'up' : 'flat'

  return (
    <section className="market-digest-card" aria-label="Market digest">
      <div className="market-digest-card__header">
        <span>The market, one line each</span>
        <small>Updated {market.updatedLabel}</small>
      </div>

      <a className="market-digest-row" href="#market-scanner">
        <MiniSparkline points={market.rate.points} />
        <span>
          Mortgage rates <strong>{market.rate.value.toFixed(2)}%</strong> - {rateMove}{' '}
          {Math.abs(market.rate.delta).toFixed(2)} this week.
        </span>
        <em>
          Rate Watch <ArrowRight size={14} />
        </em>
      </a>

      <a
        className="market-digest-row"
        href="#cost-watch/sf-median-listing-price"
        onClick={(event) => {
          event.preventDefault()
          onOpenCostWatch('sf-median-listing-price')
        }}
      >
        <MiniSparkline points={market.listing.points} />
        <span>
          SF listing prices <strong>{market.listing.changeLabel} YoY</strong> - latest median{' '}
          {market.listing.valueLabel}.
        </span>
        <em>
          Cost Watch <ArrowRight size={14} />
        </em>
      </a>

      <a className="market-digest-row" href="#market-scanner">
        <MiniSparkline points={market.inventory.points} />
        <span>
          Inventory <strong>{market.inventory.changeLabel}</strong> month over month - a bit more room to negotiate.
        </span>
        <em>
          Trends <ArrowRight size={14} />
        </em>
      </a>
    </section>
  )
}

function RecentCalculatorPills({
  calculatorIds: recentCalculatorIds,
  onOpenCalculator,
  onOpenCalculators,
}: {
  calculatorIds: string[]
  onOpenCalculator: (calculatorId: string) => void
  onOpenCalculators: () => void
}) {
  const recentCalculators = recentCalculatorIds
    .map((id) => calculators.find((calculator) => calculator.id === id))
    .filter((calculator): calculator is (typeof calculators)[number] => Boolean(calculator))

  return (
    <section className="overview-tools" aria-label="Your tools">
      <span>Pick up where you left off</span>
      {recentCalculators.map((calculator) => {
        const Icon = calculator.icon

        return (
          <button
            className="overview-tool-pill"
            type="button"
            key={calculator.id}
            onClick={() => onOpenCalculator(calculator.id)}
          >
            <Icon size={15} strokeWidth={1.9} />
            {calculator.title}
          </button>
        )
      })}
      <button type="button" className="overview-tools__all" onClick={onOpenCalculators}>
        All calculators <ArrowRight size={14} />
      </button>
    </section>
  )
}

export function OverviewTab({
  user,
  onOpenCalculator,
  onOpenCalculators,
  onOpenCostWatch,
}: OverviewTabProps) {
  const clientActivity = useClientActivity()
  const market = buildMarketSnapshot()
  const profile = currentOverviewProfile(user)
  const recents = readRecentCalculatorIds(profile)
  const hero = heroCopy(profile, market)
  const alerts = buildClientAlerts(user, profile, market)

  function openCalculator(calculatorId: string) {
    void clientActivity?.rememberCalculator(calculatorId)
    onOpenCalculator(calculatorId)
  }

  return (
    <main className="mortgage-page overview-page" id="overview">
      <section className="briefing-hero" aria-label="Your briefing">
        <span className="briefing-hero__ring" aria-hidden="true" />
        <div className="briefing-hero__content">
          <div className="briefing-hero__copy">
            <p>{briefingDateLabel()} - Your briefing</p>
            <h1>{hero.title}</h1>
            <span>{hero.subline}</span>
          </div>

          {profile.advisorNote && (
            <aside className="advisor-note" aria-label="Note from your advisor">
              <span className="advisor-note__avatar">M</span>
              <div>
                <span>From your advisor - this morning</span>
                <p>"{profile.advisorNote}"</p>
              </div>
            </aside>
          )}
        </div>
      </section>

      <ClientAlerts alerts={alerts} />
      <PersonalStatCards profile={profile} market={market} onOpenCalculator={openCalculator} />
      <MarketDigest market={market} onOpenCostWatch={onOpenCostWatch} />
      <RecentCalculatorPills
        calculatorIds={recents}
        onOpenCalculator={openCalculator}
        onOpenCalculators={onOpenCalculators}
      />
      <p className="overview-briefing-footnote">
        Deep dives live in Trends and Cost Watch - your Overview stays this short on purpose.
      </p>
    </main>
  )
}
