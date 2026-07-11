import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  DollarSign,
  FileText,
  HelpCircle,
  Landmark,
  ListChecks,
  PlayCircle,
  ShieldCheck,
  Users,
} from 'lucide-react'
import {
  educationModules,
  educationPillars,
  recommendedEducationModuleIds,
  type EducationModule,
  type EducationModuleId,
  type EducationPillar,
  type EducationPillarId,
} from '../../data/educationCenter'

interface EducationCenterProps {
  onBack: () => void
}

type CostPerspective = 'buyer' | 'seller' | 'shared'

const moduleLookup = new Map<EducationModuleId, EducationModule>(
  educationModules.map((module) => [module.id, module]),
)

const pillarLookup = new Map<EducationPillarId, EducationPillar>(
  educationPillars.map((pillar) => [pillar.id, pillar]),
)

const firstRecommendedModule = moduleLookup.get(recommendedEducationModuleIds[0]) ?? educationModules[0]

const titleReportHotspots = [
  {
    id: 'vesting',
    label: 'Vesting',
    title: 'Owner names and vesting',
    body: 'The report should match the seller names and show who must sign transfer documents.',
  },
  {
    id: 'legal',
    label: 'Legal description',
    title: 'Legal description',
    body: 'This is the recorded description used by title and the county, not just the street address.',
  },
  {
    id: 'liens',
    label: 'Liens',
    title: 'Recorded liens',
    body: 'Loans, judgments, or unpaid obligations usually need payoff or clearance before closing.',
  },
  {
    id: 'exceptions',
    label: 'Exceptions',
    title: 'Policy exceptions',
    body: 'Easements, CC&Rs, and other exceptions can limit what the title policy covers.',
  },
]

const escrowRoles = [
  {
    role: 'Buyer',
    responsibility: 'Reviews disclosures, secures financing, signs documents, and delivers funds.',
  },
  {
    role: 'Seller',
    responsibility: 'Provides disclosures, clears title issues, signs deed documents, and transfers possession.',
  },
  {
    role: 'Agent',
    responsibility: 'Tracks contract dates, coordinates negotiations, and helps translate next steps.',
  },
  {
    role: 'Lender',
    responsibility: 'Underwrites the loan, issues closing documents, and funds after signing conditions are met.',
  },
  {
    role: 'Escrow officer',
    responsibility: 'Coordinates instructions, documents, balances, funds, and closing logistics.',
  },
  {
    role: 'Title officer',
    responsibility: 'Reviews public records, clears title matters, and supports deed recording.',
  },
]

const costSorterItems: Record<CostPerspective, { label: string; detail: string }[]> = {
  buyer: [
    {
      label: 'Loan costs',
      detail: 'Origination, points, appraisal, credit report, and other lender-controlled line items.',
    },
    {
      label: 'Prepaids and impounds',
      detail: 'Interest, insurance, taxes, and reserve deposits based on loan structure and closing date.',
    },
    {
      label: 'Buyer title and escrow fees',
      detail: 'Allocation depends on county custom and the purchase contract.',
    },
  ],
  seller: [
    {
      label: 'Payoff and reconveyance',
      detail: 'Existing mortgage payoff, recording, and release-related fees.',
    },
    {
      label: 'Commission and credits',
      detail: 'Broker compensation and any negotiated buyer credits or repairs.',
    },
    {
      label: 'Transfer tax and withholding',
      detail: 'County/city transfer taxes and possible FIRPTA or California withholding review.',
    },
  ],
  shared: [
    {
      label: 'Escrow and title allocation',
      detail: 'Often guided by local custom, but the contract controls.',
    },
    {
      label: 'Prorations',
      detail: 'Taxes, HOA dues, rent, or other recurring items are split by the closing date.',
    },
    {
      label: 'Negotiated repairs or concessions',
      detail: 'Credits can move between buyer and seller columns as the deal is negotiated.',
    },
  ],
}

