/**
 * Curated calculator "hooks" for the Overview tab. Each references a
 * calculator id from data/calculators.ts (title/icon/description are pulled
 * from there so there's one source of truth).
 */
export interface QuickAction {
  calculatorId: string
  hook: string
}

export const quickActions: QuickAction[] = [
  {
    calculatorId: 'loan-comparison',
    hook: "6.5% or 5.9%? On a typical loan that's about $120/month apart — don't guess, calculate it.",
  },
  {
    calculatorId: 'affordability',
    hook: "Pre-approved for $1.2M doesn't mean you should spend $1.2M. Find your real number.",
  },
  {
    calculatorId: 'rent-vs-buy',
    hook: "Renting isn't \"throwing money away\" — see the exact year buying actually pulls ahead.",
  },
  {
    calculatorId: 'buyer-closing-costs',
    hook: 'Closing costs can run 2–5% of the price. Know the number before you write the offer.',
  },
]
