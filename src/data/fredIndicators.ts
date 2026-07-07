/**
 * Curated FRED (Federal Reserve Economic Data) indicators worth watching for
 * a Bay Area mortgage practice serving numbers-minded tech clients. Values are
 * NOT fetched live in the browser — the FRED API doesn't send CORS headers for
 * arbitrary origins, and shipping an API key into client JS would leak it to
 * every visitor. Instead, `scripts/fetch-fred-data.mjs` pulls recent history
 * for each series at build time (or on demand) and writes
 * `src/data/fredSnapshot.json`, which `FredIndicatorsSection` reads and
 * renders as an economic-calendar-style table (Time / Cur. / Event / Imp. /
 * Actual / Forecast / Previous), with the recent-history trend tucked behind
 * an expandable row. Run `pnpm fetch:fred` to refresh. See docs/FRED_DATA.md.
 */
export type FredIndicatorCategory = 'rates' | 'fed-watch' | 'bay-area-housing' | 'local-economy'

export type FredIndicatorUnit = 'percent' | 'currency' | 'index' | 'days' | 'count'

/** 1 = low, 2 = medium, 3 = high — drives the star rating in the Imp. column. */
export type FredIndicatorImportance = 1 | 2 | 3

export interface FredIndicator {
  id: string
  seriesId: string
  label: string
  cadence: string
  /** One-line, precise definition shown in the help tooltip. */
  what: string
  /** One-line reason this matters, shown in the help tooltip. */
  why: string
  fredUrl: string
  category: FredIndicatorCategory
  unit: FredIndicatorUnit
  importance: FredIndicatorImportance
}

export const fredIndicatorCategories: Record<FredIndicatorCategory, string> = {
  rates: 'Rates & Fed policy',
  'fed-watch': 'What moves the Fed',
  'bay-area-housing': 'Bay Area home prices & inventory',
  'local-economy': 'Local tech economy',
}

