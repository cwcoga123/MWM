import type { AccountProfile, ClientState } from '../lib/accounts'

/* ---------------------------------------------------------------------------
   Action Plans — the automation layer.

   Three nouns:
   - ActionPlan     : the reusable template (a trigger + ordered steps)
   - PlanTrigger    : what ENROLLS a client (stored as JSONB in Supabase)
   - PlanStep       : what the plan DOES, in order

   Enrollment/execution is evaluated server-side in production (a daily
   Supabase edge function on pg_cron). `clientMatchesTrigger` below is the
   same logic run client-side so the read-only tab can preview who would
   enroll today against the demo data.
--------------------------------------------------------------------------- */

export type PlanTrigger =
  | { kind: 'stage_enter'; state: ClientState }
  | { kind: 'rate_below_refi_threshold'; marginBps?: number }
  | { kind: 'rate_below_locked'; marginBps: number }
  | { kind: 'closing_in_days'; days: number }
  | { kind: 'closing_anniversary' }
  | { kind: 'calculator_streak'; calculatorId: string; times: number; withinDays: number }
  | { kind: 'manual' }

export type PlanStep =
  | { kind: 'task'; title: string; dueOffsetDays: number }
  | { kind: 'email'; templateId: string; subject: string; sendOffsetDays: number }
  | { kind: 'wait'; days: number }
  | { kind: 'note'; text: string; dueOffsetDays: number }
  | { kind: 'add_tag'; tag: string; dueOffsetDays: number }
  | { kind: 'set_stage'; state: ClientState }

export interface ActionPlan {
  id: string
  name: string
  description?: string
  folder?: string
  pauseOnReply?: boolean
  shared?: boolean
  /** Lifecycle stage this plan serves — used to group the library. */
  stage: ClientState
  /** True when the trigger is a signal only MWM can see (rate / in-app behavior). */
  signalDriven: boolean
  enabled: boolean
  trigger: PlanTrigger
  steps: PlanStep[]
}

/* Sample market rate used to preview rate-based enrollment in the demo.
   In production this is the latest FRED 30-yr fixed, fetched daily. */
export const SAMPLE_MARKET_RATE = 5.75

const STAGE_LABELS: Record<ClientState, string> = {
  browsing: 'Browsing',
  'house-hunting': 'House hunting',
  'in-escrow': 'In escrow',
  homeowner: 'Homeowner',
}

export function stageLabel(state: ClientState) {
  return STAGE_LABELS[state]
}

export const STAGE_ORDER: ClientState[] = [
  'browsing',
  'house-hunting',
  'in-escrow',
  'homeowner',
]

