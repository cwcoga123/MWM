import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRightLeft,
  CalendarClock,
  CalendarSync,
  CheckSquare,
  Clock,
  ChevronDown,
  ChevronUp,
  Copy,
  Flame,
  Loader2,
  Lock,
  Mail,
  MapPinned,
  Plus,
  RotateCcw,
  Route,
  Save,
  Sparkles,
  Sprout,
  StickyNote,
  Tag,
  Trash2,
  TrendingDown,
  Users,
  X,
} from 'lucide-react'
import { listAdvisorClientProfiles, type AccountProfile, type ClientState } from '../../lib/accounts'
import { demoClientProfiles } from '../../lib/demoProfiles'
import { isSupabaseConfigured } from '../../lib/supabase'
import {
  SAMPLE_MARKET_RATE,
  STAGE_ORDER,
  clientMatchesTrigger,
  stageLabel,
  stepSummary,
  stepTiming,
  triggerSummary,
  type ActionPlan,
  type PlanStep,
  type PlanTrigger,
} from '../../data/actionPlans'
import type { HubUser } from '../shell/AdminAuthGate'

interface ActionPlansTabProps {
  user: HubUser
  plans: ActionPlan[]
  canEdit: boolean
  onPlansChange: (plans: ActionPlan[]) => void
}

const CALCULATOR_OPTIONS = [
  'affordability',
  'mortgage-calculator',
  'rent-vs-buy',
  'refinance-break-even',
  'home-equity',
  'buyer-closing-costs',
]

const TRIGGER_KINDS: { value: PlanTrigger['kind']; label: string }[] = [
  { value: 'stage_enter', label: 'Enters a lifecycle stage' },
  { value: 'rate_below_refi_threshold', label: 'Rate ≤ refi threshold' },
  { value: 'rate_below_locked', label: 'Rate ≤ locked rate' },
  { value: 'closing_in_days', label: 'N days before closing' },
  { value: 'closing_anniversary', label: 'Closing anniversary' },
  { value: 'calculator_streak', label: 'Calculator streak' },
  { value: 'manual', label: 'Manual only' },
]

const SIGNAL_KINDS: PlanTrigger['kind'][] = [
  'rate_below_refi_threshold',
  'rate_below_locked',
  'calculator_streak',
]

const PLAN_FOLDERS = ['My plans', 'Buyer journey', 'Seller journey', 'Homeowner care']

const STEP_KINDS: { kind: PlanStep['kind']; label: string }[] = [
  { kind: 'task', label: 'Task' },
  { kind: 'email', label: 'Email' },
  { kind: 'wait', label: 'Wait' },
  { kind: 'note', label: 'Note' },
  { kind: 'add_tag', label: 'Tag' },
  { kind: 'set_stage', label: 'Stage' },
]

function deriveSignal(trigger: PlanTrigger) {
  return SIGNAL_KINDS.includes(trigger.kind)
}

function defaultTrigger(kind: PlanTrigger['kind'], stage: ClientState): PlanTrigger {
  switch (kind) {
    case 'stage_enter':
      return { kind, state: stage }
    case 'rate_below_refi_threshold':
      return { kind }
    case 'rate_below_locked':
      return { kind, marginBps: 25 }
    case 'closing_in_days':
      return { kind, days: 14 }
    case 'closing_anniversary':
      return { kind }
    case 'calculator_streak':
      return { kind, calculatorId: 'affordability', times: 3, withinDays: 7 }
    case 'manual':
      return { kind }
  }
}

function defaultStep(kind: PlanStep['kind']): PlanStep {
  switch (kind) {
    case 'task':
      return { kind, title: 'New task', dueOffsetDays: 0 }
    case 'email':
      return { kind, templateId: 'custom', subject: 'New email', sendOffsetDays: 0 }
    case 'wait':
      return { kind, days: 1 }
    case 'note':
      return { kind, text: 'New note', dueOffsetDays: 0 }
    case 'add_tag':
      return { kind, tag: 'new-tag', dueOffsetDays: 0 }
    case 'set_stage':
      return { kind, state: 'homeowner' }
  }
}

