import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  BellRing,
  DollarSign,
  FileText,
  Percent,
  RotateCcw,
  TrendingDown,
} from 'lucide-react'
import { calculateProductRate, formatRate, rateProducts } from '../../lib/mortgageRates'
import { calculateRefinanceBreakEven } from '../../lib/refinanceBreakEven'
import { ShareWithAdvisor } from '../shared/ShareWithAdvisor'
import type { ShareSection } from '../../lib/share'

type RefiWatchProfile = {
  currentLoanBalance: number
  currentInterestRate: number
  currentRemainingTermYears: number
  refinanceClosingCosts: number
  targetBreakEvenMonths: number
  creditScore: number
  targetLoanTermYears: number
}

interface RefiWatchToolProps {
  onBack: () => void
}

const REFI_WATCH_STORAGE_KEY = 'mwm-refi-watch-profile'

const defaultRefiWatchProfile: RefiWatchProfile = {
  currentLoanBalance: 420_000,
  currentInterestRate: 7.25,
  currentRemainingTermYears: 27,
  refinanceClosingCosts: 7_500,
  targetBreakEvenMonths: 24,
  creditScore: 780,
  targetLoanTermYears: 30,
}

const preciseCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function safeNumber(value: number, fallback = 0) {
  return Number.isFinite(value) ? Math.max(0, value) : fallback
}

function readStoredRefiWatchProfile(): RefiWatchProfile {
  try {
    const storedProfile = window.localStorage.getItem(REFI_WATCH_STORAGE_KEY)
    if (!storedProfile) return defaultRefiWatchProfile

    const parsed = JSON.parse(storedProfile) as Partial<RefiWatchProfile>
    return {
      currentLoanBalance: safeNumber(parsed.currentLoanBalance ?? defaultRefiWatchProfile.currentLoanBalance),
      currentInterestRate: safeNumber(parsed.currentInterestRate ?? defaultRefiWatchProfile.currentInterestRate),
      currentRemainingTermYears: Math.max(1, safeNumber(parsed.currentRemainingTermYears ?? defaultRefiWatchProfile.currentRemainingTermYears)),
      refinanceClosingCosts: safeNumber(parsed.refinanceClosingCosts ?? defaultRefiWatchProfile.refinanceClosingCosts),
      targetBreakEvenMonths: Math.max(1, safeNumber(parsed.targetBreakEvenMonths ?? defaultRefiWatchProfile.targetBreakEvenMonths)),
      creditScore: Math.min(850, Math.max(300, safeNumber(parsed.creditScore ?? defaultRefiWatchProfile.creditScore))),
      targetLoanTermYears: Math.max(1, safeNumber(parsed.targetLoanTermYears ?? defaultRefiWatchProfile.targetLoanTermYears)),
    }
  } catch {
    return defaultRefiWatchProfile
  }
}

function loanTermForProduct(productId: string) {
  if (productId.includes('fixed-10')) return 10
  if (productId.includes('fixed-15')) return 15
  if (productId.includes('fixed-20')) return 20
  return 30
}

function formatBreakEven(months: number | null) {
  if (months === null) return 'No break-even'
  if (months <= 0) return 'Immediate'
  if (months < 12) return `${Math.ceil(months)} mo.`
  return `${Math.ceil(months)} mo. (${(months / 12).toFixed(1)} yr.)`
}

function calculateWatchTargetRate(profile: RefiWatchProfile) {
  const qualifiesAtRate = (rate: number) => {
    const result = calculateRefinanceBreakEven({
      currentLoanBalance: profile.currentLoanBalance,
      currentInterestRate: profile.currentInterestRate,
      currentRemainingTermYears: profile.currentRemainingTermYears,
      newInterestRate: rate,
      newLoanTermYears: profile.targetLoanTermYears,
      refinanceClosingCosts: profile.refinanceClosingCosts,
      cashOutAmount: 0,
    })

    return result.monthlySavings > 0 && result.breakEvenMonths !== null && result.breakEvenMonths <= profile.targetBreakEvenMonths
  }

  if (!qualifiesAtRate(0)) return null

  let low = 0
  let high = Math.max(0.01, profile.currentInterestRate)

  for (let index = 0; index < 42; index += 1) {
    const mid = (low + high) / 2
    if (qualifiesAtRate(mid)) {
      low = mid
    } else {
      high = mid
    }
  }

  return low
}

