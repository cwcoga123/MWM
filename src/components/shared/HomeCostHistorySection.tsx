import { useEffect } from 'react'
import { ArrowUpRight } from 'lucide-react'
import homeCostCatalogJson from '../../data/homeCostSeries.json'
import homeCostHistoryJson from '../../data/homeCostHistory.json'
import { formatFredDate, formatSnapshotTimestamp } from '../../lib/formatFredValue'

type HomeCostUnit =
  | 'compactCurrency'
  | 'count'
  | 'currency'
  | 'days'
  | 'dollarsPerBarrel'
  | 'dollarsPerGallon'
  | 'dollarsPerHour'
  | 'dollarsPerMmbtu'
  | 'index'
  | 'months'
  | 'percent'
  | 'thousands'

interface HomeCostIndicator {
  id: string
  seriesId: string
  label: string
  unit: HomeCostUnit
  cadence: string
}

interface HomeCostGroup {
  id: string
  label: string
  indicators: HomeCostIndicator[]
}

interface HomeCostLayer {
  id: 'local' | 'california' | 'national'
  label: string
  subtitle: string
  groups: HomeCostGroup[]
}

interface HomeCostCatalog {
  layers: HomeCostLayer[]
}

interface HistoryPoint {
  date: string
  value: number
}

interface HistoryEntry {
  seriesId: string
  latest: HistoryPoint
  points: HistoryPoint[]
}

interface HomeCostHistory {
  generatedAt: string | null
  historyYears: number
  sampling: string
  values: Record<string, HistoryEntry>
}

const homeCostCatalog = homeCostCatalogJson as HomeCostCatalog
const homeCostHistory = homeCostHistoryJson as HomeCostHistory
const homeCostValues = homeCostHistory.values

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const compactCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
})

function formatDecimal(value: number, digits = 1) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

function formatHomeCostValue(unit: HomeCostUnit, value: number): string {
  switch (unit) {
    case 'compactCurrency':
      return compactCurrency.format(value)
    case 'currency':
      return currency.format(value)
    case 'days':
      return `${Math.round(value)} days`
    case 'dollarsPerBarrel':
      return `$${formatDecimal(value, 2)}/bbl`
    case 'dollarsPerGallon':
      return `$${formatDecimal(value, 2)}/gal`
    case 'dollarsPerHour':
      return `$${formatDecimal(value, 2)}/hr`
    case 'dollarsPerMmbtu':
      return `$${formatDecimal(value, 2)}/MMBtu`
    case 'index':
      return formatDecimal(value, 1)
    case 'months':
      return `${formatDecimal(value, 1)} mo`
    case 'percent':
      return `${formatDecimal(value, Math.abs(value) < 10 ? 2 : 1)}%`
    case 'thousands':
      return value >= 10000 ? `${formatDecimal(value / 1000, 1)}M` : `${Math.round(value).toLocaleString('en-US')}K`
    case 'count':
    default:
      return Math.round(value).toLocaleString('en-US')
  }
}

function formatYear(isoDate: string) {
  return new Date(`${isoDate}T00:00:00Z`).getUTCFullYear()
}

function formatPercentChange(current: number, start: number): string {
  if (start === 0) return 'Flat'
  const change = ((current - start) / Math.abs(start)) * 100
  if (Math.abs(change) < 0.05) return 'Flat'
  const digits = Math.abs(change) >= 10 ? 0 : 1
  const sign = change > 0 ? '+' : '-'
  return `${sign}${Math.abs(change).toFixed(digits)}%`
}

function toneFromChange(current: number, start: number): 'up' | 'down' | 'flat' {
  const change = current - start
  if (Math.abs(change) < 0.005) return 'flat'
  return change > 0 ? 'up' : 'down'
}

