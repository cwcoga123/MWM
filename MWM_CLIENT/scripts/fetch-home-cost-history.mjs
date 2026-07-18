#!/usr/bin/env node
/**
 * Refreshes src/data/homeCostHistory.json with 20 years of month-end points
 * for the FRED-backed Home Cost Watch catalog in src/data/homeCostSeries.json.
 *
 * Daily and weekly series are sampled to the last available observation in
 * each calendar month so the app can draw simple long-range charts without
 * shipping thousands of raw points to every browser session.
 *
 * This uses FRED's public CSV graph export rather than the keyed API endpoint.
 * That keeps this long-history refresh usable even when the local FRED_API_KEY
 * is missing or only configured for the shorter snapshot script later.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const catalogPath = path.join(projectRoot, 'src', 'data', 'homeCostSeries.json')
const historyPath = path.join(projectRoot, 'src', 'data', 'homeCostHistory.json')

const HISTORY_YEARS = 20
const SLEEP_MS = 120

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function yearsAgoISODate(years) {
  const date = new Date()
  date.setUTCFullYear(date.getUTCFullYear() - years)
  date.setUTCDate(1)
  return date.toISOString().slice(0, 10)
}

function loadSeries() {
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'))
  const series = []

  for (const layer of catalog.layers ?? []) {
    for (const group of layer.groups ?? []) {
      for (const indicator of group.indicators ?? []) {
        series.push({
          id: indicator.id,
          seriesId: indicator.seriesId,
          label: indicator.label,
        })
      }
    }
  }

  const seen = new Set()
  return series.filter((item) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

function parseFredCsv(text, seriesId, observationStart) {
  const lines = text.trim().split(/\r?\n/)
  const rows = []

  for (const line of lines.slice(1)) {
    const [date, rawValue] = line.split(',', 2)
    if (!date || date < observationStart || !rawValue || rawValue === '.') continue

    const value = Number(rawValue)
    if (Number.isFinite(value)) {
      rows.push({ date, value })
    }
  }

  if (rows.length === 0) {
    throw new Error(`FRED returned no usable observations for ${seriesId}`)
  }

  return rows
}

function bucketByMonth(observations) {
  const buckets = new Map()
  for (const observation of observations) {
    buckets.set(observation.date.slice(0, 7), observation)
  }
  return [...buckets.values()]
}

async function fetchSeriesHistory(seriesId) {
  const observationStart = yearsAgoISODate(HISTORY_YEARS)
  const url = new URL('https://fred.stlouisfed.org/graph/fredgraph.csv')
  url.searchParams.set('id', seriesId)

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`FRED request for ${seriesId} failed: ${response.status} ${response.statusText}`)
  }

  const observations = parseFredCsv(await response.text(), seriesId, observationStart)

  return {
    latest: observations[observations.length - 1],
    points: bucketByMonth(observations),
  }
}

async function main() {
  const series = loadSeries()
  const values = {}
  const errors = []

  for (const { id, seriesId, label } of series) {
    try {
      const { latest, points } = await fetchSeriesHistory(seriesId)
      values[id] = {
        seriesId,
        latest,
        points,
      }
      console.log(`[ok] ${label} (${seriesId}): ${points.length} points, latest ${latest.value} on ${latest.date}`)
    } catch (error) {
      errors.push(error)
      console.error(`[fail] ${label} (${seriesId}): ${error.message}`)
    }
    await sleep(SLEEP_MS)
  }

  if (Object.keys(values).length === 0) {
    console.error('No series were fetched successfully. Leaving homeCostHistory.json untouched.')
    process.exit(1)
  }

  const history = {
    generatedAt: new Date().toISOString(),
    historyYears: HISTORY_YEARS,
    sampling: 'month-end',
    values,
  }

  writeFileSync(historyPath, JSON.stringify(history, null, 2) + '\n')
  console.log(`\nWrote ${Object.keys(values).length}/${series.length} series to ${path.relative(projectRoot, historyPath)}`)

  if (errors.length > 0) {
    console.error(`\n${errors.length} series failed and were omitted from the new history file.`)
    process.exitCode = 1
  }
}

main()
