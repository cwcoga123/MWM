interface SparklineProps {
  points: number[]
  tone?: 'up' | 'down' | 'flat'
  width?: number
  height?: number
}

const TONE_COLOR: Record<NonNullable<SparklineProps['tone']>, string> = {
  up: 'var(--lime)',
  down: '#f85149',
  flat: 'var(--muted)',
}

/** Minimal dependency-free sparkline: a single polyline scaled to fit the given points. */
export function Sparkline({ points, tone = 'flat', width = 64, height = 20 }: SparklineProps) {
  if (points.length < 2) return null

  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min

  const coords = points.map((value, index) => {
    const x = (index / (points.length - 1)) * width
    const y = range === 0 ? height / 2 : height - ((value - min) / range) * height
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  return (
    <svg
      className="indicator-sparkline"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="6-month trend"
    >
      <polyline
        points={coords.join(' ')}
        fill="none"
        stroke={TONE_COLOR[tone]}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
