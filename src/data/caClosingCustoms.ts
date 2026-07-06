/**
 * Customary closing-cost practices for all 58 California counties.
 *
 * Source: Fidelity National Title, "All About Your Escrow — Who Pays What in
 * California? Your Guide to Customary Practices in Closing Costs" (revised
 * 12/11/2020). All items are customary practices only — everything is subject
 * to contractual negotiation, and rates change over time (several city
 * measures have passed since this guide was published), so verify current
 * rates with the county recorder or your title company before relying on them.
 */

export type CustomaryPayer = 'buyer' | 'seller' | 'split' | 'varies'

/**
 * A price bracket for a city transfer tax. The matching bracket's rate applies
 * to the ENTIRE sale price (these city taxes are not marginal). A bracket can
 * carry a flat per-$1,000 rate, a percent of price, or both (e.g. San Jose's
 * base rate plus its additional Measure E tax).
 */
export interface CityTaxBracket {
  /** Inclusive lower bound of the sale-price bracket. */
  min: number
  /** Inclusive upper bound, or null for no cap. */
  max: number | null
  /** Dollars per $1,000 of the full sale price. */
  ratePerThousand?: number
  /** Percent of the full sale price. */
  percent?: number
}

export interface CityTransferTax {
  city: string
  /** Customary payer per the guide; null when the guide doesn't specify (commonly seller in practice). */
  payer: CustomaryPayer | null
  brackets: CityTaxBracket[]
  note?: string
}

export interface CountyClosingCustoms {
  county: string
  /** Who customarily pays escrow charges & fees. */
  escrow: CustomaryPayer
  escrowNote?: string
  /** Who customarily pays the owner's title insurance policy. */
  title: CustomaryPayer
  titleNote?: string
  /** Documentary transfer tax, dollars per $1,000 of price. $1.10 statewide; 0 for San Francisco (folded into its city scale). */
  countyTransferTaxPerThousand: number
  countyTaxNote?: string
  cityTaxes?: CityTransferTax[]
}

export const CA_CLOSING_CUSTOMS_SOURCE =
  'Fidelity National Title, “Who Pays What in California” (rev. 12/11/2020). Customary practices only — negotiable, and rates may have changed since publication.'

const split: CustomaryPayer = 'split'

