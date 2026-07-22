import { createContext, useContext } from 'react'
import type { ShareSection } from '../../lib/share'
import type { MyPlanPreferences } from '../../data/preferences'
import type { HubUser } from '../shell/AuthGate'

export interface ClientActivityContextValue {
  user: HubUser
  saveScenario: (tool: string, sections: ShareSection[]) => Promise<void>
  removeScenario: (scenarioId: string) => Promise<void>
  rememberCalculator: (calculatorId: string) => Promise<void>
  updatePreferences: (patch: Partial<MyPlanPreferences>) => Promise<void>
}

export const ClientActivityContext = createContext<ClientActivityContextValue | null>(null)

export function useClientActivity() {
  return useContext(ClientActivityContext)
}
