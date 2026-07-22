export type CalculatorDraft = Record<string, string>

function draftKey(userId: string, calculatorId: string) {
  return `mwm.calculatorDraft.${userId}.${calculatorId}`
}

export function readCalculatorDraft(userId: string, calculatorId: string): CalculatorDraft | null {
  try {
    const raw = window.localStorage.getItem(draftKey(userId, calculatorId))
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null

    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
    )
  } catch {
    return null
  }
}

export function writeCalculatorDraft(userId: string, calculatorId: string, draft: CalculatorDraft) {
  try {
    window.localStorage.setItem(draftKey(userId, calculatorId), JSON.stringify(draft))
  } catch {
    // Draft persistence is a convenience; the calculator remains usable without it.
  }
}

