import {
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { ArrowRight, ArrowUpRight, ChevronDown, MapPin, Search, Star, X } from 'lucide-react'
import {
  DEFAULT_HOME_COST_PINS,
  HOME_COST_RANGE_OPTIONS,
  formatHomeCostValue,
  formatHomeCostDisplayValue,
  formatMonthYear,
  formatYear,
  getChangeSummary,
  getDisplayLatestPoint,
  getDisplayPoints,
  getHomeCostRecord,
  getIndicatorCount,
  getLatestPoint,
  getRangePoints,
  homeCostCatalog,
  homeCostHistory,
  type ChangeTone,
  type HistoryPoint,
  type HomeCostGeoFilter,
  type HomeCostRange,
  type HomeCostRecord,
} from '../../lib/homeCostWatch'
import { formatFredDate, formatSnapshotTimestamp } from '../../lib/formatFredValue'
import type { HubUser } from '../shell/AuthGate'
import { useClientActivity } from '../shared/clientActivityContext'

const PIN_STORAGE_KEY = 'mwm.costwatch.pins'

function pinStorageKey(userId?: string) {
  return userId ? `${PIN_STORAGE_KEY}.${userId}` : PIN_STORAGE_KEY
}
const SUMMARY_INDICATOR_IDS = [
  'mortgage-30',
  'sf-case-shiller',
  'sf-median-listing-price',
  'ca-house-price-index',
]

const GEO_OPTIONS: { id: HomeCostGeoFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'local', label: 'Bay Area' },
  { id: 'california', label: 'California' },
  { id: 'national', label: 'National' },
]

const SF_AREA_INDICATORS = [
  'sf-case-shiller',
  'sf-median-listing-price',
  'sf-listings',
  'sf-days-on-market',
  'sf-unemployment',
  'sf-permits',
]
const SAN_JOSE_AREA_INDICATORS = [
  'san-jose-median-listing-price',
  'san-jose-listings',
  'san-jose-unemployment',
  'san-jose-permits',
]
const RATE_INTEREST_INDICATORS = ['mortgage-30', 'mortgage-15', 'treasury-10y']

function savedAreaIndicatorIds(user?: HubUser) {
  if (!user) return []

  const savedNeighborhoods = [...user.neighborhoods, ...user.preferences.savedAreas].map((area) => area.toLowerCase())
  const hasSanJoseInterest = savedNeighborhoods.some((area) =>
    ['san jose', 'cupertino', 'sunnyvale', 'santa clara', 'los gatos', 'campbell'].some((match) =>
      area.includes(match),
    ),
  )
  const hasSavedAreas = savedNeighborhoods.length > 0
  const ids = [
    ...(hasSavedAreas ? SF_AREA_INDICATORS : []),
    ...(hasSanJoseInterest ? SAN_JOSE_AREA_INDICATORS : []),
    ...(user.targetBudget ? ['sf-median-listing-price'] : []),
    ...(user.lockedRate || user.refiThreshold ? RATE_INTEREST_INDICATORS : []),
  ]

  return Array.from(new Set(ids)).filter((id) => Boolean(getHomeCostRecord(id)))
}

