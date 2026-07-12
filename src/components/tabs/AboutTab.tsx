import { Info } from 'lucide-react'

/**
 * About tab — placeholder landing page introducing the MWM Client Hub.
 * Content to be filled in later.
 */
export function AboutTab() {
  return (
    <main className="mortgage-page" id="about">
      <header className="page-heading">
        <div>
          <p className="eyebrow">ABOUT</p>
          <h1>About MWM Client Hub</h1>
          <p>Details about the team and this hub are coming soon.</p>
        </div>
      </header>

      <div className="mortgage-insight overview-note">
        <Info size={17} aria-hidden="true" />
        <p>This section is a placeholder. Content will be added here.</p>
      </div>
    </main>
  )
}
