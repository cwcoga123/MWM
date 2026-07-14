import { useEffect, useMemo, useRef, useState } from 'react'

const ACULIST_WIDGET_BASE =
  'https://aculist-widget-assets-cdn.mlslmedia.com/aculist-embed-widgetdiv.js'
const ACULIST_USER_TOKEN =
  '1b9f88f9-2ff8-47cf-b8e2-9064766bb9ed1b9f88f9-2ff8-47cf-b8e2-9064766bb9ed'
const ACULIST_COLORS = '#fdb921,#0033a0,#7ED321,#1DB2B8'
const ACULIST_KPI_STYLE_ID = 'aculist-market-kpi-styles'

type GeographyType = 'Zip' | 'County' | 'Area' | 'City'
type PeriodType = 'Year' | 'Quarter' | 'Month'
type WidgetType = 'trends' | 'kpi'
type ReportId = 'sf-vs-condo' | 'single-family' | 'condo-townhouse' | 'geography-kpis'
type SeriesShape = 'bar' | 'line'
type SeriesUnit = 'currency' | 'compactCurrency' | 'currencyPerSqft' | 'percent' | 'days' | 'number'

type GeographyOption = {
  type: GeographyType
  name: string
  county: string
  label: string
  searchText: string
}

type PeriodState = {
  type: PeriodType
  period: number
}

type WidgetDefinition = {
  id: string
  title: string
  customTitle: string
  description: string
  scriptVersion: '3.0' | '3.2'
  widgetType: WidgetType
  tokenId: string
  classType?: string
  displayColumns?: number
  themeColor?: 'black'
  styleId?: string
}

type ReportDefinition = {
  id: ReportId
  label: string
  widgets: WidgetDefinition[]
}

type ChartDatum = {
  id?: string
  index?: number
  value?: number
  x?: Date | number | string
}

type DatumElement = Element & {
  __data__?: ChartDatum
}

type NativeSeries = {
  id: string
  label: string
  shape: SeriesShape
  unit: SeriesUnit
  color: string
  values: number[]
}

type NativeChartData = {
  categories: string[]
  series: NativeSeries[]
}

type KpiDatum = {
  label: string
  value: string
}

const PERIOD_OPTIONS: Record<PeriodType, number[]> = {
  Year: [3, 5, 7, 10],
  Quarter: [4, 8, 12],
  Month: [12, 24],
}

const PERIOD_DEFAULTS: Record<PeriodType, number> = {
  Year: 10,
  Quarter: 4,
  Month: 12,
}

const PERIOD_LABELS: Record<PeriodType, string> = {
  Year: 'Yearly',
  Quarter: 'Quarterly',
  Month: 'Monthly',
}

const CHART_WIDTH = 960
const CHART_HEIGHT = 380
const CHART_PADDING = { top: 32, right: 82, bottom: 52, left: 82 }
const TICK_COUNT = 5
const SERIES_COLORS = ['#0033a0', '#fdb921', '#1DB2B8', '#7ED321', '#246bfe', '#0f766e']

const ACULIST_KPI_STYLES = `
.aculistmastergrid-container {
  justify-content: center;
}

.aculistkpigrid-item {
  -ms-flex-direction: column;
  flex-direction: column;
  border: none!important;
  padding: 5px 30px 25px 30px;
}

.aculistkpigrid-measurelogo {
  background-repeat: no-repeat!important;
  grid-column: 1;
  -ms-grid-row-span: 2;
  column-count: 1;
  grid-row: 1/3;
  justify-self: center;
  align-self: center;
  -webkit-box-ordinal-group: 1;
  -moz-box-ordinal-group: 1;
  -ms-flex-order: 1;
  -webkit-order: 1;
  order: 1;
  margin-right: 10px;
}

.aculistkpigrid-measure {
  display: inline-block;
  display: flex;
  -ms-grid-column: 2;
  grid-column: 2;
  justify-self: center!important;
  -ms-flex-item-align: center!important;
  -ms-grid-row-align: center!important;
  align-self: center!important;
  -webkit-box-ordinal-group: 2;
  -moz-box-ordinal-group: 2;
  -ms-flex-order: 2;
  -webkit-order: 2;
  order: 2;
  font-family: Helvetica Neue, Helvetica, Arial, Lucida Grande, sans-serif!important;
  font-size: 1.75rem;
  font-weight: 700;
  margin-bottom: -10px;
}

.aculistkpigrid-measurelabel {
  grid-column: 2;
  justify-self: center;
  -webkit-box-ordinal-group: 3;
  -moz-box-ordinal-group: 3;
  -ms-flex-order: 3;
  -webkit-order: 3;
  order: 3;
  font-family: Helvetica Neue, Helvetica, Arial, Lucida Grande, sans-serif!important;
  font-size: .95rem;
  font-weight: 400;
}

.aculistdisclaimer-holder {
  font-family: Helvetica Neue, Helvetica, Arial, Lucida Grande, sans-serif!important;
  font-size: .85rem;
  font-weight: 400;
}

.aculistattribution-label {
  font-family: Helvetica Neue, Helvetica, Arial, Lucida Grande, sans-serif!important;
  font-size: .75rem;
  font-weight: 400;
}

.aculisttitle-holder {
  font-family: Helvetica Neue, Helvetica, Arial, Lucida Grande, sans-serif!important;
  font-size: 1.85rem;
  font-weight: 700;
  padding: 20px 0;
}

.aculistattribution-holder {
  padding-bottom: 20px;
}

@supports (display: -webkit-flex) {
  .aculistkpigrid-container {
    -webkit-align-items: center;
    align-items: center;
    -webkit-justify-content: center;
    justify-content: center;
  }
}
`