function HistoryLineChart({ label, points }: { label: string; points: HistoryPoint[] }) {
  if (points.length < 2) {
    return <div className="home-cost-chart home-cost-chart--empty">No history</div>
  }

  const width = 280
  const height = 98
  const left = 10
  const right = 270
  const top = 12
  const bottom = 75
  const values = points.map((point) => point.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min
  const coordinates = points.map((point, index) => {
    const x = left + (index / (points.length - 1)) * (right - left)
    const y = range === 0 ? (top + bottom) / 2 : bottom - ((point.value - min) / range) * (bottom - top)
    return { x, y }
  })
  const path = coordinates.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ')
  const latest = coordinates[coordinates.length - 1]

  return (
    <svg className="home-cost-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${label} 20-year chart`}>
      {[top, (top + bottom) / 2, bottom].map((y) => (
        <line key={y} className="home-cost-chart__grid" x1={left} x2={right} y1={y} y2={y} />
      ))}
      <path className="home-cost-chart__line" d={path} />
      <circle className="home-cost-chart__dot" cx={latest.x} cy={latest.y} r="3.6" />
      <text className="home-cost-chart__year" x={left} y={94}>
        {formatYear(points[0].date)}
      </text>
      <text className="home-cost-chart__year home-cost-chart__year--end" x={right} y={94}>
        {formatYear(points[points.length - 1].date)}
      </text>
    </svg>
  )
}

function HomeCostCard({ indicator }: { indicator: HomeCostIndicator }) {
  const history = homeCostValues[indicator.id]
  const points = history?.points ?? []
  const latest = history?.latest ?? points[points.length - 1]
  const first = points[0]
  const tone = latest && first ? toneFromChange(latest.value, first.value) : 'flat'
  const changeLabel = latest && first ? formatPercentChange(latest.value, first.value) : 'Pending'

  return (
    <a
      className="home-cost-card"
      href={`https://fred.stlouisfed.org/series/${indicator.seriesId}`}
      target="_blank"
      rel="noreferrer"
      aria-label={`View ${indicator.label} on FRED`}
    >
      <span className="home-cost-card__topline">
        <span>{indicator.cadence}</span>
        <ArrowUpRight size={13} aria-hidden="true" />
      </span>
      <h5>{indicator.label}</h5>
      <strong>{latest ? formatHomeCostValue(indicator.unit, latest.value) : '--'}</strong>
      <span className={`home-cost-card__change home-cost-card__change--${tone}`}>
        {changeLabel}
        {first && <span> since {formatYear(first.date)}</span>}
      </span>
      <HistoryLineChart label={indicator.label} points={points} />
      <span className="home-cost-card__meta">
        {latest ? `As of ${formatFredDate(latest.date)}` : 'Refresh pending'} - {indicator.seriesId}
      </span>
    </a>
  )
}

export function HomeCostHistorySection() {
  useEffect(() => {
    if (window.location.hash === '#home-cost-watch') {
      window.requestAnimationFrame(() => {
        document.getElementById('home-cost-watch')?.scrollIntoView()
      })
    }
  }, [])

  return (
    <section className="overview-section home-cost-watch" id="home-cost-watch">
      <div className="overview-section__heading">
        <span className="eyebrow">HOME COST WATCH</span>
        <h2>Twenty-year view by geography</h2>
      </div>

      <div className="home-cost-layers">
        {homeCostCatalog.layers.map((layer) => (
          <div className={`home-cost-layer home-cost-layer--${layer.id}`} key={layer.id}>
            <div className="home-cost-layer__heading">
              <span>{layer.label}</span>
              <h3>{layer.subtitle}</h3>
            </div>

            <div className="home-cost-groups">
              {layer.groups.map((group) => (
                <div className="home-cost-group" key={group.id}>
                  <h4>{group.label}</h4>
                  <div className="home-cost-grid">
                    {group.indicators.map((indicator) => (
                      <HomeCostCard indicator={indicator} key={indicator.id} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="overview-section__footnote">
        {homeCostHistory.generatedAt
          ? `History refreshed ${formatSnapshotTimestamp(homeCostHistory.generatedAt)}. Charts use ${homeCostHistory.sampling} observations.`
          : 'History refresh pending.'}
      </p>
    </section>
  )
}
