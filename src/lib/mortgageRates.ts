import { creditScores, type CreditScoreId } from './mortgage'

export interface RateProduct {
  id: string
  label: string
  baseRate: number
}

/**
 * Posted rates shown are for the best ("excellent") credit tier, matching
 * the convention used by the mortgage calculator (base rate + 0 adjustment).
 */
export const rateProducts: RateProduct[] = [
  { id: 'fixed-30', label: '30 Year Fixed', baseRate: 6.49 },
  { id: 'fixed-30-fha', label: '30 Year Fixed FHA', baseRate: 6.23 },
  { id: 'fixed-20', label: '20 Year Fixed', baseRate: 6.3 },
  { id: 'fixed-15', label: '15 Year Fixed', baseRate: 5.84 },
  { id: 'fixed-15-fha', label: '15 Year Fixed FHA', baseRate: 6.09 },
  { id: 'fixed-10', label: '10 Year Fixed', baseRate: 5.79 },
  { id: 'arm-5', label: '5-year ARM', baseRate: 5.67 },
]

export interface CreditBand {
  id: CreditScoreId
  label: string
  min: number
  max: number
  color: string
}

export const CREDIT_SCORE_MIN = 300
export const CREDIT_SCORE_MAX = 850

/** Bands and boundaries mirror the ranges already used by lib/mortgage.ts's creditScores. */
export const creditBands: CreditBand[] = [
  { id: 'bad', label: 'Bad', min: 300, max: 500, color: '#a1272e' },
  { id: 'poor', label: 'Poor', min: 500, max: 600, color: '#d9762a' },
  { id: 'fair', label: 'Fair', min: 600, max: 660, color: '#d9c02a' },
  { id: 'good', label: 'Good', min: 660, max: 780, color: '#6fbf4f' },
  { id: 'excellent', label: 'Excellent', min: 780, max: 850, color: '#1f6b3a' },
]

const TOTAL_BAND_WIDTH = creditBands.reduce((sum, band) => sum + (band.max - band.min), 0)

export function creditBandWidthPercent(band: CreditBand) {
  return ((band.max - band.min) / TOTAL_BAND_WIDTH) * 100
}

function safeScore(score: number) {
  if (!Number.isFinite(score)) return CREDIT_SCORE_MIN
  return Math.min(CREDIT_SCORE_MAX, Math.max(CREDIT_SCORE_MIN, score))
}

export function creditBandForScore(score: number): CreditBand {
  const clamped = safeScore(score)
  const lastIndex = creditBands.length - 1

  return (
    creditBands.find((band, index) =>
      index === lastIndex
        ? clamped >= band.min && clamped <= band.max
        : clamped >= band.min && clamped < band.max,
    ) ?? creditBands[lastIndex]
  )
}

/** Where the score sits along the full 300-850 range, as a percent (for a marker/indicator). */
export function scorePositionPercent(score: number) {
  const clamped = safeScore(score)
  return ((clamped - CREDIT_SCORE_MIN) / (CREDIT_SCORE_MAX - CREDIT_SCORE_MIN)) * 100
}

export function calculateProductRate(product: RateProduct, score: number) {
  const band = creditBandForScore(score)
  const creditScore = creditScores.find((option) => option.id === band.id) ?? creditScores[0]
  return product.baseRate + creditScore.rateAdjustment
}

/** Formats a rate the way the source rate sheet does: no forced trailing zero (6.3%, not 6.30%). */
export function formatRate(rate: number) {
  return `${Number(rate.toFixed(2))}%`
}