function createGeographyOption(type: GeographyType, name: string, county: string): GeographyOption {
  const label = `${type} - ${name} (${county})`

  return {
    type,
    name,
    county,
    label,
    searchText: `${label} ${name} ${county}`.toLowerCase(),
  }
}

const GEOGRAPHY_OPTIONS: GeographyOption[] = [
  createGeographyOption('Area', 'Central San Jose', 'Santa Clara'),
  createGeographyOption('Area', 'South San Jose', 'Santa Clara'),
  createGeographyOption('Area', 'North San Jose', 'Santa Clara'),
  createGeographyOption('Area', 'East San Jose', 'Santa Clara'),
  createGeographyOption('Area', 'West San Jose', 'Santa Clara'),
  createGeographyOption('Area', 'Willow Glen', 'Santa Clara'),
  createGeographyOption('Area', 'Cambrian', 'Santa Clara'),
  createGeographyOption('Area', 'Berryessa', 'Santa Clara'),
  createGeographyOption('Area', 'Almaden Valley', 'Santa Clara'),
  createGeographyOption('Area', 'Evergreen', 'Santa Clara'),
  createGeographyOption('Area', 'Blossom Valley', 'Santa Clara'),
  createGeographyOption('Area', 'Rose Garden', 'Santa Clara'),
  createGeographyOption('City', 'San Jose', 'Santa Clara'),
  createGeographyOption('City', 'San Juan Bautista', 'San Benito'),
  createGeographyOption('City', 'Campbell', 'Santa Clara'),
  createGeographyOption('City', 'Cupertino', 'Santa Clara'),
  createGeographyOption('City', 'Saratoga', 'Santa Clara'),
  createGeographyOption('City', 'Santa Clara', 'Santa Clara'),
  createGeographyOption('City', 'Sunnyvale', 'Santa Clara'),
  createGeographyOption('City', 'Milpitas', 'Santa Clara'),
  createGeographyOption('City', 'Los Gatos', 'Santa Clara'),
  createGeographyOption('City', 'Mountain View', 'Santa Clara'),
  createGeographyOption('City', 'Palo Alto', 'Santa Clara'),
  createGeographyOption('City', 'Morgan Hill', 'Santa Clara'),
  createGeographyOption('City', 'Gilroy', 'Santa Clara'),
  createGeographyOption('County', 'Santa Clara', 'Santa Clara'),
  createGeographyOption('County', 'San Mateo', 'San Mateo'),
  createGeographyOption('County', 'Alameda', 'Alameda'),
  createGeographyOption('County', 'Santa Cruz', 'Santa Cruz'),
  createGeographyOption('County', 'Monterey', 'Monterey'),
  createGeographyOption('County', 'San Benito', 'San Benito'),
  createGeographyOption('Zip', '93950', 'Monterey'),
  createGeographyOption('Zip', '93953', 'Monterey'),
  createGeographyOption('Zip', '95003', 'Santa Cruz'),
  createGeographyOption('Zip', '95006', 'Santa Cruz'),
  createGeographyOption('Zip', '95014', 'Santa Clara'),
  createGeographyOption('Zip', '95018', 'Santa Cruz'),
  createGeographyOption('Zip', '95020', 'Santa Clara'),
  createGeographyOption('Zip', '95030', 'Santa Clara'),
  createGeographyOption('Zip', '95032', 'Santa Clara'),
  createGeographyOption('Zip', '95035', 'Santa Clara'),
  createGeographyOption('Zip', '95110', 'Santa Clara'),
  createGeographyOption('Zip', '95112', 'Santa Clara'),
  createGeographyOption('Zip', '95113', 'Santa Clara'),
  createGeographyOption('Zip', '95116', 'Santa Clara'),
  createGeographyOption('Zip', '95118', 'Santa Clara'),
  createGeographyOption('Zip', '95120', 'Santa Clara'),
  createGeographyOption('Zip', '95123', 'Santa Clara'),
  createGeographyOption('Zip', '95124', 'Santa Clara'),
  createGeographyOption('Zip', '95125', 'Santa Clara'),
  createGeographyOption('Zip', '95126', 'Santa Clara'),
  createGeographyOption('Zip', '95128', 'Santa Clara'),
  createGeographyOption('Zip', '95129', 'Santa Clara'),
  createGeographyOption('Zip', '95131', 'Santa Clara'),
  createGeographyOption('Zip', '95132', 'Santa Clara'),
  createGeographyOption('Zip', '95134', 'Santa Clara'),
  createGeographyOption('Zip', '95135', 'Santa Clara'),
  createGeographyOption('Zip', '95136', 'Santa Clara'),
  createGeographyOption('Zip', '95138', 'Santa Clara'),
  createGeographyOption('Zip', '95148', 'Santa Clara'),
]

const DEFAULT_GEOGRAPHY = GEOGRAPHY_OPTIONS[0]

