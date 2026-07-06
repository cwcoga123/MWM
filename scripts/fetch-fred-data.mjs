#!/usr/bin/env node
/**
 * Refreshes src/data/fredSnapshot.json with, for each FRED series used on
 * the Overview tab: the latest observation, the immediately prior
 * observation (for the up/down trend arrow + date), and a recent-trend
 * label row — the last 4 raw weekly readings for weekly-cadence series
 * (mortgage rates), or the last 6 month-bucketed readings for everything
 * else.
 *
 * Why this runs in Node instead of the browser:
 *  - The FRED API does not send CORS headers for arbitrary origins, so a
 *    browser `fetch()` to api.stlouisfed.org fails outright.
 *  - Even if it didn't, shipping an API key into client JS (anything
 *    prefixed VITE_) leaks it to every visitor. FRED_API_KEY is deliberately
 *    NOT prefixed with VITE_ so Vite never bundles it.
 *
 * Usage:
 *   pnpm fetch:fred
 *
 * The key is read from (in order): the FRED_API_KEY environment variable,
 * then a FRED_API_KEY=... line in .env.local at the project root.
 *
 * The list of series below must stay in sync with the `id`/`seriesId` pairs
 * in src/data/fredIndicators.ts — this script is intentionally dependency-free
 * (no ts-node/tsx) so it re-declares the pairing rather than importing the
 * TypeScript file directly.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const envLocalPath = path.join(projectRoot, '.env.local')
const snapshotPath = path.join(projectRoot, 'src', 'data', 'fredSnapshot.json')

// Ask FRED for ~21 months of history so every series has enough observations
// to build a clean 6-point trend — monthly series only need a handful, but
// quarterly series (GDP) need 6 quarters back, and some releases lag by a
// few months (e.g. the Case-Shiller index).
const HISTORY_MONTHS = 21
// How many month-buckets to keep for the recent-trend row (non-weekly series).
const TREND_MONTHS = 6
// How many raw readings to keep for the recent-trend row (weekly series).
const TREND_WEEKS = 4

const SERIES = [
  { id: 'mortgage-30', seriesId: 'MORTGAGE30US', weekly: true },
  { id: 'mortgage-15', seriesId: 'MORTGAGE15US', weekly: true },
  { id: 'treasury-10y', seriesId: 'DGS10' },
  { id: 'fed-funds', seriesId: 'FEDFUNDS' },
  { id: 'cpi', seriesId: 'CPIAUCSL' },
  { id: 'core-pce', seriesId: 'PCEPILFE' },
  { id: 'unemployment-rate', seriesId: 'UNRATE' },
  { id: 'nonfarm-payrolls', seriesId: 'PAYEMS' },
  { id: 'jobless-claims', seriesId: 'ICSA', weekly: true },
  { id: 'gdp-growth', seriesId: 'A191RL1Q225SBEA' },
  { id: 'sf-case-shiller', seriesId: 'SFXRSA' },
  { id: 'sf-median-listing-price', seriesId: 'MEDLISPRI41860' },
  { id: 'san-jose-median-listing-price', seriesId: 'MEDLISPRI41940' },
  { id: 'san-jose-listings', seriesId: 'ACTLISCOU41940' },
  { id: 'sf-listings', seriesId: 'ACTLISCOU41860' },
  { id: 'sf-days-on-market', seriesId: 'MEDDAYONMAR41860' },
  { id: 'san-jose-unemployment', seriesId: 'SANJ906URN' },
  { id: 'sf-unemployment', seriesId: 'SANF806URN' },
]

function loadApiKey() {
  if (process.env.FRED_API_KEY) return process.env.FRED_API_KEY

  if (existsSync(envLocalPath)) {
    const contents = readFileSync(envLocalPath, 'utf8')
    for (const line of contents.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const [key, ...rest] = trimmed.split('=')
      if (key === 'FRED_API_KEY') {
        return rest.join('=').trim()
      }
    }
  }

  return undefined
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function monthsAgoISODate(months) {
  const date = new Date()
  date.setUTCMonth(date.getUTCMonth() - months)
  date.setUTCDate(1)
  return date.toISOString().slice(0, 10)
}

/** Buckets observations by calendar month, keeping the last (most recent) reading in each month. */
function bucketByMonth(observations) {
  const buckets = new Map()
  for (const obs of observations) {
    const monthKey = obs.date.slice(0, 7) // 'YYYY-MM'
    buckets.set(monthKey, obs) // later entries overwrite earlier ones within the same month
  }
  return [...buckets.values()]
}

async function fetchSeriesHistory(seriesId, apiKey, { weekly = false } = {}) {
  const url = new URL('https://api.stlouisfed.org/fred/series/observations')
  url.searchParams.set('series_id', seriesId)
  url.searchParams.set('api_key', apiKey)
  url.searchParams.set('file_type', 'json')
  url.searchParams.set('sort_order', 'asc')
  url.searchParams.set('observation_start', monthsAgoISODate(HISTORY_MONTHS))

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`FRED request for ${seriesId} failed: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  const observations = (data.observations ?? [])
    .filter((obs) => obs.value !== '.')
    .map((obs) => ({ date: obs.date, value: Number(obs.value) }))

  if (observations.length === 0) {
    throw new Error(`FRED returned no usable observations for ${seriesId}`)
  }

  const latest = observations[observations.length - 1]
  const previous = observations.length > 1 ? observations[observations.length - 2] : latest

  const recentTrend = weekly
    ? observations.slice(-TREND_WEEKS)
    : bucketByMonth(observations).slice(-TREND_MONTHS)

  return { latest, previous, recentTrend }
}

async function main() {
  const apiKey = loadApiKey()
  if (!apiKey) {
    console.error(
      'No FRED API key found. Set FRED_API_KEY in the environment or add ' +
        'FRED_API_KEY=... to .env.local (get a free key at https://fred.stlouisfed.org/docs/api/api_key.html).',
    )
    process.exit(1)
  }

  const values = {}
  const errors = []

  for (const { id, seriesId, weekly } of SERIES) {
    try {
      const { latest, previous, recentTrend } = await fetchSeriesHistory(seriesId, apiKey, { weekly })
      values[id] = {
        seriesId,
        value: latest.value,
        date: latest.date,
        previousValue: previous.value,
        previousDate: previous.date,
        recentTrend,
      }
      console.log(`✓ ${id} (${seriesId}): ${latest.value} as of ${latest.date} (prev ${previous.value} on ${previous.date})`)
    } catch (error) {
      errors.push(error)
      console.error(`✗ ${id} (${seriesId}): ${error.message}`)
    }
    // Be polite to the API — a small delay between requests.
    await sleep(150)
  }

  if (Object.keys(values).length === 0) {
    console.error('No series were fetched successfully. Leaving fredSnapshot.json untouched.')
    process.exit(1)
  }

  const snapshot = {
    generatedAt: new Date().toISOString(),
    values,
  }

  writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2) + '\n')
  console.log(`\nWrote ${Object.keys(values).length}/${SERIES.length} series to ${path.relative(projectRoot, snapshotPath)}`)

  if (errors.length > 0) {
    console.error(
      `\n${errors.length} series failed to refresh and were omitted from the new snapshot. Rerun the script to retry them.`,
    )
    process.exitCode = 1
  }
}

main()
