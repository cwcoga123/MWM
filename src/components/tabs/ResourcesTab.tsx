import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BellRing,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  DollarSign,
  ExternalLink,
  FileText,
  Mail,
  Percent,
  RotateCcw,
  ShieldCheck,
  TrendingDown,
  Upload,
  X,
} from 'lucide-react'
import { advisorContact } from '../../data/advisor'
import { calculateProductRate, formatRate, rateProducts } from '../../lib/mortgageRates'
import { calculateRefinanceBreakEven } from '../../lib/refinanceBreakEven'
import { supabase } from '../../lib/supabase'
import { EducationCenter } from '../resources/EducationCenter'
import type { HubUser } from '../shell/AuthGate'

type ChecklistItem = {
  id: string
  category: string
  title: string
  detail: string
  required: boolean
}

type UploadedDocument = {
  name: string
  size: number
  type: string
  url: string
}

type ActiveResource = 'education-center' | 'preapproval' | 'refi-watch' | null

type RefiWatchProfile = {
  currentLoanBalance: number
  currentInterestRate: number
  currentRemainingTermYears: number
  refinanceClosingCosts: number
  targetBreakEvenMonths: number
  creditScore: number
  targetLoanTermYears: number
}

interface ResourcesTabProps {
  user: HubUser
}

const checklistItems: ChecklistItem[] = [
  {
    id: 'photo-id',
    category: 'Identity',
    title: 'Government photo ID',
    detail: 'Driver license, passport, or state ID for each borrower.',
    required: true,
  },
  {
    id: 'authorization',
    category: 'Identity',
    title: 'Credit authorization and intake',
    detail: 'Signed authorization plus current contact and residence details.',
    required: true,
  },
  {
    id: 'pay-stubs',
    category: 'Income',
    title: 'Recent pay stubs',
    detail: 'Most recent 30 days for each salaried or hourly borrower.',
    required: true,
  },
  {
    id: 'w2-1099',
    category: 'Income',
    title: 'W-2 or 1099 history',
    detail: 'Last two years from every employer or contract source.',
    required: true,
  },
  {
    id: 'tax-returns',
    category: 'Income',
    title: 'Tax returns',
    detail: 'Last two years if self-employed, commissioned, or using rental income.',
    required: false,
  },
  {
    id: 'bank-statements',
    category: 'Assets',
    title: 'Bank statements',
    detail: 'Last two months for checking, savings, and money market accounts.',
    required: true,
  },
  {
    id: 'investment-statements',
    category: 'Assets',
    title: 'Investment or retirement statements',
    detail: 'Latest statement for funds used toward down payment or reserves.',
    required: false,
  },
  {
    id: 'gift-docs',
    category: 'Assets',
    title: 'Gift funds paperwork',
    detail: 'Gift letter and donor statement when gift funds are part of the plan.',
    required: false,
  },
  {
    id: 'debt-statements',
    category: 'Debts and property',
    title: 'Debt statements',
    detail: 'Student loan, auto, personal loan, or other monthly obligation details.',
    required: false,
  },
  {
    id: 'owned-property',
    category: 'Debts and property',
    title: 'Real estate owned',
    detail: 'Mortgage, tax, insurance, HOA, and lease details for retained property.',
    required: false,
  },
]

const categories = Array.from(new Set(checklistItems.map((item) => item.category)))
const REFI_WATCH_STORAGE_KEY = 'mwm-refi-watch-profile'

const defaultRefiWatchProfile: RefiWatchProfile = {
  currentLoanBalance: 420_000,
  currentInterestRate: 7.25,
  currentRemainingTermYears: 27,
  refinanceClosingCosts: 7_500,
  targetBreakEvenMonths: 24,
  creditScore: 780,
  targetLoanTermYears: 30,
}

const preciseCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function safeNumber(value: number, fallback = 0) {
  return Number.isFinite(value) ? Math.max(0, value) : fallback
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function formatFileSummary(files: UploadedDocument[]) {
  if (files.length === 1) return `${files[0].name} (${formatFileSize(files[0].size)})`
  return `${files.length} files selected`
}

function revokeUploadUrls(files: UploadedDocument[] | undefined) {
  files?.forEach((file) => URL.revokeObjectURL(file.url))
}

function readStoredRefiWatchProfile(): RefiWatchProfile {
  try {
    const storedProfile = window.localStorage.getItem(REFI_WATCH_STORAGE_KEY)
    if (!storedProfile) return defaultRefiWatchProfile

    const parsed = JSON.parse(storedProfile) as Partial<RefiWatchProfile>
    return {
      currentLoanBalance: safeNumber(parsed.currentLoanBalance ?? defaultRefiWatchProfile.currentLoanBalance),
      currentInterestRate: safeNumber(parsed.currentInterestRate ?? defaultRefiWatchProfile.currentInterestRate),
      currentRemainingTermYears: Math.max(1, safeNumber(parsed.currentRemainingTermYears ?? defaultRefiWatchProfile.currentRemainingTermYears)),
      refinanceClosingCosts: safeNumber(parsed.refinanceClosingCosts ?? defaultRefiWatchProfile.refinanceClosingCosts),
      targetBreakEvenMonths: Math.max(1, safeNumber(parsed.targetBreakEvenMonths ?? defaultRefiWatchProfile.targetBreakEvenMonths)),
      creditScore: Math.min(850, Math.max(300, safeNumber(parsed.creditScore ?? defaultRefiWatchProfile.creditScore))),
      targetLoanTermYears: Math.max(1, safeNumber(parsed.targetLoanTermYears ?? defaultRefiWatchProfile.targetLoanTermYears)),
    }
  } catch {
    return defaultRefiWatchProfile
  }
}

function loanTermForProduct(productId: string) {
  if (productId.includes('fixed-10')) return 10
  if (productId.includes('fixed-15')) return 15
  if (productId.includes('fixed-20')) return 20
  return 30
}

function formatBreakEven(months: number | null) {
  if (months === null) return 'No break-even'
  if (months <= 0) return 'Immediate'
  if (months < 12) return `${Math.ceil(months)} mo.`
  return `${Math.ceil(months)} mo. (${(months / 12).toFixed(1)} yr.)`
}

function calculateWatchTargetRate(profile: RefiWatchProfile) {
  const qualifiesAtRate = (rate: number) => {
    const result = calculateRefinanceBreakEven({
      currentLoanBalance: profile.currentLoanBalance,
      currentInterestRate: profile.currentInterestRate,
      currentRemainingTermYears: profile.currentRemainingTermYears,
      newInterestRate: rate,
      newLoanTermYears: profile.targetLoanTermYears,
      refinanceClosingCosts: profile.refinanceClosingCosts,
      cashOutAmount: 0,
    })

    return result.monthlySavings > 0 && result.breakEvenMonths !== null && result.breakEvenMonths <= profile.targetBreakEvenMonths
  }

  if (!qualifiesAtRate(0)) return null

  let low = 0
  let high = Math.max(0.01, profile.currentInterestRate)

  for (let index = 0; index < 42; index += 1) {
    const mid = (low + high) / 2
    if (qualifiesAtRate(mid)) {
      low = mid
    } else {
      high = mid
    }
  }

  return low
}

export function ResourcesTab({ user }: ResourcesTabProps) {
  const [activeResource, setActiveResource] = useState<ActiveResource>(null)
  const [uploads, setUploads] = useState<Record<string, UploadedDocument[]>>({})
  const [reviewMessage, setReviewMessage] = useState('')
  const [reviewSending, setReviewSending] = useState(false)
  const [refiWatchProfile, setRefiWatchProfile] = useState<RefiWatchProfile>(readStoredRefiWatchProfile)
  const uploadsRef = useRef<Record<string, UploadedDocument[]>>({})

  useEffect(() => {
    return () => {
      Object.values(uploadsRef.current).forEach(revokeUploadUrls)
    }
  }, [])

  const requiredItems = useMemo(() => checklistItems.filter((item) => item.required), [])
  const uploadedRequiredCount = requiredItems.filter((item) => uploads[item.id]?.length).length
  const uploadedCount = checklistItems.filter((item) => uploads[item.id]?.length).length
  const missingRequiredCount = requiredItems.length - uploadedRequiredCount
  const progressPercent = Math.round((uploadedRequiredCount / requiredItems.length) * 100)
  const refiWatchTargetRate = useMemo(() => calculateWatchTargetRate(refiWatchProfile), [refiWatchProfile])
  const refiWatchProducts = useMemo(
    () =>
      rateProducts.map((product) => {
        const rate = calculateProductRate(product, refiWatchProfile.creditScore)
        const termYears = loanTermForProduct(product.id)
        const result = calculateRefinanceBreakEven({
          currentLoanBalance: refiWatchProfile.currentLoanBalance,
          currentInterestRate: refiWatchProfile.currentInterestRate,
          currentRemainingTermYears: refiWatchProfile.currentRemainingTermYears,
          newInterestRate: rate,
          newLoanTermYears: termYears,
          refinanceClosingCosts: refiWatchProfile.refinanceClosingCosts,
          cashOutAmount: 0,
        })

        return {
          product,
          rate,
          termYears,
          result,
          triggersWatch:
            result.monthlySavings > 0 &&
            result.breakEvenMonths !== null &&
            result.breakEvenMonths <= refiWatchProfile.targetBreakEvenMonths,
        }
      }),
    [refiWatchProfile],
  )
  const bestRefiWatchProduct = useMemo(
    () =>
      [...refiWatchProducts].sort((a, b) => {
        if (a.triggersWatch !== b.triggersWatch) return a.triggersWatch ? -1 : 1
        const aBreakEven = a.result.breakEvenMonths ?? Number.POSITIVE_INFINITY
        const bBreakEven = b.result.breakEvenMonths ?? Number.POSITIVE_INFINITY
        if (aBreakEven !== bBreakEven) return aBreakEven - bBreakEven
        return b.result.monthlySavings - a.result.monthlySavings
      })[0],
    [refiWatchProducts],
  )
  const refiWatchTriggered = Boolean(bestRefiWatchProduct?.triggersWatch)

  useEffect(() => {
    try {
      window.localStorage.setItem(REFI_WATCH_STORAGE_KEY, JSON.stringify(refiWatchProfile))
    } catch {
      // Local persistence is a convenience only; calculations continue without it.
    }
  }, [refiWatchProfile])

  function handleUpload(itemId: string, files: FileList | null) {
    const selectedFiles = Array.from(files ?? []).map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file),
    }))

    if (!selectedFiles.length) return

    const previousFiles = uploadsRef.current[itemId]
    const nextUploads = {
      ...uploadsRef.current,
      [itemId]: selectedFiles,
    }

    uploadsRef.current = nextUploads
    setUploads(nextUploads)
    revokeUploadUrls(previousFiles)
    setReviewMessage('')
  }

  function clearUpload(itemId: string) {
    const previousFiles = uploadsRef.current[itemId]
    const nextUploads = { ...uploadsRef.current }
    delete nextUploads[itemId]

    uploadsRef.current = nextUploads
    setUploads(nextUploads)
    revokeUploadUrls(previousFiles)
    setReviewMessage('')
  }

  function buildReviewEmailBody() {
    const uploadedRows = checklistItems
      .filter((item) => uploads[item.id]?.length)
      .map((item) => {
        const fileNames = uploads[item.id].map((file) => file.name).join(', ')
        return `- ${item.title}: ${fileNames}`
      })

    const missingRows = requiredItems
      .filter((item) => !uploads[item.id]?.length)
      .map((item) => `- ${item.title}`)

    return [
      `Hi ${advisorContact.name},`,
      '',
      'The client is ready to review their pre-approval readiness checklist.',
      '',
      `Client: ${user.name}`,
      `Email: ${user.email}`,
      `Required documents uploaded: ${uploadedRequiredCount}/${requiredItems.length}`,
      `Total document groups uploaded: ${uploadedCount}/${checklistItems.length}`,
      '',
      'Uploaded documents:',
      uploadedRows.length ? uploadedRows.join('\r\n') : '- None yet',
      '',
      'Missing required documents:',
      missingRows.length ? missingRows.join('\r\n') : '- None',
      '',
      'Sent from the MWM Client Hub',
    ].join('\r\n')
  }

  function buildReviewPayload() {
    return {
      advisorName: advisorContact.name,
      clientName: user.name,
      clientEmail: user.email,
      requiredUploaded: uploadedRequiredCount,
      requiredTotal: requiredItems.length,
      totalUploaded: uploadedCount,
      totalItems: checklistItems.length,
      documents: checklistItems.map((item) => ({
        title: item.title,
        required: item.required,
        files: (uploads[item.id] ?? []).map((file) => ({
          name: file.name,
          size: file.size,
          type: file.type,
        })),
      })),
    }
  }

  function openReviewEmailDraft() {
    const subject = `MWM Client Hub - ${user.name} is ready for pre-approval review`
    const mailtoUrl = `mailto:${advisorContact.shareEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(buildReviewEmailBody())}`

    window.location.href = mailtoUrl
  }

  async function requestAdvisorReview() {
    if (missingRequiredCount > 0) {
      setReviewMessage('Upload every required document before requesting review.')
      return
    }

    setReviewSending(true)
    setReviewMessage('')

    try {
      if (!supabase) throw new Error('Supabase is not configured.')

      const { error } = await supabase.functions.invoke('send-review-request', {
        body: buildReviewPayload(),
      })

      if (error) throw error

      setReviewMessage(`Review request sent to ${advisorContact.name}.`)
    } catch {
      openReviewEmailDraft()
      setReviewMessage(`Direct notification is not configured, so an email draft opened for ${advisorContact.shareEmail}.`)
    } finally {
      setReviewSending(false)
    }
  }

  function updateRefiWatchProfile(patch: Partial<RefiWatchProfile>) {
    setRefiWatchProfile((current) => ({
      ...current,
      ...patch,
    }))
  }

  if (!activeResource) {
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
              <span className="eyebrow">EDUCATION CENTER</span>
              <strong>Transaction roadmap lessons</strong>
              <small>Guided California-focused modules with timelines, short video placeholders, checklists, and advisor prompts.</small>
            </span>
            <span className="resource-option__meta">
              8 V1 modules <ArrowRight size={18} />
            </span>
          </button>
          <button
            type="button"
            className="resource-option"
            onClick={() => setActiveResource('preapproval')}
          >
            <span className="resource-option__icon"><ClipboardCheck size={22} /></span>
            <span className="resource-option__copy">
              <span className="eyebrow">PRE-APPROVAL</span>
              <strong>Pre-approval readiness checklist</strong>
              <small>Document checklist with upload status, file viewing, and advisor review request.</small>
            </span>
            <span className="resource-option__meta">
              {uploadedRequiredCount}/{requiredItems.length} required <ArrowRight size={18} />
            </span>
          </button>
          <button
            type="button"
            className="resource-option"
            onClick={() => setActiveResource('refi-watch')}
          >
            <span className="resource-option__icon resource-option__icon--blue"><BellRing size={22} /></span>
            <span className="resource-option__copy">
              <span className="eyebrow">RATE WATCH</span>
              <strong>Refi Watch</strong>
              <small>Enter your current loan once; the hub flags when posted rates make a refinance break even.</small>
            </span>
            <span className={`resource-option__meta ${refiWatchTriggered ? 'is-triggered' : ''}`}>
              {refiWatchTriggered ? 'Review now' : 'Watching'} <ArrowRight size={18} />
            </span>
          </button>
        </section>
      </main>
    )
  }

  if (activeResource === 'education-center') {
    return <EducationCenter onBack={() => setActiveResource(null)} />
  }

  if (activeResource === 'refi-watch') {
    return (
      <main className="mortgage-page resources-page" id="resources">
        <div className="resource-breadcrumb">
          <button type="button" onClick={() => setActiveResource(null)}>
            <ArrowLeft size={16} /> Resources
          </button>
        </div>

        <header className="mortgage-heading">
          <div className="mortgage-heading__icon"><BellRing size={24} /></div>
          <div>
            <p className="eyebrow">RATE WATCH</p>
            <h1>Refi Watch</h1>
            <p>Save your current loan once and check whether posted rates have reached your break-even target.</p>
          </div>
        </header>

        <section className="refi-watch-layout" aria-labelledby="refi-watch-title">
          <div className="refi-watch-panel">
            <div className="readiness-panel__heading">
              <div>
                <p className="eyebrow">CURRENT LOAN</p>
                <h2 id="refi-watch-title">Loan profile</h2>
                <p>These inputs are saved in this browser so clients can return without re-entering the loan.</p>
              </div>
              <button
                type="button"
                className="resource-secondary-button"
                onClick={() => setRefiWatchProfile(defaultRefiWatchProfile)}
              >
                <RotateCcw size={15} /> Reset
              </button>
            </div>

            <div className="resource-form-grid">
              <label className="resource-field" htmlFor="refi-balance">
                <span>Current loan balance</span>
                <span className="resource-input">
                  <DollarSign size={15} />
                  <input
                    id="refi-balance"
                    type="number"
                    min="0"
                    step="1000"
                    value={refiWatchProfile.currentLoanBalance}
                    onChange={(event) => updateRefiWatchProfile({ currentLoanBalance: safeNumber(event.target.valueAsNumber) })}
                  />
                </span>
              </label>

              <label className="resource-field" htmlFor="refi-current-rate">
                <span>Current interest rate</span>
                <span className="resource-input">
                  <Percent size={15} />
                  <input
                    id="refi-current-rate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={refiWatchProfile.currentInterestRate}
                    onChange={(event) => updateRefiWatchProfile({ currentInterestRate: safeNumber(event.target.valueAsNumber) })}
                  />
                </span>
              </label>

              <label className="resource-field" htmlFor="refi-remaining-term">
                <span>Remaining term</span>
                <span className="resource-input">
                  <input
                    id="refi-remaining-term"
                    type="number"
                    min="1"
                    step="1"
                    value={refiWatchProfile.currentRemainingTermYears}
                    onChange={(event) => updateRefiWatchProfile({ currentRemainingTermYears: Math.max(1, safeNumber(event.target.valueAsNumber)) })}
                  />
                  <small>years</small>
                </span>
              </label>

              <label className="resource-field" htmlFor="refi-closing-costs">
                <span>Estimated closing costs</span>
                <span className="resource-input">
                  <DollarSign size={15} />
                  <input
                    id="refi-closing-costs"
                    type="number"
                    min="0"
                    step="500"
                    value={refiWatchProfile.refinanceClosingCosts}
                    onChange={(event) => updateRefiWatchProfile({ refinanceClosingCosts: safeNumber(event.target.valueAsNumber) })}
                  />
                </span>
              </label>

              <label className="resource-field" htmlFor="refi-target-window">
                <span>Break-even target</span>
                <span className="resource-input">
                  <input
                    id="refi-target-window"
                    type="number"
                    min="1"
                    step="1"
                    value={refiWatchProfile.targetBreakEvenMonths}
                    onChange={(event) => updateRefiWatchProfile({ targetBreakEvenMonths: Math.max(1, safeNumber(event.target.valueAsNumber)) })}
                  />
                  <small>months</small>
                </span>
              </label>

              <label className="resource-field" htmlFor="refi-credit-score">
                <span>Credit score</span>
                <span className="resource-input">
                  <input
                    id="refi-credit-score"
                    type="number"
                    min="300"
                    max="850"
                    step="1"
                    value={refiWatchProfile.creditScore}
                    onChange={(event) => updateRefiWatchProfile({ creditScore: Math.min(850, Math.max(300, safeNumber(event.target.valueAsNumber))) })}
                  />
                </span>
              </label>

              <label className="resource-field" htmlFor="refi-target-term">
                <span>Target loan term</span>
                <span className="resource-input">
                  <select
                    id="refi-target-term"
                    value={refiWatchProfile.targetLoanTermYears}
                    onChange={(event) => updateRefiWatchProfile({ targetLoanTermYears: Number(event.target.value) })}
                  >
                    <option value={30}>30 years</option>
                    <option value={20}>20 years</option>
                    <option value={15}>15 years</option>
                    <option value={10}>10 years</option>
                  </select>
                </span>
              </label>
            </div>

            <div className="refi-watch-table-wrap">
              <table className="refi-watch-table">
                <thead>
                  <tr>
                    <th>Posted option</th>
                    <th>Rate</th>
                    <th>Term</th>
                    <th>Monthly savings</th>
                    <th>Break-even</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {refiWatchProducts.map((item) => (
                    <tr key={item.product.id} className={item.triggersWatch ? 'is-triggered' : ''}>
                      <td>{item.product.label}</td>
                      <td>{formatRate(item.rate)}</td>
                      <td>{item.termYears} yr.</td>
                      <td className={item.result.monthlySavings > 0 ? '' : 'is-negative'}>
                        {preciseCurrency.format(item.result.monthlySavings)}
                      </td>
                      <td>{formatBreakEven(item.result.breakEvenMonths)}</td>
                      <td>
                        <span className={`refi-watch-status ${item.triggersWatch ? 'is-triggered' : ''}`}>
                          {item.triggersWatch ? 'Triggers' : 'Watch'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="readiness-summary refi-watch-summary" aria-label="Refi Watch status">
            <div className={`readiness-summary__icon ${refiWatchTriggered ? 'is-ready' : ''}`}>
              {refiWatchTriggered ? <TrendingDown size={23} /> : <BellRing size={23} />}
            </div>
            <p className="eyebrow">WATCH STATUS</p>
            <h2>{refiWatchTriggered ? 'Refi review triggered' : 'Keep watching'}</h2>
            <p>
              {refiWatchTriggered && bestRefiWatchProduct
                ? `${bestRefiWatchProduct.product.label} is showing ${formatRate(bestRefiWatchProduct.rate)}, with an estimated ${formatBreakEven(bestRefiWatchProduct.result.breakEvenMonths)} break-even.`
                : refiWatchTargetRate === null
                  ? 'The current target is not reachable with the saved loan profile. Review costs, term, or break-even window.'
                  : `Rates need to reach about ${formatRate(refiWatchTargetRate)} or lower on the target term to hit the ${refiWatchProfile.targetBreakEvenMonths}-month break-even window.`}
            </p>

            <dl className="readiness-stats">
              <div>
                <dt>Best posted rate</dt>
                <dd>{bestRefiWatchProduct ? formatRate(bestRefiWatchProduct.rate) : '-'}</dd>
              </div>
              <div>
                <dt>Best break-even</dt>
                <dd>{bestRefiWatchProduct ? formatBreakEven(bestRefiWatchProduct.result.breakEvenMonths) : '-'}</dd>
              </div>
              <div>
                <dt>Target watch rate</dt>
                <dd>{refiWatchTargetRate === null ? '-' : formatRate(refiWatchTargetRate)}</dd>
              </div>
            </dl>

            <div className="readiness-note">
              <FileText size={17} />
              <span>Refi Watch compares against the hub's posted rate sheet. Final pricing depends on lender quote, points, fees, and underwriting.</span>
            </div>
          </aside>
        </section>
      </main>
    )
  }

  return (
    <main className="mortgage-page resources-page" id="resources">
      <div className="resource-breadcrumb">
        <button type="button" onClick={() => setActiveResource(null)}>
          <ArrowLeft size={16} /> Resources
        </button>
      </div>

      <header className="mortgage-heading">
        <div className="mortgage-heading__icon"><ClipboardCheck size={24} /></div>
        <div>
          <p className="eyebrow">CLIENT RESOURCES</p>
          <h1>Resources</h1>
          <p>Pre-approval documents, status, and review readiness in one place.</p>
        </div>
      </header>

      <section className="resources-layout" aria-labelledby="preapproval-checklist-title">
        <div className="readiness-panel">
          <div className="readiness-panel__heading">
            <div>
              <p className="eyebrow">PRE-APPROVAL</p>
              <h2 id="preapproval-checklist-title">Pre-approval readiness checklist</h2>
              <p>Every required document has a visible upload status so follow-up stays focused on missing items.</p>
            </div>
            <div className="readiness-score" aria-label={`${progressPercent}% of required documents uploaded`}>
              <strong>{progressPercent}%</strong>
              <span>Required uploaded</span>
            </div>
          </div>

          <div className="readiness-progress" aria-hidden="true">
            <span style={{ width: `${progressPercent}%` }} />
          </div>

          <div className="readiness-groups">
            {categories.map((category) => {
              const items = checklistItems.filter((item) => item.category === category)

              return (
                <section className="readiness-group" key={category}>
                  <h3>{category}</h3>
                  <div className="readiness-list">
                    {items.map((item) => {
                      const itemUploads = uploads[item.id] ?? []
                      const isUploaded = itemUploads.length > 0
                      const inputId = `upload-${item.id}`

                      return (
                        <article className="readiness-item" key={item.id}>
                          <span className={`readiness-item__icon ${isUploaded ? 'is-complete' : ''}`}>
                            {isUploaded ? <CheckCircle2 size={18} /> : <Clock3 size={18} />}
                          </span>
                          <div className="readiness-item__copy">
                            <div>
                              <strong>{item.title}</strong>
                              <span className={`requirement-pill ${item.required ? 'is-required' : ''}`}>
                                {item.required ? 'Required' : 'If applicable'}
                              </span>
                            </div>
                            <p>{item.detail}</p>
                            {isUploaded && (
                              <div className="readiness-file-list">
                                <small>{formatFileSummary(itemUploads)}</small>
                                {itemUploads.map((file) => (
                                  <a
                                    className="readiness-file-link"
                                    href={file.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    key={`${item.id}-${file.name}-${file.size}`}
                                  >
                                    <ExternalLink size={13} /> View {file.name}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="readiness-item__actions">
                            <span className={`upload-status ${isUploaded ? 'is-uploaded' : ''}`}>
                              {isUploaded ? 'Uploaded' : item.required ? 'Needed' : 'Optional'}
                            </span>
                            <label className="upload-button" htmlFor={inputId}>
                              <Upload size={15} /> {isUploaded ? 'Replace' : 'Upload'}
                            </label>
                            <input
                              id={inputId}
                              className="readiness-file-input"
                              type="file"
                              multiple
                              accept=".pdf,.jpg,.jpeg,.png,.heic,.doc,.docx,.xls,.xlsx"
                              aria-label={`Upload ${item.title}`}
                              onChange={(event) => {
                                handleUpload(item.id, event.currentTarget.files)
                                event.currentTarget.value = ''
                              }}
                            />
                            {isUploaded && (
                              <button
                                type="button"
                                className="resource-icon-button"
                                onClick={() => clearUpload(item.id)}
                                aria-label={`Clear ${item.title}`}
                              >
                                <X size={15} />
                              </button>
                            )}
                          </div>
                        </article>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
        </div>

        <aside className="readiness-summary" aria-label="Pre-approval checklist summary">
          <div className="readiness-summary__icon"><ShieldCheck size={23} /></div>
          <p className="eyebrow">READINESS</p>
          <h2>{missingRequiredCount === 0 ? 'Ready for review' : `${missingRequiredCount} required item${missingRequiredCount === 1 ? '' : 's'} left`}</h2>
          <p>
            {missingRequiredCount === 0
              ? 'The required set is complete and ready for advisor review.'
              : 'Upload the remaining required documents before the pre-approval review.'}
          </p>
          <button
            type="button"
            className="review-advisor-button"
            onClick={requestAdvisorReview}
            disabled={missingRequiredCount > 0 || reviewSending}
          >
            <Mail size={16} /> {reviewSending ? 'Sending review request...' : 'Review with your advisor'}
          </button>
          {reviewMessage && <p className="review-advisor-message">{reviewMessage}</p>}
          <dl className="readiness-stats">
            <div>
              <dt>Required uploaded</dt>
              <dd>{uploadedRequiredCount}/{requiredItems.length}</dd>
            </div>
            <div>
              <dt>Total uploads</dt>
              <dd>{uploadedCount}/{checklistItems.length}</dd>
            </div>
          </dl>
          <div className="readiness-note">
            <FileText size={17} />
            <span>File selections are tracked in this browser session until secure document storage is connected.</span>
          </div>
        </aside>
      </section>
    </main>
  )
}
