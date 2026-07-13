import { useEffect, useRef, useState } from 'react'

const ACULIST_WIDGET_SCRIPT =
  'https://aculist-widget-assets-cdn.mlslmedia.com/aculist-embed-widgetdiv.js?v=3.2'

type MarketPoint = {
  year: string
  singleFamilyPrice: number
  condoPrice: number
  singleFamilyRatio: number
  condoRatio: number
}

type ChartDatum = {
  value?: number
}

type DatumElement = Element & {
  __data__?: ChartDatum
}

const CHART_WIDTH = 960
const CHART_HEIGHT = 380
const CHART_PADDING = { top: 32, right: 68, bottom: 52, left: 76 }
const PRICE_TICKS = 5

function readSeries(document: Document, selector: string) {
  return Array.from(document.querySelectorAll<DatumElement>(selector)).map(
    (element) => element.__data__?.value,
  )
}

function tickPosition(element: Element) {
  const transform = element.getAttribute('transform') ?? ''
  return Number(transform.match(/translate\([^,]+,\s*([\d.-]+)/)?.[1])
}

function linearScale(ticks: Array<{ position: number; value: number }>) {
  const count = ticks.length
  const sumX = ticks.reduce((sum, tick) => sum + tick.position, 0)
  const sumY = ticks.reduce((sum, tick) => sum + tick.value, 0)
  const sumXY = ticks.reduce((sum, tick) => sum + tick.position * tick.value, 0)
  const sumXX = ticks.reduce((sum, tick) => sum + tick.position * tick.position, 0)
  const slope = (count * sumXY - sumX * sumY) / (count * sumXX - sumX * sumX)
  const intercept = (sumY - slope * sumX) / count

  return (position: number) => intercept + slope * position
}

function seriesGroups(document: Document, container: string, shape: string) {
  return Array.from(document.querySelectorAll(`${container} .c3-target`))
    .filter((target) => target.querySelector(shape))
    .map((target) => Array.from(target.querySelectorAll<DatumElement>(shape)))
}

function readRenderedSeries(document: Document) {
  const priceTicks = Array.from(document.querySelectorAll('.c3-axis-y .tick')).map((tick) => ({
    position: tickPosition(tick),
    value: Number((tick.textContent ?? '').replace(/[$,]/g, '')),
  })).filter((tick) => Number.isFinite(tick.position) && Number.isFinite(tick.value))
  const ratioTicks = Array.from(document.querySelectorAll('.c3-axis-y2 .tick')).map((tick) => ({
    position: tickPosition(tick),
    value: Number((tick.textContent ?? '').replace('%', '')),
  })).filter((tick) => Number.isFinite(tick.position) && Number.isFinite(tick.value))
  const bars = seriesGroups(document, '.c3-chart-bars', '.c3-bar')
  const lines = seriesGroups(document, '.c3-chart-lines', '.c3-circle')

  if (priceTicks.length < 2 || ratioTicks.length < 2 || bars.length < 2 || lines.length < 2) {
    return null
  }

  const priceAt = linearScale(priceTicks)
  const ratioAt = linearScale(ratioTicks)
  const barValues = bars.slice(0, 2).map((series) => series.map((bar) => {
    const path = bar.getAttribute('d') ?? ''
    const top = Number(path.match(/L\s*[\d.-]+,([\d.-]+)/)?.[1])
    return Math.round(priceAt(top) / 1_000) * 1_000
  }))
  const ratioValues = lines.slice(0, 2).map((series) => series.map((point) =>
    Math.round(ratioAt(Number(point.getAttribute('cy'))) * 10) / 10,
  ))

  return {
    singleFamilyPrice: barValues[0],
    condoPrice: barValues[1],
    singleFamilyRatio: ratioValues[0],
    condoRatio: ratioValues[1],
  }
}

function readMarketData(widget: HTMLDivElement): MarketPoint[] | null {
  const frame = widget.querySelector('iframe')
  const document = frame?.contentDocument

  if (!document) return null

  const visibleYears = Array.from(new Set(
    Array.from(document.querySelectorAll('.c3-axis-x .tick text')).map(
      (element) => element.textContent?.trim() ?? '',
    ),
  )).filter((year) => /^\d{4}$/.test(year))
  const rendered = readRenderedSeries(document)
  const singleFamilyPrice = readSeries(document, '.c3-chart-bars .c3-target-SFHM1 .c3-bar')
  const condoPrice = readSeries(document, '.c3-chart-bars .c3-target-C\\/TM1 .c3-bar')
  const singleFamilyRatio = readSeries(document, '.c3-chart-lines .c3-target-SFHM2 .c3-circle')
  const condoRatio = readSeries(document, '.c3-chart-lines .c3-target-C\\/TM2 .c3-circle')
  const preferRaw = (raw: Array<number | undefined>, fallback: number[] | undefined) =>
    raw.length > 0 && raw.every((value) => typeof value === 'number') ? raw : fallback ?? []
  const resolved = {
    singleFamilyPrice: preferRaw(singleFamilyPrice, rendered?.singleFamilyPrice),
    condoPrice: preferRaw(condoPrice, rendered?.condoPrice),
    singleFamilyRatio: preferRaw(singleFamilyRatio, rendered?.singleFamilyRatio),
    condoRatio: preferRaw(condoRatio, rendered?.condoRatio),
  }
  const seriesLength = resolved.singleFamilyPrice.length

  if (
    Object.values(resolved).some(
      (series) => seriesLength === 0 || series.length !== seriesLength || series.some((value) => typeof value !== 'number'),
    )
  ) {
    return null
  }

  const latestVisibleYear = Math.max(...visibleYears.map(Number), new Date().getFullYear())
  const years = visibleYears.length === seriesLength
    ? visibleYears
    : Array.from({ length: seriesLength }, (_, index) => String(latestVisibleYear - seriesLength + index + 1))

  return years.map((year, index) => ({
    year,
    singleFamilyPrice: resolved.singleFamilyPrice[index] as number,
    condoPrice: resolved.condoPrice[index] as number,
    singleFamilyRatio: (resolved.singleFamilyRatio[index] as number) <= 2
      ? (resolved.singleFamilyRatio[index] as number) * 100
      : resolved.singleFamilyRatio[index] as number,
    condoRatio: (resolved.condoRatio[index] as number) <= 2
      ? (resolved.condoRatio[index] as number) * 100
      : resolved.condoRatio[index] as number,
  }))
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatCompactPrice(value: number) {
  return `$${(value / 1_000_000).toFixed(2)}M`
}

function NativeMarketChart({ data }: { data: MarketPoint[] }) {
  const [activeIndex, setActiveIndex] = useState(data.length - 1)
  const plotWidth = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right
  const plotHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom
  const groupWidth = plotWidth / data.length
  const barWidth = Math.min(24, groupWidth * 0.28)
  const maxPrice = Math.ceil(
    Math.max(...data.flatMap((point) => [point.singleFamilyPrice, point.condoPrice])) / 200_000,
  ) * 200_000
  const ratios = data.flatMap((point) => [point.singleFamilyRatio, point.condoRatio])
  const minRatio = Math.floor((Math.min(...ratios) - 0.5) * 2) / 2
  const maxRatio = Math.ceil((Math.max(...ratios) + 0.5) * 2) / 2
  const x = (index: number) => CHART_PADDING.left + groupWidth * index + groupWidth / 2
  const priceY = (value: number) => CHART_PADDING.top + plotHeight * (1 - value / maxPrice)
  const ratioY = (value: number) =>
    CHART_PADDING.top + plotHeight * (1 - (value - minRatio) / (maxRatio - minRatio))
  const line = (key: 'singleFamilyRatio' | 'condoRatio') =>
    data.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${ratioY(point[key])}`).join(' ')
  const activePoint = data[activeIndex]
  const previousPoint = data[Math.max(0, activeIndex - 1)]
  const sfChange = ((activePoint.singleFamilyPrice / previousPoint.singleFamilyPrice) - 1) * 100
  const condoChange = ((activePoint.condoPrice / previousPoint.condoPrice) - 1) * 100

  return (
    <section className="market-native" aria-labelledby="native-market-title">
      <div className="market-native__header">
        <div>
          <span className="market-native__label">MWM VIEW</span>
          <h2 id="native-market-title">Central San Jose at a glance</h2>
          <p>The same MLS data, presented to match your client hub.</p>
        </div>
        <span className="market-native__status"><i /> Live from Aculist</span>
      </div>

      <div className="market-native__metrics">
        <article>
          <span>Single-family median</span>
          <strong>{formatCompactPrice(activePoint.singleFamilyPrice)}</strong>
          <small className={sfChange >= 0 ? 'is-positive' : 'is-negative'}>
            {sfChange >= 0 ? '+' : ''}{sfChange.toFixed(1)}% vs. prior year
          </small>
        </article>
        <article>
          <span>Condo / townhome median</span>
          <strong>{formatCompactPrice(activePoint.condoPrice)}</strong>
          <small className={condoChange >= 0 ? 'is-positive' : 'is-negative'}>
            {condoChange >= 0 ? '+' : ''}{condoChange.toFixed(1)}% vs. prior year
          </small>
        </article>
        <article>
          <span>Sale-to-list</span>
          <strong>{activePoint.singleFamilyRatio.toFixed(1)}%</strong>
          <small>Single-family · {activePoint.year}</small>
        </article>
      </div>

      <div className="market-native__legend" aria-hidden="true">
        <span><i className="is-sf-price" /> Single-family price</span>
        <span><i className="is-condo-price" /> Condo price</span>
        <span><i className="is-sf-ratio" /> Single-family sale-to-list</span>
        <span><i className="is-condo-ratio" /> Condo sale-to-list</span>
      </div>

      <div className="market-native__chart-wrap">
        <svg
          className="market-native__chart"
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          role="img"
          aria-label="Median prices and sale-to-list ratios by year"
        >
          {Array.from({ length: PRICE_TICKS + 1 }, (_, index) => {
            const value = (maxPrice / PRICE_TICKS) * index
            const y = priceY(value)
            return (
              <g key={value}>
                <line className="market-native__grid" x1={CHART_PADDING.left} x2={CHART_WIDTH - CHART_PADDING.right} y1={y} y2={y} />
                <text className="market-native__axis" x={CHART_PADDING.left - 12} y={y + 4} textAnchor="end">
                  {value === 0 ? '$0' : `$${(value / 1_000_000).toFixed(1)}M`}
                </text>
                <text className="market-native__axis" x={CHART_WIDTH - CHART_PADDING.right + 12} y={y + 4}>
                  {(minRatio + ((maxRatio - minRatio) / PRICE_TICKS) * index).toFixed(1)}%
                </text>
              </g>
            )
          })}

          {data.map((point, index) => (
            <g key={point.year}>
              {activeIndex === index && (
                <rect className="market-native__highlight" x={CHART_PADDING.left + groupWidth * index} y={CHART_PADDING.top} width={groupWidth} height={plotHeight} rx="8" />
              )}
              <rect className="market-native__bar is-sf" x={x(index) - barWidth - 2} y={priceY(point.singleFamilyPrice)} width={barWidth} height={CHART_PADDING.top + plotHeight - priceY(point.singleFamilyPrice)} rx="4" />
              <rect className="market-native__bar is-condo" x={x(index) + 2} y={priceY(point.condoPrice)} width={barWidth} height={CHART_PADDING.top + plotHeight - priceY(point.condoPrice)} rx="4" />
              <text className="market-native__year" x={x(index)} y={CHART_HEIGHT - 18} textAnchor="middle">{point.year}</text>
              <rect
                className="market-native__hit-area"
                x={CHART_PADDING.left + groupWidth * index}
                y={CHART_PADDING.top}
                width={groupWidth}
                height={plotHeight}
                onMouseEnter={() => setActiveIndex(index)}
                onFocus={() => setActiveIndex(index)}
                tabIndex={0}
                aria-label={`${point.year}: single-family ${formatPrice(point.singleFamilyPrice)}, condo ${formatPrice(point.condoPrice)}`}
              />
            </g>
          ))}

          <path className="market-native__line is-sf" d={line('singleFamilyRatio')} />
          <path className="market-native__line is-condo" d={line('condoRatio')} />
          {data.flatMap((point, index) => [
            <circle key={`sf-${point.year}`} className="market-native__point is-sf" cx={x(index)} cy={ratioY(point.singleFamilyRatio)} r={activeIndex === index ? 5 : 3.5} />,
            <circle key={`condo-${point.year}`} className="market-native__point is-condo" cx={x(index)} cy={ratioY(point.condoRatio)} r={activeIndex === index ? 5 : 3.5} />,
          ])}
        </svg>
      </div>

      <div className="market-native__selection" aria-live="polite">
        <strong>{activePoint.year}</strong>
        <span>Single-family <b>{formatPrice(activePoint.singleFamilyPrice)}</b> · {activePoint.singleFamilyRatio.toFixed(1)}%</span>
        <span>Condo / townhome <b>{formatPrice(activePoint.condoPrice)}</b> · {activePoint.condoRatio.toFixed(1)}%</span>
      </div>
    </section>
  )
}

export function MarketScannerTab() {
  const widgetRef = useRef<HTMLDivElement>(null)
  const [marketData, setMarketData] = useState<MarketPoint[]>([])
  const [dataUnavailable, setDataUnavailable] = useState(false)

  useEffect(() => {
    const widget = widgetRef.current
    const widgetStyles = document.createElement('style')
    const script = document.createElement('script')
    let attempts = 0

    widget?.replaceChildren()
    widgetStyles.id = 'aculist-market-trends-styles'
    widgetStyles.textContent = 'body { margin: 0; background: transparent; }'
    document.body.appendChild(widgetStyles)

    const loadWidget = window.setTimeout(() => {
      script.src = ACULIST_WIDGET_SCRIPT
      script.async = true
      script.dataset.aculistMarketScannerLoader = 'true'
      document.body.appendChild(script)
    })
    const readData = window.setInterval(() => {
      attempts += 1
      try {
        const data = widget ? readMarketData(widget) : null
        if (data) {
          setMarketData(data)
          window.clearInterval(readData)
        } else if (attempts >= 240) {
          setDataUnavailable(true)
          window.clearInterval(readData)
        }
      } catch {
        if (attempts >= 240) {
          setDataUnavailable(true)
          window.clearInterval(readData)
        }
      }
    }, 250)

    return () => {
      window.clearTimeout(loadWidget)
      window.clearInterval(readData)
      script.remove()
      widgetStyles.remove()
      widget?.replaceChildren()
    }
  }, [])

  return (
    <main className="mortgage-page" id="market-scanner">
      <header className="page-heading">
        <div>
          <p className="eyebrow">MARKET SCANNER</p>
          <h1>Central San Jose Market Trends</h1>
          <p>Explore ten years of residential real estate trends in Central San Jose.</p>
        </div>
      </header>

      <div
        ref={widgetRef}
        id="aculist-market-trends"
        data-widgettype="trends"
        data-aculistwidget=""
        data-geographytype="Area"
        data-geographyname="Central San Jose"
        data-county="Santa Clara"
        data-colors="#fdb921,#0033a0,#7ED321,#1DB2B8"
        data-period="10"
        data-periodtype="Year"
        data-tokenid="defaultmspvslp"
        data-classtype="Residential - Single Family,Residential - Common Interest"
        data-usertoken="1b9f88f9-2ff8-47cf-b8e2-9064766bb9ed1b9f88f9-2ff8-47cf-b8e2-9064766bb9ed"
        data-title="true"
        data-styleid="aculist-market-trends-styles"
      />

      {marketData.length > 0 ? (
        <NativeMarketChart data={marketData} />
      ) : (
        <section className="market-native market-native--loading" aria-live="polite">
          <span className="market-native__label">MWM VIEW</span>
          <h2>{dataUnavailable ? 'Native comparison unavailable' : 'Building your comparison…'}</h2>
          <p>{dataUnavailable ? 'The embedded data could not be read for the custom view.' : 'Reading the same market data from the chart above.'}</p>
        </section>
      )}
    </main>
  )
}
