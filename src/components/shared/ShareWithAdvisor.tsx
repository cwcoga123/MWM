import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Mail, Send, Share2 } from 'lucide-react'
import { advisorContact } from '../../data/advisor'
import { sendAdvisorEmail } from '../../lib/advisorEmail'
import {
  buildShareMailtoUrl,
  buildShareSubject,
  buildShareSummary,
  type ShareSection,
} from '../../lib/share'

interface ShareWithAdvisorProps {
  /** Tool name shown in the email subject and intro, e.g. "Mortgage calculator". */
  tool: string
  /** Snapshot of the tool's current inputs and results, taken on click. */
  getSections: () => ShareSection[]
}

type SendStatus = 'idle' | 'sending' | 'sent' | 'fallback'

/**
 * Reusable "Share with your advisor" action. Drop it in any tool's action bar
 * (e.g. inside `.mortgage-actions`): it renders a Share button that opens a
 * small popover. "Send email" delivers the summary directly through the
 * send-advisor-email edge function; if sending isn't configured it falls back
 * to opening a prefilled email draft. Draft and copy remain available too.
 */
export function ShareWithAdvisor({ tool, getSections }: ShareWithAdvisorProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [status, setStatus] = useState<SendStatus>('idle')
  const containerRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return

    function close() {
      setOpen(false)
      setStatus('idle')
      setCopied(false)
    }

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        close()
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') close()
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [copied])

  async function sendEmail() {
    if (status === 'sending') return

    setStatus('sending')
    const sections = getSections()
    const sent = await sendAdvisorEmail({
      subject: buildShareSubject(tool),
      message: buildShareSummary(tool, sections),
    })

    if (sent) {
      setStatus('sent')
      return
    }

    // Direct sending isn't configured or failed — open a prefilled draft so
    // the client can still reach the advisor.
    window.location.href = buildShareMailtoUrl(tool, sections)
    setStatus('fallback')
  }

  function closePopover() {
    setOpen(false)
    setStatus('idle')
    setCopied(false)
  }

  function openEmailDraft() {
    window.location.href = buildShareMailtoUrl(tool, getSections())
    closePopover()
  }

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(buildShareSummary(tool, getSections()))
      setCopied(true)
    } catch {
      // Clipboard unavailable (e.g. insecure context) — leave the popover open
      // so the email options remain available.
    }
  }

  return (
    <span className="share-advisor" ref={containerRef}>
      <button
        type="button"
        onClick={() => (open ? closePopover() : setOpen(true))}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Share with your advisor"
      >
        <Share2 size={15} /> Share
      </button>

      {open && (
        <div className="share-advisor__popover" role="dialog" aria-label="Share with your advisor">
          <strong>Share with your advisor</strong>
          <small>
            Emails your current numbers to {advisorContact.name} at{' '}
            {advisorContact.shareEmail}.
          </small>
          <button
            type="button"
            className="share-advisor__action share-advisor__action--primary"
            onClick={sendEmail}
            disabled={status === 'sending'}
          >
            {status === 'sent' ? <Check size={15} /> : <Send size={15} />}
            {status === 'sending' ? 'Sending…' : status === 'sent' ? 'Sent' : 'Send email'}
          </button>
          <button type="button" className="share-advisor__action" onClick={openEmailDraft}>
            <Mail size={15} /> Open email draft
          </button>
          <button type="button" className="share-advisor__action" onClick={copySummary}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? 'Copied' : 'Copy summary'}
          </button>
          {status === 'sent' && (
            <p className="share-advisor__status" role="status">
              Sent to {advisorContact.name}.
            </p>
          )}
          {status === 'fallback' && (
            <p className="share-advisor__status" role="status">
              Direct sending isn&apos;t configured yet, so an email draft opened instead.
            </p>
          )}
        </div>
      )}
    </span>
  )
}
