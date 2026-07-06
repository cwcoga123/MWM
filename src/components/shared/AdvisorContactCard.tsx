import { useEffect, useRef } from 'react'
import { CalendarClock, Mail, MessageCircle, Phone, X } from 'lucide-react'
import { advisorContact } from '../../data/advisor'

interface AdvisorContactCardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Persistent "Talk to your advisor" floating action button. Rendered once at
 * the app-shell level so it stays fixed in the bottom-right corner across
 * every tab (Overview, Calculators, etc.), not just one page. Open state is
 * controlled by the parent so other UI (e.g. a Market Pulse card) can open it
 * directly too.
 */
export function AdvisorContactCard({ open, onOpenChange }: AdvisorContactCardProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onOpenChange(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onOpenChange(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open, onOpenChange])

  return (
    <div className="advisor-fab-container" ref={containerRef}>
      {open && (
        <div className="advisor-card" role="dialog" aria-label="Contact your advisor">
          <button
            type="button"
            className="advisor-card__close"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
          >
            <X size={16} />
          </button>

          <div className="advisor-card__header">
            <span className="advisor-card__avatar">{advisorContact.photoInitials}</span>
            <div>
              <strong>{advisorContact.name}</strong>
              <small>{advisorContact.title}</small>
            </div>
          </div>

          <div className="advisor-card__rows">
            <a className="advisor-card__row" href={`tel:${advisorContact.phone.replace(/[^0-9+]/g, '')}`}>
              <Phone size={16} />
              <span>{advisorContact.phone}</span>
            </a>
            <a className="advisor-card__row" href={`mailto:${advisorContact.email}`}>
              <Mail size={16} />
              <span>{advisorContact.email}</span>
            </a>
            {advisorContact.scheduleUrl && (
              <a className="advisor-card__row" href={advisorContact.scheduleUrl}>
                <CalendarClock size={16} />
                <span>Schedule a call</span>
              </a>
            )}
          </div>

          <p className="advisor-card__license">{advisorContact.license}</p>
        </div>
      )}

      <button
        type="button"
        className="advisor-fab"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        aria-label="Talk to your advisor"
      >
        <MessageCircle size={20} />
        <span>Talk to your advisor</span>
      </button>
    </div>
  )
}
