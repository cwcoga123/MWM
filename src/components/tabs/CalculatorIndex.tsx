import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  BellRing,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  Search,
  Sparkles,
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

  function openCalculator(calculatorId: string) {
    if ((OPENABLE_CALCULATORS as string[]).includes(calculatorId)) {
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

  if (activeCalculator === 'mortgage-calculator') {
    return <MortgageCalculator onBack={closeCalculator} />
  }

  if (activeCalculator === 'cash-out-refinance') {
    return <CashOutRefinanceCalculator onBack={closeCalculator} />
  }

  if (activeCalculator === 'amortization-schedule') {
    return <AmortizationCalculator onBack={closeCalculator} />
  }

  if (activeCalculator === 'loan-comparison') {
    return <LoanComparisonCalculator onBack={closeCalculator} />
  }

  if (activeCalculator === 'affordability') {
    return <AffordabilityCalculator onBack={closeCalculator} />
  }

  if (activeCalculator === 'mortgage-rates') {
    return <MortgageRatesCalculator onBack={closeCalculator} />
  }

  if (activeCalculator === 'rent-vs-buy') {
    return <RentVsBuyCalculator onBack={closeCalculator} />
  }

  if (activeCalculator === 'seller-net-proceeds') {
    return <SellerProceedsCalculator onBack={closeCalculator} />
  }

  if (activeCalculator === 'buyer-closing-costs') {
    return <BuyerClosingCostsCalculator onBack={closeCalculator} />
  }

  if (activeCalculator === 'down-payment') {
    return <DownPaymentPlannerCalculator onBack={closeCalculator} />
  }

  if (activeCalculator === 'home-equity') {
    return <HomeEquityCalculator onBack={closeCalculator} />
  }

  if (activeCalculator === 'investment-property') {
    return <InvestmentPropertyCalculator onBack={closeCalculator} />
  }

  if (activeCalculator === 'refinance-break-even') {
    return <RefinanceBreakEvenCalculator onBack={closeCalculator} />
  }

  if (activeCalculator === 'preapproval') {
    return <PreapprovalChecklistTool user={user} onBack={closeCalculator} />
  }

  if (activeCalculator === 'refi-watch') {
    return <RefiWatchTool onBack={closeCalculator} />
  }

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
            <p>Your recently used calculators will appear here.</p>
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
