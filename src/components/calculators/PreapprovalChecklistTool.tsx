import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  ExternalLink,
  FileText,
  Mail,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react'
import { advisorContact } from '../../data/advisor'
import { supabase } from '../../lib/supabase'
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

interface PreapprovalChecklistToolProps {
  user: HubUser
  onBack: () => void
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

/**
 * Pre-approval readiness checklist — moved here from the Resources tab so it
 * lives alongside the other financial tools under Calculators. Kept as its
 * own visually distinct section (see .calculator-special-section in
 * styles.css) rather than being blended into the regular calculator
 * categories.
 */
export function PreapprovalChecklistTool({ user, onBack }: PreapprovalChecklistToolProps) {
  const [uploads, setUploads] = useState<Record<string, UploadedDocument[]>>({})
  const [reviewMessage, setReviewMessage] = useState('')
  const [reviewSending, setReviewSending] = useState(false)
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

  return (
    <main className="mortgage-page resources-page" id="preapproval">
      <div className="resource-breadcrumb">
        <button type="button" onClick={onBack}>
          <ArrowLeft size={16} /> Calculators
        </button>
      </div>

      <header className="mortgage-heading">
        <div className="mortgage-heading__icon"><ClipboardCheck size={24} /></div>
        <div>
          <p className="eyebrow">PRE-APPROVAL</p>
          <h1>Pre-approval readiness checklist</h1>
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