export const caClosingCustoms: CountyClosingCustoms[] = [
  {
    county: 'Alameda',
    escrow: 'buyer',
    title: 'buyer',
    countyTransferTaxPerThousand: 1.1,
    countyTaxNote: 'Seller pays; buyer/seller split in the city of Alameda only.',
    cityTaxes: [
      { city: 'Alameda', payer: split, brackets: [{ min: 0, max: null, ratePerThousand: 12 }] },
      { city: 'Albany', payer: split, brackets: [{ min: 0, max: null, ratePerThousand: 15 }], note: 'Effective 1/1/2021.' },
      {
        city: 'Berkeley',
        payer: split,
        brackets: [
          { min: 0, max: 1_500_000, percent: 1.5 },
          { min: 1_500_001, max: null, percent: 2.5 },
        ],
      },
      { city: 'Emeryville', payer: split, brackets: [{ min: 0, max: null, ratePerThousand: 12 }] },
      { city: 'Hayward', payer: split, brackets: [{ min: 0, max: null, ratePerThousand: 8.5 }] },
      {
        city: 'Oakland',
        payer: split,
        brackets: [
          { min: 0, max: 300_000, percent: 1 },
          { min: 300_001, max: 2_000_000, percent: 1.5 },
          { min: 2_000_001, max: 5_000_000, percent: 1.75 },
          { min: 5_000_001, max: null, percent: 2.5 },
        ],
      },
      { city: 'Piedmont', payer: split, brackets: [{ min: 0, max: null, ratePerThousand: 13 }] },
      { city: 'San Leandro', payer: split, brackets: [{ min: 0, max: null, ratePerThousand: 11 }], note: 'Effective 12/24/2020.' },
    ],
  },
  { county: 'Alpine', escrow: split, title: split, countyTransferTaxPerThousand: 1.1 },
  { county: 'Amador', escrow: split, title: 'buyer', countyTransferTaxPerThousand: 1.1 },
  { county: 'Butte', escrow: split, title: split, countyTransferTaxPerThousand: 1.1 },
  { county: 'Calaveras', escrow: split, title: split, countyTransferTaxPerThousand: 1.1 },
  { county: 'Colusa', escrow: split, title: split, countyTransferTaxPerThousand: 1.1 },
  {
    county: 'Contra Costa',
    escrow: 'buyer',
    title: 'buyer',
    countyTransferTaxPerThousand: 1.1,
    cityTaxes: [
      {
        city: 'Richmond',
        payer: split,
        brackets: [
          { min: 100, max: 999_999, percent: 0.7 },
          { min: 1_000_000, max: 2_999_999, percent: 1.25 },
          { min: 3_000_000, max: 9_999_999, percent: 2.5 },
          { min: 10_000_000, max: null, percent: 3 },
        ],
      },
      { city: 'El Cerrito', payer: split, brackets: [{ min: 0, max: null, ratePerThousand: 12 }] },
    ],
  },
  { county: 'Del Norte', escrow: split, title: split, countyTransferTaxPerThousand: 1.1 },
  { county: 'El Dorado', escrow: split, title: split, countyTransferTaxPerThousand: 1.1 },
  { county: 'Fresno', escrow: split, title: 'seller', countyTransferTaxPerThousand: 1.1 },
  { county: 'Glenn', escrow: split, title: split, countyTransferTaxPerThousand: 1.1 },
  { county: 'Humboldt', escrow: split, title: split, countyTransferTaxPerThousand: 1.1 },
  { county: 'Imperial', escrow: split, title: split, countyTransferTaxPerThousand: 1.1 },
  { county: 'Inyo', escrow: split, title: 'seller', countyTransferTaxPerThousand: 1.1 },
  { county: 'Kern', escrow: split, title: 'seller', countyTransferTaxPerThousand: 1.1 },
  { county: 'Kings', escrow: split, title: 'seller', countyTransferTaxPerThousand: 1.1 },
  { county: 'Lake', escrow: 'buyer', title: 'buyer', countyTransferTaxPerThousand: 1.1 },
  { county: 'Lassen', escrow: split, title: split, countyTransferTaxPerThousand: 1.1 },
  {
    county: 'Los Angeles',
    escrow: split,
    title: 'seller',
    countyTransferTaxPerThousand: 1.1,
    cityTaxes: [
      {
        city: 'Culver City',
        payer: null,
        brackets: [
          { min: 1_500_000, max: 2_999_999, percent: 1.5 },
          { min: 3_000_000, max: 9_999_999, percent: 3 },
          { min: 10_000_000, max: null, percent: 4 },
        ],
        note: 'Effective 4/1/2021. The guide lists no rate below $1.5M.',
      },
      { city: 'Los Angeles', payer: null, brackets: [{ min: 0, max: null, ratePerThousand: 4.5 }] },
      { city: 'Pomona', payer: null, brackets: [{ min: 0, max: null, ratePerThousand: 2.2 }] },
      { city: 'Redondo Beach', payer: null, brackets: [{ min: 0, max: null, ratePerThousand: 2.2 }] },
      {
        city: 'Santa Monica',
        payer: null,
        brackets: [
          { min: 0, max: 4_999_999, ratePerThousand: 3 },
          { min: 5_000_000, max: null, ratePerThousand: 6 },
        ],
        note: 'Effective 3/1/2021.',
      },
    ],
  },
  {
    county: 'Madera',
    escrow: split,
    title: 'varies',
    titleNote: 'Split in Chowchilla & Mountain Area; seller pays in Valley areas.',
    countyTransferTaxPerThousand: 1.1,
  },
  {
    county: 'Marin',
    escrow: 'buyer',
    title: 'buyer',
    countyTransferTaxPerThousand: 1.1,
    cityTaxes: [{ city: 'San Rafael', payer: 'seller', brackets: [{ min: 0, max: null, ratePerThousand: 2 }] }],
  },
  { county: 'Mariposa', escrow: split, title: split, countyTransferTaxPerThousand: 1.1 },
  { county: 'Mendocino', escrow: 'buyer', title: 'buyer', countyTransferTaxPerThousand: 1.1 },
  { county: 'Merced', escrow: split, title: split, countyTransferTaxPerThousand: 1.1 },
  { county: 'Modoc', escrow: split, title: 'seller', countyTransferTaxPerThousand: 1.1 },
  { county: 'Mono', escrow: split, title: 'seller', countyTransferTaxPerThousand: 1.1 },
  {
    county: 'Monterey',
    escrow: 'seller',
    title: 'varies',
    titleNote: 'Split in Salinas; seller pays on the Monterey Peninsula.',
    countyTransferTaxPerThousand: 1.1,
  },
  { county: 'Napa', escrow: 'buyer', title: 'buyer', countyTransferTaxPerThousand: 1.1 },
  { county: 'Nevada', escrow: split, title: split, countyTransferTaxPerThousand: 1.1 },
  { county: 'Orange', escrow: split, title: 'seller', countyTransferTaxPerThousand: 1.1 },
  { county: 'Placer', escrow: split, title: split, countyTransferTaxPerThousand: 1.1 },
  { county: 'Plumas', escrow: split, title: split, countyTransferTaxPerThousand: 1.1 },
  {
    county: 'Riverside',
    escrow: split,
    title: 'seller',
    countyTransferTaxPerThousand: 1.1,
    cityTaxes: [{ city: 'Riverside', payer: null, brackets: [{ min: 0, max: null, ratePerThousand: 1.1 }] }],
  },
  {
    county: 'Sacramento',
    escrow: 'seller',
    title: 'seller',
    countyTransferTaxPerThousand: 1.1,
    cityTaxes: [{ city: 'Sacramento', payer: split, brackets: [{ min: 0, max: null, ratePerThousand: 2.75 }] }],
  },
  { county: 'San Benito', escrow: 'seller', title: 'seller', countyTransferTaxPerThousand: 1.1 },
  { county: 'San Bernardino', escrow: split, title: 'seller', countyTransferTaxPerThousand: 1.1 },
  { county: 'San Diego', escrow: split, title: 'seller', countyTransferTaxPerThousand: 1.1 },
  {
    county: 'San Francisco',
    escrow: 'buyer',
    title: 'buyer',
    countyTransferTaxPerThousand: 0,
    countyTaxNote:
      'City & county are the same in San Francisco — the seller pays a single combined transfer tax on the city scale below.',
    cityTaxes: [
      {
        city: 'San Francisco',
        payer: 'seller',
        brackets: [
          { min: 0, max: 249_999, percent: 0.5 },
          { min: 250_000, max: 999_999, percent: 0.68 },
          { min: 1_000_000, max: 4_999_999, percent: 0.75 },
          { min: 5_000_000, max: 9_999_999, percent: 2.25 },
          { min: 10_000_000, max: 24_999_999, percent: 5.5 },
          { min: 25_000_000, max: null, percent: 6 },
        ],
        note: 'Top two tiers effective 1/1/2021.',
      },
    ],
  },
  { county: 'San Joaquin', escrow: split, title: split, countyTransferTaxPerThousand: 1.1 },
  { county: 'San Luis Obispo', escrow: split, title: 'seller', countyTransferTaxPerThousand: 1.1 },
  {
    county: 'San Mateo',
    escrow: 'buyer',
    title: 'buyer',
    countyTransferTaxPerThousand: 1.1,
    cityTaxes: [
      { city: 'San Mateo', payer: split, brackets: [{ min: 0, max: null, ratePerThousand: 5 }] },
      { city: 'Hillsborough', payer: split, brackets: [{ min: 0, max: null, ratePerThousand: 0.3 }] },
    ],
  },
  { county: 'Santa Barbara', escrow: split, title: 'seller', countyTransferTaxPerThousand: 1.1 },
  {
    county: 'Santa Clara',
    escrow: 'seller',
    title: 'seller',
    countyTransferTaxPerThousand: 1.1,
    cityTaxes: [
      { city: 'Mountain View', payer: split, brackets: [{ min: 0, max: null, ratePerThousand: 3.3 }] },
      { city: 'Palo Alto', payer: split, brackets: [{ min: 0, max: null, ratePerThousand: 3.3 }] },
      {
        city: 'San Jose',
        payer: split,
        brackets: [
          { min: 0, max: 1_999_999, ratePerThousand: 3.3 },
          { min: 2_000_000, max: 5_000_000, ratePerThousand: 3.3, percent: 0.75 },
          { min: 5_000_001, max: 10_000_000, ratePerThousand: 3.3, percent: 1 },
          { min: 10_000_001, max: null, ratePerThousand: 3.3, percent: 1.5 },
        ],
        note: 'Base $3.30/$1,000 plus additional tax effective 7/1/2020.',
      },
    ],
  },
  { county: 'Santa Cruz', escrow: split, title: split, countyTransferTaxPerThousand: 1.1 },
  { county: 'Shasta', escrow: split, title: split, countyTransferTaxPerThousand: 1.1 },
  { county: 'Sierra', escrow: split, title: split, countyTransferTaxPerThousand: 1.1 },
  { county: 'Siskiyou', escrow: split, title: split, countyTransferTaxPerThousand: 1.1 },
  {
    county: 'Solano',
    escrow: 'buyer',
    title: 'buyer',
    countyTransferTaxPerThousand: 1.1,
    cityTaxes: [{ city: 'Vallejo', payer: 'seller', brackets: [{ min: 0, max: null, ratePerThousand: 3.3 }] }],
  },
  {
    county: 'Sonoma',
    escrow: 'buyer',
    title: 'buyer',
    countyTransferTaxPerThousand: 1.1,
    cityTaxes: [
      { city: 'Petaluma', payer: 'seller', brackets: [{ min: 0, max: null, ratePerThousand: 2 }] },
      { city: 'Santa Rosa', payer: 'seller', brackets: [{ min: 0, max: null, ratePerThousand: 2 }] },
    ],
  },
  {
    county: 'Stanislaus',
    escrow: split,
    title: 'seller',
    titleNote: 'Seller pays, except Turlock where it is split 50/50.',
    countyTransferTaxPerThousand: 1.1,
  },
  { county: 'Sutter', escrow: 'seller', title: 'seller', countyTransferTaxPerThousand: 1.1 },
  { county: 'Tehama', escrow: split, title: split, countyTransferTaxPerThousand: 1.1 },
  { county: 'Trinity', escrow: split, title: split, countyTransferTaxPerThousand: 1.1 },
  { county: 'Tulare', escrow: split, title: split, countyTransferTaxPerThousand: 1.1 },
  { county: 'Tuolumne', escrow: split, title: split, countyTransferTaxPerThousand: 1.1 },
  { county: 'Ventura', escrow: split, title: 'seller', countyTransferTaxPerThousand: 1.1 },
  {
    county: 'Yolo',
    escrow: 'varies',
    escrowNote: 'Buyer pays in Davis; seller pays everywhere else.',
    title: 'varies',
    titleNote: 'Buyer pays in Davis; seller pays everywhere else.',
    countyTransferTaxPerThousand: 1.1,
  },
  { county: 'Yuba', escrow: 'seller', title: 'seller', countyTransferTaxPerThousand: 1.1 },
]