const propertyTaxMilestones = [
  {
    date: 'July 1',
    title: 'Tax year begins',
    detail: 'California secured property taxes are assessed on a July 1 through June 30 tax year.',
  },
  {
    date: 'October',
    title: 'Bills mailed',
    detail: 'County tax collectors commonly mail annual secured tax bills in October.',
  },
  {
    date: 'November 1',
    title: 'First installment due',
    detail: 'The first installment can be paid once the bill is issued and is due on November 1.',
  },
  {
    date: 'December 10',
    title: 'First delinquency date',
    detail: 'The first installment is delinquent after December 10 if unpaid.',
  },
  {
    date: 'February 1',
    title: 'Second installment due',
    detail: 'The second installment is due on February 1.',
  },
  {
    date: 'April 10',
    title: 'Second delinquency date',
    detail: 'The second installment is delinquent after April 10 if unpaid.',
  },
  {
    date: 'After sale',
    title: 'Supplemental bill watch',
    detail: 'A change in ownership can trigger a supplemental bill after reassessment.',
  },
]

function modulesForPillar(pillar: EducationPillar) {
  return pillar.v1ModuleIds
    .map((moduleId) => moduleLookup.get(moduleId))
    .filter((module): module is EducationModule => Boolean(module))
}

function LessonAnswerCards({ module }: { module: EducationModule }) {
  const answers = [
    ['What is this?', module.answers.what],
    ['Why does it matter?', module.answers.why],
    ['What do I need to do?', module.answers.do],
    ['Ask your advisor', module.answers.ask],
  ]

  return (
    <div className="education-answer-grid">
      {answers.map(([label, body]) => (
        <article className="education-answer-card" key={label}>
          <span>{label}</span>
          <p>{body}</p>
        </article>
      ))}
    </div>
  )
}