export const seedActionPlans: ActionPlan[] = [
  // ── Browsing ──────────────────────────────────────────────
  {
    id: 'first-touch-nurture',
    name: 'First-touch nurture',
    stage: 'browsing',
    signalDriven: false,
    enabled: true,
    trigger: { kind: 'stage_enter', state: 'browsing' },
    steps: [
      { kind: 'email', templateId: 'welcome-no-pressure', subject: 'No rush — here when you’re ready', sendOffsetDays: 0 },
      { kind: 'wait', days: 4 },
      { kind: 'email', templateId: 'try-affordability', subject: 'The gentlest first step: what can you comfortably afford?', sendOffsetDays: 4 },
      { kind: 'task', title: 'Personal check-in — no agenda, just say hi', dueOffsetDays: 10 },
    ],
  },
  {
    id: 'affordability-momentum',
    name: 'Affordability momentum',
    stage: 'browsing',
    signalDriven: true,
    enabled: true,
    trigger: { kind: 'calculator_streak', calculatorId: 'affordability', times: 3, withinDays: 7 },
    steps: [
      { kind: 'task', title: 'Same-week call — they’re running numbers, strike now', dueOffsetDays: 0 },
      { kind: 'email', templateId: 'want-help-reading-these', subject: 'Want a second pair of eyes on those numbers?', sendOffsetDays: 0 },
    ],
  },

  // ── House hunting ─────────────────────────────────────────
  {
    id: 'buyer-activation',
    name: 'Buyer activation',
    stage: 'house-hunting',
    signalDriven: false,
    enabled: true,
    trigger: { kind: 'stage_enter', state: 'house-hunting' },
    steps: [
      { kind: 'email', templateId: 'preapproval-checklist', subject: 'Your pre-approval checklist (5 minutes, big head start)', sendOffsetDays: 0 },
      { kind: 'task', title: 'Call to confirm budget + must-haves', dueOffsetDays: 1 },
      { kind: 'email', templateId: 'neighborhood-alerts-on', subject: 'Alerts are on for your neighborhoods', sendOffsetDays: 2 },
      { kind: 'wait', days: 5 },
      { kind: 'task', title: 'Share this week’s matching listings', dueOffsetDays: 7 },
    ],
  },

  // ── In escrow ─────────────────────────────────────────────
  {
    id: 'closing-countdown',
    name: 'Closing countdown',
    stage: 'in-escrow',
    signalDriven: false,
    enabled: true,
    trigger: { kind: 'closing_in_days', days: 14 },
    steps: [
      { kind: 'task', title: 'Confirm appraisal is ordered and on track', dueOffsetDays: 0 },
      { kind: 'email', templateId: 'closing-doc-checklist', subject: 'What to gather before closing day', sendOffsetDays: 0 },
      { kind: 'wait', days: 7 },
      { kind: 'task', title: 'Schedule the final walkthrough', dueOffsetDays: 7 },
      { kind: 'email', templateId: 'wire-fraud-safety', subject: 'Important: how to verify wiring instructions', sendOffsetDays: 10 },
      { kind: 'task', title: 'Closing day — congratulate + explain first payment', dueOffsetDays: 14 },
    ],
  },
  {
    id: 'rate-float-down-watch',
    name: 'Rate float-down watch',
    stage: 'in-escrow',
    signalDriven: true,
    enabled: true,
    trigger: { kind: 'rate_below_locked', marginBps: 25 },
    steps: [
      { kind: 'task', title: 'Check float-down eligibility with the lender', dueOffsetDays: 0 },
      { kind: 'email', templateId: 'rates-moved-locked', subject: 'Rates moved — you may be able to lower your locked rate', sendOffsetDays: 0 },
    ],
  },

  // ── Homeowner ─────────────────────────────────────────────
  {
    id: 'post-close-onboarding',
    name: 'Post-close onboarding',
    stage: 'homeowner',
    signalDriven: false,
    enabled: true,
    trigger: { kind: 'stage_enter', state: 'homeowner' },
    steps: [
      { kind: 'email', templateId: 'congrats-what-now', subject: 'Congratulations — here’s what happens next', sendOffsetDays: 0 },
      { kind: 'task', title: 'Set their refi threshold + confirm loan servicer', dueOffsetDays: 2 },
      { kind: 'wait', days: 30 },
      { kind: 'email', templateId: 'first-payment-equity', subject: 'First payment done — your equity snapshot', sendOffsetDays: 30 },
    ],
  },
  {
    id: 'annual-equity-review',
    name: 'Annual equity review',
    stage: 'homeowner',
    signalDriven: false,
    enabled: true,
    trigger: { kind: 'closing_anniversary' },
    steps: [
      { kind: 'email', templateId: 'one-year-equity', subject: 'One year in — how your equity is doing', sendOffsetDays: 0 },
      { kind: 'task', title: 'Offer an annual mortgage review call', dueOffsetDays: 1 },
    ],
  },
  {
    id: 'refi-opportunity-outreach',
    name: 'Refi opportunity outreach',
    stage: 'homeowner',
    signalDriven: true,
    enabled: true,
    trigger: { kind: 'rate_below_refi_threshold' },
    steps: [
      { kind: 'task', title: 'Call client about refi savings', dueOffsetDays: 0 },
      { kind: 'email', templateId: 'refi-savings', subject: 'Your refinance may now make sense', sendOffsetDays: 0 },
      { kind: 'wait', days: 3 },
      { kind: 'task', title: 'Follow up if no reply', dueOffsetDays: 3 },
    ],
  },
]

