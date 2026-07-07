/**
 * Curated calendar of upcoming dates that matter to a Bay Area mortgage
 * practice: national housing-data releases, the Fed/macro prints that move
 * mortgage rates, Bay Area–specific reports, and holidays/deadlines that
 * affect closings and escrow timing.
 *
 * Unlike src/data/fredIndicators.ts, most of these events don't have a free,
 * redistributable data feed (ISM's Services PMI/Prices/Employment indexes in
 * particular are licensed and not on FRED), so this file intentionally
 * tracks *when things happen* rather than trying to keep "Actual" values
 * current. Where an official schedule wasn't published yet, `estimated:
 * true` flags the date as a best estimate (see `note`) rather than a
 * confirmed one — verify against `sourceUrl` before relying on it for a
 * client conversation.
 *
 * Rendered by src/components/shared/RealEstateCalendar.tsx as an economic-
 * calendar-style table, grouped by category, ordered soonest-first.
 */
export type CalendarCategory = 'housing-data' | 'fed-macro' | 'bay-area' | 'holidays'

export type CalendarImportance = 1 | 2 | 3

export interface CalendarEvent {
  id: string
  /** ISO date (YYYY-MM-DD) — the start date for multi-day events. */
  date: string
  /** ISO end date, for multi-day events like an FOMC meeting. */
  endDate?: string
  /** Local release time, Eastern — omitted for all-day items like holidays. */
  time?: string
  event: string
  category: CalendarCategory
  importance: CalendarImportance
  cadence: string
  /** True if the date is a best estimate pending an official schedule confirmation — see `note`. */
  estimated?: boolean
  source: string
  sourceUrl: string
  note?: string
}

export const calendarCategories: Record<CalendarCategory, string> = {
  'housing-data': 'National housing-data releases',
  'fed-macro': 'Fed & macro events that move rates',
  'bay-area': 'Bay Area & local market dates',
  holidays: 'Holidays & closing deadlines',
}