/**
 * Refi Watch — moved here from the Resources tab so it lives alongside the
 * other financial tools under Calculators. Kept as its own visually distinct
 * section (see .calculator-special-section in styles.css) rather than being
 * blended into the regular calculator categories.
 */
export function RefiWatchTool({ onBack }: RefiWatchToolProps) {
  const [refiWatchProfile, setRefiWatchProfile] = useState<RefiWatchProfile>(readStoredRefiWatchProfile)

  const refiWatchTargetRate = useMemo(() => calculateWatchTargetRate(refiWatchProfile), [refiWatchProfile])
  const refiWatchProducts = useMemo(
    () =>
      rateProducts.map((product) => {
        const rate = calculateProductRate(product, refiWatchProfile.creditScore)
        const termYears = loanTermForProduct(product.id)
        const result = calculateRefinanceBreakEven({
          currentLoanBalance: refiWatchProfile.currentLoanBalance,
          currentInterestRate: refiWatchProfile.currentInterestRate,
          currentRemainingTermYears: refiWatchProfile.currentRemainingTermYears,
          newInterestRate: rate,
          newLoanTermYears: termYears,
          refinanceClosingCosts: refiWatchProfile.refinanceClosingCosts,
          cashOutAmount: 0,
        })

        return {
          product,
          rate,
          termYears,
          result,
          triggersWatch:
            result.monthlySavings > 0 &&
            result.breakEvenMonths !== null &&
            result.breakEvenMonths <= refiWatchProfile.targetBreakEvenMonths,
        }
      }),
    [refiWatchProfile],
  )
  const bestRefiWatchProduct = useMemo(
    () =>
      [...refiWatchProducts].sort((a, b) => {
        if (a.triggersWatch !== b.triggersWatch) return a.triggersWatch ? -1 : 1
        const aBreakEven = a.result.breakEvenMonths ?? Number.POSITIVE_INFINITY
        const bBreakEven = b.result.breakEvenMonths ?? Number.POSITIVE_INFINITY
        if (aBreakEven !== bBreakEven) return aBreakEven - bBreakEven
        return b.result.monthlySavings - a.result.monthlySavings
      })[0],
    [refiWatchProducts],
  )
  const refiWatchTriggered = Boolean(bestRefiWatchProduct?.triggersWatch)

  useEffect(() => {
    try {
      window.localStorage.setItem(REFI_WATCH_STORAGE_KEY, JSON.stringify(refiWatchProfile))
    } catch {
      // Local persistence is a convenience only; calculations continue without it.
    }
  }, [refiWatchProfile])

  function updateRefiWatchProfile(patch: Partial<RefiWatchProfile>) {
    setRefiWatchProfile((current) => ({
      ...current,
      ...patch,
    }))
  }

  function getShareSections(): ShareSection[] {
    return [
      {
        title: 'Saved loan profile',
        entries: [
          { label: 'Current loan balance', value: preciseCurrency.format(refiWatchProfile.currentLoanBalance) },
          { label: 'Current interest rate', value: formatRate(refiWatchProfile.currentInterestRate) },
          { label: 'Remaining term', value: `${refiWatchProfile.currentRemainingTermYears} years` },
          { label: 'Estimated closing costs', value: preciseCurrency.format(refiWatchProfile.refinanceClosingCosts) },
          { label: 'Break-even target', value: `${refiWatchProfile.targetBreakEvenMonths} months` },
          { label: 'Credit score', value: String(refiWatchProfile.creditScore) },
          { label: 'Target loan term', value: `${refiWatchProfile.targetLoanTermYears} years` },
        ],
      },
      {
        title: 'Watch status',
        entries: [
          { label: 'Best posted rate', value: bestRefiWatchProduct ? formatRate(bestRefiWatchProduct.rate) : '-' },
          { label: 'Best break-even', value: bestRefiWatchProduct ? formatBreakEven(bestRefiWatchProduct.result.breakEvenMonths) : '-' },
          { label: 'Target watch rate', value: refiWatchTargetRate === null ? '-' : formatRate(refiWatchTargetRate) },
          { label: 'Status', value: refiWatchTriggered ? 'Refi review triggered' : 'Keep watching' },
        ],
      },
    ]
  }

  return (
    <main className="mortgage-page resources-page" id="refi-watch">
      <div className="resource-breadcrumb">
        <button type="button" onClick={onBack}>
          <ArrowLeft size={16} /> Calculators
        </button>
        <div className="mortgage-actions">
          <ShareWithAdvisor tool="Refi Watch" getSections={getShareSections} />
        </div>
      </div>

      <header className="mortgage-heading">
        <div className="mortgage-heading__icon"><BellRing size={24} /></div>
        <div>
          <p className="eyebrow">RATE WATCH</p>
          <h1>Refi Watch</h1>
          <p>Save your current loan once and check whether posted rates have reached your break-even target.</p>
        </div>
      </header>

      <section className="refi-watch-layout" aria-labelledby="refi-watch-title">
        <div className="refi-watch-panel">
          <div className="readiness-panel__heading">
            <div>
              <p className="eyebrow">CURRENT LOAN</p>
              <h2 id="refi-watch-title">Loan profile</h2>
              <p>These inputs are saved in this browser so clients can return without re-entering the loan.</p>
            </div>
            <button
              type="button"
              className="resource-secondary-button"
              onClick={() => setRefiWatchProfile(defaultRefiWatchProfile)}
            >
              <RotateCcw size={15} /> Reset
            </button>
          </div>

          <div className="resource-form-grid">
            <label className="resource-field" htmlFor="refi-balance">
              <span>Current loan balance</span>
              <span className="resource-input">
                <DollarSign size={15} />
                <input
                  id="refi-balance"
                  type="number"
                  min="0"
                  step="1000"
                  value={refiWatchProfile.currentLoanBalance}
                  onChange={(event) => updateRefiWatchProfile({ currentLoanBalance: safeNumber(event.target.valueAsNumber) })}
                />
              </span>
            </label>

            <label className="resource-field" htmlFor="refi-current-rate">
              <span>Current interest rate</span>
              <span className="resource-input">
                <Percent size={15} />
                <input
                  id="refi-current-rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={refiWatchProfile.currentInterestRate}
                  onChange={(event) => updateRefiWatchProfile({ currentInterestRate: safeNumber(event.target.valueAsNumber) })}
                />
              </span>
            </label>

            <label className="resource-field" htmlFor="refi-remaining-term">
              <span>Remaining term</span>
              <span className="resource-input">
                <input
                  id="refi-remaining-term"
                  type="number"
                  min="1"
                  step="1"
                  value={refiWatchProfile.currentRemainingTermYears}
                  onChange={(event) => updateRefiWatchProfile({ currentRemainingTermYears: Math.max(1, safeNumber(event.target.valueAsNumber)) })}
                />
                <small>years</small>
              </span>
            </label>

            <label className="resource-field" htmlFor="refi-closing-costs">
              <span>Estimated closing costs</span>
              <span className="resource-input">
                <DollarSign size={15} />
                <input
                  id="refi-closing-costs"
                  type="number"
                  min="0"
                  step="500"
                  value={refiWatchProfile.refinanceClosingCosts}
                  onChange={(event) => updateRefiWatchProfile({ refinanceClosingCosts: safeNumber(event.target.valueAsNumber) })}
                />
              </span>
            </label>

            <label className="resource-field" htmlFor="refi-target-window">
              <span>Break-even target</span>
              <span className="resource-input">
                <input
                  id="refi-target-window"
                  type="number"
                  min="1"
                  step="1"
                  value={refiWatchProfile.targetBreakEvenMonths}
                  onChange={(event) => updateRefiWatchProfile({ targetBreakEvenMonths: Math.max(1, safeNumber(event.target.valueAsNumber)) })}
                />
                <small>months</small>
              </span>
            </label>

            <label className="resource-field" htmlFor="refi-credit-score">
              <span>Credit score</span>
              <span className="resource-input">
                <input
                  id="refi-credit-score"
                  type="number"
                  min="300"
                  max="850"
                  step="1"
                  value={refiWatchProfile.creditScore}
                  onChange={(event) => updateRefiWatchProfile({ creditScore: Math.min(850, Math.max(300, safeNumber(event.target.valueAsNumber))) })}
                />
              </span>
            </label>

            <label className="resource-field" htmlFor="refi-target-term">
              <span>Target loan term</span>
              <span className="resource-input">
                <select
                  id="refi-target-term"
                  value={refiWatchProfile.targetLoanTermYears}
                  onChange={(event) => updateRefiWatchProfile({ targetLoanTermYears: Number(event.target.value) })}
                >
                  <option value={30}>30 years</option>
                  <option value={20}>20 years</option>
                  <option value={15}>15 years</option>
                  <option value={10}>10 years</option>
                </select>
              </span>
            </label>
          </div>

          <div className="refi-watch-table-wrap">
            <table className="refi-watch-table">
              <thead>
                <tr>
                  <th>Posted option</th>
                  <th>Rate</th>
                  <th>Term</th>
                  <th>Monthly savings</th>
                  <th>Break-even</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {refiWatchProducts.map((item) => (
                  <tr key={item.product.id} className={item.triggersWatch ? 'is-triggered' : ''}>
                    <td>{item.product.label}</td>
                    <td>{formatRate(item.rate)}</td>
                    <td>{item.termYears} yr.</td>
                    <td className={item.result.monthlySavings > 0 ? '' : 'is-negative'}>
                      {preciseCurrency.format(item.result.monthlySavings)}
                    </td>
                    <td>{formatBreakEven(item.result.breakEvenMonths)}</td>
                    <td>
                      <span className={`refi-watch-status ${item.triggersWatch ? 'is-triggered' : ''}`}>
                        {item.triggersWatch ? 'Triggers' : 'Watch'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="readiness-summary refi-watch-summary" aria-label="Refi Watch status">
          <div className={`readiness-summary__icon ${refiWatchTriggered ? 'is-ready' : ''}`}>
            {refiWatchTriggered ? <TrendingDown size={23} /> : <BellRing size={23} />}
          </div>
          <p className="eyebrow">WATCH STATUS</p>
          <h2>{refiWatchTriggered ? 'Refi review triggered' : 'Keep watching'}</h2>
          <p>
            {refiWatchTriggered && bestRefiWatchProduct
              ? `${bestRefiWatchProduct.product.label} is showing ${formatRate(bestRefiWatchProduct.rate)}, with an estimated ${formatBreakEven(bestRefiWatchProduct.result.breakEvenMonths)} break-even.`
              : refiWatchTargetRate === null
                ? 'The current target is not reachable with the saved loan profile. Review costs, term, or break-even window.'
                : `Rates need to reach about ${formatRate(refiWatchTargetRate)} or lower on the target term to hit the ${refiWatchProfile.targetBreakEvenMonths}-month break-even window.`}
          </p>

          <dl className="readiness-stats">
            <div>
              <dt>Best posted rate</dt>
              <dd>{bestRefiWatchProduct ? formatRate(bestRefiWatchProduct.rate) : '-'}</dd>
            </div>
            <div>
              <dt>Best break-even</dt>
              <dd>{bestRefiWatchProduct ? formatBreakEven(bestRefiWatchProduct.result.breakEvenMonths) : '-'}</dd>
            </div>
            <div>
              <dt>Target watch rate</dt>
              <dd>{refiWatchTargetRate === null ? '-' : formatRate(refiWatchTargetRate)}</dd>
            </div>
          </dl>

          <div className="readiness-note">
            <FileText size={17} />
            <span>Refi Watch compares against the hub's posted rate sheet. Final pricing depends on lender quote, points, fees, and underwriting.</span>
          </div>
        </aside>
      </section>
    </main>
  )
}