function ModuleInteraction({
  module,
  activeTitleHotspot,
  onTitleHotspotChange,
  costPerspective,
  onCostPerspectiveChange,
  taxMilestoneIndex,
  onTaxMilestoneChange,
}: {
  module: EducationModule
  activeTitleHotspot: string
  onTitleHotspotChange: (id: string) => void
  costPerspective: CostPerspective
  onCostPerspectiveChange: (perspective: CostPerspective) => void
  taxMilestoneIndex: number
  onTaxMilestoneChange: (index: number) => void
}) {
  if (module.id === 'escrow-101') {
    return (
      <section className="education-interaction" aria-labelledby="escrow-role-map-title">
        <div className="education-section-heading">
          <span className="eyebrow">ROLE MAP</span>
          <h3 id="escrow-role-map-title">Who is in the file?</h3>
        </div>
        <div className="role-map-grid">
          {escrowRoles.map((role) => (
            <article className="role-map-card" key={role.role}>
              <span><Users size={16} /></span>
              <strong>{role.role}</strong>
              <p>{role.responsibility}</p>
            </article>
          ))}
        </div>
      </section>
    )
  }

  if (module.id === 'preliminary-title-report') {
    const activeHotspot = titleReportHotspots.find((hotspot) => hotspot.id === activeTitleHotspot) ?? titleReportHotspots[0]

    return (
      <section className="education-interaction" aria-labelledby="title-report-tour-title">
        <div className="education-section-heading">
          <span className="eyebrow">ANNOTATED SAMPLE</span>
          <h3 id="title-report-tour-title">Preliminary title report tour</h3>
        </div>
        <div className="title-report-sample">
          <div className="title-report-paper" aria-label="Sample preliminary title report sections">
            <div className="title-report-paper__header">
              <span>Preliminary Report</span>
              <strong>Sample California Purchase</strong>
            </div>
            {titleReportHotspots.map((hotspot, index) => (
              <button
                type="button"
                className={`title-report-line ${activeHotspot.id === hotspot.id ? 'is-active' : ''}`}
                key={hotspot.id}
                onClick={() => onTitleHotspotChange(hotspot.id)}
              >
                <span>{index + 1}</span>
                {hotspot.label}
              </button>
            ))}
          </div>
          <article className="title-report-note">
            <span><FileText size={18} /></span>
            <div>
              <strong>{activeHotspot.title}</strong>
              <p>{activeHotspot.body}</p>
            </div>
          </article>
        </div>
      </section>
    )
  }

  if (module.id === 'closing-costs') {
    return (
      <section className="education-interaction" aria-labelledby="cost-sorter-title">
        <div className="education-section-heading">
          <span className="eyebrow">COST SORTER</span>
          <h3 id="cost-sorter-title">Sort the conversation by party</h3>
        </div>
        <div className="cost-sorter-tabs" role="tablist" aria-label="Closing cost perspective">
          {(['buyer', 'seller', 'shared'] as CostPerspective[]).map((perspective) => (
            <button
              type="button"
              role="tab"
              aria-selected={costPerspective === perspective}
              className={costPerspective === perspective ? 'is-active' : ''}
              key={perspective}
              onClick={() => onCostPerspectiveChange(perspective)}
            >
              {perspective}
            </button>
          ))}
        </div>
        <div className="cost-sorter-list">
          {costSorterItems[costPerspective].map((item) => (
            <article className="cost-sorter-item" key={item.label}>
              <CircleDollarSign size={17} />
              <div>
                <strong>{item.label}</strong>
                <p>{item.detail}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    )
  }

  if (module.id === 'property-tax-calendar') {
    const activeMilestone = propertyTaxMilestones[taxMilestoneIndex] ?? propertyTaxMilestones[0]

    return (
      <section className="education-interaction" aria-labelledby="tax-calendar-title">
        <div className="education-section-heading">
          <span className="eyebrow">CALIFORNIA CALENDAR</span>
          <h3 id="tax-calendar-title">Property tax milestones</h3>
        </div>
        <div className="tax-calendar-strip">
          {propertyTaxMilestones.map((milestone, index) => (
            <button
              type="button"
              className={index === taxMilestoneIndex ? 'is-active' : ''}
              key={milestone.date}
              onClick={() => onTaxMilestoneChange(index)}
            >
              <span>{milestone.date}</span>
              {milestone.title}
            </button>
          ))}
        </div>
        <article className="tax-calendar-detail">
          <span><Clock3 size={18} /></span>
          <div>
            <strong>{activeMilestone.date}: {activeMilestone.title}</strong>
            <p>{activeMilestone.detail}</p>
          </div>
        </article>
      </section>
    )
  }

  if (module.id === 'wire-safety') {
    return (
      <section className="education-interaction" aria-labelledby="wire-safety-flow-title">
        <div className="education-section-heading">
          <span className="eyebrow">VERIFICATION FLOW</span>
          <h3 id="wire-safety-flow-title">Safe path for closing funds</h3>
        </div>
        <div className="wire-flow">
          {['Secure instructions', 'Verified phone call', 'Bank wire', 'Escrow receipt'].map((step, index) => (
            <div className="wire-flow-step" key={step}>
              <span>{index + 1}</span>
              <strong>{step}</strong>
              {index < 3 && <ArrowRight size={16} aria-hidden="true" />}
            </div>
          ))}
        </div>
        <div className="education-alert">
          <ShieldCheck size={18} />
          <p>Do not use changed wire instructions until escrow verifies them through a known phone number.</p>
        </div>
      </section>
    )
  }

  if (module.id === 'loan-process-roadmap') {
    return (
      <section className="education-interaction" aria-labelledby="loan-calculator-links-title">
        <div className="education-section-heading">
          <span className="eyebrow">MINI CALCULATORS</span>
          <h3 id="loan-calculator-links-title">Run the numbers while you learn</h3>
        </div>
        <div className="education-cta-grid">
          {module.ctas?.map((cta) => (
            <a className="education-cta-card" href={cta.href} key={cta.href}>
              <DollarSign size={17} />
              <span>
                <strong>{cta.label}</strong>
                <small>{cta.description}</small>
              </span>
              <ArrowRight size={15} />
            </a>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="education-interaction" aria-labelledby="lesson-flow-title">
      <div className="education-section-heading">
        <span className="eyebrow">GUIDED WALKTHROUGH</span>
        <h3 id="lesson-flow-title">What to watch</h3>
      </div>
      <div className="education-alert">
        <ListChecks size={18} />
        <p>Work through the checklist, then bring the advisor question into your next transaction update.</p>
      </div>
    </section>
  )
}

function PlannedPillarPanel({ pillar }: { pillar: EducationPillar }) {
  const Icon = pillar.icon

  return (
    <article className="education-planned-panel">
      <span className="education-planned-panel__icon"><Icon size={23} /></span>
      <p className="eyebrow">PLANNED ROADMAP PILLAR</p>
      <h2>{pillar.title}</h2>
      <p>{pillar.summary}</p>
      <div className="planned-module-list">
        {pillar.modules.map((moduleName) => (
          <span key={moduleName}>{moduleName}</span>
        ))}
      </div>
    </article>
  )
}

export function EducationCenter({ onBack }: EducationCenterProps) {
  const [activePillarId, setActivePillarId] = useState<EducationPillarId>(firstRecommendedModule.pillarId)
  const [activeModuleId, setActiveModuleId] = useState<EducationModuleId>(firstRecommendedModule.id)
  const [activeStepIndex, setActiveStepIndex] = useState(0)
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({})
  const [activeTitleHotspot, setActiveTitleHotspot] = useState(titleReportHotspots[0].id)
  const [costPerspective, setCostPerspective] = useState<CostPerspective>('buyer')
  const [taxMilestoneIndex, setTaxMilestoneIndex] = useState(0)

  const activePillar = pillarLookup.get(activePillarId) ?? educationPillars[0]
  const activePillarModules = useMemo(() => modulesForPillar(activePillar), [activePillar])
  const activeModule = moduleLookup.get(activeModuleId) ?? firstRecommendedModule
  const activeStep = activeModule.walkthrough[Math.min(activeStepIndex, activeModule.walkthrough.length - 1)]
  const activeModuleAvailableInPillar = activeModule.pillarId === activePillar.id
  const selectedModule = activeModuleAvailableInPillar ? activeModule : activePillarModules[0]
  const selectedStep = selectedModule
    ? selectedModule.walkthrough[Math.min(activeStepIndex, selectedModule.walkthrough.length - 1)]
    : activeStep

  function selectPillar(pillar: EducationPillar) {
    setActivePillarId(pillar.id)
    setActiveStepIndex(0)

    const firstModule = modulesForPillar(pillar)[0]
    if (firstModule) {
      setActiveModuleId(firstModule.id)
    }
  }

  function selectModule(module: EducationModule) {
    setActivePillarId(module.pillarId)
    setActiveModuleId(module.id)
    setActiveStepIndex(0)
  }

  function toggleChecklistItem(module: EducationModule, index: number) {
    const key = `${module.id}-${index}`
    setCompletedItems((current) => ({
      ...current,
      [key]: !current[key],
    }))
  }

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
          <p className="eyebrow">EDUCATION CENTER</p>
          <h1>Education Center</h1>
          <p>California-focused transaction lessons built as short walkthroughs, checklists, timelines, and advisor prompts.</p>
        </div>
      </header>

      <section className="education-summary-strip" aria-label="Education Center summary">
        <div>
          <strong>{educationPillars.length}</strong>
          <span>Transaction pillars</span>
        </div>
        <div>
          <strong>{recommendedEducationModuleIds.length}</strong>
          <span>V1 guided modules</span>
        </div>
        <div>
          <strong>&lt;3</strong>
          <span>Minutes per lesson</span>
        </div>
      </section>

      <section className="education-roadmap" aria-label="Transaction roadmap pillars">
        {educationPillars.map((pillar, index) => {
          const Icon = pillar.icon
          const availableCount = pillar.v1ModuleIds.length

          return (
            <button
              type="button"
              className={pillar.id === activePillar.id ? 'is-active' : ''}
              key={pillar.id}
              onClick={() => selectPillar(pillar)}
            >
              <span className="education-roadmap__number">{index + 1}</span>
              <span className="education-roadmap__icon"><Icon size={18} /></span>
              <span className="education-roadmap__copy">
                <strong>{pillar.shortTitle}</strong>
                <small>{availableCount ? `${availableCount} live` : 'planned'}</small>
              </span>
            </button>
          )
        })}
      </section>

      <section className="education-layout">
        <aside className="education-sidebar" aria-label="Education module library">
          <div className="education-section-heading">
            <span className="eyebrow">RECOMMENDED V1</span>
            <h2>Start here</h2>
          </div>
          <div className="education-module-list">
            {recommendedEducationModuleIds.map((moduleId) => {
              const module = moduleLookup.get(moduleId)
              if (!module) return null
              const Icon = module.icon

              return (
                <button
                  type="button"
                  className={selectedModule?.id === module.id ? 'is-active' : ''}
                  key={module.id}
                  onClick={() => selectModule(module)}
                >
                  <span><Icon size={17} /></span>
                  <span>
                    <strong>{module.title}</strong>
                    <small>{module.duration} · {module.formatLabel}</small>
                  </span>
                </button>
              )
            })}
          </div>

          <div className="education-pillar-card">
            <span className="eyebrow">PILLAR MODULES</span>
            <h3>{activePillar.title}</h3>
            <p>{activePillar.summary}</p>
            <div>
              {activePillar.modules.map((moduleName) => (
                <span key={moduleName}>{moduleName}</span>
              ))}
            </div>
          </div>
        </aside>

        {selectedModule ? (
          <article className="education-lesson">
            <div className="education-lesson__hero">
              <div>
                <p className="eyebrow">{selectedModule.eyebrow}</p>
                <h2>{selectedModule.title}</h2>
                <p>{selectedModule.intro}</p>
                <div className="education-lesson__meta">
                  <span><Clock3 size={14} /> {selectedModule.duration}</span>
                  <span><ListChecks size={14} /> {selectedModule.formatLabel}</span>
                </div>
              </div>
              <div className="education-video-card">
                <PlayCircle size={34} />
                <strong>{selectedModule.videoTitle}</strong>
                <span>Embedded advisor video placeholder</span>
              </div>
            </div>

            <LessonAnswerCards module={selectedModule} />

            <section className="education-walkthrough" aria-labelledby="education-walkthrough-title">
              <div className="education-section-heading">
                <span className="eyebrow">WALKTHROUGH</span>
                <h3 id="education-walkthrough-title">{selectedModule.walkthroughTitle}</h3>
              </div>
              <div className="education-stepper">
                {selectedModule.walkthrough.map((step, index) => (
                  <button
                    type="button"
                    className={index === Math.min(activeStepIndex, selectedModule.walkthrough.length - 1) ? 'is-active' : ''}
                    key={step.title}
                    onClick={() => setActiveStepIndex(index)}
                  >
                    <span>{index + 1}</span>
                    {step.title}
                  </button>
                ))}
              </div>
              <article className="education-step-detail">
                <span><ArrowRight size={18} /></span>
                <div>
                  <strong>{selectedStep.title}</strong>
                  <p>{selectedStep.detail}</p>
                </div>
              </article>
            </section>

            <ModuleInteraction
              module={selectedModule}
              activeTitleHotspot={activeTitleHotspot}
              onTitleHotspotChange={setActiveTitleHotspot}
              costPerspective={costPerspective}
              onCostPerspectiveChange={setCostPerspective}
              taxMilestoneIndex={taxMilestoneIndex}
              onTaxMilestoneChange={setTaxMilestoneIndex}
            />

            <section className="education-detail-grid">
              <div className="education-checklist-panel">
                <div className="education-section-heading">
                  <span className="eyebrow">CHECKLIST</span>
                  <h3>{selectedModule.checklistTitle}</h3>
                </div>
                <div className="education-checklist">
                  {selectedModule.checklist.map((item, index) => {
                    const key = `${selectedModule.id}-${index}`
                    const checked = Boolean(completedItems[key])

                    return (
                      <button
                        type="button"
                        className={checked ? 'is-checked' : ''}
                        key={item}
                        onClick={() => toggleChecklistItem(selectedModule, index)}
                      >
                        <span>{checked ? <CheckCircle2 size={16} /> : <HelpCircle size={16} />}</span>
                        {item}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="education-reference-panel">
                <div className="education-section-heading">
                  <span className="eyebrow">REFERENCE CARDS</span>
                  <h3>{selectedModule.cardsTitle}</h3>
                </div>
                <div className="education-reference-cards">
                  {selectedModule.cards.map((card) => (
                    <article key={card.label}>
                      <strong>{card.label}</strong>
                      <p>{card.body}</p>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            {selectedModule.id !== 'loan-process-roadmap' && selectedModule.ctas && (
              <section className="education-cta-grid" aria-label="Related calculators">
                {selectedModule.ctas.map((cta) => (
                  <a className="education-cta-card" href={cta.href} key={cta.href}>
                    <Landmark size={17} />
                    <span>
                      <strong>{cta.label}</strong>
                      <small>{cta.description}</small>
                    </span>
                    <ArrowRight size={15} />
                  </a>
                ))}
              </section>
            )}
          </article>
        ) : (
          <PlannedPillarPanel pillar={activePillar} />
        )}
      </section>
    </main>
  )
}