/* --------------------------------------------------------------- summaries */

export function triggerSummary(trigger: PlanTrigger): string {
  switch (trigger.kind) {
    case 'stage_enter':
      return `Enters ${stageLabel(trigger.state)}`
    case 'rate_below_refi_threshold':
      return trigger.marginBps
        ? `Market rate ≤ refi threshold − ${trigger.marginBps}bps`
        : 'Market rate ≤ client refi threshold'
    case 'rate_below_locked':
      return `Market rate ≤ locked rate − ${trigger.marginBps}bps`
    case 'closing_in_days':
      return `${trigger.days} days before closing`
    case 'closing_anniversary':
      return 'Closing anniversary'
    case 'calculator_streak':
      return `Ran ${trigger.calculatorId} ${trigger.times}× in ${trigger.withinDays} days`
    case 'manual':
      return 'Manual enrollment'
  }
}

export function stepSummary(step: PlanStep): string {
  switch (step.kind) {
    case 'task':
      return step.title
    case 'email':
      return step.subject
    case 'wait':
      return `Wait ${step.days} days`
    case 'note':
      return step.text
    case 'add_tag':
      return `Add tag: ${step.tag}`
    case 'set_stage':
      return `Advance stage to ${stageLabel(step.state)}`
  }
}

export function stepTiming(step: PlanStep): string {
  switch (step.kind) {
    case 'task':
      return `Task · day ${step.dueOffsetDays}`
    case 'email':
      return `Email · day ${step.sendOffsetDays}`
    case 'wait':
      return 'Delay'
    case 'note':
      return `Note · day ${step.dueOffsetDays}`
    case 'add_tag':
      return `Tag · day ${step.dueOffsetDays}`
    case 'set_stage':
      return 'Automation'
  }
}

/* -------------------------------------------------------------- evaluation */

function daysUntil(dateIso: string, today: Date): number {
  const target = new Date(dateIso)
  if (Number.isNaN(target.getTime())) return Number.NaN
  const ms = target.getTime() - today.getTime()
  return Math.round(ms / 86_400_000)
}

function isAnniversaryWithin(dateIso: string, today: Date, windowDays: number): boolean {
  const anchor = new Date(dateIso)
  if (Number.isNaN(anchor.getTime())) return false

  const thisYear = new Date(today.getFullYear(), anchor.getMonth(), anchor.getDate())
  const diff = Math.abs(Math.round((thisYear.getTime() - today.getTime()) / 86_400_000))
  return diff <= windowDays
}

/**
 * Whether a client would enroll in a plan today. `calculator_streak` is a
 * heuristic here — `recent_calculator_ids` stores only the last few ids with
 * no counts, so production needs a `calculator_events` log for a true streak.
 */
export function clientMatchesTrigger(
  client: AccountProfile,
  trigger: PlanTrigger,
  marketRate: number = SAMPLE_MARKET_RATE,
  today: Date = new Date(),
): boolean {
  switch (trigger.kind) {
    case 'stage_enter':
      return client.client_state === trigger.state

    case 'rate_below_refi_threshold': {
      if (client.refi_threshold === null) return false
      const margin = (trigger.marginBps ?? 0) / 100
      return marketRate <= client.refi_threshold - margin
    }

    case 'rate_below_locked': {
      if (client.client_state !== 'in-escrow' || client.locked_rate === null) return false
      return marketRate <= client.locked_rate - trigger.marginBps / 100
    }

    case 'closing_in_days': {
      if (client.client_state !== 'in-escrow' || !client.closing_date) return false
      const days = daysUntil(client.closing_date, today)
      return Number.isFinite(days) && days >= 0 && days <= trigger.days
    }

    case 'closing_anniversary':
      return client.closing_date ? isAnniversaryWithin(client.closing_date, today, 7) : false

    case 'calculator_streak':
      return client.recent_calculator_ids.includes(trigger.calculatorId)

    case 'manual':
      return false
  }
}
