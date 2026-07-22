import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  ArrowRight,
  BellRing,
  Bookmark,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { calculators, categories, type CalculatorItem } from '../../data/calculators'
import { AffordabilityCalculator } from '../calculators/AffordabilityCalculator'
import { AmortizationCalculator } from '../calculators/AmortizationCalculator'
import { CashOutRefinanceCalculator } from '../calculators/CashOutRefinanceCalculator'
import { LoanComparisonCalculator } from '../calculators/LoanComparisonCalculator'
import { MortgageCalculator } from '../calculators/MortgageCalculator'
import { MortgageRatesCalculator } from '../calculators/MortgageRatesCalculator'
import { RentVsBuyCalculator } from '../calculators/RentVsBuyCalculator'
import { BuyerClosingCostsCalculator } from '../calculators/BuyerClosingCostsCalculator'
import { SellerProceedsCalculator } from '../calculators/SellerProceedsCalculator'
import { DownPaymentPlannerCalculator } from '../calculators/DownPaymentPlannerCalculator'
import { HomeEquityCalculator } from '../calculators/HomeEquityCalculator'
import { InvestmentPropertyCalculator } from '../calculators/InvestmentPropertyCalculator'
import { RefinanceBreakEvenCalculator } from '../calculators/RefinanceBreakEvenCalculator'
import { PreapprovalChecklistTool } from '../calculators/PreapprovalChecklistTool'
import { RefiWatchTool } from '../calculators/RefiWatchTool'
import type { HubUser } from '../shell/AuthGate'
import { useClientActivity } from '../shared/clientActivityContext'
import { CalculatorFollowUp, CalculatorPlanBanner } from '../shared/CalculatorPlanBanner'
import { CalculatorDraftBoundary } from '../shared/CalculatorDraftBoundary'
import { writeCalculatorDraft } from '../../lib/calculatorDrafts'

interface CalculatorIndexProps {
  user: HubUser
}

type ActiveCalculator =
  | 'mortgage-calculator'
  | 'cash-out-refinance'
  | 'amortization-schedule'
  | 'affordability'
  | 'loan-comparison'
  | 'mortgage-rates'
  | 'rent-vs-buy'
  | 'seller-net-proceeds'
  | 'buyer-closing-costs'
  | 'down-payment'
  | 'home-equity'
  | 'investment-property'
  | 'refinance-break-even'
  | 'preapproval'
  | 'refi-watch'
  | null

const OPENABLE_CALCULATORS: Exclude<ActiveCalculator, null>[] = [
  'mortgage-calculator',
  'cash-out-refinance',
  'amortization-schedule',
  'affordability',
  'loan-comparison',
  'mortgage-rates',
  'rent-vs-buy',
  'seller-net-proceeds',
  'buyer-closing-costs',
  'down-payment',
  'home-equity',
  'investment-property',
  'refinance-break-even',
  'preapproval',
  'refi-watch',
]

function calculatorFromHash(): ActiveCalculator {
  const calculatorId = window.location.hash.slice(1)
  return (OPENABLE_CALCULATORS as string[]).includes(calculatorId)
    ? (calculatorId as ActiveCalculator)
    : null
}

function CalculatorRow({
  calculator,
  onOpen,
}: {
  calculator: CalculatorItem
  onOpen: (calculatorId: string) => void
}) {
  const Icon = calculator.icon

  return (
    <a
      className="calculator-row"
      href={`#${calculator.id}`}
      onClick={() => onOpen(calculator.id)}
    >
      <span className="calculator-row__icon"><Icon size={20} strokeWidth={1.8} /></span>
      <span className="calculator-row__copy">
        <strong>{calculator.title}</strong>
        <small>{calculator.description}</small>
      </span>
      <span className="calculator-row__arrow"><ArrowRight size={18} /></span>
     
    </a>
  )
}