export const realEstateCalendarEvents: CalendarEvent[] = [
  // --- National housing-data releases ---------------------------------
  {
    id: 'nar-existing-home-sales-jun',
    date: '2026-07-09',
    time: '10:00 AM ET',
    event: 'Existing-Home Sales (June)',
    category: 'housing-data',
    importance: 3,
    cadence: 'Monthly',
    source: 'National Association of Realtors',
    sourceUrl: 'https://www.nar.realtor/research-and-statistics/housing-statistics/existing-home-sales',
  },
  {
    id: 'nar-pending-home-sales-jun',
    date: '2026-07-16',
    time: '10:00 AM ET',
    event: 'Pending Home Sales Index (June)',
    category: 'housing-data',
    importance: 2,
    cadence: 'Monthly',
    source: 'National Association of Realtors',
    sourceUrl: 'https://www.nar.realtor/research-and-statistics/housing-statistics/pending-home-sales',
  },
  {
    id: 'census-housing-starts-jun',
    date: '2026-07-17',
    time: '8:30 AM ET',
    event: 'Housing Starts & Building Permits (June)',
    category: 'housing-data',
    importance: 3,
    cadence: 'Monthly',
    source: 'U.S. Census Bureau',
    sourceUrl: 'https://www.census.gov/construction/nrc/',
  },
  {
    id: 'census-new-home-sales-jun',
    date: '2026-07-24',
    time: '10:00 AM ET',
    event: 'New Home Sales (June)',
    category: 'housing-data',
    importance: 2,
    cadence: 'Monthly',
    estimated: true,
    note: 'Usually the week after Housing Starts — confirm the exact day on the Census release calendar.',
    source: 'U.S. Census Bureau',
    sourceUrl: 'https://www.census.gov/construction/nrc/',
  },
  {
    id: 'case-shiller-may',
    date: '2026-07-28',
    time: '9:00 AM ET',
    event: 'S&P Cotality Case-Shiller Home Price Index (May)',
    category: 'housing-data',
    importance: 2,
    cadence: 'Monthly',
    note: 'Includes the SF and San Jose metro sub-indices used in Indicators Worth Watching, above.',
    source: 'S&P Dow Jones Indices',
    sourceUrl:
      'https://www.spglobal.com/spdji/en/index-family/indicators/sp-corelogic-case-shiller/sp-corelogic-case-shiller-composite/',
  },
  {
    id: 'freddie-mac-pmms',
    date: '2026-07-09',
    time: '~12:00 PM ET',
    event: '30-Yr / 15-Yr Mortgage Rates (PMMS)',
    category: 'housing-data',
    importance: 2,
    cadence: 'Weekly (every Thursday)',
    source: 'Freddie Mac',
    sourceUrl: 'https://www.freddiemac.com/pmms',
  },
  {
    id: 'mba-mortgage-applications',
    date: '2026-07-08',
    time: '7:00 AM ET',
    event: 'Mortgage Applications Survey',
    category: 'housing-data',
    importance: 1,
    cadence: 'Weekly (every Wednesday)',
    source: 'Mortgage Bankers Association',
    sourceUrl: 'https://www.mba.org/news-and-research/newsroom/weekly-applications-survey',
  },

  // --- Fed & macro events that move rates -----------------------------
  {
    id: 'cpi-jun',
    date: '2026-07-14',
    time: '8:30 AM ET',
    event: 'Consumer Price Index (June)',
    category: 'fed-macro',
    importance: 3,
    cadence: 'Monthly',
    source: 'Bureau of Labor Statistics',
    sourceUrl: 'https://www.bls.gov/schedule/news_release/cpi.htm',
  },
  {
    id: 'jobless-claims-weekly',
    date: '2026-07-09',
    time: '8:30 AM ET',
    event: 'Initial Jobless Claims',
    category: 'fed-macro',
    importance: 2,
    cadence: 'Weekly (every Thursday)',
    source: 'U.S. Department of Labor',
    sourceUrl: 'https://www.dol.gov/ui/data.pdf',
  },
  {
    id: 'fomc-jul',
    date: '2026-07-28',
    endDate: '2026-07-29',
    time: '2:00 PM ET decision · 2:30 PM press conf.',
    event: 'FOMC Meeting & Rate Decision',
    category: 'fed-macro',
    importance: 3,
    cadence: '8x / year',
    source: 'Federal Reserve',
    sourceUrl: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm',
  },
  {
    id: 'pce-jun',
    date: '2026-07-31',
    time: '8:30 AM ET',
    event: 'Core PCE Price Index (June)',
    category: 'fed-macro',
    importance: 3,
    cadence: 'Monthly',
    estimated: true,
    note: 'BEA "Personal Income and Outlays" typically posts about a month after month-end — confirm on bea.gov.',
    source: 'Bureau of Economic Analysis',
    sourceUrl: 'https://www.bea.gov/data/personal-consumption-expenditures-price-index-excluding-food-and-energy',
  },
  {
    id: 'ism-manufacturing-jul',
    date: '2026-08-03',
    time: '10:00 AM ET',
    event: 'ISM Manufacturing PMI (July)',
    category: 'fed-macro',
    importance: 2,
    cadence: 'Monthly (1st business day)',
    estimated: true,
    note: 'Released the first business day of the month — confirm on the ISM report calendar.',
    source: 'Institute for Supply Management',
    sourceUrl: 'https://www.ismworld.org/supply-management-news-and-reports/reports/rob-report-calendar/',
  },
  {
    id: 'ism-services-jul',
    date: '2026-08-05',
    time: '10:00 AM ET',
    event: 'ISM Services PMI, Prices Index & Employment Index (July)',
    category: 'fed-macro',
    importance: 3,
    cadence: 'Monthly (3rd business day)',
    estimated: true,
    note: 'Covers the Services PMI, Prices Index, and Employment Index together. Not on FRED (ISM restricts redistribution) — actual values aren’t tracked here, check ismworld.org when it drops.',
    source: 'Institute for Supply Management',
    sourceUrl: 'https://www.ismworld.org/supply-management-news-and-reports/reports/rob-report-calendar/',
  },
  {
    id: 'jobs-report-jul',
    date: '2026-08-07',
    time: '8:30 AM ET',
    event: 'Employment Situation / Jobs Report (July)',
    category: 'fed-macro',
    importance: 3,
    cadence: 'Monthly (1st Friday, usually)',
    estimated: true,
    note: 'First Friday of the month — confirm on the BLS release schedule.',
    source: 'Bureau of Labor Statistics',
    sourceUrl: 'https://www.bls.gov/schedule/news_release/empsit.htm',
  },

  // --- Bay Area & local market dates -----------------------------------
  {
    id: 'edd-metro-unemployment',
    date: '2026-07-17',
    event: 'SF & San Jose Metro Unemployment (June)',
    category: 'bay-area',
    importance: 2,
    cadence: 'Monthly (~3rd Friday)',
    estimated: true,
    note: 'EDD typically posts metro-level unemployment about 3 weeks after month-end — confirm on labormarketinfo.edd.ca.gov.',
    source: 'CA Employment Development Department',
    sourceUrl: 'https://labormarketinfo.edd.ca.gov/data/monthly-data-release.html',
  },
  {
    id: 'car-monthly-report',
    date: '2026-07-20',
    event: 'C.A.R. Monthly Housing Market Report',
    category: 'bay-area',
    importance: 1,
    cadence: 'Monthly',
    estimated: true,
    note: 'Exact publish date varies month to month — see car.org for the current release.',
    source: 'California Association of Realtors',
    sourceUrl: 'https://www.car.org/marketdata',
  },

  // --- Holidays & closing deadlines -------------------------------------
  {
    id: 'labor-day-2026',
    date: '2026-09-07',
    event: 'Labor Day (federal/bank holiday)',
    category: 'holidays',
    importance: 1,
    cadence: 'Annual',
    note: 'Banks and county recorder offices closed — build it into closing timelines.',
    source: 'Federal Reserve holiday schedule',
    sourceUrl: 'https://www.federalreserve.gov/aboutthefed/k8.htm',
  },
  {
    id: 'columbus-day-2026',
    date: '2026-10-12',
    event: "Columbus Day / Indigenous Peoples' Day (bank holiday)",
    category: 'holidays',
    importance: 1,
    cadence: 'Annual',
    source: 'Federal Reserve holiday schedule',
    sourceUrl: 'https://www.federalreserve.gov/aboutthefed/k8.htm',
  },
  {
    id: 'veterans-day-2026',
    date: '2026-11-11',
    event: 'Veterans Day (federal/bank holiday)',
    category: 'holidays',
    importance: 1,
    cadence: 'Annual',
    source: 'Federal Reserve holiday schedule',
    sourceUrl: 'https://www.federalreserve.gov/aboutthefed/k8.htm',
  },
  {
    id: 'thanksgiving-2026',
    date: '2026-11-26',
    event: 'Thanksgiving Day (bank holiday)',
    category: 'holidays',
    importance: 1,
    cadence: 'Annual',
    source: 'Federal Reserve holiday schedule',
    sourceUrl: 'https://www.federalreserve.gov/aboutthefed/k8.htm',
  },
  {
    id: 'ca-property-tax-1st-installment',
    date: '2026-12-10',
    event: 'CA Property Tax 1st Installment Delinquent After',
    category: 'holidays',
    importance: 2,
    cadence: 'Annual',
    note: '10% penalty + admin cost applies after this date if the first installment is unpaid.',
    source: 'CA State Board of Equalization',
    sourceUrl: 'https://www.boe.ca.gov/proptaxes/calendar.htm',
  },
  {
    id: 'christmas-2026',
    date: '2026-12-25',
    event: 'Christmas Day (bank holiday)',
    category: 'holidays',
    importance: 1,
    cadence: 'Annual',
    source: 'Federal Reserve holiday schedule',
    sourceUrl: 'https://www.federalreserve.gov/aboutthefed/k8.htm',
  },
  {
    id: 'new-years-2027',
    date: '2027-01-01',
    event: "New Year's Day (bank holiday)",
    category: 'holidays',
    importance: 1,
    cadence: 'Annual',
    source: 'Federal Reserve holiday schedule',
    sourceUrl: 'https://www.federalreserve.gov/aboutthefed/k8.htm',
  },
  {
    id: 'ca-property-tax-2nd-installment',
    date: '2027-04-10',
    event: 'CA Property Tax 2nd Installment Delinquent After',
    category: 'holidays',
    importance: 2,
    cadence: 'Annual',
    note: '10% penalty + admin cost applies after this date if the second installment is unpaid.',
    source: 'CA State Board of Equalization',
    sourceUrl: 'https://www.boe.ca.gov/proptaxes/calendar.htm',
  },
  {
    id: 'tax-day-2027',
    date: '2027-04-15',
    event: 'Federal Tax Day (individual filing deadline)',
    category: 'holidays',
    importance: 1,
    cadence: 'Annual',
    source: 'IRS',
    sourceUrl: 'https://www.irs.gov/filing/when-to-file',
  },
]