const REPORTS: ReportDefinition[] = [
  {
    id: 'sf-vs-condo',
    label: 'Single Family vs Condo/Townhouse Trends',
    widgets: [
      {
        id: 'sf-condo-dom-vs-lp',
        title: 'Original Days on Market vs List Price',
        customTitle: 'Days on market and list-price strength',
        description: 'Single-family and condo/townhouse trend comparison from Aculist.',
        scriptVersion: '3.0',
        widgetType: 'trends',
        tokenId: 'defaultdomvslp',
        classType: 'Residential - Single Family,Residential - Common Interest',
      },
      {
        id: 'sf-condo-ppsqft',
        title: 'Original Price per Square Foot',
        customTitle: 'Price per square foot trend',
        description: 'Single-family and condo/townhouse price-per-square-foot comparison.',
        scriptVersion: '3.0',
        widgetType: 'trends',
        tokenId: 'defaultppsqft',
        classType: 'Residential - Single Family,Residential - Common Interest',
      },
    ],
  },
  {
    id: 'single-family',
    label: 'Single Family Trends',
    widgets: [
      {
        id: 'single-family-msp-vs-lp',
        title: 'Original Median Sale Price vs List Price',
        customTitle: 'Single-family price and list-price trend',
        description: 'Median sale price and sale-to-list pressure for single-family homes.',
        scriptVersion: '3.2',
        widgetType: 'trends',
        tokenId: 'defaultmspvslp',
        classType: 'Residential - Single Family',
      },
      {
        id: 'single-family-dom-vs-lp',
        title: 'Original Days on Market vs List Price',
        customTitle: 'Single-family speed and list-price trend',
        description: 'Days on market and sale-to-list pressure for single-family homes.',
        scriptVersion: '3.2',
        widgetType: 'trends',
        tokenId: 'defaultdomvslp',
        classType: 'Residential - Single Family',
      },
      {
        id: 'single-family-nvss',
        title: 'Original New Listings vs Sold Listings',
        customTitle: 'Single-family supply and sales trend',
        description: 'Listing flow and sold activity for single-family homes.',
        scriptVersion: '3.2',
        widgetType: 'trends',
        tokenId: 'defaultnvss',
        classType: 'Residential - Single Family',
      },
    ],
  },
  {
    id: 'condo-townhouse',
    label: 'Condo/Townhouse Trends',
    widgets: [
      {
        id: 'condo-msp-vs-lp',
        title: 'Original Median Sale Price vs List Price',
        customTitle: 'Condo/townhouse price and list-price trend',
        description: 'Median sale price and sale-to-list pressure for condos and townhomes.',
        scriptVersion: '3.2',
        widgetType: 'trends',
        tokenId: 'defaultmspvslp',
        classType: 'Residential - Common Interest',
      },
      {
        id: 'condo-dom-vs-lp',
        title: 'Original Days on Market vs List Price',
        customTitle: 'Condo/townhouse speed and list-price trend',
        description: 'Days on market and sale-to-list pressure for condos and townhomes.',
        scriptVersion: '3.2',
        widgetType: 'trends',
        tokenId: 'defaultdomvslp',
        classType: 'Residential - Common Interest',
      },
      {
        id: 'condo-nvss',
        title: 'Original New Listings vs Sold Listings',
        customTitle: 'Condo/townhouse supply and sales trend',
        description: 'Listing flow and sold activity for condos and townhomes.',
        scriptVersion: '3.2',
        widgetType: 'trends',
        tokenId: 'defaultnvss',
        classType: 'Residential - Common Interest',
      },
    ],
  },
  {
    id: 'geography-kpis',
    label: 'Geography KPIs',
    widgets: [
      {
        id: 'kpi-two-column',
        title: 'Original Geography KPIs',
        customTitle: 'Geography KPI snapshot',
        description: 'Current KPI summary for the selected geography.',
        scriptVersion: '3.2',
        widgetType: 'kpi',
        tokenId: 'default2columns',
        displayColumns: 2,
        themeColor: 'black',
      },
      {
        id: 'kpi-one-row',
        title: 'Original KPI Row',
        customTitle: 'Compact KPI row',
        description: 'Compact KPI row using the Aculist one-row layout.',
        scriptVersion: '3.2',
        widgetType: 'kpi',
        tokenId: 'default1row',
        displayColumns: 3,
        themeColor: 'black',
        styleId: ACULIST_KPI_STYLE_ID,
      },
    ],
  },
]

function displayGeographyValue(option: GeographyOption) {
  return option.name
}

function geographyKey(option: GeographyOption) {
  return `${option.type}|${option.name}|${option.county}`
}

function periodSummary(period: PeriodState) {
  const unit = period.type === 'Year' ? 'year' : period.type === 'Quarter' ? 'quarter' : 'month'
  return `${period.period} ${unit}${period.period === 1 ? '' : 's'}`
}

function widgetLoadKey(reportId: ReportId, geography: GeographyOption, period: PeriodState) {
  return [
    reportId,
    geography.type,
    geography.name,
    geography.county,
    period.type,
    period.period,
  ].join('|')
}

function safeDomId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function getElementClassName(element: Element) {
  const className = element.getAttribute('class') ?? ''
  const svgClassName = (element as SVGElement).className

  if (typeof svgClassName === 'object' && 'baseVal' in svgClassName) {
    return svgClassName.baseVal || className
  }

  return className
}

function targetId(element: Element) {
  return getElementClassName(element).match(/c3-target-([^\s]+)/)?.[1] ?? ''
}

function legendLabels(document: Document) {
  const labels = new Map<string, string>()

  Array.from(document.querySelectorAll('.c3-legend-item')).forEach((item) => {
    const id = getElementClassName(item).match(/c3-legend-item-([^\s]+)/)?.[1]
    const label = item.textContent?.trim()

    if (id && label) {
      labels.set(id, label)
    }
  })

  return labels
}

function formattedCategory(value: Date | number | string | undefined) {
  if (value instanceof Date) {
    return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(value)
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }

  if (typeof value === 'string') {
    return value
  }

  return ''
}

