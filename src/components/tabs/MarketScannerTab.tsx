import { Radar } from 'lucide-react'

/**
 * Market Scanner tab — placeholder for upcoming market-scanning tools
 * (listing alerts, inventory trends, etc.). Content to be filled in later.
 */
export function MarketScannerTab() {
  return (
    <main className="mortgage-page" id="market-scanner">
      <header className="page-heading">
        <div>
          <p className="eyebrow">MARKET SCANNER</p>
          <h1>Market Scanner</h1>
          <p>Scanning tools for the Bay Area market are coming soon.</p>
        </div>
      </header>

      <div className="mortgage-insight overview-note">
        <Radar size={17} aria-hidden="true" />
        <p>This section is a placeholder. Content will be added here.</p>
      </div>
    </main>
  )
}
