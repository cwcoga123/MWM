import { ArrowRight, Home, Sparkles } from 'lucide-react'
import type { HubUser } from '../shell/AuthGate'
import { calculators } from '../../data/calculators'
import { FredIndicatorsSection } from '../shared/FredIndicatorsSection'
import { marketPulseInsights, type MarketPulseInsight } from '../../data/marketPulse'
import { quickActions } from '../../data/quickActions'

interface OverviewTabProps {
  user: HubUser
  onOpenCalculator: (calculatorId: string) => void
  onOpenAdvisorCard: () => void
}

function firstName(name: string) {
  return name.trim().split(' ')[0] || name
}

function MarketPulseCard({
  insight,
  onOpenCalculator,
  onOpenAdvisorCard,
}: {
  insight: MarketPulseInsight
  onOpenCalculator: (calculatorId: string) => void
  onOpenAdvisorCard: () => void
}) {
  const { cta } = insight

  return (
    <article className="market-pulse-card">
      <span className="market-pulse-card__tag">{insight.tag}</span>
      <h3>{insight.hook}</h3>
      <p>{insight.body}</p>
      {cta.type === 'calculator' && cta.calculatorId && (
        <button type="button" className="market-pulse-card__cta" onClick={() => onOpenCalculator(cta.calculatorId!)}>
          {cta.label} <ArrowRight size={15} />
        </button>
      )}
      {cta.type === 'advisor' && (
        <button type="button" className="market-pulse-card__cta" onClick={onOpenAdvisorCard}>
          {cta.label} <ArrowRight size={15} />
        </button>
      )}
      {cta.type === 'soon' && <span className="market-pulse-card__badge">{cta.label}</span>}
    </article>
  )
}

export function OverviewTab({ user, onOpenCalculator, onOpenAdvisorCard }: OverviewTabProps) {
  return (
    <main className="mortgage-page overview-page" id="overview">
      <header className="mortgage-heading">
        <div className="mortgage-heading__icon"><Home size={24} /></div>
        <div>
          <p className="eyebrow">BAY AREA · OVERVIEW</p>
          <h1>Welcome back, {firstName(user.name)}</h1>
          <p>A quick pulse on the market and the numbers worth running this week.</p>
        </div>
      </header>

      <FredIndicatorsSection />

      <section className="overview-section">
        <div className="overview-section__heading">
          <span className="eyebrow">MARKET PULSE</span>
          <h2>What's actually moving in the Bay Area</h2>
        </div>
        <div className="market-pulse-grid">
          {marketPulseInsights.map((insight) => (
            <MarketPulseCard
              key={insight.id}
              insight={insight}
              onOpenCalculator={onOpenCalculator}
              onOpenAdvisorCard={onOpenAdvisorCard}
            />
          ))}
        </div>
      </section>

      <section className="overview-section">
        <div className="overview-section__heading">
          <span className="eyebrow">RUN THE NUMBERS</span>
          <h2>Don't take our word for it — calculate it</h2>
        </div>
        <div className="quick-actions-grid">
          {quickActions.map((action) => {
            const calculator = calculators.find((item) => item.id === action.calculatorId)
            if (!calculator) return null
            const Icon = calculator.icon

            return (
              <button
                type="button"
                className="quick-action-card"
                key={action.calculatorId}
                onClick={() => onOpenCalculator(action.calculatorId)}
              >
                <span className="quick-action-card__icon"><Icon size={20} strokeWidth={1.8} /></span>
                <strong>{action.hook}</strong>
                <span className="quick-action-card__link">
                  Open {calculator.title} <ArrowRight size={15} />
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <div className="mortgage-insight overview-note">
        <Sparkles size={17} aria-hidden="true" />
        <p>
          The indicators above now reflect real FRED data as of the last refresh. Neighborhood-level home price
          data (below the metro level) is still on the way.
        </p>
      </div>
    </main>
  )
}
