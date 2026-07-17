import {
  type ReactNode,
} from 'react'
import { calculators } from '../../data/calculators'
import {
  updateRecentCalculatorIds,
  updateSavedScenarios,
  type SavedScenario,
} from '../../lib/accounts'
import { type ShareSection } from '../../lib/share'
import type { HubUser } from '../shell/AuthGate'
import { ClientActivityContext } from './clientActivityContext'

type UserPatch = Partial<
  Pick<HubUser, 'recentCalculatorIds' | 'savedScenarios'>
>

interface ClientActivityProviderProps {
  user: HubUser
  onUserUpdate: (patch: UserPatch) => void
  children: ReactNode
}

const MAX_RECENT_CALCULATORS = 4
const MAX_SAVED_SCENARIOS = 12
const calculatorIds = new Set(calculators.map((calculator) => calculator.id))

function localStorageKey(userId: string, key: string) {
  return `mwm.${key}.${userId}`
}

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `scenario-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function uniqueCalculatorIds(ids: string[]) {
  return Array.from(new Set(ids)).filter((id) => calculatorIds.has(id))
}

function sameStringArray(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function calculatorIdFromLocation(tool: string) {
  const hash = window.location.hash.slice(1)

  if (calculatorIds.has(hash)) return hash

  const matchingCalculator = calculators.find((calculator) => calculator.title === tool)
  return matchingCalculator?.id ?? tool.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

function scenarioLabel(sections: ShareSection[]) {
  const resultEntry = sections
    .find((section) => section.title.toLowerCase().includes('result'))
    ?.entries.at(0)

  return resultEntry ? `${resultEntry.label}: ${resultEntry.value}` : 'Saved scenario'
}

function scenarioSummary(sections: ShareSection[]) {
  const resultSection =
    sections.find((section) => section.title.toLowerCase().includes('result')) ??
    sections.at(-1)
  const entries = resultSection?.entries.slice(0, 3) ?? []

  return entries.map((entry) => `${entry.label}: ${entry.value}`).join(' | ')
}

function persistLocal<T>(userId: string, key: string, value: T) {
  try {
    window.localStorage.setItem(localStorageKey(userId, key), JSON.stringify(value))
  } catch {
    // Local persistence is only a fallback for demos/offline development.
  }
}

export function ClientActivityProvider({
  user,
  onUserUpdate,
  children,
}: ClientActivityProviderProps) {
  async function rememberCalculator(calculatorId: string) {
    const nextRecentCalculatorIds = uniqueCalculatorIds([
      calculatorId,
      ...user.recentCalculatorIds,
    ]).slice(0, MAX_RECENT_CALCULATORS)

    if (sameStringArray(nextRecentCalculatorIds, user.recentCalculatorIds)) return

    onUserUpdate({ recentCalculatorIds: nextRecentCalculatorIds })

    try {
      if (user.isDemo) throw new Error('Demo profile')
      await updateRecentCalculatorIds(user.id, nextRecentCalculatorIds)
    } catch {
      persistLocal(user.id, 'recentCalculators', nextRecentCalculatorIds)
    }
  }

  async function saveScenario(tool: string, sections: ShareSection[]) {
    const scenario: SavedScenario = {
      id: createId(),
      calculatorId: calculatorIdFromLocation(tool),
      tool,
      label: scenarioLabel(sections),
      summary: scenarioSummary(sections),
      sections,
      savedAt: new Date().toISOString(),
    }
    const nextSavedScenarios = [scenario, ...user.savedScenarios].slice(0, MAX_SAVED_SCENARIOS)

    onUserUpdate({ savedScenarios: nextSavedScenarios })

    try {
      if (user.isDemo) throw new Error('Demo profile')
      await updateSavedScenarios(user.id, nextSavedScenarios)
    } catch {
      persistLocal(user.id, 'savedScenarios', nextSavedScenarios)
    }
  }

  async function removeScenario(scenarioId: string) {
    const nextSavedScenarios = user.savedScenarios.filter((scenario) => scenario.id !== scenarioId)

    onUserUpdate({ savedScenarios: nextSavedScenarios })

    try {
      if (user.isDemo) throw new Error('Demo profile')
      await updateSavedScenarios(user.id, nextSavedScenarios)
    } catch {
      persistLocal(user.id, 'savedScenarios', nextSavedScenarios)
    }
  }

  return (
    <ClientActivityContext.Provider
      value={{ rememberCalculator, saveScenario, removeScenario }}
    >
      {children}
    </ClientActivityContext.Provider>
  )
}
