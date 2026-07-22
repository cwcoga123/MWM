import type { AccountProfile } from './accounts'
import {
  defaultMyPlanPreferences,
  normalizeMyPlanPreferences,
} from '../../../MWM_CLIENT/src/data/preferences'
import {
  overviewDemoAccounts,
  type OverviewClientProfile,
} from '../data/overviewPersonalization'

/** Maps a demo overview account to the AccountProfile shape used across the admin app. */
export function demoAccountToProfile(account: OverviewClientProfile): AccountProfile {
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
    user_preferences: normalizeMyPlanPreferences(defaultMyPlanPreferences),
    recent_calculator_ids: account.recentCalculatorIds,
    saved_scenarios: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

export const demoClientProfiles: AccountProfile[] = overviewDemoAccounts.map(demoAccountToProfile)
