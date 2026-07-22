import { useState, type FormEvent, type ReactNode } from 'react'
import { Bell, Check, Eye, Home, LockKeyhole, Save, SlidersHorizontal, UserRound } from 'lucide-react'
import type { HubUser } from '../shell/AuthGate'
import {
  mergeMyPlanPreferences,
  type HomeGoal,
  type MyPlanPreferences,
} from '../../data/preferences'
import { useClientActivity } from '../shared/clientActivityContext'

interface SettingsTabProps {
  user: HubUser
}

function moneyValue(value: number | null) {
  return value === null ? '' : String(value)
}

function toNullableNumber(value: string) {
  if (!value.trim()) return null
  const parsed = Number(value.replace(/,/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

function goalLabel(goal: HomeGoal) {
  return {
    researching: 'Researching',
    buying: 'Buying a home',
    selling: 'Selling a home',
    refinancing: 'Refinancing',
    investing: 'Investing',
  }[goal]
}

function PlanField({
  label,
  children,
  help,
}: {
  label: string
  children: ReactNode
  help?: string
}) {
  return (
    <label className="settings-field">
      <span>{label}</span>
      {children}
      {help && <small>{help}</small>}
    </label>
  )
}

export function SettingsTab({ user }: SettingsTabProps) {
  const clientActivity = useClientActivity()
  const savedAreas = Array.from(new Set([...user.neighborhoods, ...user.preferences.savedAreas]))
  const [draft, setDraft] = useState<MyPlanPreferences>(user.preferences)
  const [status, setStatus] = useState('')
  const isBuyer = draft.homeGoal === 'buying'
  const isSeller = draft.homeGoal === 'selling'

  function updateDraft(patch: Partial<MyPlanPreferences>) {
    setDraft((current) => mergeMyPlanPreferences(current, patch))
    setStatus('')
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!clientActivity) return

    void clientActivity.updatePreferences(draft).then(() => {
      setStatus('Your plan settings are saved.')
    })
  }

  return (
    <main className="settings-page" id="settings">
      <header className="page-heading settings-heading">
        <div>
          <p className="eyebrow">YOUR WORKSPACE</p>
          <h1>Settings</h1>
          <p>Shape the numbers, alerts, and guidance MWM shows you.</p>
        </div>
        <div className="settings-heading__badge"><SlidersHorizontal size={16} /> My Plan</div>
      </header>

      <form className="settings-layout" onSubmit={handleSubmit}>
        <div className="settings-main">
          <section className="settings-card" aria-labelledby="settings-profile-title">
            <div className="settings-card__heading">
              <span className="settings-card__icon"><UserRound size={18} /></span>
              <div><p className="eyebrow">PROFILE</p><h2 id="settings-profile-title">Make it feel like yours</h2></div>
            </div>
            <div className="settings-grid">
              <PlanField label="Preferred name" help={`Signed in as ${user.email}`}>
                <input
                  value={draft.preferredName}
                  onChange={(event) => updateDraft({ preferredName: event.target.value })}
                  placeholder={user.name}
                  maxLength={80}
                />
              </PlanField>
              <PlanField label="Your main goal">
                <select
                  value={draft.homeGoal}
                  onChange={(event) => updateDraft({ homeGoal: event.target.value as HomeGoal })}
                >
                  {(['researching', 'buying', 'selling', 'refinancing', 'investing'] as HomeGoal[]).map((goal) => (
                    <option value={goal} key={goal}>{goalLabel(goal)}</option>
                  ))}
                </select>
              </PlanField>
              <PlanField label="Timeline">
                <select value={draft.timeline} onChange={(event) => updateDraft({ timeline: event.target.value })}>
                  {['Exploring', 'Within 3 months', '3–6 months', '6–12 months', 'More than a year'].map((timeline) => (
                    <option value={timeline} key={timeline}>{timeline}</option>
                  ))}
                </select>
              </PlanField>
              {!isSeller && (
                <PlanField label="Property type">
                  <select value={draft.propertyType} onChange={(event) => updateDraft({ propertyType: event.target.value as MyPlanPreferences['propertyType'] })}>
                    <option value="any">Any type</option>
                    <option value="single-family">Single-family</option>
                    <option value="condo-townhome">Condo or townhome</option>
                    <option value="multi-unit">Multi-unit</option>
                  </select>
                </PlanField>
              )}
              <PlanField label="Saved market areas" help="Separate areas with commas. These supplement any advisor-saved areas.">
                <input value={draft.savedAreas.join(', ')} onChange={(event) => updateDraft({ savedAreas: event.target.value.split(',').map((area) => area.trim()).filter(Boolean) })} placeholder="e.g. Noe Valley, San Jose" />
              </PlanField>
              {isBuyer && (
                <>
                  <PlanField label="Bedrooms">
                    <input type="number" min="0" max="20" value={draft.bedrooms ?? ''} onChange={(event) => updateDraft({ bedrooms: toNullableNumber(event.target.value) })} placeholder="Any" />
                  </PlanField>
                  <PlanField label="Bathrooms">
                    <input type="number" min="0" max="20" step="0.5" value={draft.bathrooms ?? ''} onChange={(event) => updateDraft({ bathrooms: toNullableNumber(event.target.value) })} placeholder="Any" />
                  </PlanField>
                </>
              )}
            </div>
          </section>

          <section className="settings-card" aria-labelledby="settings-assumptions-title">
            <div className="settings-card__heading">
              <span className="settings-card__icon"><Home size={18} /></span>
              <div><p className="eyebrow">{isSeller ? 'SELLER DEFAULTS' : isBuyer ? 'BUYER DEFAULTS' : 'CALCULATOR DEFAULTS'}</p><h2 id="settings-assumptions-title">{isSeller ? 'Your selling plan' : isBuyer ? 'Your buying plan' : 'Your planning assumptions'}</h2></div>
            </div>
            <p className="settings-card__lede">{isSeller ? 'These values shape your sale estimate, equity view, and net proceeds.' : 'These values prefill calculators. You can still change them for any individual scenario.'}</p>
            <div className="settings-grid">
              {isSeller ? (
                <>
                  <PlanField label="Current home value" help="Your best current estimate—not an appraisal.">
                    <input type="number" min="0" step="1000" value={moneyValue(draft.currentHomeValue)} onChange={(event) => updateDraft({ currentHomeValue: toNullableNumber(event.target.value) })} placeholder="Optional" />
                  </PlanField>
                  <PlanField label="Mortgage balance">
                    <input type="number" min="0" step="1000" value={moneyValue(draft.currentMortgageBalance)} onChange={(event) => updateDraft({ currentMortgageBalance: toNullableNumber(event.target.value) })} placeholder="Optional" />
                  </PlanField>
                  <PlanField label="Target sale price">
                    <input type="number" min="0" step="1000" value={moneyValue(draft.targetSalePrice)} onChange={(event) => updateDraft({ targetSalePrice: toNullableNumber(event.target.value) })} placeholder="Use current value" />
                  </PlanField>
                  <PlanField label="Selling costs" help="Agent fees, transfer taxes, escrow, and other sale costs.">
                    <input type="number" min="0" max="20" step="0.25" value={draft.sellingCostPercent} onChange={(event) => updateDraft({ sellingCostPercent: Number(event.target.value) || 0 })} />
                  </PlanField>
                  <PlanField label="Repairs and preparation budget">
                    <input type="number" min="0" step="500" value={moneyValue(draft.repairsBudget)} onChange={(event) => updateDraft({ repairsBudget: toNullableNumber(event.target.value) })} placeholder="Optional" />
                  </PlanField>
                </>
              ) : (
                <>
              <PlanField label="Comfortable monthly payment">
                <input type="number" min="0" step="100" value={moneyValue(draft.comfortableMonthlyPayment)} onChange={(event) => updateDraft({ comfortableMonthlyPayment: toNullableNumber(event.target.value) })} placeholder="Optional" />
              </PlanField>
              <PlanField label="Gross annual income" help="Used only to personalize affordability estimates.">
                <input type="number" min="0" step="1000" value={moneyValue(draft.grossAnnualIncome)} onChange={(event) => updateDraft({ grossAnnualIncome: toNullableNumber(event.target.value) })} placeholder="Optional" />
              </PlanField>
              <PlanField label="Monthly debt payments" help="Exclude the new housing payment.">
                <input type="number" min="0" step="50" value={moneyValue(draft.monthlyDebt)} onChange={(event) => updateDraft({ monthlyDebt: toNullableNumber(event.target.value) })} placeholder="Optional" />
              </PlanField>
              <PlanField label="Down payment amount">
                <input type="number" min="0" step="1000" value={moneyValue(draft.downPaymentAmount)} onChange={(event) => updateDraft({ downPaymentAmount: toNullableNumber(event.target.value) })} placeholder="Optional" />
              </PlanField>
              <PlanField label="Down payment percentage">
                <input type="number" min="0" max="100" step="1" value={draft.downPaymentPercent} onChange={(event) => updateDraft({ downPaymentPercent: Number(event.target.value) || 0 })} />
              </PlanField>
              <PlanField label="Loan type">
                <select value={draft.loanType} onChange={(event) => updateDraft({ loanType: event.target.value as MyPlanPreferences['loanType'] })}>
                  <option value="conventional">Conventional</option>
                  <option value="FHA">FHA</option>
                  <option value="VA">VA</option>
                  <option value="jumbo">Jumbo</option>
                  <option value="cash">Cash purchase</option>
                </select>
              </PlanField>
              <PlanField label="Loan term">
                <select value={draft.loanTermYears} onChange={(event) => updateDraft({ loanTermYears: Number(event.target.value) as MyPlanPreferences['loanTermYears'] })}>
                  <option value="15">15 years</option><option value="20">20 years</option><option value="30">30 years</option>
                </select>
              </PlanField>
              <PlanField label="Property tax rate" help="Used as an annual percentage of home price.">
                <input type="number" min="0" step="0.01" value={draft.annualPropertyTaxRate} onChange={(event) => updateDraft({ annualPropertyTaxRate: Number(event.target.value) || 0 })} />
              </PlanField>
              <PlanField label="Annual home insurance">
                <input type="number" min="0" step="100" value={draft.annualHomeInsurance} onChange={(event) => updateDraft({ annualHomeInsurance: Number(event.target.value) || 0 })} />
              </PlanField>
              <PlanField label="Monthly HOA">
                <input type="number" min="0" step="25" value={draft.monthlyHoa} onChange={(event) => updateDraft({ monthlyHoa: Number(event.target.value) || 0 })} />
              </PlanField>
              <PlanField label="Minimum cash reserve">
                <input type="number" min="0" step="1000" value={moneyValue(draft.cashReserve)} onChange={(event) => updateDraft({ cashReserve: toNullableNumber(event.target.value) })} placeholder="Optional" />
              </PlanField>
                </>
              )}
            </div>
          </section>

          <section className="settings-card" aria-labelledby="settings-preferences-title">
            <div className="settings-card__heading">
              <span className="settings-card__icon"><Eye size={18} /></span>
              <div><p className="eyebrow">GUIDANCE</p><h2 id="settings-preferences-title">What should MWM pay attention to?</h2></div>
            </div>
            <div className="settings-grid">
              <PlanField label={isSeller ? 'Selling priorities' : 'Must-haves'}>
                <textarea value={draft.mustHaves} onChange={(event) => updateDraft({ mustHaves: event.target.value })} placeholder={isSeller ? 'e.g. maximize proceeds, flexible move date' : 'e.g. outdoor space, transit access'} rows={3} />
              </PlanField>
              <PlanField label={isSeller ? 'Things to solve before listing' : 'Deal-breakers'}>
                <textarea value={draft.dealBreakers} onChange={(event) => updateDraft({ dealBreakers: event.target.value })} placeholder={isSeller ? 'e.g. repairs, staging, tenant timing' : 'e.g. high HOA, major renovation'} rows={3} />
              </PlanField>
              <PlanField label="Default market history">
                <select value={draft.marketRange} onChange={(event) => updateDraft({ marketRange: event.target.value as MyPlanPreferences['marketRange'] })}>
                  <option value="1Y">1 year</option><option value="5Y">5 years</option><option value="10Y">10 years</option><option value="20Y">20 years</option>
                </select>
              </PlanField>
              <PlanField label="Default landing page">
                <select value={draft.defaultView} onChange={(event) => updateDraft({ defaultView: event.target.value as MyPlanPreferences['defaultView'] })}>
                  <option value="overview">Overview</option><option value="calendar">Calendar</option><option value="calculators">Calculators</option><option value="cost-watch">Cost Watch</option><option value="market-scanner">Trends</option>
                </select>
              </PlanField>
            </div>
          </section>

          <section className="settings-card" aria-labelledby="settings-notifications-title">
            <div className="settings-card__heading">
              <span className="settings-card__icon"><Bell size={18} /></span>
              <div><p className="eyebrow">NOTIFICATIONS</p><h2 id="settings-notifications-title">Only hear from MWM when it helps</h2></div>
            </div>
            <div className="settings-toggle-list">
              {([
                ['advisorMessages', 'Advisor messages', 'Know when your advisor leaves a note or responds.'],
                ['rateAlerts', 'Rate alerts', 'Use your refinance or rate-watch thresholds.'],
                ['marketAlerts', 'Market changes', 'Receive meaningful movement in saved areas and indicators.'],
                ['calendarReminders', 'Calendar reminders', 'Keep important market and personal dates on your radar.'],
              ] as const).map(([key, label, help]) => (
                <label className="settings-toggle" key={key}>
                  <input type="checkbox" checked={draft.notifications[key]} onChange={(event) => updateDraft({ notifications: { ...draft.notifications, [key]: event.target.checked } })} />
                  <span><strong>{label}</strong><small>{help}</small></span>
                </label>
              ))}
            </div>
            <div className="settings-grid settings-grid--compact">
              <PlanField label="Digest frequency">
                <select value={draft.notifications.digestFrequency} onChange={(event) => updateDraft({ notifications: { ...draft.notifications, digestFrequency: event.target.value as MyPlanPreferences['notifications']['digestFrequency'] } })}>
                  <option value="instant">As it happens</option><option value="daily">Daily digest</option><option value="weekly">Weekly digest</option>
                </select>
              </PlanField>
              <PlanField label="Quiet hours">
                <div className="settings-inline-inputs"><input type="time" value={draft.notifications.quietHoursStart} onChange={(event) => updateDraft({ notifications: { ...draft.notifications, quietHoursStart: event.target.value } })} /><span>to</span><input type="time" value={draft.notifications.quietHoursEnd} onChange={(event) => updateDraft({ notifications: { ...draft.notifications, quietHoursEnd: event.target.value } })} /></div>
              </PlanField>
            </div>
          </section>

          <section className="settings-card" aria-labelledby="settings-appearance-title">
            <div className="settings-card__heading">
              <span className="settings-card__icon"><SlidersHorizontal size={18} /></span>
              <div><p className="eyebrow">DISPLAY</p><h2 id="settings-appearance-title">Comfort and accessibility</h2></div>
            </div>
            <div className="settings-grid settings-grid--compact">
              <PlanField label="Theme">
                <select value={draft.appearance.theme} onChange={(event) => updateDraft({ appearance: { ...draft.appearance, theme: event.target.value as MyPlanPreferences['appearance']['theme'] } })}>
                  <option value="light">Light</option><option value="dark">Dark</option><option value="system">Use device setting</option>
                </select>
              </PlanField>
              <PlanField label="Density">
                <select value={draft.appearance.density} onChange={(event) => updateDraft({ appearance: { ...draft.appearance, density: event.target.value as MyPlanPreferences['appearance']['density'] } })}>
                  <option value="comfortable">Comfortable</option><option value="compact">Compact</option>
                </select>
              </PlanField>
            </div>
            <label className="settings-toggle settings-toggle--last">
              <input type="checkbox" checked={draft.appearance.reduceMotion} onChange={(event) => updateDraft({ appearance: { ...draft.appearance, reduceMotion: event.target.checked } })} />
              <span><strong>Reduce motion</strong><small>Minimize transitions and animated effects.</small></span>
            </label>
          </section>
        </div>

        <aside className="settings-aside">
          <div className="settings-summary-card">
            <span className="eyebrow">MY PLAN</span>
            <h2>{draft.preferredName || user.name}</h2>
            <p>{goalLabel(draft.homeGoal)} · {draft.timeline}</p>
            {!isSeller && user.targetBudget !== null && <div><small>Advisor target</small><strong>${Math.round(user.targetBudget).toLocaleString()}</strong></div>}
            {isSeller && draft.currentHomeValue !== null && <div><small>Current home value</small><strong>${Math.round(draft.currentHomeValue).toLocaleString()}</strong></div>}
            {isSeller && draft.targetSalePrice !== null && <div><small>Target sale price</small><strong>${Math.round(draft.targetSalePrice).toLocaleString()}</strong></div>}
            {savedAreas.length > 0 && <div><small>Saved areas</small><strong>{savedAreas.slice(0, 3).join(', ')}</strong></div>}
            {user.refiThreshold !== null && <div><small>Rate watch</small><strong>{user.refiThreshold.toFixed(2)}% threshold</strong></div>}
          </div>
          <div className="settings-security-card"><LockKeyhole size={17} /><span><strong>Your data stays private</strong><small>Planning preferences are used to personalize your workspace and are only shared with your advisor through actions you choose.</small></span></div>
          <button className="button button--primary settings-save-button" type="submit"><Save size={16} /> Save My Plan</button>
          {status && <p className="settings-save-status" role="status"><Check size={16} /> {status}</p>}
        </aside>
      </form>
    </main>
  )
}
