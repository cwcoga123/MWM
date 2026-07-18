import { createContext, useContext } from 'react'
import type { ShareSection } from '../../lib/share'

export interface ClientActivityContextValue {
  saveScenario: (tool: string, sections: ShareSection[]) => Promise<void>
  removeScenario: (scenarioId: string) => Promise<void>
  rememberCalculator: (calculatorId: string) => Promise<void>
}

export const ClientActivityContext = createContext<ClientActivityContextValue | null>(null)

export function useClientActivity() {
  return useContext(ClientActivityContext)
}
