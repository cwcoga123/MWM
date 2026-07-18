import homeCostCatalogJson from '../data/homeCostSeries.json'
import homeCostHistoryJson from '../data/homeCostHistory.json'
import type { FredIndicatorDisplay, FredIndicatorUnit } from '../data/fredIndicators'
import { formatFredValue } from './formatFredValue'

export type HomeCostRange = '1Y' | '5Y' | '10Y' | '20Y'
export type HomeCostGeoFilter = 'all' | HomeCostLayer['id']

export interface HomeCostIndicator {
  id: string
  seriesId: string
  label: string
  unit: FredIndicatorUnit
  display?: FredIndicatorDisplay
  cadence: string
}

export interface HomeCostGroup {
  id: string
  label: string
  indicators: HomeCostIndicator[]
}

export interface HomeCostLayer {
  id: 'local' | 'california' | 'national'
  label: string
  subtitle: string
  groups: HomeCostGroup[]
}

export interface HomeCostCatalog {
  layers: HomeCostLayer[]
}

export interface HistoryPoint {
  date: string
  value: number
}

export interface HistoryEntry {
  seriesId: string
  latest: HistoryPoint
  points: HistoryPoint[]
}

export interface HomeCostHistory {
  generatedAt: string | null
  historyYears: number
  sampling: string
  values: Record<string, HistoryEntry>
}

export interface HomeCostRecord {
  indicator: HomeCostIndicator
  group: HomeCostGroup
  layer: HomeCostLayer
  groupKey: string
  history?: HistoryEntry
}

export type ChangeTone = 'up' | 'down' | 'flat'

export interface ChangeSummary {
  label: string
  suffix: string
  tone: ChangeTone
  percent: number
}

export const homeCostCatalog = homeCostCatalogJson as HomeCostCatalog
export const homeCostHistory = homeCostHistoryJson as HomeCostHistory

export const HOME_COST_RANGE_OPTIONS: HomeCostRange[] = ['1Y', '5Y', '10Y', '20Y']
export const DEFAULT_HOME_COST_PINS = [
  'mortgage-30',
  'sf-case-shiller',
  'sf-median-listing-price',
  'ca-house-price-index',
]

export const homeCostRecords: HomeCostRecord[] = homeCostCatalog.layers.flatMap((layer) =>
  layer.groups.flatMap((group) =>
    group.indicators.map((indicator) => ({
      indicator,
      group,
      layer,
      groupKey: `${layer.id}:${group.id}`,
      history: homeCostHistory.values[indicator.id],
    })),
  ),
)

export const homeCostRecordById = new Map(homeCostRecords.map((record) => [record.indicator.id, record]))

export function getHomeCostRecord(id: string) {
  return homeCostRecordById.get(id)
}

export function getRangePoints(points: HistoryPoint[], range: HomeCostRange) {
  const counts: Record<HomeCostRange, number | null> = {
    '1Y': 13,
    '5Y': 61,
    '10Y': 121,
    '20Y': null,
  }
  const count = counts[range]

  return count ? points.slice(-count) : points
}

export function formatHomeCostValue(unit: FredIndicatorUnit, value: number) {
  return formatFredValue(unit, value)
}

export function formatHomeCostDisplayValue(record: HomeCostRecord, value: number) {
  if (record.indicator.display === 'yearOverYearPercent') {
    return `${value.toFixed(1)}%`
  }

  return formatHomeCostValue(record.indicator.unit, value)
}

export function formatYear(isoDate: string) {
  return new Date(`${isoDate}T00:00:00Z`).getUTCFullYear()
}

export function formatMonthYear(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00Z`)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function getChangeSummary(points: HistoryPoint[], range: HomeCostRange): ChangeSummary {
  if (points.length < 2) {
    return {
      label: 'Pending',
      suffix: '',
      tone: 'flat',
      percent: 0,
    }
  }

  const first = points[0]
  const latest = points[points.length - 1]
  const percent = first.value === 0 ? 0 : ((latest.value - first.value) / Math.abs(first.value)) * 100
  const flat = Math.abs(percent) < 0.05
  const digits = Math.abs(percent) >= 10 ? 0 : 1
  const suffix = range === '20Y' ? `since ${formatYear(first.date)}` : `over ${range}`

  if (flat) {
    return {
      label: 'Flat',
      suffix,
      tone: 'flat',
      percent,
    }
  }

  return {
    label: `${percent > 0 ? '+' : '-'}${Math.abs(percent).toFixed(digits)}%`,
    suffix,
    tone: percent > 0 ? 'up' : 'down',
    percent,
  }
}

export function getLatestPoint(record: HomeCostRecord) {
  return record.history?.latest ?? record.history?.points.at(-1)
}

function yearAgoMonthKey(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00Z`)
  date.setUTCFullYear(date.getUTCFullYear() - 1)
  return date.toISOString().slice(0, 7)
}

export function getDisplayPoints(record: HomeCostRecord): HistoryPoint[] {
  const points = record.history?.points ?? []

  if (record.indicator.display !== 'yearOverYearPercent') return points

  const byMonth = new Map(points.map((point) => [point.date.slice(0, 7), point]))

  return points.flatMap((point) => {
    const yearAgo = byMonth.get(yearAgoMonthKey(point.date))
    if (!yearAgo || yearAgo.value === 0) return []

    return [
      {
        date: point.date,
        value: ((point.value - yearAgo.value) / Math.abs(yearAgo.value)) * 100,
      },
    ]
  })
}

export function getDisplayLatestPoint(record: HomeCostRecord) {
  return getDisplayPoints(record).at(-1)
}

export function getIndicatorCount() {
  return homeCostRecords.length
}