export function CalculatorIndex({ user }: CalculatorIndexProps) {
  const FeaturedIcon = calculators[0].icon
  const clientActivity = useClientActivity()
  const lastRememberedCalculatorRef = useRef<ActiveCalculator>(null)
  const [query, setQuery] = useState('')
  const [activeCalculator, setActiveCalculator] =
    useState<ActiveCalculator>(calculatorFromHash)
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    'Mortgage & financing': true,
    'Buying & selling': true,
    'Property insights': false,
  })

  const normalizedQuery = query.trim().toLowerCase()
  const filteredCalculators = useMemo(
    () =>
      calculators.filter((calculator) =>
        `${calculator.title} ${calculator.description} ${calculator.category}`
          .toLowerCase()
          .includes(normalizedQuery),
      ),
    [normalizedQuery],
  )

  useEffect(() => {
    function syncCalculatorFromHash() {
      setActiveCalculator(calculatorFromHash())
    }

    window.addEventListener('hashchange', syncCalculatorFromHash)
    return () => window.removeEventListener('hashchange', syncCalculatorFromHash)
  }, [])

  useEffect(() => {
    if (activeCalculator && activeCalculator !== lastRememberedCalculatorRef.current) {
      lastRememberedCalculatorRef.current = activeCalculator
      void clientActivity?.rememberCalculator(activeCalculator)
    }
  }, [activeCalculator, clientActivity])

  function openCalculator(calculatorId: string, inputDraft?: Record<string, string>) {
    if ((OPENABLE_CALCULATORS as string[]).includes(calculatorId)) {
      if (inputDraft) writeCalculatorDraft(user.id, calculatorId, inputDraft)
      setActiveCalculator(calculatorId as ActiveCalculator)
    }
  }

  function closeCalculator() {
    setActiveCalculator(null)
    window.location.hash = 'calculators'
  }

  function toggleCategory(category: string) {
    setOpenCategories((current) => ({
      ...current,
      [category]: !current[category],
    }))
  }

  if (activeCalculator) {
    let calculatorContent: ReactNode = null
    if (activeCalculator === 'mortgage-calculator') calculatorContent = <MortgageCalculator onBack={closeCalculator} />
    if (activeCalculator === 'cash-out-refinance') calculatorContent = <CashOutRefinanceCalculator onBack={closeCalculator} />
    if (activeCalculator === 'amortization-schedule') calculatorContent = <AmortizationCalculator onBack={closeCalculator} />
    if (activeCalculator === 'loan-comparison') calculatorContent = <LoanComparisonCalculator onBack={closeCalculator} />
    if (activeCalculator === 'affordability') calculatorContent = <AffordabilityCalculator onBack={closeCalculator} />
    if (activeCalculator === 'mortgage-rates') calculatorContent = <MortgageRatesCalculator onBack={closeCalculator} />
    if (activeCalculator === 'rent-vs-buy') calculatorContent = <RentVsBuyCalculator onBack={closeCalculator} />
    if (activeCalculator === 'seller-net-proceeds') calculatorContent = <SellerProceedsCalculator onBack={closeCalculator} />
    if (activeCalculator === 'buyer-closing-costs') calculatorContent = <BuyerClosingCostsCalculator onBack={closeCalculator} />
    if (activeCalculator === 'down-payment') calculatorContent = <DownPaymentPlannerCalculator onBack={closeCalculator} />
    if (activeCalculator === 'home-equity') calculatorContent = <HomeEquityCalculator onBack={closeCalculator} />
    if (activeCalculator === 'investment-property') calculatorContent = <InvestmentPropertyCalculator onBack={closeCalculator} />
    if (activeCalculator === 'refinance-break-even') calculatorContent = <RefinanceBreakEvenCalculator onBack={closeCalculator} />
    if (activeCalculator === 'preapproval') calculatorContent = <PreapprovalChecklistTool user={user} onBack={closeCalculator} />
    if (activeCalculator === 'refi-watch') calculatorContent = <RefiWatchTool onBack={closeCalculator} />

    const calculatorTitle = activeCalculator === 'preapproval'
      ? 'Pre-approval readiness'
      : activeCalculator === 'refi-watch'
        ? 'Refi Watch'
        : calculators.find((calculator) => calculator.id === activeCalculator)?.title ?? 'Calculator'

    return (
      <div className="calculator-workspace-shell">
        <CalculatorPlanBanner user={user} calculatorTitle={calculatorTitle} />
        <CalculatorDraftBoundary user={user} calculatorId={activeCalculator}>
          {calculatorContent}
        </CalculatorDraftBoundary>
        <CalculatorFollowUp calculatorId={activeCalculator} />
      </div>
    )
  }

  const recentCalculators = user.recentCalculatorIds
    .map((id) => calculators.find((calculator) => calculator.id === id))
    .filter((calculator): calculator is CalculatorItem => Boolean(calculator))
  const savedScenarios = user.savedScenarios.slice(0, 5)

  return (
    <main className="calculator-page" id="calculators">
      <section className="page-heading">
        <div>
          <p className="eyebrow">PLAN WITH CLARITY</p>
          <h1>Financial calculators</h1>
          <p>
            Explore the numbers behind your next move. These estimates are a starting
            point for a more informed conversation.
          </p>
        </div>
        <div className="heading-note"><Sparkles size={17} /> New tools are added regularly</div>
      </section>

      <section className="calculator-special-section" aria-label="Readiness and rate tools">
        <div className="calculator-special-section__heading">
          <span className="group-kicker">READINESS &amp; RATE TOOLS</span>
          <h2>Beyond the numbers</h2>
        </div>
        <div className="calculator-special-list">
          <button type="button" className="calculator-special-card" onClick={() => openCalculator('preapproval')}>
            <span className="calculator-special-card__icon"><ClipboardCheck size={22} /></span>
            <span className="calculator-special-card__copy">
              <strong>Pre-approval readiness checklist</strong>
              <small>Document checklist with upload status, file viewing, and advisor review request.</small>
            </span>
            <span className="calculator-special-card__arrow"><ArrowRight size={18} /></span>
          </button>
          <button type="button" className="calculator-special-card" onClick={() => openCalculator('refi-watch')}>
            <span className="calculator-special-card__icon calculator-special-card__icon--blue"><BellRing size={22} /></span>
            <span className="calculator-special-card__copy">
              <strong>Refi Watch</strong>
              <small>Enter your current loan once; the hub flags when posted rates make a refinance break even.</small>
            </span>
            <span className="calculator-special-card__arrow"><ArrowRight size={18} /></span>
          </button>
        </div>
      </section>

      <section className="calculator-layout">
        <div className="calculator-content">
          <label className="search-box" htmlFor="calculator-search">
            <Search size={20} />
            <input
              id="calculator-search"
              type="search"
              placeholder="Search calculators"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <span>{filteredCalculators.length} tools</span>
          </label>

          {normalizedQuery ? (
            <section className="calculator-group search-results">
              <div className="group-heading">
                <div>
                  <span className="group-kicker">SEARCH RESULTS</span>
                  <h2>Matching tools</h2>
                </div>
                <span>{filteredCalculators.length}</span>
              </div>
              <div className="calculator-list">
                {filteredCalculators.map((calculator) => (
                  <CalculatorRow calculator={calculator} key={calculator.id} onOpen={openCalculator} />
                ))}
                {filteredCalculators.length === 0 && (
                  <div className="empty-state">
                    <Search size={24} />
                    <strong>No calculators found</strong>
                    <span>Try a broader term such as “loan,” “buy,” or “equity.”</span>
                  </div>
                )}
              </div>
            </section>
          ) : (
            categories.map((category, index) => {
              const items = calculators.filter((calculator) => calculator.category === category)
              const isOpen = openCategories[category]

              return (
                <section className={`calculator-group accent-${index + 1}`} key={category}>
                  <button
                    className="group-heading"
                    onClick={() => toggleCategory(category)}
                    aria-expanded={isOpen}
                  >
                    <div>
                      <span className="group-kicker">{String(index + 1).padStart(2, '0')}</span>
                      <h2>{category}</h2>
                    </div>
                    <span className="group-heading__meta">{items.length} tools <ChevronDown size={19} /></span>
                  </button>
                  {isOpen && (
                    <div className="calculator-list">
                      {items.map((calculator) => (
                        <CalculatorRow calculator={calculator} key={calculator.id} onOpen={openCalculator} />
                      ))}
                    </div>
                  )}
                </section>
              )
            })
          )}
        </div>

        <aside className="calculator-aside">
          <div className="featured-card">
            <span className="featured-card__tag">RECOMMENDED START</span>
            <span className="featured-card__icon"><FeaturedIcon size={25} /></span>
            <h2>Understand your monthly payment</h2>
            <p>
              See a complete estimate including principal, interest, taxes, and
              insurance—not just the loan payment.
            </p>
            <span className="button button--light featured-card__next">
              Mortgage calculator is first up <ArrowRight size={17} />
            </span>
          </div>
          <div className="recent-card">
            <div className="recent-card__heading"><Clock3 size={18} /><strong>Recently viewed</strong></div>
            {recentCalculators.length ? (
              <div className="recent-card__list">
                {recentCalculators.map((calculator) => (
                  <button
                    type="button"
                    key={calculator.id}
                    onClick={() => openCalculator(calculator.id)}
                  >
                    <span>{calculator.title}</span>
                    <ArrowRight size={13} />
                  </button>
                ))}
              </div>
            ) : (
              <p>Your recently used calculators will appear here.</p>
            )}
          </div>
          <div className="recent-card saved-scenarios-card">
            <div className="recent-card__heading"><Bookmark size={18} /><strong>Saved scenarios</strong></div>
            {savedScenarios.length ? (
              <div className="saved-scenarios-list">
                {savedScenarios.map((scenario) => (
                  <article key={scenario.id}>
                    <button
                      type="button"
                      className="saved-scenarios-list__open"
                      onClick={() => openCalculator(scenario.calculatorId, scenario.inputDraft)}
                    >
                      <strong>{scenario.tool}</strong>
                      <span>{scenario.label}</span>
                      {scenario.summary && <small>{scenario.summary}</small>}
                      <small>Saved {new Date(scenario.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</small>
                    </button>
                    <button
                      type="button"
                      className="saved-scenarios-list__remove"
                      aria-label={`Remove ${scenario.tool} scenario`}
                      onClick={() => void clientActivity?.removeScenario(scenario.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <p>Saved calculator snapshots will appear here.</p>
            )}
          </div>
          <p className="disclaimer">
            Results are estimates for educational purposes and are not a loan offer or
            financial advice.
          </p>
        </aside>
      </section>
    </main>
  )
}
