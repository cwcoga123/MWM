import { ArrowLeft, ClipboardCheck, MapPin } from 'lucide-react'

interface EducationCenterProps {
  onBack: () => void
}

/**
 * Transaction road map — content intentionally cleared out per request.
 * Still reachable from the Resources tab; the walkthrough/module content
 * that used to live here will be rebuilt later.
 */
export function EducationCenter({ onBack }: EducationCenterProps) {
  return (
    <main className="mortgage-page resources-page education-page" id="education-center">
      <div className="resource-breadcrumb">
        <button type="button" onClick={onBack}>
          <ArrowLeft size={16} /> Resources
        </button>
      </div>

      <header className="mortgage-heading">
        <div className="mortgage-heading__icon"><ClipboardCheck size={24} /></div>
        <div>
          <p className="eyebrow">TRANSACTION ROAD MAP</p>
          <h1>Transaction road map</h1>
          <p>This section is being rebuilt. Content is coming soon.</p>
        </div>
      </header>

      <div className="mortgage-insight overview-note">
        <MapPin size={17} aria-hidden="true" />
        <p>No content here yet.</p>
      </div>
    </main>
  )
}