function planIcon(plan: ActionPlan) {
  switch (plan.id) {
    case 'first-touch-nurture':
      return <Sprout size={18} />
    case 'affordability-momentum':
      return <Flame size={18} />
    case 'buyer-activation':
      return <MapPinned size={18} />
    case 'closing-countdown':
      return <CalendarClock size={18} />
    case 'rate-float-down-watch':
      return <ArrowRightLeft size={18} />
    case 'annual-equity-review':
      return <CalendarSync size={18} />
    case 'refi-opportunity-outreach':
      return <TrendingDown size={18} />
    default:
      return <Route size={18} />
  }
}

function triggerIcon(trigger: PlanTrigger) {
  switch (trigger.kind) {
    case 'rate_below_refi_threshold':
    case 'rate_below_locked':
      return <TrendingDown size={20} />
    case 'closing_in_days':
      return <CalendarClock size={20} />
    case 'closing_anniversary':
      return <CalendarSync size={20} />
    case 'calculator_streak':
      return <Flame size={20} />
    default:
      return <Route size={20} />
  }
}

function stepIcon(step: PlanStep) {
  switch (step.kind) {
    case 'task':
      return <CheckSquare size={15} />
    case 'email':
      return <Mail size={15} />
    case 'wait':
      return <Clock size={15} />
    case 'note':
      return <StickyNote size={15} />
    case 'add_tag':
      return <Tag size={15} />
    case 'set_stage':
      return <ArrowRightLeft size={15} />
  }
}

function clientLabel(profile: AccountProfile) {
  return profile.full_name?.trim() || profile.email || 'Unnamed client'
}

