import { supabase } from './supabase'
import {
  normalizeMyPlanPreferences,
  type MyPlanPreferences,
} from '../../../MWM_CLIENT/src/data/preferences'

export type AccountRole = 'client' | 'advisor' | 'admin'
export type AccountStatus = 'active' | 'disabled'
export type ClientState = 'browsing' | 'house-hunting' | 'in-escrow' | 'homeowner'

export interface SavedScenarioSection {
  title: string
  entries: {
    label: string
    value: string
  }[]
}

export interface SavedScenario {
  id: string
  calculatorId: string
  tool: string
  label: string
  summary: string
  sections: SavedScenarioSection[]
  savedAt: string
  inputDraft?: Record<string, string>
}

export interface AccountProfile {
  id: string
  email: string | null
  full_name: string | null
  phone: string | null
  account_role: AccountRole
  account_status: AccountStatus
  client_state: ClientState
  advisor_note: string | null
  target_budget: number | null
  neighborhoods: string[]
  closing_date: string | null
  locked_rate: number | null
  refi_threshold: number | null
  user_preferences: MyPlanPreferences
  recent_calculator_ids: string[]
  saved_scenarios: SavedScenario[]
  created_at: string
  updated_at: string
}

export interface ClientPersonalizationPatch {
  clientState: ClientState
  advisorNote: string | null
  targetBudget: number | null
  neighborhoods: string[]
  closingDate: string | null
  lockedRate: number | null
  refiThreshold: number | null
}

const PROFILE_COLUMNS = [
  'id',
  'email',
  'full_name',
  'phone',
  'account_role',
  'account_status',
  'client_state',
  'advisor_note',
  'target_budget',
  'neighborhoods',
  'closing_date',
  'locked_rate',
  'refi_threshold',
  'user_preferences',
  'recent_calculator_ids',
  'saved_scenarios',
  'created_at',
  'updated_at',
].join(', ')

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function asSavedScenarios(value: unknown): SavedScenario[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []

    const candidate = item as Partial<SavedScenario>
    if (
      typeof candidate.id !== 'string' ||
      typeof candidate.calculatorId !== 'string' ||
      typeof candidate.tool !== 'string' ||
      typeof candidate.label !== 'string' ||
      typeof candidate.summary !== 'string' ||
      typeof candidate.savedAt !== 'string' ||
      !Array.isArray(candidate.sections)
    ) {
      return []
    }

    return [
      {
        id: candidate.id,
        calculatorId: candidate.calculatorId,
        tool: candidate.tool,
        label: candidate.label,
        summary: candidate.summary,
        sections: candidate.sections,
        savedAt: candidate.savedAt,
        inputDraft:
          candidate.inputDraft && typeof candidate.inputDraft === 'object'
            ? Object.fromEntries(
                Object.entries(candidate.inputDraft).filter(
                  ([key, value]) => typeof key === 'string' && typeof value === 'string',
                ),
              )
            : undefined,
      },
    ]
  })
}

function normalizeProfile(profile: AccountProfile): AccountProfile {
  return {
    ...profile,
    user_preferences: normalizeMyPlanPreferences(profile.user_preferences),
    neighborhoods: asStringArray(profile.neighborhoods),
    recent_calculator_ids: asStringArray(profile.recent_calculator_ids),
    saved_scenarios: asSavedScenarios(profile.saved_scenarios),
  }
}

export async function getAccountProfile(userId: string) {
  if (!supabase) throw new Error('Supabase is not configured.')

  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .single()

  if (error) throw error

  return normalizeProfile(data as unknown as AccountProfile)
}

export async function listAdvisorClientProfiles() {
  if (!supabase) throw new Error('Supabase is not configured.')

  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('account_role', 'client')
    .order('full_name', { ascending: true, nullsFirst: false })
    .order('email', { ascending: true })

  if (error) throw error

  return (data as unknown as AccountProfile[]).map(normalizeProfile)
}

export async function updateClientPersonalization(
  clientId: string,
  patch: ClientPersonalizationPatch,
) {
  if (!supabase) throw new Error('Supabase is not configured.')

  const { data, error } = await supabase.rpc('update_client_personalization', {
    client_id: clientId,
    new_client_state: patch.clientState,
    new_advisor_note: patch.advisorNote,
    new_target_budget: patch.targetBudget,
    new_neighborhoods: patch.neighborhoods,
    new_closing_date: patch.closingDate,
    new_locked_rate: patch.lockedRate,
    new_refi_threshold: patch.refiThreshold,
  })

  if (error) throw error

  return normalizeProfile(data as unknown as AccountProfile)
}

export async function updateRecentCalculatorIds(userId: string, recentCalculatorIds: string[]) {
  if (!supabase) throw new Error('Supabase is not configured.')

  const { error } = await supabase
    .from('profiles')
    .update({ recent_calculator_ids: recentCalculatorIds })
    .eq('id', userId)

  if (error) throw error
}

export async function updateSavedScenarios(userId: string, savedScenarios: SavedScenario[]) {
  if (!supabase) throw new Error('Supabase is not configured.')

  const { error } = await supabase
    .from('profiles')
    .update({ saved_scenarios: savedScenarios })
    .eq('id', userId)

  if (error) throw error
}