function generatedDateLabel(isoTimestamp: string | null) {
  if (!isoTimestamp) return 'Refresh pending'
  const date = new Date(isoTimestamp)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function readInitialDetailId() {
  const hash = window.location.hash.slice(1)
  const match = hash.match(/^cost-watch\/(.+)$/)
  const detailId = match?.[1] ? decodeURIComponent(match[1]) : null

  return detailId && getHomeCostRecord(detailId) ? detailId : null
}

function readPins(userId?: string) {
  try {
    const stored = window.localStorage.getItem(pinStorageKey(userId))
    if (!stored) return DEFAULT_HOME_COST_PINS
    const parsed = JSON.parse(stored)

    if (Array.isArray(parsed)) {
      const validPins = parsed.filter((id): id is string => typeof id === 'string' && Boolean(getHomeCostRecord(id)))
      return validPins.length ? validPins : DEFAULT_HOME_COST_PINS
    }
  } catch {
    return DEFAULT_HOME_COST_PINS
  }

  return DEFAULT_HOME_COST_PINS
}

function nearestIndexFromPointer(
  event: ReactPointerEvent<SVGSVGElement>,
  pointsLength: number,
  viewWidth: number,
  left: number,
  right: number,
) {
  const rect = event.currentTarget.getBoundingClientRect()
  const viewX = ((event.clientX - rect.left) / rect.width) * viewWidth
  const ratio = Math.min(1, Math.max(0, (viewX - left) / (right - left)))

  return Math.round(ratio * (pointsLength - 1))
}

function toneClass(tone: ChangeTone) {
  return `cost-watch-change cost-watch-change--${tone}`
}

function TooltipPill({
  x,
  y,
  text,
  viewWidth,
}: {
  x: number
  y: number
  text: string
  viewWidth: number
}) {
  const width = Math.min(Math.max(text.length * 6.4 + 20, 118), viewWidth - 8)
  const tipX = Math.min(Math.max(x - width / 2, 4), viewWidth - width - 4)
  const tipY = Math.max(2, y - 34)

  return (
    <g className="cost-watch-tooltip" transform={`translate(${tipX.toFixed(1)} ${tipY.toFixed(1)})`}>
      <rect width={width.toFixed(1)} height="24" rx="7" />
      <text x={(width / 2).toFixed(1)} y="16">
        {text}
      </text>
    </g>
  )
}

function buildCoordinates(
  points: HistoryPoint[],
  left: number,
  right: number,
  top: number,
  bottom: number,
) {
  const values = points.map((point) => point.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min
  const coordinates = points.map((point, index) => {
    const x = left + (index / (points.length - 1)) * (right - left)
    const y = range === 0 ? (top + bottom) / 2 : bottom - ((point.value - min) / range) * (bottom - top)
    return { x, y, point }
  })

  return { coordinates, min, max }
}

function pathFromCoordinates(coordinates: { x: number; y: number }[]) {
  return coordinates.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ')
}

function HistoryLineChart({
  label,
  points,
  record,
  range,
}: {
  label: string
  points: HistoryPoint[]
  record: HomeCostRecord
  range: HomeCostRange
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  if (points.length < 2) {
    return <div className="cost-watch-chart cost-watch-chart--empty">No history</div>
  }

  const width = 280
  const height = 98
  const left = 10
  const right = 270
  const top = 12
  const bottom = 75
  const { coordinates } = buildCoordinates(points, left, right, top, bottom)
  const latest = coordinates[coordinates.length - 1]
  const hover = hoverIndex === null ? null : coordinates[hoverIndex]
  const hoverText = hover
    ? `${formatMonthYear(hover.point.date)} - ${formatHomeCostDisplayValue(record, hover.point.value)}`
    : ''
  const startLabel = range === '1Y' ? formatMonthYear(points[0].date) : String(formatYear(points[0].date))
  const endLabel = range === '1Y' ? formatMonthYear(points[points.length - 1].date) : String(formatYear(points[points.length - 1].date))

  return (
    <svg
      className="cost-watch-chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${label} ${range} chart`}
      onPointerMove={(event) => setHoverIndex(nearestIndexFromPointer(event, points.length, width, left, right))}
      onPointerLeave={() => setHoverIndex(null)}
    >
      {[top, (top + bottom) / 2, bottom].map((y) => (
        <line key={y} className="cost-watch-chart__grid" x1={left} x2={right} y1={y} y2={y} />
      ))}
      <path className="cost-watch-chart__line" d={pathFromCoordinates(coordinates)} />
      <circle className="cost-watch-chart__dot" cx={latest.x} cy={latest.y} r="3.6" />
      {hover && <TooltipPill x={hover.x} y={hover.y} text={hoverText} viewWidth={width} />}
      <text className="cost-watch-chart__label" x={left} y={94}>
        {startLabel}
      </text>
      <text className="cost-watch-chart__label cost-watch-chart__label--end" x={right} y={94}>
        {endLabel}
      </text>
    </svg>
  )
}

function MiniSparkline({ points }: { points: HistoryPoint[] }) {
  if (points.length < 2) return null

  const width = 200
  const height = 30
  const { coordinates } = buildCoordinates(points, 2, 198, 3, 25)
  const latest = coordinates[coordinates.length - 1]

  return (
    <svg className="cost-watch-strip-chart" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path d={pathFromCoordinates(coordinates)} />
      <circle cx={latest.x} cy={latest.y} r="2.8" />
    </svg>
  )
}

function IndicatorCard({
  record,
  range,
  pinned,
  onTogglePin,
  onOpen,
  featured = false,
}: {
  record: HomeCostRecord
  range: HomeCostRange
  pinned: boolean
  onTogglePin: (id: string) => void
  onOpen: (id: string) => void
  featured?: boolean
}) {
  const points = getRangePoints(getDisplayPoints(record), range)
  const latest = getDisplayLatestPoint(record)
  const rawLatest = getLatestPoint(record)
  const change = getChangeSummary(points, range)
  const rawIndexNote =
    record.indicator.display === 'yearOverYearPercent' && rawLatest
      ? ` (index ${formatHomeCostValue(record.indicator.unit, rawLatest.value)})`
      : ''

  function openFromKeyboard(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onOpen(record.indicator.id)
    }
  }

  return (
    <article
      className={`cost-watch-card ${featured ? 'cost-watch-card--pinned' : ''}`}
      data-indicator-id={record.indicator.id}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(record.indicator.id)}
      onKeyDown={openFromKeyboard}
    >
      <div className="cost-watch-card__topline">
        <span>{record.indicator.cadence}</span>
        <span className="cost-watch-card__actions">
          <button
            type="button"
            className={`cost-watch-icon-button ${pinned ? 'is-pinned' : ''}`}
            aria-label={pinned ? `Unpin ${record.indicator.label}` : `Pin ${record.indicator.label}`}
            onClick={(event) => {
              event.stopPropagation()
              onTogglePin(record.indicator.id)
            }}
          >
            <Star size={13} fill={pinned ? 'currentColor' : 'none'} />
          </button>
          <a
            className="cost-watch-icon-button"
            href={`https://fred.stlouisfed.org/series/${record.indicator.seriesId}`}
            target="_blank"
            rel="noreferrer"
            aria-label={`View ${record.indicator.label} on FRED`}
            onClick={(event) => event.stopPropagation()}
          >
            <ArrowUpRight size={13} />
          </a>
        </span>
      </div>
      <h3>{record.indicator.label}</h3>
      <strong>{latest ? formatHomeCostDisplayValue(record, latest.value) : '--'}</strong>
      <span className={toneClass(change.tone)}>
        {change.label}
        {change.suffix && <span> {change.suffix}</span>}
      </span>
      <HistoryLineChart label={record.indicator.label} points={points} record={record} range={range} />
      <span className="cost-watch-card__meta">
        {rawLatest ? `As of ${formatFredDate(rawLatest.date)}` : 'Refresh pending'} - {record.indicator.seriesId}
        {rawIndexNote}
      </span>
    </article>
  )
}

function RangeSegmentedControl({
  value,
  onChange,
  compact = false,
}: {
  value: HomeCostRange
  onChange: (range: HomeCostRange) => void
  compact?: boolean
}) {
  return (
    <div className={`cost-watch-segments ${compact ? 'cost-watch-segments--compact' : ''}`} aria-label="Time range">
      {HOME_COST_RANGE_OPTIONS.map((range) => (
        <button
          type="button"
          key={range}
          className={value === range ? 'is-active' : ''}
          onClick={() => onChange(range)}
        >
          {range}
        </button>
      ))}
    </div>
  )
}

function GeoSegmentedControl({
  value,
  onChange,
}: {
  value: HomeCostGeoFilter
  onChange: (geo: HomeCostGeoFilter) => void
}) {
  return (
    <div className="cost-watch-segments" aria-label="Geography filter">
      {GEO_OPTIONS.map((option) => (
        <button
          type="button"
          key={option.id}
          className={value === option.id ? 'is-active' : ''}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function DetailChart({
  record,
  points,
}: {
  record: HomeCostRecord
  points: HistoryPoint[]
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  if (points.length < 2) {
    return <div className="cost-watch-detail-chart cost-watch-chart--empty">No history</div>
  }

  const width = 720
  const height = 300
  const left = 8
  const right = 664
  const top = 16
  const bottom = 264
  const { coordinates, min, max } = buildCoordinates(points, left, right, top, bottom)
  const mid = (min + max) / 2
  const linePath = pathFromCoordinates(coordinates)
  const areaPath = `M${left} ${bottom} ${linePath.replace(/^M/, 'L')} L${right} ${bottom} Z`
  const active = hoverIndex === null ? coordinates[coordinates.length - 1] : coordinates[hoverIndex]
  const hoverText = `${formatMonthYear(active.point.date)} - ${formatHomeCostDisplayValue(record, active.point.value)}`

  return (
    <svg
      className="cost-watch-detail-chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${record.indicator.label} detail chart`}
      onPointerMove={(event) => setHoverIndex(nearestIndexFromPointer(event, points.length, width, left, right))}
      onPointerLeave={() => setHoverIndex(null)}
    >
      {[
        { y: top, value: max },
        { y: (top + bottom) / 2, value: mid },
        { y: bottom, value: min },
      ].map((tick) => (
        <g key={tick.y}>
          <line className="cost-watch-detail-chart__grid" x1={left} x2={right} y1={tick.y} y2={tick.y} />
          <text className="cost-watch-detail-chart__axis" x="676" y={tick.y + 4}>
            {formatHomeCostDisplayValue(record, tick.value)}
          </text>
        </g>
      ))}
      <path className="cost-watch-detail-chart__area" d={areaPath} />
      <path className="cost-watch-detail-chart__line" d={linePath} />
      {hoverIndex !== null && (
        <line
          className="cost-watch-detail-chart__crosshair"
          x1={active.x}
          x2={active.x}
          y1={top}
          y2={bottom}
        />
      )}
      <circle className="cost-watch-detail-chart__dot" cx={active.x} cy={active.y} r="4.4" />
      {hoverIndex !== null && <TooltipPill x={active.x} y={active.y} text={hoverText} viewWidth={width} />}
      <text className="cost-watch-detail-chart__date" x={left} y="294">
        {formatMonthYear(points[0].date)}
      </text>
      <text className="cost-watch-detail-chart__date cost-watch-detail-chart__date--end" x={right} y="294">
        {formatMonthYear(points[points.length - 1].date)}
      </text>
    </svg>
  )
}

function RangeStats({
  record,
  points,
}: {
  record: HomeCostRecord
  points: HistoryPoint[]
}) {
  if (!points.length) return null

  const latest = points[points.length - 1]
  const high = points.reduce((best, point) => (point.value > best.value ? point : best), points[0])
  const low = points.reduce((best, point) => (point.value < best.value ? point : best), points[0])
  const start = points[0]
  const stats = [
    { label: 'LATEST', point: latest, sub: formatFredDate(latest.date) },
    { label: 'HIGH', point: high, sub: formatMonthYear(high.date) },
    { label: 'LOW', point: low, sub: formatMonthYear(low.date) },
    { label: 'START OF RANGE', point: start, sub: formatMonthYear(start.date) },
  ]

  return (
    <div className="cost-watch-stat-grid">
      {stats.map((stat) => (
        <article key={stat.label}>
          <span>{stat.label}</span>
          <strong>{formatHomeCostDisplayValue(record, stat.point.value)}</strong>
          <small>{stat.sub}</small>
        </article>
      ))}
    </div>
  )
}

function CostWatchDetailModal({
  record,
  range,
  onRangeChange,
  pinned,
  onTogglePin,
  onClose,
}: {
  record: HomeCostRecord
  range: HomeCostRange
  onRangeChange: (range: HomeCostRange) => void
  pinned: boolean
  onTogglePin: (id: string) => void
  onClose: () => void
}) {
  const points = getRangePoints(getDisplayPoints(record), range)
  const latest = getDisplayLatestPoint(record)
  const rawLatest = getLatestPoint(record)
  const change = getChangeSummary(points, range)

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return (
    <div
      className="cost-watch-modal"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section className="cost-watch-detail" role="dialog" aria-modal="true" aria-label={record.indicator.label}>
        <header className="cost-watch-detail__header">
          <div>
            <span className="cost-watch-detail__breadcrumb">
              {record.layer.label} - {record.layer.subtitle} - {record.group.label}
            </span>
            <h2>{record.indicator.label}</h2>
          </div>
          <div className="cost-watch-detail__actions">
            <button
              type="button"
              className={pinned ? 'is-pinned' : ''}
              onClick={() => onTogglePin(record.indicator.id)}
            >
              <Star size={14} fill={pinned ? 'currentColor' : 'none'} />
              {pinned ? 'Pinned' : 'Pin'}
            </button>
            <a href={`https://fred.stlouisfed.org/series/${record.indicator.seriesId}`} target="_blank" rel="noreferrer">
              View on FRED <ArrowUpRight size={13} />
            </a>
            <button type="button" className="cost-watch-detail__close" aria-label="Close detail" onClick={onClose}>
              <X size={17} />
            </button>
          </div>
        </header>

        <div className="cost-watch-detail__summary">
          <div>
            <strong>{latest ? formatHomeCostDisplayValue(record, latest.value) : '--'}</strong>
            <span className={toneClass(change.tone)}>
              {change.label}
              {change.suffix && <span> {change.suffix}</span>}
            </span>
          </div>
          <RangeSegmentedControl value={range} onChange={onRangeChange} compact />
        </div>

        <DetailChart record={record} points={points} />
        <RangeStats record={record} points={points} />
        <p className="cost-watch-detail__meta">
          {record.indicator.cadence} series - FRED {record.indicator.seriesId}
          {rawLatest ? ` - As of ${formatFredDate(rawLatest.date)}` : ''}
          {record.indicator.display === 'yearOverYearPercent' && rawLatest
            ? ` - index ${formatHomeCostValue(record.indicator.unit, rawLatest.value)}`
            : ''}
        </p>
      </section>
    </div>
  )
}

export function CostWatchOverviewStrip({ onOpenCostWatch }: { onOpenCostWatch: (indicatorId?: string) => void }) {
  const records = SUMMARY_INDICATOR_IDS.map((id) => getHomeCostRecord(id)).filter((record): record is HomeCostRecord =>
    Boolean(record),
  )
  const labels: Record<string, string> = {
    'mortgage-30': '30-yr mortgage',
    'sf-case-shiller': 'SF home prices',
    'sf-median-listing-price': 'SF median listing',
    'ca-house-price-index': 'CA price index',
  }

  return (
    <section className="overview-section cost-watch-strip">
      <div className="overview-section__heading">
        <span className="eyebrow">HOME COST WATCH</span>
        <button type="button" className="cost-watch-strip__heading" onClick={() => onOpenCostWatch()}>
          <h2>Open Cost Watch</h2>
          <ArrowRight size={20} />
        </button>
      </div>

      <div className="cost-watch-strip__grid">
        {records.map((record) => {
          const points = getRangePoints(getDisplayPoints(record), '20Y')
          const latest = getDisplayLatestPoint(record)
          const change = getChangeSummary(points, '20Y')

          return (
            <button
              type="button"
              className="cost-watch-strip-card"
              data-indicator-id={record.indicator.id}
              key={record.indicator.id}
              onClick={() => onOpenCostWatch(record.indicator.id)}
            >
              <span>{labels[record.indicator.id] ?? record.indicator.label}</span>
              <strong>{latest ? formatHomeCostDisplayValue(record, latest.value) : '--'}</strong>
              <span className={toneClass(change.tone)}>
                {change.label}
                {change.suffix && <span> {change.suffix}</span>}
              </span>
              <MiniSparkline points={points} />
            </button>
          )
        })}
      </div>

      <p className="overview-section__footnote">
        {getIndicatorCount()} indicators tracked across the Bay Area, California, and the U.S. - Updated{' '}
        {generatedDateLabel(homeCostHistory.generatedAt)}
      </p>
    </section>
  )
}

export function CostWatchTab({ user }: { user?: HubUser }) {
  const clientActivity = useClientActivity()
  const initialSavedIndicatorIds = savedAreaIndicatorIds(user)
  const [range, setRange] = useState<HomeCostRange>(() => user?.preferences.marketRange ?? '20Y')
  const [geo, setGeo] = useState<HomeCostGeoFilter>('all')
  const [selectedGroup, setSelectedGroup] = useState('all')
  const [query, setQuery] = useState('')
  const [savedOnly, setSavedOnly] = useState(initialSavedIndicatorIds.length > 0)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [detailId, setDetailId] = useState<string | null>(readInitialDetailId)
  const [pins, setPins] = useState<string[]>(() => user?.preferences.savedCostWatchIds.length ? user.preferences.savedCostWatchIds : readPins(user?.id))
  const normalizedQuery = query.trim().toLowerCase()
  const savedIndicatorIds = useMemo(() => savedAreaIndicatorIds(user), [user])
  const savedIndicatorIdSet = useMemo(() => new Set(savedIndicatorIds), [savedIndicatorIds])
  const savedOnlyActive = savedOnly && savedIndicatorIds.length > 0
  const savedAreasLabel = [...(user?.neighborhoods ?? []), ...(user?.preferences.savedAreas ?? [])].slice(0, 3).join(', ') || 'Rate watch'

  useEffect(() => {
    window.localStorage.setItem(pinStorageKey(user?.id), JSON.stringify(pins))
    if (user && clientActivity && pins.join('|') !== user.preferences.savedCostWatchIds.join('|')) {
      void clientActivity.updatePreferences({ savedCostWatchIds: pins })
    }
  }, [clientActivity, pins, user])

  useEffect(() => {
    function syncDetailFromHash() {
      const nextDetailId = readInitialDetailId()
      if (nextDetailId) setDetailId(nextDetailId)
    }

    window.addEventListener('hashchange', syncDetailFromHash)
    return () => window.removeEventListener('hashchange', syncDetailFromHash)
  }, [])

  const groupOptions = useMemo(
    () =>
      homeCostCatalog.layers.flatMap((layer) =>
        layer.groups.map((group) => ({
          value: `${layer.id}:${group.id}`,
          label: `${layer.subtitle} - ${group.label}`,
        })),
      ),
    [],
  )

  const visibleLayers = useMemo(() => {
    return homeCostCatalog.layers
      .filter((layer) => geo === 'all' || layer.id === geo)
      .map((layer) => {
        const groups = layer.groups
          .map((group) => {
            const groupKey = `${layer.id}:${group.id}`

            if (selectedGroup !== 'all' && selectedGroup !== groupKey) {
              return { group, records: [] }
            }

            const records = group.indicators
              .map((indicator) => getHomeCostRecord(indicator.id))
              .filter((record): record is HomeCostRecord => {
                if (!record) return false
                if (savedOnlyActive && !savedIndicatorIdSet.has(record.indicator.id)) return false
                if (!normalizedQuery) return true
                return (
                  record.indicator.label.toLowerCase().includes(normalizedQuery) ||
                  record.indicator.seriesId.toLowerCase().includes(normalizedQuery)
                )
              })

            return { group, records }
          })
          .filter((group) => group.records.length > 0)

        return {
          layer,
          groups,
          count: groups.reduce((total, group) => total + group.records.length, 0),
        }
      })
      .filter((layer) => layer.count > 0)
  }, [geo, normalizedQuery, savedIndicatorIdSet, savedOnlyActive, selectedGroup])

  const pinnedRecords = pins
    .map((id) => getHomeCostRecord(id))
    .filter((record): record is HomeCostRecord => {
      if (!record) return false
      return !savedOnlyActive || savedIndicatorIdSet.has(record.indicator.id)
    })
  const showPinned = !normalizedQuery && selectedGroup === 'all' && pinnedRecords.length > 0
  const visibleCount = visibleLayers.reduce((total, layer) => total + layer.count, 0)
  const detailRecord = detailId ? getHomeCostRecord(detailId) : undefined

  function togglePin(id: string) {
    setPins((current) => (current.includes(id) ? current.filter((pin) => pin !== id) : [...current, id]))
  }

  function closeDetail() {
    setDetailId(null)
    if (window.location.hash.startsWith('#cost-watch/')) {
      window.history.replaceState(null, '', '#cost-watch')
    }
  }

  function clearFilters() {
    setQuery('')
    setGeo('all')
    setSelectedGroup('all')
    setSavedOnly(false)
  }

  return (
    <main className="cost-watch-page" id="cost-watch">
      <header className="cost-watch-header">
        <div>
          <p className="eyebrow">HOME COST WATCH</p>
          <h1>Cost Watch</h1>
          <p>Twenty years of housing-cost data across the Bay Area, California, and the U.S.</p>
        </div>
        <span className="cost-watch-freshness">
          <i aria-hidden="true" />
          Updated {generatedDateLabel(homeCostHistory.generatedAt)}
        </span>
      </header>

      <div className="cost-watch-toolbar">
        <label className="cost-watch-search">
          <Search size={15} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder='Search indicators - try "lumber" or "mortgage"'
          />
        </label>
        {savedIndicatorIds.length > 0 && (
          <button
            type="button"
            className={`cost-watch-saved-filter ${savedOnlyActive ? 'is-active' : ''}`}
            aria-pressed={savedOnlyActive}
            onClick={() => setSavedOnly((current) => !current)}
          >
            <MapPin size={15} />
            Saved
          </button>
        )}
        <GeoSegmentedControl value={geo} onChange={setGeo} />
        <select
          className="cost-watch-select"
          value={selectedGroup}
          onChange={(event) => setSelectedGroup(event.target.value)}
          aria-label="Group filter"
        >
          <option value="all">All groups</option>
          {groupOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <RangeSegmentedControl value={range} onChange={setRange} />
      </div>

      {savedOnlyActive && (
        <div className="cost-watch-client-filter">
          <MapPin size={15} />
          <strong>{savedAreasLabel}</strong>
          <span>{savedIndicatorIds.length} matched indicators</span>
        </div>
      )}

      {showPinned && (
        <section className="cost-watch-pinned" aria-labelledby="cost-watch-pinned-title">
          <h2 id="cost-watch-pinned-title">
            <Star size={12} fill="currentColor" />
            Pinned
          </h2>
          <div className="cost-watch-card-grid">
            {pinnedRecords.map((record) => (
              <IndicatorCard
                key={record.indicator.id}
                record={record}
                range={range}
                pinned={pins.includes(record.indicator.id)}
                onTogglePin={togglePin}
                onOpen={setDetailId}
                featured
              />
            ))}
          </div>
        </section>
      )}

      {visibleCount === 0 ? (
        <section className="cost-watch-empty">
          <h2>No indicators match</h2>
          <button type="button" onClick={clearFilters}>
            Clear search & filters
          </button>
        </section>
      ) : (
        <div className="cost-watch-layers">
          {visibleLayers.map(({ layer, groups, count }) => {
            const isCollapsed = collapsed[layer.id]

            return (
              <section className="cost-watch-layer" key={layer.id}>
                <button
                  type="button"
                  className="cost-watch-layer__heading"
                  onClick={() => setCollapsed((current) => ({ ...current, [layer.id]: !current[layer.id] }))}
                  aria-expanded={!isCollapsed}
                >
                  <span>
                    <small>{layer.label}</small>
                    <strong>{layer.subtitle}</strong>
                  </span>
                  <em>{count} indicators</em>
                  <ChevronDown size={17} />
                </button>

                {!isCollapsed && (
                  <div className="cost-watch-groups">
                    {groups.map(({ group, records }) => (
                      <section className="cost-watch-group" key={group.id}>
                        <h3>{group.label}</h3>
                        <div className="cost-watch-card-grid">
                          {records.map((record) => (
                            <IndicatorCard
                              key={record.indicator.id}
                              record={record}
                              range={range}
                              pinned={pins.includes(record.indicator.id)}
                              onTogglePin={togglePin}
                              onOpen={setDetailId}
                            />
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}

      <p className="cost-watch-footnote">
        {homeCostHistory.generatedAt
          ? `History refreshed ${formatSnapshotTimestamp(homeCostHistory.generatedAt)}. Charts use ${homeCostHistory.sampling} observations. Data: FRED, Federal Reserve Bank of St. Louis.`
          : 'History refresh pending. Data: FRED, Federal Reserve Bank of St. Louis.'}
      </p>

      {detailRecord && (
        <CostWatchDetailModal
          record={detailRecord}
          range={range}
          onRangeChange={setRange}
          pinned={pins.includes(detailRecord.indicator.id)}
          onTogglePin={togglePin}
          onClose={closeDetail}
        />
      )}
    </main>
  )
}
