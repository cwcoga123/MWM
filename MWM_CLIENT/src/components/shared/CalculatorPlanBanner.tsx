import { ArrowRight, SlidersHorizontal } from 'lucide-react'
import type { HubUser } from '../shell/AuthGate'

interface CalculatorPlanBannerProps {
  user: HubUser
  calculatorTitle: string
}

const nextSteps: Record<string, Array<{ id: string; label: string }>> = {
  'mortgage-calculator': [{ id: 'affordability', label: 'Check your comfortable range' }, { id: 'loan-comparison', label: 'Compare loan options' }],
  affordability: [{ id: 'mortgage-calculator', label: 'Build the full payment' }, { id: 'down-payment', label: 'Test down-payment options' }],
  'down-payment': [{ id: 'buyer-closing-costs', label: 'Plan cash to close' }, { id: 'mortgage-calculator', label: 'See the monthly payment' }],
  'buyer-closing-costs': [{ id: 'preapproval', label: 'Review readiness' }, { id: 'mortgage-calculator', label: 'See the monthly payment' }],
  'refinance-break-even': [{ id: 'refi-watch', label: 'Set up Refi Watch' }, { id: 'loan-comparison', label: 'Compare loan structures' }],
  'refi-watch': [{ id: 'refinance-break-even', label: 'Calculate break-even' }],
  'home-equity': [{ id: 'seller-net-proceeds', label: 'Estimate sale proceeds' }, { id: 'cash-out-refinance', label: 'Explore cash-out' }],
  'rent-vs-buy': [{ id: 'affordability', label: 'Find your comfortable payment' }],
}

export function CalculatorPlanBanner({ user, calculatorTitle }: CalculatorPlanBannerProps) {
  const plan = user.preferences
  const areas = Array.from(new Set([...user.neighborhoods, ...plan.savedAreas]))
  const targetLabel = user.targetBudget === null ? 'No target budget yet' : `$${Math.round(user.targetBudget).toLocaleString()} target`
  const downPaymentLabel = plan.downPaymentAmount !== null
    ? `$${Math.round(plan.downPaymentAmount).toLocaleString()} down`
    : `${plan.downPaymentPercent}% down`
  const planSummary = plan.homeGoal === 'selling'
    ? `${plan.targetSalePrice === null ? 'Sale price not set' : `$${Math.round(plan.targetSalePrice).toLocaleString()} sale target`} · ${plan.currentMortgageBalance === null ? 'Mortgage balance not set' : `$${Math.round(plan.currentMortgageBalance).toLocaleString()} mortgage`} · ${plan.sellingCostPercent}% selling costs`
    : `${targetLabel} · ${downPaymentLabel} · ${plan.loanTermYears}-year ${plan.loanType} loan`

  return (
    <section className="calculator-plan-banner" aria-label="Your planning context">
      <div className="calculator-plan-banner__copy">
        <span className="calculator-plan-banner__icon"><SlidersHorizontal size={15} /></span>
        <div><span className="eyebrow">MY PLAN · {calculatorTitle.toUpperCase()}</span><strong>{planSummary}</strong></div>
      </div>
      <div className="calculator-plan-banner__meta">
        <span>{areas.slice(0, 2).join(' · ') || 'Add saved areas in Settings'}</span>
        <a href="#settings">Edit assumptions <ArrowRight size={13} /></a>
      </div>
    </section>
  )
}

export function CalculatorFollowUp({ calculatorId }: { calculatorId: string }) {
  const steps = nextSteps[calculatorId]
  if (!steps?.length) return null

  return (
    <section className="calculator-follow-up" aria-label="Next steps">
      <div><span className="eyebrow">KEEP GOING</span><strong>Turn this result into a decision</strong><small>Carry the conversation into the next useful tool.</small></div>
      <div className="calculator-follow-up__links">
        {steps.map((step) => <a href={`#${step.id}`} key={step.id}>{step.label}<ArrowRight size={13} /></a>)}
      </div>
    </section>
  )
}
