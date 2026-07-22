import { ArrowRight, Bell, CalendarDays, MessageCircle, Percent, X } from 'lucide-react'
import type { HubUser } from './AuthGate'

interface NotificationsPanelProps {
  user: HubUser
  open: boolean
  onClose: () => void
  onOpenSettings: () => void
}

function daysUntil(value: string) {
  const today = new Date()
  const target = new Date(`${value}T00:00:00`)
  return Math.max(0, Math.round((target.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86_400_000))
}

export function NotificationsPanel({ user, open, onClose, onOpenSettings }: NotificationsPanelProps) {
  if (!open) return null

  const notifications = [
    user.preferences.notifications.advisorMessages && user.advisorNote
      ? { icon: MessageCircle, title: 'A note from your advisor', body: user.advisorNote, meta: 'Review it on your Overview.' }
      : null,
    user.preferences.notifications.rateAlerts && user.refiThreshold !== null
      ? { icon: Percent, title: 'Rate watch is active', body: `We’ll keep your ${user.refiThreshold.toFixed(2)}% threshold in mind.`, meta: 'Open Refi Watch when you want to review it.' }
      : null,
    user.preferences.notifications.calendarReminders && user.closingDate
      ? { icon: CalendarDays, title: `Closing in ${daysUntil(user.closingDate)} days`, body: `Your closing date is ${new Date(`${user.closingDate}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.`, meta: 'Keep your next milestone visible in Calendar.' }
      : null,
  ].filter(Boolean) as Array<{ icon: typeof Bell; title: string; body: string; meta: string }>

  return (
    <div className="notification-panel" role="dialog" aria-label="Notifications">
      <div className="notification-panel__header">
        <div><span className="eyebrow">YOUR WORKSPACE</span><h2>Notifications</h2></div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close notifications"><X size={17} /></button>
      </div>
      {notifications.length ? (
        <div className="notification-panel__list">
          {notifications.map(({ icon: Icon, title, body, meta }) => (
            <article className="notification-item" key={title}>
              <span className="notification-item__icon"><Icon size={16} /></span>
              <div><strong>{title}</strong><p>{body}</p><small>{meta}</small></div>
            </article>
          ))}
        </div>
      ) : (
        <div className="notification-panel__empty"><Bell size={22} /><strong>You’re all caught up.</strong><span>Turn on the alerts that matter to you in Settings.</span></div>
      )}
      <button type="button" className="notification-panel__settings" onClick={onOpenSettings}>Manage notification settings <ArrowRight size={14} /></button>
    </div>
  )
}