function readCategories(document: Document, series: NativeSeries[], sampleElements: DatumElement[]) {
  const axisLabels = Array.from(document.querySelectorAll('.c3-axis-x .tick text'))
    .map((element) => element.textContent?.trim() ?? '')
    .filter(Boolean)
  const uniqueAxisLabels = axisLabels.filter((label, index) => axisLabels.indexOf(label) === index)
  const seriesLength = Math.max(0, ...series.map((item) => item.values.length))

  if (uniqueAxisLabels.length === seriesLength) {
    return uniqueAxisLabels
  }

  const dataLabels = sampleElements.map((element) => formattedCategory(element.__data__?.x)).filter(Boolean)

  if (dataLabels.length === seriesLength) {
    return dataLabels
  }

  const visibleYears = uniqueAxisLabels.filter((label) => /^\d{4}$/.test(label))
  const latestVisibleYear = visibleYears.length > 0
    ? Math.max(...visibleYears.map(Number))
    : new Date().getFullYear()

  return Array.from({ length: seriesLength }, (_, index) =>
    visibleYears.length > 0 ? String(latestVisibleYear - seriesLength + index + 1) : String(index + 1),
  )
}

function readableSeriesBase(id: string, fallbackLabel: string) {
  const label = fallbackLabel.trim()
  const knownLabels: Record<string, string> = {
    SFHM1: 'Single-family',
    SFHM2: 'Single-family',
    'C/TM1': 'Condo/townhouse',
    'C/TM2': 'Condo/townhouse',
  }

  if (knownLabels[id]) return knownLabels[id]
  if (label) return label

  return id
    .replace(/[-_/]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim() || 'Series'
}

function seriesLabel(definition: WidgetDefinition, id: string, fallbackLabel: string, shape: SeriesShape) {
  const base = readableSeriesBase(id, fallbackLabel)

  if (definition.tokenId === 'defaultmspvslp') {
    return shape === 'bar' ? `${base} median sale price` : `${base} sale-to-list`
  }

  if (definition.tokenId === 'defaultdomvslp') {
    return shape === 'bar' ? `${base} days on market` : `${base} sale-to-list`
  }

  if (definition.tokenId === 'defaultppsqft') {
    return `${base} price per sq ft`
  }

  if (definition.tokenId === 'defaultnvss') {
    return shape === 'bar' ? `${base} new listings` : `${base} sold listings`
  }

  return base
}

function inferUnit(definition: WidgetDefinition, shape: SeriesShape, values: number[]) {
  if (definition.tokenId === 'defaultmspvslp') {
    return shape === 'bar' ? 'compactCurrency' : 'percent'
  }

  if (definition.tokenId === 'defaultdomvslp') {
    return shape === 'bar' ? 'days' : 'percent'
  }

  if (definition.tokenId === 'defaultppsqft') {
    return 'currencyPerSqft'
  }

  if (definition.tokenId === 'defaultnvss') {
    return 'number'
  }

  const max = Math.max(...values)

  if (shape === 'line' && max <= 2) return 'percent'
  if (max >= 10000) return 'compactCurrency'

  return 'number'
}

function normalizeValues(values: number[], unit: SeriesUnit) {
  if (unit === 'percent' && values.every((value) => value <= 2)) {
    return values.map((value) => value * 100)
  }

  return values
}

function readShapeSeries(
  document: Document,
  definition: WidgetDefinition,
  container: string,
  shapeSelector: string,
  shape: SeriesShape,
) {
  const labels = legendLabels(document)

  return Array.from(document.querySelectorAll(`${container} .c3-target`))
    .map((target, index): NativeSeries | null => {
      const id = targetId(target) || `${shape}-${index + 1}`
      const elements = Array.from(target.querySelectorAll<DatumElement>(shapeSelector))
      const values = elements
        .map((element) => element.__data__?.value)
        .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))

      if (values.length === 0 || values.length !== elements.length) {
        return null
      }

      const unit = inferUnit(definition, shape, values)

      return {
        id,
        label: seriesLabel(definition, id, labels.get(id) ?? '', shape),
        shape,
        unit,
        color: SERIES_COLORS[index % SERIES_COLORS.length],
        values: normalizeValues(values, unit),
      }
    })
    .filter((series): series is NativeSeries => Boolean(series))
}

function readTrendData(widget: HTMLDivElement, definition: WidgetDefinition): NativeChartData | null {
  const frame = widget.querySelector('iframe')
  const document = frame?.contentDocument

  if (!document) return null

  const barElements = Array.from(document.querySelectorAll<DatumElement>('.c3-chart-bars .c3-bar'))
  const circleElements = Array.from(document.querySelectorAll<DatumElement>('.c3-chart-lines .c3-circle'))
  const series = [
    ...readShapeSeries(document, definition, '.c3-chart-bars', '.c3-bar', 'bar'),
    ...readShapeSeries(document, definition, '.c3-chart-lines', '.c3-circle', 'line'),
  ].filter((item) => item.values.length > 0)
  const seriesLength = Math.max(0, ...series.map((item) => item.values.length))

  if (series.length === 0 || series.some((item) => item.values.length !== seriesLength)) {
    return null
  }

  return {
    categories: readCategories(document, series, [...barElements, ...circleElements]),
    series,
  }
}

