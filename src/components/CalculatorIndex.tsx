import { useMemo, useState } from 'react'
import {
  ArrowRight,
  ChevronDown,
  Clock3,
  Search,
  Sparkles,
} from 'lucide-react'
import { calculators, categories, type CalculatorItem } from '../data/calculators'

function CalculatorRow({ calculator }: { calculator: CalculatorItem }) {
  const Icon = calculator.icon

  return (
    <a className="calculator-row" href={`#${calculator.id}`}>
      <span className="calculator-row__icon"><Icon size={20} strokeWidth={1.8} /></span>
      <span className="calculator-row__copy">
        <strong>{calculator.title}</strong>
        <small>{calculator.description}</small>
      </span>
      {calculator.status === 'ready' ? (
        <span className="status-pill">First up</span>
      ) : (
        <span className="calculator-row__arrow"><ArrowRight size={18} /></span>
      )}
    </a>
  )
}

export function CalculatorIndex() {
  const FeaturedIcon = calculators[0].icon
  const [query, setQuery] = useState('')
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

  function toggleCategory(category: string) {
    setOpenCategories((current) => ({
      ...current,
      [category]: !current[category],
    }))
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
                  <CalculatorRow calculator={calculator} key={calculator.id} />
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
                        <CalculatorRow calculator={calculator} key={calculator.id} />
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
