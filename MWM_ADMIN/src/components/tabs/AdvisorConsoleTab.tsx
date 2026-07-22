import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  CalendarDays,
  CheckCircle2,
  Loader2,
  Lock,
  MapPin,
  MessageSquareText,
  Percent,
  Route,
  Save,
  Search,
  UserRound,
  Users,
  WalletCards,
} from 'lucide-react'
import {
  listAdvisorClientProfiles,
  updateClientPersonalization,
  type AccountProfile,
  type ClientPersonalizationPatch,
  type ClientState,
} from '../../lib/accounts'
import { isSupabaseConfigured } from '../../lib/supabase'
import {
  defaultMyPlanPreferences,
  normalizeMyPlanPreferences,
} from '../../../../MWM_CLIENT/src/data/preferences'
import {
  overviewDemoAccounts,
  type OverviewClientProfile,
} from '../../data/overviewPersonalization'
import {
  SAMPLE_MARKET_RATE,
  clientMatchesTrigger,
  triggerSummary,
  type ActionPlan,
} from '../../data/actionPlans'
import type { HubUser } from '../shell/AdminAuthGate'
import type { ClientPlanState } from '../shell/AdminShell'

interface AdvisorConsoleTabProps {
  user: HubUser
  plans: ActionPlan[]
  clientPlanState: ClientPlanState
  onToggleClientPlan: (clientId: string, planId: string, active: boolean) => void
}

interface ConsoleDraft {
  clientState: ClientState
  advisorNote: string
  targetBudget: string
  neighborhoods: string
  closingDate: string
  lockedRate: string
  refiThreshold: string
}

const emptyDraft: ConsoleDraft = {
  clientState: 'browsing',
  advisorNote: '',
  targetBudget: '',
  neighborhoods: '',
  closingDate: '',
  lockedRate: '',
  refiThreshold: '',
}

const clientStateOptions: { value: ClientState; label: string }[] = [
  { value: 'browsing', label: 'Browsing' },
  { value: 'house-hunting', label: 'House hunting' },
  { value: 'in-escrow', label: 'In escrow' },
  { value: 'homeowner', label: 'Homeowner' },
]