function readKpiData(widget: HTMLDivElement): KpiDatum[] | null {
  const frame = widget.querySelector('iframe')
  const root: ParentNode = frame?.contentDocument ?? widget
  const items = Array.from(root.querySelectorAll('.aculistkpigrid-item'))
    .map((item) => {
      const value = item.querySelector('.aculistkpigrid-measure')?.textContent?.trim()
      const label = item.querySelector('.aculistkpigrid-measurelabel')?.textContent?.trim()

      if (!value || !label) return null

      return { value, label }
    })
    .filter((item): item is KpiDatum => Boolean(item))

  return items.length > 0 ? items : null
}

function formatCompactCurrency(value: number) {
  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`
  }

  if (Math.abs(value) >= 1_000) {
    return `$${Math.round(value / 1_000)}K`
  }

  return `$${Math.round(value).toLocaleString('en-US')}`
}

function formatValue(value: number, unit: SeriesUnit) {
  if (unit === 'compactCurrency') return formatCompactCurrency(value)
  if (unit === 'currency') return `$${Math.round(value).toLocaleString('en-US')}`
  if (unit === 'currencyPerSqft') return `$${Math.round(value).toLocaleString('en-US')}/sq ft`
  if (unit === 'percent') return `${value.toFixed(1)}%`
  if (unit === 'days') return `${Math.round(value)} days`

  return Math.round(value).toLocaleString('en-US')
}

function shortAxisValue(value: number, unit: SeriesUnit) {
  if (unit === 'compactCurrency') return formatCompactCurrency(value)
  if (unit === 'currency' || unit === 'currencyPerSqft') return `$${Math.round(value).toLocaleString('en-US')}`
  if (unit === 'percent') return `${value.toFixed(0)}%`
  if (unit === 'days') return `${Math.round(value)}d`

  return Math.round(value).toLocaleString('en-US')
}

function buildDomain(values: number[], includeZero: boolean) {
  const finiteValues = values.filter((value) => Number.isFinite(value))
  const minValue = Math.min(...finiteValues)
  const maxValue = Math.max(...finiteValues)
  const baseMin = includeZero ? Math.min(0, minValue) : minValue
  const span = Math.max(maxValue - baseMin, Math.abs(maxValue) * 0.08, 1)

  return {
    min: includeZero ? baseMin : baseMin - span * 0.12,
    max: maxValue + span * 0.12,
  }
}

function pathFromPoints(points: Array<{ x: number; y: number }>) {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
}

function NativeTrendChart({
  data,
  definition,
  geography,
  period,
}: {
  data: NativeChartData
  definition: WidgetDefinition
  geography: GeographyOption
  period: PeriodState
}) {
  const [activeIndex, setActiveIndex] = useState(Math.max(0, data.categories.length - 1))
  const categories = data.categories
  const barSeries = data.series.filter((series) => series.shape === 'bar')
  const lineSeries = data.series.filter((series) => series.shape === 'line')
  const primarySeries = barSeries.length > 0 ? barSeries : lineSeries
  const secondarySeries = barSeries.length > 0 ? lineSeries : []
  const primaryUnit = primarySeries[0]?.unit ?? 'number'
  const secondaryUnit = secondarySeries[0]?.unit ?? primaryUnit
  const plotWidth = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right
  const plotHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom
  const groupWidth = plotWidth / Math.max(1, categories.length)
  const barWidth = Math.min(24, (groupWidth * 0.68) / Math.max(1, barSeries.length))
  const primaryDomain = buildDomain(
    primarySeries.flatMap((series) => series.values),
    barSeries.length > 0,
  )
  const secondaryDomain = secondarySeries.length > 0
    ? buildDomain(secondarySeries.flatMap((series) => series.values), false)
    : primaryDomain
  const x = (index: number) => CHART_PADDING.left + groupWidth * index + groupWidth / 2
  const primaryY = (value: number) =>
    CHART_PADDING.top + plotHeight * (1 - (value - primaryDomain.min) / (primaryDomain.max - primaryDomain.min))
  const secondaryY = (value: number) =>
    CHART_PADDING.top + plotHeight * (1 - (value - secondaryDomain.min) / (secondaryDomain.max - secondaryDomain.min))
  const safeActiveIndex = Math.min(activeIndex, categories.length - 1)
  const activeCategory = categories[safeActiveIndex] ?? ''
  const activeValues = data.series.slice(0, 4)

  return (
    <section className="market-native" aria-labelledby={`${definition.id}-custom-title`}>
      <div className="market-native__header">
        <div>
          <span className="market-native__label">MWM VIEW</span>
          <h2 id={`${definition.id}-custom-title`}>{definition.customTitle}</h2>
          <p>{geography.label} - {periodSummary(period)} lookback.</p>
        </div>
        <span className="market-native__status"><i /> Parsed from Aculist</span>
      </div>

      <div className="market-native__metrics">
        {activeValues.slice(0, 3).map((series) => {
          const activeValue = series.values[safeActiveIndex]
          const previousValue = series.values[Math.max(0, safeActiveIndex - 1)]
          const change = previousValue ? ((activeValue / previousValue) - 1) * 100 : 0

          return (
            <article key={series.id}>
              <span>{series.label}</span>
              <strong>{formatValue(activeValue, series.unit)}</strong>
              <small className={change >= 0 ? 'is-positive' : 'is-negative'}>
                {change >= 0 ? '+' : ''}{change.toFixed(1)}% vs prior point
              </small>
            </article>
          )
        })}
      </div>

      <div className="market-native__legend" aria-hidden="true">
        {data.series.map((series) => (
          <span key={series.id}>
            <i style={{ background: series.color, borderRadius: series.shape === 'line' ? '50%' : 3 }} />
            {series.label}
          </span>
        ))}
      </div>

      <div className="market-native__chart-wrap">
        <svg
          className="market-native__chart"
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          role="img"
          aria-label={`${definition.customTitle} custom chart`}
        >
          {Array.from({ length: TICK_COUNT + 1 }, (_, index) => {
            const primaryValue = primaryDomain.min + ((primaryDomain.max - primaryDomain.min) / TICK_COUNT) * index
            const secondaryValue = secondaryDomain.min + ((secondaryDomain.max - secondaryDomain.min) / TICK_COUNT) * index
            const y = primaryY(primaryValue)

            return (
              <g key={primaryValue}>
                <line className="market-native__grid" x1={CHART_PADDING.left} x2={CHART_WIDTH - CHART_PADDING.right} y1={y} y2={y} />
                <text className="market-native__axis" x={CHART_PADDING.left - 12} y={y + 4} textAnchor="end">
                  {shortAxisValue(primaryValue, primaryUnit)}
                </text>
                {secondarySeries.length > 0 && (
                  <text className="market-native__axis" x={CHART_WIDTH - CHART_PADDING.right + 12} y={y + 4}>
                    {shortAxisValue(secondaryValue, secondaryUnit)}
                  </text>
                )}
              </g>
            )
          })}

          {categories.map((category, index) => (
            <g key={category}>
              {safeActiveIndex === index && (
                <rect className="market-native__highlight" x={CHART_PADDING.left + groupWidth * index} y={CHART_PADDING.top} width={groupWidth} height={plotHeight} rx="8" />
              )}
              {barSeries.map((series, seriesIndex) => {
                const value = series.values[index]
                const barX = x(index) - (barSeries.length * barWidth) / 2 + seriesIndex * barWidth
                const y = primaryY(value)

                return (
                  <rect
                    key={`${series.id}-${category}`}
                    className="market-native__bar"
                    x={barX}
                    y={y}
                    width={Math.max(3, barWidth - 3)}
                    height={CHART_PADDING.top + plotHeight - y}
                    rx="4"
                    style={{ fill: series.color }}
                  />
                )
              })}
              <text className="market-native__year" x={x(index)} y={CHART_HEIGHT - 18} textAnchor="middle">{category}</text>
              <rect
                className="market-native__hit-area"
                x={CHART_PADDING.left + groupWidth * index}
                y={CHART_PADDING.top}
                width={groupWidth}
                height={plotHeight}
                onMouseEnter={() => setActiveIndex(index)}
                onFocus={() => setActiveIndex(index)}
                tabIndex={0}
                aria-label={`${category} chart values`}
              />
            </g>
          ))}

          {lineSeries.map((series) => {
            const yForLine = secondarySeries.includes(series) ? secondaryY : primaryY
            const points = series.values.map((value, index) => ({ x: x(index), y: yForLine(value) }))

            return (
              <g key={series.id}>
                <path className="market-native__line" d={pathFromPoints(points)} style={{ stroke: series.color }} />
                {points.map((point, index) => (
                  <circle
                    key={`${series.id}-${categories[index]}`}
                    className="market-native__point"
                    cx={point.x}
                    cy={point.y}
                    r={safeActiveIndex === index ? 5 : 3.5}
                    style={{ fill: series.color }}
                  />
                ))}
              </g>
            )
          })}
        </svg>
      </div>

      <div className="market-native__selection" aria-live="polite">
        <strong>{activeCategory}</strong>
        {data.series.slice(0, 4).map((series) => (
          <span key={series.id}>{series.label} <b>{formatValue(series.values[safeActiveIndex], series.unit)}</b></span>
        ))}
      </div>
    </section>
  )
}

function NativeKpiPanel({
  data,
  definition,
  geography,
}: {
  data: KpiDatum[]
  definition: WidgetDefinition
  geography: GeographyOption
}) {
  return (
    <section className="market-native" aria-labelledby={`${definition.id}-custom-title`}>
      <div className="market-native__header">
        <div>
          <span className="market-native__label">MWM VIEW</span>
          <h2 id={`${definition.id}-custom-title`}>{definition.customTitle}</h2>
          <p>{geography.label}</p>
        </div>
        <span className="market-native__status"><i /> Parsed from Aculist</span>
      </div>

      <div className="market-kpi-grid">
        {data.map((item) => (
          <article key={`${item.label}-${item.value}`} className="market-kpi-card">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </div>
    </section>
  )
}

function CustomLoadingPanel({
  definition,
  dataUnavailable,
}: {
  definition: WidgetDefinition
  dataUnavailable: boolean
}) {
  return (
    <section className="market-native market-native--loading" aria-live="polite">
      <span className="market-native__label">MWM VIEW</span>
      <h2>{dataUnavailable ? 'Custom chart unavailable' : 'Building custom chart...'}</h2>
      <p>
        {dataUnavailable
          ? 'The embedded Aculist data could not be read for this custom view.'
          : `Reading the rendered Aculist data for ${definition.customTitle.toLowerCase()}.`}
      </p>
    </section>
  )
}

function AculistWidgetPair({
  definition,
  geography,
  period,
  loadKey,
}: {
  definition: WidgetDefinition
  geography: GeographyOption
  period: PeriodState
  loadKey: string
}) {
  const widgetRef = useRef<HTMLDivElement>(null)
  const [trendData, setTrendData] = useState<NativeChartData | null>(null)
  const [kpiData, setKpiData] = useState<KpiDatum[] | null>(null)
  const [dataUnavailable, setDataUnavailable] = useState(false)
  const widgetId = `aculist-${safeDomId(`${definition.id}-${loadKey}`)}`

  useEffect(() => {
    const widget = widgetRef.current
    let attempts = 0

    const readData = window.setInterval(() => {
      attempts += 1

      try {
        if (widget && definition.widgetType === 'trends') {
          const data = readTrendData(widget, definition)

          if (data) {
            setTrendData(data)
            window.clearInterval(readData)
          }
        } else if (widget && definition.widgetType === 'kpi') {
          const data = readKpiData(widget)

          if (data) {
            setKpiData(data)
            window.clearInterval(readData)
          }
        }
      } catch {
        // Keep polling until the timeout below; Aculist can render in phases.
      }

      if (attempts >= 240) {
        setDataUnavailable(true)
        window.clearInterval(readData)
      }
    }, 250)

    return () => {
      window.clearInterval(readData)
      widget?.replaceChildren()
    }
  }, [definition, loadKey])

  return (
    <article className="market-widget-pair">
      <section className="market-original" aria-labelledby={`${definition.id}-original-title`}>
        <div className="market-original__heading">
          <div>
            <span>Original Aculist Chart</span>
            <h2 id={`${definition.id}-original-title`}>{definition.title}</h2>
          </div>
          <small>{definition.description}</small>
        </div>
        <div className="market-original__frame">
          <div
            ref={widgetRef}
            id={widgetId}
            className="market-aculist-widget"
            data-widgettype={definition.widgetType}
            data-aculistwidget=""
            data-geographytype={geography.type}
            data-geographyname={geography.name}
            data-county={geography.county}
            data-colors={definition.widgetType === 'trends' ? ACULIST_COLORS : undefined}
            data-period={definition.widgetType === 'trends' ? period.period : undefined}
            data-periodtype={definition.widgetType === 'trends' ? period.type : undefined}
            data-tokenid={definition.tokenId}
            data-classtype={definition.classType}
            data-usertoken={ACULIST_USER_TOKEN}
            data-title="true"
            data-displaycolumns={definition.displayColumns}
            data-themecolor={definition.themeColor}
            data-styleid={definition.styleId}
          />
        </div>
      </section>

      {definition.widgetType === 'trends' && trendData && (
        <NativeTrendChart data={trendData} definition={definition} geography={geography} period={period} />
      )}

      {definition.widgetType === 'kpi' && kpiData && (
        <NativeKpiPanel data={kpiData} definition={definition} geography={geography} />
      )}

      {((definition.widgetType === 'trends' && !trendData) || (definition.widgetType === 'kpi' && !kpiData)) && (
        <CustomLoadingPanel definition={definition} dataUnavailable={dataUnavailable} />
      )}
    </article>
  )
}

function PeriodSplitControl({
  type,
  active,
  value,
  open,
  onChooseType,
  onToggle,
  onChooseValue,
}: {
  type: PeriodType
  active: boolean
  value: number
  open: boolean
  onChooseType: (type: PeriodType) => void
  onToggle: (type: PeriodType) => void
  onChooseValue: (type: PeriodType, value: number) => void
}) {
  return (
    <div className={`market-period-split ${active ? 'is-active' : ''}`}>
      <button type="button" className="market-period-split__label" onClick={() => onChooseType(type)}>
        {PERIOD_LABELS[type]}
      </button>
      <button
        type="button"
        className="market-period-split__caret"
        onClick={() => onToggle(type)}
        aria-label={`Choose ${PERIOD_LABELS[type].toLowerCase()} lookback`}
        aria-expanded={open}
      >
        <span aria-hidden="true">v</span>
      </button>
      {open && (
        <div className="market-period-menu" role="menu">
          {PERIOD_OPTIONS[type].map((option) => (
            <button
              key={option}
              type="button"
              className={value === option ? 'is-selected' : ''}
              onClick={() => onChooseValue(type, option)}
              role="menuitem"
            >
              {option} {type === 'Year' ? 'years' : type === 'Quarter' ? 'quarters' : 'months'}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function MarketScannerTab() {
  const [activeReportId, setActiveReportId] = useState<ReportId>('sf-vs-condo')
  const [appliedGeography, setAppliedGeography] = useState(DEFAULT_GEOGRAPHY)
  const [pendingGeography, setPendingGeography] = useState<GeographyOption | null>(DEFAULT_GEOGRAPHY)
  const [searchValue, setSearchValue] = useState(displayGeographyValue(DEFAULT_GEOGRAPHY))
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [periodType, setPeriodType] = useState<PeriodType>('Year')
  const [periodByType, setPeriodByType] = useState<Record<PeriodType, number>>(PERIOD_DEFAULTS)
  const [appliedPeriod, setAppliedPeriod] = useState<PeriodState>({ type: 'Year', period: PERIOD_DEFAULTS.Year })
  const [openPeriodType, setOpenPeriodType] = useState<PeriodType | null>(null)
  const activeReport = REPORTS.find((report) => report.id === activeReportId) ?? REPORTS[0]
  const pendingPeriod = periodByType[periodType]
  const currentPeriod = useMemo<PeriodState>(
    () => ({ type: periodType, period: pendingPeriod }),
    [periodType, pendingPeriod],
  )
  const currentLoadKey = widgetLoadKey(activeReport.id, appliedGeography, appliedPeriod)
  const searchText = searchValue.trim().toLowerCase()
  const suggestions = useMemo(() => {
    if (!searchText) return GEOGRAPHY_OPTIONS.slice(0, 8)

    return GEOGRAPHY_OPTIONS
      .filter((option) => option.searchText.includes(searchText))
      .sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(searchText) || a.label.toLowerCase().startsWith(searchText)
        const bStarts = b.name.toLowerCase().startsWith(searchText) || b.label.toLowerCase().startsWith(searchText)

        if (aStarts === bStarts) return a.label.localeCompare(b.label)
        return aStarts ? -1 : 1
      })
      .slice(0, 10)
  }, [searchText])
  const hasValidSelectedSearch =
    Boolean(pendingGeography) && searchValue === displayGeographyValue(pendingGeography as GeographyOption)
  const searchChanged = pendingGeography
    ? geographyKey(pendingGeography) !== geographyKey(appliedGeography)
    : searchValue.trim() !== displayGeographyValue(appliedGeography)
  const periodChanged =
    appliedPeriod.type !== currentPeriod.type || appliedPeriod.period !== currentPeriod.period
  const hasPendingChanges = searchChanged || periodChanged

  useEffect(() => {
    const versions = Array.from(new Set(activeReport.widgets.map((widget) => widget.scriptVersion)))
    const scripts: HTMLScriptElement[] = []
    const timer = window.setTimeout(() => {
      versions.forEach((version) => {
        const script = document.createElement('script')
        script.type = 'text/javascript'
        script.async = true
        script.src = `${ACULIST_WIDGET_BASE}?v=${version}`
        script.dataset.aculistMarketScannerLoader = version
        document.body.appendChild(script)
        scripts.push(script)
      })
    }, 50)

    return () => {
      window.clearTimeout(timer)
      scripts.forEach((script) => script.remove())
    }
  }, [activeReport, currentLoadKey])

  function handleSearchChange(value: string) {
    setSearchValue(value)
    setPendingGeography(null)
    setSearchError('')
    setSearchOpen(true)
  }

  function selectGeography(option: GeographyOption) {
    setPendingGeography(option)
    setSearchValue(displayGeographyValue(option))
    setSearchError('')
    setSearchOpen(false)
  }

  function choosePeriodType(nextType: PeriodType) {
    setPeriodType(nextType)
    setOpenPeriodType(null)
  }

  function choosePeriodValue(nextType: PeriodType, value: number) {
    setPeriodType(nextType)
    setPeriodByType((current) => ({ ...current, [nextType]: value }))
    setOpenPeriodType(null)
  }

  function applyChanges() {
    if (!pendingGeography || !hasValidSelectedSearch) {
      setSearchError('Select a Zip, County, Area, or City from the suggested list to apply.')
      setSearchOpen(true)
      return
    }

    setAppliedGeography(pendingGeography)
    setAppliedPeriod(currentPeriod)
    setSearchError('')
    setSearchOpen(false)
    setOpenPeriodType(null)
  }

  return (
    <main className="mortgage-page" id="market-scanner">
      <header className="page-heading">
        <div>
          <p className="eyebrow">MARKET SCANNER</p>
          <h1>{appliedGeography.name} Market Trends</h1>
          <p>Explore Aculist market views by validated geography and lookback period.</p>
        </div>
      </header>

      <section className="market-control-panel" aria-label="Market scanner controls">
        <div className="market-search">
          <input
            type="text"
            value={searchValue}
            onChange={(event) => handleSearchChange(event.target.value)}
            onFocus={() => setSearchOpen(true)}
            placeholder="Search Zip, County, Area, or City"
            aria-autocomplete="list"
            aria-expanded={searchOpen}
            aria-controls="market-geography-suggestions"
            aria-invalid={Boolean(searchError)}
          />
          {searchOpen && (
            <div className="market-search__menu" id="market-geography-suggestions" role="listbox">
              {suggestions.length > 0 ? (
                suggestions.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    role="option"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectGeography(option)}
                  >
                    {option.label}
                  </button>
                ))
              ) : (
                <span>No matches. Select a listed geography to continue.</span>
              )}
            </div>
          )}
          {searchError && <p className="market-search__error">{searchError}</p>}
        </div>

        <div className="market-period-controls" aria-label="Lookback period">
          {(['Year', 'Quarter', 'Month'] as PeriodType[]).map((type) => (
            <PeriodSplitControl
              key={type}
              type={type}
              active={periodType === type}
              value={periodByType[type]}
              open={openPeriodType === type}
              onChooseType={choosePeriodType}
              onToggle={(nextType) => setOpenPeriodType((openType) => openType === nextType ? null : nextType)}
              onChooseValue={choosePeriodValue}
            />
          ))}
        </div>

        <button
          type="button"
          className={`market-apply ${hasPendingChanges ? 'is-lit' : ''}`}
          onClick={applyChanges}
          disabled={!hasPendingChanges}
        >
          Apply Change
        </button>
      </section>

      <nav className="market-report-tabs" aria-label="Aculist report types">
        {REPORTS.map((report) => (
          <button
            key={report.id}
            type="button"
            className={report.id === activeReport.id ? 'is-active' : ''}
            onClick={() => setActiveReportId(report.id)}
          >
            {report.label}
          </button>
        ))}
      </nav>

      {activeReport.id === 'geography-kpis' && <style id={ACULIST_KPI_STYLE_ID}>{ACULIST_KPI_STYLES}</style>}

      <section className="market-report-stack" aria-label={activeReport.label}>
        {activeReport.widgets.map((widget) => (
          <AculistWidgetPair
            key={`${currentLoadKey}-${widget.id}`}
            definition={widget}
            geography={appliedGeography}
            period={appliedPeriod}
            loadKey={currentLoadKey}
          />
        ))}
      </section>
    </main>
  )
}