export function ActionPlansTab({ user, plans, canEdit, onPlansChange }: ActionPlansTabProps) {
  const [clients, setClients] = useState<AccountProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [draftPlans, setDraftPlans] = useState<ActionPlan[]>(plans)
  const [savedPlans, setSavedPlans] = useState<ActionPlan[]>(plans)
  const [selectedId, setSelectedId] = useState(plans[0]?.id ?? '')
  const [dirty, setDirty] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true

    async function loadClients() {
      setLoading(true)
      try {
        const data =
          user.isDemo || !isSupabaseConfigured
            ? demoClientProfiles
            : await listAdvisorClientProfiles()
        if (active) setClients(data)
      } catch {
        if (active) setClients(demoClientProfiles)
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadClients()
    return () => {
      active = false
    }
  }, [user.isDemo])

  const matchesByPlan = useMemo(() => {
    const map = new Map<string, AccountProfile[]>()
    for (const plan of draftPlans) {
      map.set(
        plan.id,
        clients.filter((client) => clientMatchesTrigger(client, plan.trigger, SAMPLE_MARKET_RATE)),
      )
    }
    return map
  }, [clients, draftPlans])

  const grouped = useMemo(
    () =>
      STAGE_ORDER.map((stage) => ({
        stage,
        plans: draftPlans.filter((plan) => plan.stage === stage),
      })).filter((group) => group.plans.length > 0),
    [draftPlans],
  )

  const selectedPlan = draftPlans.find((plan) => plan.id === selectedId) ?? draftPlans[0]
  const matched = selectedPlan ? matchesByPlan.get(selectedPlan.id) ?? [] : []

  // ---- editing helpers ----
  function patchPlan(id: string, patch: Partial<ActionPlan>) {
    setDraftPlans((current) =>
      current.map((plan) => (plan.id === id ? { ...plan, ...patch } : plan)),
    )
    setDirty(true)
    setNotice('')
  }

  function setTrigger(id: string, trigger: PlanTrigger) {
    patchPlan(id, { trigger, signalDriven: deriveSignal(trigger) })
  }

  function patchStep(id: string, index: number, step: PlanStep) {
    const plan = draftPlans.find((item) => item.id === id)
    if (!plan) return
    patchPlan(id, { steps: plan.steps.map((current, i) => (i === index ? step : current)) })
  }

  function addStep(id: string, kind: PlanStep['kind']) {
    const plan = draftPlans.find((item) => item.id === id)
    if (!plan) return
    patchPlan(id, { steps: [...plan.steps, defaultStep(kind)] })
  }

  function removeStep(id: string, index: number) {
    const plan = draftPlans.find((item) => item.id === id)
    if (!plan) return
    patchPlan(id, { steps: plan.steps.filter((_, i) => i !== index) })
  }

  function moveStep(id: string, index: number, direction: -1 | 1) {
    const plan = draftPlans.find((item) => item.id === id)
    if (!plan) return

    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= plan.steps.length) return

    const steps = [...plan.steps]
    ;[steps[index], steps[nextIndex]] = [steps[nextIndex], steps[index]]
    patchPlan(id, { steps })
  }

  function createPlan() {
    const id = `custom-plan-${Date.now()}`
    const plan: ActionPlan = {
      id,
      name: 'New action plan',
      description: 'A reusable follow-up workflow for your team.',
      folder: 'My plans',
      pauseOnReply: true,
      shared: true,
      stage: 'browsing',
      signalDriven: false,
      enabled: true,
      trigger: { kind: 'manual' },
      steps: [defaultStep('task')],
    }

    setDraftPlans((current) => [...current, plan])
    setSelectedId(id)
    setDirty(true)
    setNotice('')
  }

  function duplicatePlan() {
    if (!selectedPlan) return

    const copy: ActionPlan = {
      ...selectedPlan,
      id: `custom-plan-${Date.now()}`,
      name: `${selectedPlan.name} copy`,
      shared: false,
      steps: selectedPlan.steps.map((step) => ({ ...step })),
    }

    setDraftPlans((current) => {
      const index = current.findIndex((plan) => plan.id === selectedPlan.id)
      return [...current.slice(0, index + 1), copy, ...current.slice(index + 1)]
    })
    setSelectedId(copy.id)
    setDirty(true)
    setNotice('')
  }

  function deletePlan() {
    if (!selectedPlan || !window.confirm(`Delete “${selectedPlan.name}”?`)) return

    const remaining = draftPlans.filter((plan) => plan.id !== selectedPlan.id)
    setDraftPlans(remaining)
    setSelectedId(remaining[0]?.id ?? '')
    setDirty(true)
    setNotice('')
  }

  function saveChanges() {
    onPlansChange(draftPlans)
    setSavedPlans(draftPlans)
    setDirty(false)
    setNotice('Changes saved.')
  }

  function discardChanges() {
    setDraftPlans(savedPlans)
    setSelectedId((current) => (savedPlans.some((plan) => plan.id === current) ? current : savedPlans[0]?.id ?? ''))
    setDirty(false)
    setNotice('Draft changes discarded.')
  }

  return (
    <section className="hs-page">
      <div className="hs-page__head">
        <div>
          <p className="hs-eyebrow">Automation</p>
          <h1 className="hs-page__title">Action plans</h1>
        </div>
        <div className="hs-page__meta">
          {canEdit ? <Sparkles size={15} /> : <Lock size={15} />}
          <span>{canEdit ? 'Editable' : 'View only'}</span>
        </div>
      </div>

      <div className="hs-crm">
        <aside className="hs-card hs-index" aria-label="Action plans">
          <div className="hs-plan-index__head">
            <div className="hs-plan-index__note">
              <Sparkles size={13} />
              <span>Sample 30-yr rate {SAMPLE_MARKET_RATE.toFixed(2)}%</span>
            </div>
            {canEdit && (
              <button className="hs-btn hs-btn--small hs-btn--outline" type="button" onClick={createPlan}>
                <Plus size={14} /> New plan
              </button>
            )}
          </div>
          <div className="hs-plan-index__list">
            {grouped.map((group) => (
              <div key={group.stage} className="hs-plan-group">
                <p className="hs-plan-group__label">{stageLabel(group.stage)}</p>
                {group.plans.map((plan) => {
                  const active = plan.id === selectedPlan?.id
                  const count = matchesByPlan.get(plan.id)?.length ?? 0
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      className={active ? 'hs-plan-row is-active' : 'hs-plan-row'}
                      onClick={() => setSelectedId(plan.id)}
                    >
                      <span className="hs-plan-row__icon">{planIcon(plan)}</span>
                      <span className="hs-plan-row__copy">
                        <strong>
                          {plan.name}
                          {!plan.enabled && <em className="hs-plan-row__paused"> · paused</em>}
                        </strong>
                        <small>{triggerSummary(plan.trigger)}</small>
                      </span>
                      {plan.signalDriven && (
                        <span className="hs-plan-row__signal" title="Signal only MWM can see" />
                      )}
                      {count > 0 && <span className="hs-plan-row__count">{count}</span>}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </aside>

        {selectedPlan ? (
          <div className="hs-card hs-plan">
            <header className="hs-plan__head">
              <span className="hs-plan__icon">{planIcon(selectedPlan)}</span>
              <div className="hs-plan__id">
                {canEdit ? (
                  <input
                    className="hs-plan__name-input"
                    value={selectedPlan.name}
                    aria-label="Plan name"
                    onChange={(event) => patchPlan(selectedPlan.id, { name: event.target.value })}
                  />
                ) : (
                  <h2>{selectedPlan.name}</h2>
                )}
                <p>
                  {stageLabel(selectedPlan.stage)} · {selectedPlan.steps.length} steps
                </p>
              </div>
              <div className="hs-plan__badges">
                {selectedPlan.signalDriven && (
                  <span className="hs-badge hs-badge--signal">
                    <Sparkles size={12} /> Signal-driven
                  </span>
                )}
                {canEdit ? (
                  <label className="hs-switch" title={selectedPlan.enabled ? 'Active' : 'Paused'}>
                    <input
                      type="checkbox"
                      checked={selectedPlan.enabled}
                      onChange={(event) =>
                        patchPlan(selectedPlan.id, { enabled: event.target.checked })
                      }
                    />
                    <span className="hs-switch__track" aria-hidden="true" />
                    <span className="hs-switch__label">
                      {selectedPlan.enabled ? 'Active' : 'Paused'}
                    </span>
                  </label>
                ) : (
                  <span className="hs-badge hs-badge--on">
                    {selectedPlan.enabled ? 'Active' : 'Paused'}
                  </span>
                )}
              </div>
              {canEdit && (
                <div className="hs-plan__tools">
                  <button
                    className="hs-iconbtn hs-iconbtn--quiet"
                    type="button"
                    title="Duplicate action plan"
                    aria-label="Duplicate action plan"
                    onClick={duplicatePlan}
                  >
                    <Copy size={15} />
                  </button>
                  <button
                    className="hs-iconbtn hs-iconbtn--quiet hs-iconbtn--danger"
                    type="button"
                    title="Delete action plan"
                    aria-label="Delete action plan"
                    onClick={deletePlan}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </header>

            <div className="hs-plan__section hs-plan__metadata">
              {canEdit ? (
                <>
                  <label className="hs-field-sm hs-field-sm--wide">
                    <span>Plan description</span>
                    <input
                      value={selectedPlan.description ?? ''}
                      placeholder="What should this follow-up accomplish?"
                      onChange={(event) =>
                        patchPlan(selectedPlan.id, { description: event.target.value })
                      }
                    />
                  </label>
                  <div className="hs-plan__metadata-grid">
                    <label className="hs-field-sm">
                      <span>Folder</span>
                      <div className="hs-select">
                        <select
                          value={selectedPlan.folder ?? 'My plans'}
                          onChange={(event) =>
                            patchPlan(selectedPlan.id, { folder: event.target.value })
                          }
                        >
                          {PLAN_FOLDERS.map((folder) => (
                            <option key={folder} value={folder}>
                              {folder}
                            </option>
                          ))}
                        </select>
                      </div>
                    </label>
                    <label className="hs-field-sm">
                      <span>Primary stage</span>
                      <div className="hs-select">
                        <select
                          value={selectedPlan.stage}
                          onChange={(event) =>
                            patchPlan(selectedPlan.id, {
                              stage: event.target.value as ClientState,
                            })
                          }
                        >
                          {STAGE_ORDER.map((stage) => (
                            <option key={stage} value={stage}>
                              {stageLabel(stage)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </label>
                  </div>
                  <div className="hs-plan__preferences">
                    <label className="hs-check">
                      <input
                        type="checkbox"
                        checked={selectedPlan.pauseOnReply ?? true}
                        onChange={(event) =>
                          patchPlan(selectedPlan.id, { pauseOnReply: event.target.checked })
                        }
                      />
                      <span>
                        <strong>Pause when the client replies</strong>
                        <small>Keep human conversations from competing with automation.</small>
                      </span>
                    </label>
                    <label className="hs-check">
                      <input
                        type="checkbox"
                        checked={selectedPlan.shared ?? true}
                        onChange={(event) =>
                          patchPlan(selectedPlan.id, { shared: event.target.checked })
                        }
                      />
                      <span>
                        <strong>Share with the team</strong>
                        <small>Make this plan available to other advisors.</small>
                      </span>
                    </label>
                  </div>
                </>
              ) : (
                <div className="hs-plan__metadata-readonly">
                  <strong>{selectedPlan.description || 'No description added.'}</strong>
                  <span>
                    {selectedPlan.folder ?? 'My plans'} · {selectedPlan.shared === false ? 'Private' : 'Shared'}
                    {selectedPlan.pauseOnReply === false ? ' · Runs through replies' : ' · Pauses on reply'}
                  </span>
                </div>
              )}
            </div>

            <div className="hs-plan__section">
              <p className="hs-plan__label">Enrollment trigger</p>
              {canEdit ? (
                <TriggerEditor
                  plan={selectedPlan}
                  onChange={(trigger) => setTrigger(selectedPlan.id, trigger)}
                />
              ) : (
                <div
                  className={
                    selectedPlan.signalDriven ? 'hs-trigger hs-trigger--signal' : 'hs-trigger'
                  }
                >
                  <span className="hs-trigger__icon">{triggerIcon(selectedPlan.trigger)}</span>
                  <span className="hs-trigger__copy">
                    <strong>{triggerSummary(selectedPlan.trigger)}</strong>
                    <small>Evaluated daily against every active client</small>
                  </span>
                  <code className="hs-trigger__kind">{selectedPlan.trigger.kind}</code>
                </div>
              )}
            </div>

            <div className="hs-plan__section">
              <p className="hs-plan__label">Steps</p>
              {canEdit ? (
                <>
                  <div className="hs-step-list">
                    {selectedPlan.steps.map((step, index) => (
                      <StepEditor
                        key={index}
                        step={step}
                        onChange={(next) => patchStep(selectedPlan.id, index, next)}
                        onRemove={() => removeStep(selectedPlan.id, index)}
                        onMoveUp={() => moveStep(selectedPlan.id, index, -1)}
                        onMoveDown={() => moveStep(selectedPlan.id, index, 1)}
                        isFirst={index === 0}
                        isLast={index === selectedPlan.steps.length - 1}
                      />
                    ))}
                    {!selectedPlan.steps.length && (
                      <p className="hs-muted-note">No steps yet — add one below.</p>
                    )}
                  </div>
                  <div className="hs-addstep">
                    {STEP_KINDS.map((option) => (
                      <button
                        key={option.kind}
                        type="button"
                        onClick={() => addStep(selectedPlan.id, option.kind)}
                      >
                        <Plus size={14} /> {option.label}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <ol className="hs-timeline">
                  {selectedPlan.steps.map((step, index) => (
                    <li key={index} className={`hs-timeline__item hs-timeline__item--${step.kind}`}>
                      <span className="hs-timeline__icon">{stepIcon(step)}</span>
                      <span className="hs-timeline__copy">
                        <strong>{stepSummary(step)}</strong>
                        <small>{stepTiming(step)}</small>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="hs-plan__section hs-plan__section--enrolled">
              <p className="hs-plan__label">
                Would enroll today
                <span className="hs-plan__count-pill">{matched.length}</span>
              </p>
              {loading ? (
                <div className="hs-loading hs-loading--inline">
                  <Loader2 size={16} className="hs-spin" />
                  Checking clients
                </div>
              ) : matched.length ? (
                <ul className="hs-enrolled">
                  {matched.map((client) => (
                    <li key={client.id}>
                      <span className="hs-enrolled__avatar">
                        {clientLabel(client).slice(0, 1).toUpperCase()}
                      </span>
                      <span className="hs-enrolled__copy">
                        <strong>{clientLabel(client)}</strong>
                        <small>{stageLabel(client.client_state)}</small>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="hs-enrolled__empty">
                  <Users size={16} />
                  No clients match this trigger right now
                </div>
              )}
            </div>

            {canEdit && (
              <footer className="hs-plan__footer">
                <div className="hs-plan__save-status" aria-live="polite">
                  {dirty ? <span>Unsaved changes</span> : notice || <span>All changes saved</span>}
                </div>
                <div className="hs-plan__footer-actions">
                  <button
                    className="hs-btn hs-btn--outline"
                    type="button"
                    disabled={!dirty}
                    onClick={discardChanges}
                  >
                    <RotateCcw size={14} /> Discard
                  </button>
                  <button
                    className="hs-btn hs-btn--primary"
                    type="button"
                    disabled={!dirty}
                    onClick={saveChanges}
                  >
                    <Save size={14} /> Save changes
                  </button>
                </div>
              </footer>
            )}
          </div>
        ) : (
          <section className="hs-card hs-empty-card hs-plan-empty">
            <Route size={24} />
            <h2>No action plan selected</h2>
            <p>Create a plan to build a reusable follow-up workflow.</p>
            {canEdit && (
              <button className="hs-btn hs-btn--primary" type="button" onClick={createPlan}>
                <Plus size={14} /> Create action plan
              </button>
            )}
          </section>
        )}
      </div>
    </section>
  )
}

/* -------------------------------------------------------------- Trigger editor */
function TriggerEditor({
  plan,
  onChange,
}: {
  plan: ActionPlan
  onChange: (trigger: PlanTrigger) => void
}) {
  const trigger = plan.trigger

  return (
    <div className="hs-trigger-edit">
      <label className="hs-field-sm">
        <span>Trigger type</span>
        <div className="hs-select">
          <select
            value={trigger.kind}
            onChange={(event) =>
              onChange(defaultTrigger(event.target.value as PlanTrigger['kind'], plan.stage))
            }
          >
            {TRIGGER_KINDS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </label>

      {trigger.kind === 'stage_enter' && (
        <label className="hs-field-sm">
          <span>Stage</span>
          <div className="hs-select">
            <select
              value={trigger.state}
              onChange={(event) =>
                onChange({ kind: 'stage_enter', state: event.target.value as ClientState })
              }
            >
              {STAGE_ORDER.map((stage) => (
                <option key={stage} value={stage}>
                  {stageLabel(stage)}
                </option>
              ))}
            </select>
          </div>
        </label>
      )}

      {trigger.kind === 'rate_below_refi_threshold' && (
        <label className="hs-field-sm">
          <span>Margin (bps)</span>
          <div className="hs-input">
            <input
              type="number"
              value={trigger.marginBps ?? 0}
              onChange={(event) =>
                onChange({ kind: 'rate_below_refi_threshold', marginBps: Number(event.target.value) })
              }
            />
          </div>
        </label>
      )}

      {trigger.kind === 'rate_below_locked' && (
        <label className="hs-field-sm">
          <span>Margin (bps)</span>
          <div className="hs-input">
            <input
              type="number"
              value={trigger.marginBps}
              onChange={(event) =>
                onChange({ kind: 'rate_below_locked', marginBps: Number(event.target.value) })
              }
            />
          </div>
        </label>
      )}

      {trigger.kind === 'closing_in_days' && (
        <label className="hs-field-sm">
          <span>Days before closing</span>
          <div className="hs-input">
            <input
              type="number"
              value={trigger.days}
              onChange={(event) =>
                onChange({ kind: 'closing_in_days', days: Number(event.target.value) })
              }
            />
          </div>
        </label>
      )}

      {trigger.kind === 'calculator_streak' && (
        <>
          <label className="hs-field-sm">
            <span>Calculator</span>
            <div className="hs-select">
              <select
                value={trigger.calculatorId}
                onChange={(event) =>
                  onChange({ ...trigger, calculatorId: event.target.value })
                }
              >
                {CALCULATOR_OPTIONS.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            </div>
          </label>
          <label className="hs-field-sm">
            <span>Times</span>
            <div className="hs-input">
              <input
                type="number"
                value={trigger.times}
                onChange={(event) => onChange({ ...trigger, times: Number(event.target.value) })}
              />
            </div>
          </label>
          <label className="hs-field-sm">
            <span>Within days</span>
            <div className="hs-input">
              <input
                type="number"
                value={trigger.withinDays}
                onChange={(event) => onChange({ ...trigger, withinDays: Number(event.target.value) })}
              />
            </div>
          </label>
        </>
      )}
    </div>
  )
}

/* ----------------------------------------------------------------- Step editor */
function StepEditor({
  step,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  step: PlanStep
  onChange: (step: PlanStep) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  isFirst: boolean
  isLast: boolean
}) {
  return (
    <div className={`hs-step-edit hs-step-edit--${step.kind}`}>
      <span className="hs-step-edit__icon">{stepIcon(step)}</span>

      {step.kind === 'task' && (
        <input
          className="hs-step-edit__text"
          value={step.title}
          aria-label="Task title"
          onChange={(event) => onChange({ ...step, title: event.target.value })}
        />
      )}
      {step.kind === 'email' && (
        <input
          className="hs-step-edit__text"
          value={step.subject}
          aria-label="Email subject"
          onChange={(event) => onChange({ ...step, subject: event.target.value })}
        />
      )}
      {step.kind === 'wait' && <span className="hs-step-edit__text hs-step-edit__static">Wait</span>}
      {step.kind === 'note' && (
        <input
          className="hs-step-edit__text"
          value={step.text}
          aria-label="Note text"
          onChange={(event) => onChange({ ...step, text: event.target.value })}
        />
      )}
      {step.kind === 'add_tag' && (
        <input
          className="hs-step-edit__text"
          value={step.tag}
          aria-label="Tag"
          onChange={(event) => onChange({ ...step, tag: event.target.value })}
        />
      )}
      {step.kind === 'set_stage' && (
        <div className="hs-select hs-step-edit__text">
          <select
            value={step.state}
            aria-label="Stage"
            onChange={(event) => onChange({ ...step, state: event.target.value as ClientState })}
          >
            {STAGE_ORDER.map((stage) => (
              <option key={stage} value={stage}>
                {stageLabel(stage)}
              </option>
            ))}
          </select>
        </div>
      )}

      {step.kind === 'task' && (
        <label className="hs-step-edit__day">
          <input
            type="number"
            value={step.dueOffsetDays}
            aria-label="Due day"
            onChange={(event) => onChange({ ...step, dueOffsetDays: Number(event.target.value) })}
          />
          <span>day</span>
        </label>
      )}
      {step.kind === 'email' && (
        <label className="hs-step-edit__day">
          <input
            type="number"
            value={step.sendOffsetDays}
            aria-label="Send day"
            onChange={(event) => onChange({ ...step, sendOffsetDays: Number(event.target.value) })}
          />
          <span>day</span>
        </label>
      )}
      {step.kind === 'wait' && (
        <label className="hs-step-edit__day">
          <input
            type="number"
            value={step.days}
            aria-label="Wait days"
            onChange={(event) => onChange({ ...step, days: Number(event.target.value) })}
          />
          <span>days</span>
        </label>
      )}

      {(step.kind === 'note' || step.kind === 'add_tag') && (
        <label className="hs-step-edit__day">
          <input
            type="number"
            min="0"
            value={step.dueOffsetDays}
            aria-label="Run day"
            onChange={(event) => onChange({ ...step, dueOffsetDays: Number(event.target.value) })}
          />
          <span>day</span>
        </label>
      )}

      <span className="hs-step-edit__move" aria-label="Reorder step">
        <button
          type="button"
          title="Move step up"
          aria-label="Move step up"
          disabled={isFirst}
          onClick={onMoveUp}
        >
          <ChevronUp size={14} />
        </button>
        <button
          type="button"
          title="Move step down"
          aria-label="Move step down"
          disabled={isLast}
          onClick={onMoveDown}
        >
          <ChevronDown size={14} />
        </button>
      </span>

      <button
        type="button"
        className="hs-step-edit__remove"
        aria-label="Remove step"
        onClick={onRemove}
      >
        <X size={15} />
      </button>
    </div>
  )
}
