# FRED data on the Overview tab

The Overview tab shows a curated set of [FRED](https://fred.stlouisfed.org/)
(Federal Reserve Economic Data) series chosen for a Bay Area mortgage practice
serving numbers-minded tech clients: mortgage rates and Fed policy, San
Francisco and San Jose metro home prices and inventory, and local
tech-sector employment.

## Why the data isn't fetched live in the browser

Two hard blockers rule that out:

1. **CORS.** `api.stlouisfed.org` does not send `Access-Control-Allow-Origin`
   headers for arbitrary sites, so a browser `fetch()` from the app fails
   before it ever gets a response.
2. **API key exposure.** Any environment variable prefixed `VITE_` gets
   inlined into the JavaScript bundle Vite ships to the browser. Putting the
   FRED key there would hand it to every visitor.

## How it works instead

`scripts/fetch-fred-data.mjs` is a small Node script (no extra dependencies —
it uses Node's built-in `fetch`) that:

1. Reads `FRED_API_KEY` from the environment, or from a `FRED_API_KEY=...`
   line in `.env.local` (this key is intentionally **not** prefixed
   `VITE_`).
2. Calls the FRED observations endpoint for each series and takes the
   latest value.
3. Writes `src/data/fredSnapshot.json`, keyed by the same `id`s used in
   `src/data/fredIndicators.ts`, each with `{ seriesId, value, date }`, plus
   a top-level `generatedAt` timestamp.

`OverviewTab.tsx` imports that JSON directly (a normal build-time import, no
network call) and renders each indicator's value with an "as of" date. If a
series is missing from the snapshot (for example, one request failed on the
last refresh), that card just falls back to a plain link to FRED — the tab
never breaks because of stale or partial data.

The Home Cost Watch section uses a second static data file:
`src/data/homeCostHistory.json`. It is generated from the catalog in
`src/data/homeCostSeries.json` and renders simple 20-year line charts grouped
as Local/Bay Area, Semi-Local/California, and National/U.S. The history script
uses FRED's public CSV graph export, then samples daily and weekly series to
month-end points so the client bundle stays small.

## Refreshing the data

```sh
pnpm fetch:fred
pnpm fetch:home-cost-history
```

Run these whenever you want fresher numbers - before a deploy, on a schedule
via CI, or manually. Commit the updated `src/data/fredSnapshot.json` and
`src/data/homeCostHistory.json` so the deployed app serves the new values.

## Adding or changing a series

1. Add the series to `fredIndicators` in `src/data/fredIndicators.ts`
   (`id`, `seriesId`, `label`, `cadence`, `why`, `fredUrl`, `category`,
   `unit`). Verify the series ID exists on fred.stlouisfed.org first —
   nothing here validates it automatically.
2. Add the matching `{ id, seriesId }` pair to the `SERIES` array at the top
   of `scripts/fetch-fred-data.mjs`. The two lists are intentionally
   separate (the script avoids importing TypeScript) and must be kept in
   sync by hand.
3. Run `pnpm fetch:fred` to populate the new value.

`unit` controls formatting in `src/lib/formatFredValue.ts`: `percent`,
`currency`, `days`, `count`, or `index`.

For Home Cost Watch charts, add or edit the matching entry in
`src/data/homeCostSeries.json`, then run `pnpm fetch:home-cost-history`.
