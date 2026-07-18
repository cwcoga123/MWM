export type MarketPulseCtaType = 'calculator' | 'advisor' | 'soon'

export interface MarketPulseCta {
  type: MarketPulseCtaType
  label: string
  /** Calculator id from data/calculators.ts, required when type is 'calculator'. */
  calculatorId?: string
}

export interface MarketPulseInsight {
  id: string
  tag: string
  hook: string
  body: string
  cta: MarketPulseCta
}

/**
 * Curated Bay Area insight cards for the Overview tab's Market Pulse section.
 * Content is short and client-facing on purpose — deeper explainers can live
 * elsewhere later. Each card points somewhere useful: an existing calculator,
 * the advisor contact card, or a "coming soon" placeholder for ideas that need
 * data we don't have yet (e.g. neighborhood-level appreciation).
 */
export const marketPulseInsights: MarketPulseInsight[] = [
  {
    id: 'rsu-timing',
    tag: 'For tech employees',
    hook: 'Timing your move around your RSU vesting schedule',
    body: "Waiting for a rate drop or a stock spike has a cost too. Compare what a 1% lower rate would actually save against the appreciation you'd miss by waiting in the neighborhoods you're watching.",
    cta: { type: 'calculator', label: 'Model the cost of waiting', calculatorId: 'rent-vs-buy' },
  },
  {
    id: 'adu-san-jose',
    tag: 'San Jose homeowners',
    hook: 'Your backyard might be your best-performing asset',
    body: "San Jose's ADU and density rules make it possible to add a rentable unit to an existing lot. Weigh permit and construction costs against the extra monthly rent before you commit.",
    cta: { type: 'calculator', label: 'Estimate rental cash flow', calculatorId: 'investment-property' },
  },
  {
    id: 'seismic-compliance',
    tag: 'Owners & investors',
    hook: "The “technical debt” hiding in your home",
    body: 'Soft-story retrofits, balcony inspections, and wildfire-zone insurance requirements can surface mid-transaction. Get ahead of your property’s compliance timeline before it becomes a closing-week surprise.',
    cta: { type: 'advisor', label: 'Ask about your property' },
  },
  {
    id: 'innovation-corridor',
    tag: 'Location strategy',
    hook: 'Why one zip code outperforms the one next door',
    body: 'Proximity to major tech employers and commute corridors is already showing up in appreciation and resale strength. Neighborhood-level data like this is coming soon to your dashboard.',
    cta: { type: 'soon', label: 'Coming soon' },
  },
]
