import { useState } from 'react'
import { ArrowRight, ClipboardCheck, FileText } from 'lucide-react'
import { EducationCenter } from '../resources/EducationCenter'
import type { HubUser } from '../shell/AuthGate'

type ActiveResource = 'education-center' | null

interface ResourcesTabProps {
  user: HubUser
}

export function ResourcesTab({ user }: ResourcesTabProps) {
  void user

  const [activeResource, setActiveResource] = useState<ActiveResource>(null)

  if (activeResource === 'education-center') {
    return <EducationCenter onBack={() => setActiveResource(null)} />
  }

  return (
    <main className="mortgage-page resources-page" id="resources">
      <header className="mortgage-heading">
        <div className="mortgage-heading__icon"><ClipboardCheck size={24} /></div>
        <div>
          <p className="eyebrow">CLIENT RESOURCES</p>
          <h1>Resources</h1>
          <p>Open the resource you need, then complete the workflow inside.</p>
        </div>
      </header>

      <section className="resource-library" aria-label="Resource options">
        <button
          type="button"
          className="resource-option"
          onClick={() => setActiveResource('education-center')}
        >
          <span className="resource-option__icon"><FileText size={22} /></span>
          <span className="resource-option__copy">
            <span className="eyebrow">TRANSACTION ROAD MAP</span>
            <strong>Transaction road map</strong>
            <small>Guided California-focused modules with timelines, checklists, and advisor prompts.</small>
          </span>
          <span className="resource-option__meta">
            Open <ArrowRight size={18} />
          </span>
        </button>
      </section>
    </main>
  )
}