export function countyCustomsFor(county: string): CountyClosingCustoms | undefined {
  return caClosingCustoms.find((entry) => entry.county === county)
}

/** County documentary transfer tax in dollars for a given sale price. */
export function countyTransferTaxAmount(customs: CountyClosingCustoms, salePrice: number): number {
  return Math.max(0, salePrice) * (customs.countyTransferTaxPerThousand / 1000)
}

/** City transfer tax in dollars for a given sale price (bracket rate applies to the full price). */
export function cityTransferTaxAmount(cityTax: CityTransferTax, salePrice: number): number {
  const price = Math.max(0, salePrice)
  const bracket = cityTax.brackets.find(
    (candidate) => price >= candidate.min && (candidate.max === null || price <= candidate.max),
  )
  if (!bracket) return 0
  return (price / 1000) * (bracket.ratePerThousand ?? 0) + price * ((bracket.percent ?? 0) / 100)
}

/**
 * The share of a tax the given side customarily pays.
 * Unspecified city-tax payers (null) default to the seller, the common practice in California.
 */
export function customaryShare(payer: CustomaryPayer | null, amount: number, side: 'buyer' | 'seller'): number {
  if (payer === 'split') return amount / 2
  if (payer === 'buyer') return side === 'buyer' ? amount : 0
  if (payer === 'seller' || payer === null) return side === 'seller' ? amount : 0
  return side === 'seller' ? amount : 0 // 'varies' — assume seller as conservative default
}

export function payerLabel(payer: CustomaryPayer | null): string {
  switch (payer) {
    case 'buyer':
      return 'Buyer'
    case 'seller':
      return 'Seller'
    case 'split':
      return 'Split buyer/seller'
    case 'varies':
      return 'Varies by area'
    default:
      return 'Not specified (commonly seller)'
  }
}