function profileFromDemo(account: OverviewClientProfile): AccountProfile {
  const isBuyer = account.clientState === 'house-hunting' || account.clientState === 'in-escrow'
  const isSeller = account.clientState === 'homeowner'
  const homeValue = account.homeowner?.estimatedValue ?? null
  const mortgageBalance = account.homeowner?.remainingBalance ?? null
  const paymentInputs = account.escrow?.paymentInputs ?? account.search?.targetPaymentInputs

  return {
    id: account.id,
    email: account.email,
    full_name: account.name,
    phone: null,
    account_role: 'client',
    account_status: 'active',
    client_state: account.clientState,
    advisor_note: account.advisorNote,
    target_budget: account.search?.targetBudget ?? account.escrow?.budget ?? null,
    neighborhoods: account.preferences.neighborhoods,
    closing_date: account.escrow?.closingDate ?? null,
    locked_rate: account.escrow?.lockedRate ?? null,
    refi_threshold: account.homeowner?.refiAlertRate ?? null,
    user_preferences: normalizeMyPlanPreferences({
      ...defaultMyPlanPreferences,
      homeGoal: isBuyer ? 'buying' : isSeller ? 'selling' : 'researching',
      timeline: isBuyer ? (account.clientState === 'in-escrow' ? 'Closing soon' : '3–6 months') : defaultMyPlanPreferences.timeline,
      savedAreas: account.preferences.neighborhoods,
      comfortableMonthlyPayment: paymentInputs ? Math.round((paymentInputs.homePrice * 0.0065) / 10) * 10 : null,
      currentHomeValue: homeValue,
      currentMortgageBalance: mortgageBalance,
      targetSalePrice: homeValue,
      downPaymentAmount: paymentInputs?.downPayment ?? null,
      loanTermYears: paymentInputs?.amortizationYears === 15 || paymentInputs?.amortizationYears === 20 ? paymentInputs.amortizationYears : 30,
      annualPropertyTaxRate: paymentInputs?.homePrice ? (paymentInputs.annualPropertyTax / paymentInputs.homePrice) * 100 : defaultMyPlanPreferences.annualPropertyTaxRate,
      annualHomeInsurance: paymentInputs?.annualHomeInsurance ?? defaultMyPlanPreferences.annualHomeInsurance,
      monthlyHoa: paymentInputs?.monthlyHoa ?? defaultMyPlanPreferences.monthlyHoa,
    }),
    recent_calculator_ids: account.recentCalculatorIds,
    saved_scenarios: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

function draftFromProfile(profile: AccountProfile): ConsoleDraft {
  return {
    clientState: profile.client_state,
    advisorNote: profile.advisor_note ?? '',
    targetBudget: profile.target_budget === null ? '' : String(Math.round(profile.target_budget)),
    neighborhoods: profile.neighborhoods.join(', '),
    closingDate: profile.closing_date ?? '',
    lockedRate: profile.locked_rate === null ? '' : String(profile.locked_rate),
    refiThreshold: profile.refi_threshold === null ? '' : String(profile.refi_threshold),
  }
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null

  const parsed = Number(trimmed.replace(/,/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

function parseNeighborhoods(value: string) {
  return Array.from(
    new Set(
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ).slice(0, 20)
}

function toPersonalizationPatch(draft: ConsoleDraft): ClientPersonalizationPatch {
  return {
    clientState: draft.clientState,
    advisorNote: draft.advisorNote.trim() || null,
    targetBudget: parseOptionalNumber(draft.targetBudget),
    neighborhoods: parseNeighborhoods(draft.neighborhoods),
    closingDate: draft.closingDate || null,
    lockedRate: parseOptionalNumber(draft.lockedRate),
    refiThreshold: parseOptionalNumber(draft.refiThreshold),
  }
}

function updateProfileFromPatch(profile: AccountProfile, patch: ClientPersonalizationPatch): AccountProfile {
  return {
    ...profile,
    client_state: patch.clientState,
    advisor_note: patch.advisorNote,
    target_budget: patch.targetBudget,
    neighborhoods: patch.neighborhoods,
    closing_date: patch.closingDate,
    locked_rate: patch.lockedRate,
    refi_threshold: patch.refiThreshold,
    updated_at: new Date().toISOString(),
  }
}

function clientLabel(profile: AccountProfile) {
  return profile.full_name?.trim() || profile.email || 'Unnamed client'
}

function stateLabel(state: ClientState) {
  return clientStateOptions.find((option) => option.value === state)?.label ?? state
}

function formatBudget(value: number | null) {
  if (value === null) return '—'
  return `$${Math.round(value).toLocaleString('en-US')}`
}

function goalLabel(goal: AccountProfile['user_preferences']['homeGoal']) {
  return {
    researching: 'Researching',
    buying: 'Buying',
    selling: 'Selling',
    refinancing: 'Refinancing',
    investing: 'Investing',
  }[goal]
}

function propertyTypeLabel(propertyType: AccountProfile['user_preferences']['propertyType']) {
  return {
    any: 'Any property type',
    'single-family': 'Single-family',
    'condo-townhome': 'Condo / townhome',
    'multi-unit': 'Multi-unit',
  }[propertyType]
}

function loanTypeLabel(loanType: AccountProfile['user_preferences']['loanType']) {
  return loanType === 'FHA' || loanType === 'VA' || loanType === 'jumbo' || loanType === 'cash'
    ? loanType
    : 'Conventional'
}

function formatPercent(value: number | null) {
  return value === null ? '—' : `${Number(value.toFixed(2))}%`
}

function formatAreas(areas: string[]) {
  return areas.length ? areas.join(', ') : 'No areas saved'
}

function formatHomeSize(plan: AccountProfile['user_preferences']) {
  const bedrooms = plan.bedrooms === null ? null : `${plan.bedrooms} bd`
  const bathrooms = plan.bathrooms === null ? null : `${plan.bathrooms} ba`
  return [bedrooms, bathrooms].filter(Boolean).join(' · ') || 'No size preference'
}

function estimatedNetProceeds(plan: AccountProfile['user_preferences']) {
  if (plan.targetSalePrice === null) return null

  return (
    plan.targetSalePrice -
    (plan.currentMortgageBalance ?? 0) -
    plan.targetSalePrice * (plan.sellingCostPercent / 100) -
    (plan.repairsBudget ?? 0)
  )
}

function settingLabel(value: string) {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function PlanItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="hs-plan-item">
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  )
}

function ClientPlanSummary({ plan }: { plan: AccountProfile['user_preferences'] }) {
  const isBuyer = plan.homeGoal === 'buying'
  const isSeller = plan.homeGoal === 'selling'
  const activeAlerts = [
    plan.notifications.advisorMessages,
    plan.notifications.rateAlerts,
    plan.notifications.marketAlerts,
    plan.notifications.calendarReminders,
  ].filter(Boolean).length

  return (
    <section className="hs-record__section hs-client-profile-plan">
      <div className="hs-client-profile-plan__head">
        <div>
          <h3>Client plan</h3>
          <p>Saved settings from the client workspace</p>
        </div>
        <span className={`hs-plan-badge hs-plan-badge--${plan.homeGoal}`}>
          {goalLabel(plan.homeGoal)}
        </span>
      </div>

      <div className="hs-plan-grid">
        <PlanItem label="Timeline" value={plan.timeline} />
        <PlanItem label="Saved areas" value={formatAreas(plan.savedAreas)} />

        {isBuyer && (
          <>
            <PlanItem label="Property type" value={propertyTypeLabel(plan.propertyType)} />
            <PlanItem label="Home size" value={formatHomeSize(plan)} />
            <PlanItem
              label="Comfortable payment"
              value={plan.comfortableMonthlyPayment === null ? 'Not set' : `${formatBudget(plan.comfortableMonthlyPayment)} / month`}
            />
            <PlanItem
              label="Down payment"
              value={`${plan.downPaymentAmount === null ? 'Amount not set' : formatBudget(plan.downPaymentAmount)} · ${formatPercent(plan.downPaymentPercent)}`}
            />
            <PlanItem
              label="Financing"
              value={`${loanTypeLabel(plan.loanType)} · ${plan.loanTermYears}-year term`}
            />
            <PlanItem
              label="Home costs"
              value={`${formatPercent(plan.annualPropertyTaxRate)} tax · ${formatBudget(plan.annualHomeInsurance)}/yr insurance · ${formatBudget(plan.monthlyHoa)}/mo HOA`}
            />
            <PlanItem
              label="Cash reserve"
              value={plan.cashReserve === null ? 'Not set' : formatBudget(plan.cashReserve)}
            />
          </>
        )}

        {isSeller && (
          <>
            <PlanItem label="Current home value" value={formatBudget(plan.currentHomeValue)} />
            <PlanItem label="Mortgage balance" value={formatBudget(plan.currentMortgageBalance)} />
            <PlanItem label="Target sale price" value={formatBudget(plan.targetSalePrice)} />
            <PlanItem
              label="Estimated net proceeds"
              value={formatBudget(estimatedNetProceeds(plan))}
            />
            <PlanItem label="Selling costs" value={formatPercent(plan.sellingCostPercent)} />
            <PlanItem label="Repairs budget" value={formatBudget(plan.repairsBudget)} />
          </>
        )}

        {!isBuyer && !isSeller && (
          <>
            <PlanItem label="Property type" value={propertyTypeLabel(plan.propertyType)} />
            <PlanItem label="Market horizon" value={plan.marketRange} />
          </>
        )}

        <PlanItem label="Default workspace" value={settingLabel(plan.defaultView)} />
        <PlanItem label="Active alerts" value={`${activeAlerts} of 4 enabled`} />
      </div>

      {(plan.mustHaves || plan.dealBreakers) && (
        <div className="hs-plan-notes">
          {plan.mustHaves && (
            <p>
              <small>Must-haves</small>
              <span>{plan.mustHaves}</span>
            </p>
          )}
          {plan.dealBreakers && (
            <p>
              <small>Deal-breakers</small>
              <span>{plan.dealBreakers}</span>
            </p>
          )}
        </div>
      )}
    </section>
  )
}

export function AdvisorConsoleTab({
  user,
  plans,
  clientPlanState,
  onToggleClientPlan,
}: AdvisorConsoleTabProps) {
  const canUseConsole = user.role === 'advisor' || user.role === 'admin'
  const [clients, setClients] = useState<AccountProfile[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [draftState, setDraftState] = useState<{
    clientId: string
    draft: ConsoleDraft
  } | null>(null)
  const [command, setCommand] = useState('')
  const [loading, setLoading] = useState(canUseConsole)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const commandRef = useRef<HTMLInputElement>(null)

  const normalizedCommand = command
    .replace(/^\/\s*/, '')
    .replace(/^find\s+/i, '')
    .trim()
    .toLowerCase()

  const filteredClients = useMemo(() => {
    if (!normalizedCommand) return clients

    return clients.filter((client) =>
      [
        clientLabel(client),
        client.email ?? '',
        client.client_state,
        client.neighborhoods.join(' '),
        client.user_preferences.savedAreas.join(' '),
        client.user_preferences.homeGoal,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedCommand),
    )
  }, [clients, normalizedCommand])

  const selectedClient =
    clients.find((client) => client.id === selectedId) ?? filteredClients[0] ?? clients[0]
  const draft =
    selectedClient && draftState?.clientId === selectedClient.id
      ? draftState.draft
      : selectedClient
        ? draftFromProfile(selectedClient)
        : emptyDraft

  useEffect(() => {
    if (!canUseConsole) return

    let active = true

    async function loadClients() {
      setLoading(true)
      setError('')

      try {
        const data =
          user.isDemo || !isSupabaseConfigured
            ? overviewDemoAccounts.map(profileFromDemo)
            : await listAdvisorClientProfiles()

        if (!active) return

        setClients(data)
        setSelectedId((current) => current || data[0]?.id || '')
      } catch {
        if (!active) return
        setError('Unable to load client profiles.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadClients()

    return () => {
      active = false
    }
  }, [canUseConsole, user.isDemo])

  useEffect(() => {
    function handleKeyboard(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      const isFormField =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        if (selectedClient) void saveDraft()
        return
      }

      if (event.key === '/' && !isFormField) {
        event.preventDefault()
        commandRef.current?.focus()
        return
      }

      if (!filteredClients.length || isFormField) return

      if (event.key === 'j' || event.key === 'k') {
        event.preventDefault()
        const currentIndex = Math.max(
          0,
          filteredClients.findIndex((client) => client.id === selectedClient?.id),
        )
        const delta = event.key === 'j' ? 1 : -1
        const nextIndex = (currentIndex + delta + filteredClients.length) % filteredClients.length
        selectClient(filteredClients[nextIndex].id)
      }
    }

    window.addEventListener('keydown', handleKeyboard)
    return () => window.removeEventListener('keydown', handleKeyboard)
  })

  async function saveDraft() {
    if (!selectedClient || saving) return

    const patch = toPersonalizationPatch(draft)
    setSaving(true)
    setStatus('')
    setError('')

    try {
      const updatedProfile =
        user.isDemo || !isSupabaseConfigured
          ? updateProfileFromPatch(selectedClient, patch)
          : await updateClientPersonalization(selectedClient.id, patch)

      setClients((current) =>
        current.map((client) => (client.id === updatedProfile.id ? updatedProfile : client)),
      )
      setStatus(`Saved ${clientLabel(updatedProfile)}.`)
    } catch {
      setError('Unable to save personalization.')
    } finally {
      setSaving(false)
    }
  }

  function updateDraft(patch: Partial<ConsoleDraft>) {
    if (!selectedClient) return

    setDraftState({
      clientId: selectedClient.id,
      draft: {
        ...draft,
        ...patch,
      },
    })
  }

  function selectClient(clientId: string) {
    setSelectedId(clientId)
    setStatus('')
    setError('')
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void saveDraft()
  }

  if (!canUseConsole) {
    return (
      <section className="hs-page">
        <div className="hs-empty-card">
          <Lock size={26} />
          <h2>Advisor access required</h2>
          <p>Your account doesn't have permission to manage client records.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="hs-page">
      <div className="hs-page__head">
        <div>
          <p className="hs-eyebrow">Advisor console</p>
          <h1 className="hs-page__title">Clients</h1>
        </div>
        <div className="hs-page__meta">
          <Users size={15} />
          <span>{filteredClients.length} records</span>
        </div>
      </div>

      {loading ? (
        <div className="hs-loading">
          <Loader2 size={18} className="hs-spin" />
          Loading clients
        </div>
      ) : (
        <div className="hs-crm">
          <aside className="hs-card hs-index" aria-label="Clients">
            <label className="hs-index__search" htmlFor="advisor-command">
              <Search size={15} />
              <input
                ref={commandRef}
                id="advisor-command"
                value={command}
                onChange={(event) => setCommand(event.target.value)}
                placeholder="Search name, area, stage"
              />
            </label>

            <ul className="hs-index__list">
              {filteredClients.map((client) => {
                const active = client.id === selectedClient?.id
                return (
                  <li key={client.id}>
                    <button
                      type="button"
                      className={active ? 'hs-index__row is-active' : 'hs-index__row'}
                      onClick={() => selectClient(client.id)}
                    >
                      <span className="hs-index__avatar">
                        {clientLabel(client).slice(0, 1).toUpperCase()}
                      </span>
                      <span className="hs-index__copy">
                        <strong>{clientLabel(client)}</strong>
                        <small>{client.email}</small>
                        <small className="hs-index__plan">
                          {goalLabel(client.user_preferences.homeGoal)} plan
                        </small>
                      </span>
                      <span className={`hs-stage hs-stage--${client.client_state}`}>
                        {stateLabel(client.client_state)}
                      </span>
                    </button>
                  </li>
                )
              })}
              {!filteredClients.length && (
                <li className="hs-index__empty">
                  <Users size={18} />
                  No clients match
                </li>
              )}
            </ul>
          </aside>

          {selectedClient ? (
            <form className="hs-card hs-record" onSubmit={handleSubmit}>
              <header className="hs-record__head">
                <span className="hs-record__avatar">
                  {clientLabel(selectedClient).slice(0, 1).toUpperCase()}
                </span>
                <div className="hs-record__id">
                  <h2>{clientLabel(selectedClient)}</h2>
                  <p>
                    <UserRound size={13} />
                    {selectedClient.email}
                  </p>
                </div>
                <span className={`hs-stage hs-stage--${draft.clientState}`}>
                  {stateLabel(draft.clientState)}
                </span>
              </header>

              <div className="hs-record__stats">
                <div>
                  <small>Target budget</small>
                  <strong>{formatBudget(parseOptionalNumber(draft.targetBudget))}</strong>
                </div>
                <div>
                  <small>Locked rate</small>
                  <strong>{draft.lockedRate ? `${draft.lockedRate}%` : '—'}</strong>
                </div>
                <div>
                  <small>Closing date</small>
                  <strong>{draft.closingDate || '—'}</strong>
                </div>
              </div>

              <ClientPlanSummary plan={selectedClient.user_preferences} />

              <div className="hs-record__section">
                <h3>Properties</h3>
                <div className="hs-fields">
                  <label className="hs-field" htmlFor="advisor-client-state">
                    <span>Lifecycle stage</span>
                    <div className="hs-select">
                      <select
                        id="advisor-client-state"
                        value={draft.clientState}
                        onChange={(event) =>
                          updateDraft({ clientState: event.target.value as ClientState })
                        }
                      >
                        {clientStateOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </label>

                  <label className="hs-field hs-field--wide" htmlFor="advisor-note">
                    <span>
                      <MessageSquareText size={13} /> Advisor note
                    </span>
                    <textarea
                      id="advisor-note"
                      value={draft.advisorNote}
                      rows={4}
                      maxLength={2000}
                      placeholder="Context, next steps, preferences…"
                      onChange={(event) => updateDraft({ advisorNote: event.target.value })}
                    />
                  </label>

                  <label className="hs-field" htmlFor="advisor-target-budget">
                    <span>
                      <WalletCards size={13} /> Target budget
                    </span>
                    <div className="hs-input hs-input--prefix" data-prefix="$">
                      <input
                        id="advisor-target-budget"
                        value={draft.targetBudget}
                        inputMode="numeric"
                        placeholder="0"
                        onChange={(event) => updateDraft({ targetBudget: event.target.value })}
                      />
                    </div>
                  </label>

                  <label className="hs-field" htmlFor="advisor-neighborhoods">
                    <span>
                      <MapPin size={13} /> Neighborhoods
                    </span>
                    <div className="hs-input">
                      <input
                        id="advisor-neighborhoods"
                        value={draft.neighborhoods}
                        placeholder="Comma separated"
                        onChange={(event) => updateDraft({ neighborhoods: event.target.value })}
                      />
                    </div>
                  </label>

                  <label className="hs-field" htmlFor="advisor-closing-date">
                    <span>
                      <CalendarDays size={13} /> Closing date
                    </span>
                    <div className="hs-input">
                      <input
                        id="advisor-closing-date"
                        type="date"
                        value={draft.closingDate}
                        onChange={(event) => updateDraft({ closingDate: event.target.value })}
                      />
                    </div>
                  </label>

                  <label className="hs-field" htmlFor="advisor-locked-rate">
                    <span>
                      <Percent size={13} /> Locked rate
                    </span>
                    <div className="hs-input hs-input--suffix" data-suffix="%">
                      <input
                        id="advisor-locked-rate"
                        value={draft.lockedRate}
                        inputMode="decimal"
                        placeholder="0.00"
                        onChange={(event) => updateDraft({ lockedRate: event.target.value })}
                      />
                    </div>
                  </label>

                  <label className="hs-field" htmlFor="advisor-refi-threshold">
                    <span>
                      <Percent size={13} /> Refi threshold
                    </span>
                    <div className="hs-input hs-input--suffix" data-suffix="%">
                      <input
                        id="advisor-refi-threshold"
                        value={draft.refiThreshold}
                        inputMode="decimal"
                        placeholder="0.00"
                        onChange={(event) => updateDraft({ refiThreshold: event.target.value })}
                      />
                    </div>
                  </label>
                </div>
              </div>

              <div className="hs-record__section">
                <h3>Action plans</h3>
                {(() => {
                  const applicable = plans.filter(
                    (plan) =>
                      plan.stage === selectedClient.client_state ||
                      (plan.signalDriven &&
                        clientMatchesTrigger(selectedClient, plan.trigger, SAMPLE_MARKET_RATE)),
                  )

                  if (!applicable.length) {
                    return <p className="hs-muted-note">No plans apply to this client's stage.</p>
                  }

                  return (
                    <div className="hs-client-plans">
                      {applicable.map((plan) => {
                        const active =
                          clientPlanState[selectedClient.id]?.[plan.id] ?? plan.enabled
                        const matches = clientMatchesTrigger(
                          selectedClient,
                          plan.trigger,
                          SAMPLE_MARKET_RATE,
                        )
                        return (
                          <div className="hs-client-plan" key={plan.id}>
                            <span className="hs-client-plan__icon">
                              <Route size={15} />
                            </span>
                            <span className="hs-client-plan__copy">
                              <strong>
                                {plan.name}
                                {plan.signalDriven && <em className="hs-client-plan__tag">signal</em>}
                              </strong>
                              <small>
                                {triggerSummary(plan.trigger)}
                                {matches && <b className="hs-client-plan__match"> · matches now</b>}
                              </small>
                            </span>
                            <label
                              className="hs-switch hs-switch--sm"
                              title={
                                plan.enabled
                                  ? active
                                    ? 'Active for this client'
                                    : 'Off for this client'
                                  : 'Paused globally'
                              }
                            >
                              <input
                                type="checkbox"
                                checked={plan.enabled && active}
                                disabled={!plan.enabled}
                                onChange={(event) =>
                                  onToggleClientPlan(
                                    selectedClient.id,
                                    plan.id,
                                    event.target.checked,
                                  )
                                }
                              />
                              <span className="hs-switch__track" aria-hidden="true" />
                            </label>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>

              <footer className="hs-record__foot">
                <div className="hs-record__status" aria-live="polite">
                  {status && (
                    <span className="hs-msg hs-msg--ok">
                      <CheckCircle2 size={15} />
                      {status}
                    </span>
                  )}
                  {error && <span className="hs-msg hs-msg--err">{error}</span>}
                </div>
                <button className="hs-btn hs-btn--primary" type="submit" disabled={saving}>
                  {saving ? <Loader2 size={15} className="hs-spin" /> : <Save size={15} />}
                  {saving ? 'Saving' : 'Save'}
                </button>
              </footer>
            </form>
          ) : (
            <section className="hs-card hs-empty-card">
              <Users size={22} />
              <h2>No client selected</h2>
              <p>Choose a client from the list to edit their record.</p>
            </section>
          )}
        </div>
      )}
    </section>
  )
}