export const fredIndicators: FredIndicator[] = [
  {
    id: 'mortgage-30',
    seriesId: 'MORTGAGE30US',
    label: '30-Yr Fixed Mortgage Rate',
    cadence: 'Weekly',
    what: 'Average rate lenders quote for a 30-year fixed mortgage.',
    why: 'The rate most buyers actually pay — drives monthly payment and affordability.',
    fredUrl: 'https://fred.stlouisfed.org/series/MORTGAGE30US',
    category: 'rates',
    unit: 'percent',
    importance: 3,
  },
  {
    id: 'mortgage-15',
    seriesId: 'MORTGAGE15US',
    label: '15-Yr Fixed Mortgage Rate',
    cadence: 'Weekly',
    what: 'Average rate lenders quote for a 15-year fixed mortgage.',
    why: 'Lower than the 30-year, but higher payments — the fast-payoff tradeoff.',
    fredUrl: 'https://fred.stlouisfed.org/series/MORTGAGE15US',
    category: 'rates',
    unit: 'percent',
    importance: 2,
  },
  {
    id: 'treasury-10y',
    seriesId: 'DGS10',
    label: '10-Year Treasury Yield',
    cadence: 'Daily',
    what: 'Yield on the 10-year U.S. Treasury note.',
    why: 'Mortgage rates track this closely and often move first.',
    fredUrl: 'https://fred.stlouisfed.org/series/DGS10',
    category: 'rates',
    unit: 'percent',
    importance: 3,
  },
  {
    id: 'fed-funds',
    seriesId: 'FEDFUNDS',
    label: 'Federal Funds Rate',
    cadence: 'FOMC-driven',
    what: "The Fed's target rate for overnight bank lending.",
    why: 'Sets the floor for borrowing costs economy-wide.',
    fredUrl: 'https://fred.stlouisfed.org/series/FEDFUNDS',
    category: 'rates',
    unit: 'percent',
    importance: 3,
  },
  {
    id: 'cpi',
    seriesId: 'CPIAUCSL',
    label: 'Consumer Price Index',
    cadence: 'Monthly',
    what: 'Index of prices paid for a broad basket of consumer goods and services.',
    why: 'Headline inflation — a hot print pushes back Fed rate cuts.',
    fredUrl: 'https://fred.stlouisfed.org/series/CPIAUCSL',
    category: 'fed-watch',
    unit: 'index',
    importance: 3,
  },
  {
    id: 'core-pce',
    seriesId: 'PCEPILFE',
    label: 'Core PCE Price Index',
    cadence: 'Monthly',
    what: 'Price index excluding food and energy.',
    why: "The Fed's own preferred inflation gauge, targeted at 2%.",
    fredUrl: 'https://fred.stlouisfed.org/series/PCEPILFE',
    category: 'fed-watch',
    unit: 'index',
    importance: 3,
  },
  {
    id: 'unemployment-rate',
    seriesId: 'UNRATE',
    label: 'U.S. Unemployment Rate',
    cadence: 'Monthly',
    what: 'Share of the labor force that is jobless and looking for work.',
    why: "Half of the Fed's dual mandate — a rising rate builds the case for cuts.",
    fredUrl: 'https://fred.stlouisfed.org/series/UNRATE',
    category: 'fed-watch',
    unit: 'percent',
    importance: 3,
  },
  {
    id: 'nonfarm-payrolls',
    seriesId: 'PAYEMS',
    label: 'Nonfarm Payrolls',
    cadence: 'Monthly',
    what: 'Total U.S. jobs on nonfarm payrolls, in thousands.',
    why: 'The delta shown is the jobs added or lost last month — the market\'s most-watched print.',
    fredUrl: 'https://fred.stlouisfed.org/series/PAYEMS',
    category: 'fed-watch',
    unit: 'count',
    importance: 3,
  },
  {
    id: 'jobless-claims',
    seriesId: 'ICSA',
    label: 'Initial Jobless Claims',
    cadence: 'Weekly',
    what: 'New unemployment insurance claims filed each week.',
    why: 'The fastest-moving crack in the labor market, weeks ahead of the jobs report.',
    fredUrl: 'https://fred.stlouisfed.org/series/ICSA',
    category: 'fed-watch',
    unit: 'count',
    importance: 2,
  },
  {
    id: 'gdp-growth',
    seriesId: 'A191RL1Q225SBEA',
    label: 'Real GDP Growth Rate',
    cadence: 'Quarterly',
    what: 'Annualized quarterly change in real U.S. GDP.',
    why: 'A cooling economy alongside cooling inflation is the classic setup for a cut.',
    fredUrl: 'https://fred.stlouisfed.org/series/A191RL1Q225SBEA',
    category: 'fed-watch',
    unit: 'percent',
    importance: 2,
  },
  {
    id: 'sf-case-shiller',
    seriesId: 'SFXRSA',
    label: 'SF Metro Home Price Index',
    cadence: 'Monthly',
    what: 'Case-Shiller home price index for the SF metro.',
    why: 'The benchmark read on whether Bay Area prices are rising or falling.',
    fredUrl: 'https://fred.stlouisfed.org/series/SFXRSA',
    category: 'bay-area-housing',
    unit: 'index',
    importance: 2,
  },
  {
    id: 'sf-median-listing-price',
    seriesId: 'MEDLISPRI41860',
    label: 'SF Metro Median Listing Price',
    cadence: 'Monthly',
    what: 'Median asking price for active listings, SF-Oakland-Hayward.',
    why: "What sellers are pricing at right now — the number for offers.",
    fredUrl: 'https://fred.stlouisfed.org/series/MEDLISPRI41860',
    category: 'bay-area-housing',
    unit: 'currency',
    importance: 2,
  },
  {
    id: 'san-jose-median-listing-price',
    seriesId: 'MEDLISPRI41940',
    label: 'San Jose Metro Median Listing Price',
    cadence: 'Monthly',
    what: 'Median asking price for active listings, San Jose metro.',
    why: "Silicon Valley's asking-price benchmark for RSU-funded buyers.",
    fredUrl: 'https://fred.stlouisfed.org/series/MEDLISPRI41940',
    category: 'bay-area-housing',
    unit: 'currency',
    importance: 2,
  },
  {
    id: 'san-jose-listings',
    seriesId: 'ACTLISCOU41940',
    label: 'San Jose Metro Active Listings',
    cadence: 'Monthly',
    what: 'Count of active for-sale listings, San Jose metro.',
    why: 'More listings, more negotiating room; fewer, more competition.',
    fredUrl: 'https://fred.stlouisfed.org/series/ACTLISCOU41940',
    category: 'bay-area-housing',
    unit: 'count',
    importance: 1,
  },
  {
    id: 'sf-listings',
    seriesId: 'ACTLISCOU41860',
    label: 'SF Metro Active Listings',
    cadence: 'Monthly',
    what: 'Count of active for-sale listings, SF-Oakland-Hayward.',
    why: "Same read as San Jose's — compare the two sides of the Bay.",
    fredUrl: 'https://fred.stlouisfed.org/series/ACTLISCOU41860',
    category: 'bay-area-housing',
    unit: 'count',
    importance: 1,
  },
  {
    id: 'sf-days-on-market',
    seriesId: 'MEDDAYONMAR41860',
    label: 'SF Metro Median Days on Market',
    cadence: 'Monthly',
    what: "Median days a listing stays active before it's off-market.",
    why: 'Faster than usual means competition is heating up.',
    fredUrl: 'https://fred.stlouisfed.org/series/MEDDAYONMAR41860',
    category: 'bay-area-housing',
    unit: 'days',
    importance: 1,
  },
  {
    id: 'san-jose-unemployment',
    seriesId: 'SANJ906URN',
    label: 'San Jose Metro Unemployment Rate',
    cadence: 'Monthly',
    what: 'Unemployment rate, San Jose-Sunnyvale-Santa Clara metro.',
    why: 'A proxy for tech-sector layoffs and hiring health.',
    fredUrl: 'https://fred.stlouisfed.org/series/SANJ906URN',
    category: 'local-economy',
    unit: 'percent',
    importance: 2,
  },
  {
    id: 'sf-unemployment',
    seriesId: 'SANF806URN',
    label: 'SF Metro Unemployment Rate',
    cadence: 'Monthly',
    what: 'Unemployment rate, SF-Oakland-Hayward metro.',
    why: 'Same read for the San Francisco side of the Bay.',
    fredUrl: 'https://fred.stlouisfed.org/series/SANF806URN',
    category: 'local-economy',
    unit: 'percent',
    importance: 2,
  },
]
