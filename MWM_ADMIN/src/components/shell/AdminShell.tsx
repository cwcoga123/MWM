import { LogOut, Terminal, Users } from 'lucide-react'
import { AdvisorConsoleTab } from '../tabs/AdvisorConsoleTab'
import type { HubUser } from './AdminAuthGate'

interface AdminShellProps {
  user: HubUser
  onSignOut: () => Promise<void>
}

export function AdminShell({ user, onSignOut }: AdminShellProps) {
  return (
    <div className="app-shell admin-app-shell">
      <aside className="sidebar admin-sidebar">
        <div className="sidebar__top">
          <a className="brand-lockup" href="/" aria-label="MWM admin home">
            <span className="brand-mark">M</span>
            <span>
              <strong>MWM</strong>
              <small>Admin CRM</small>
            </span>
          </a>
        </div>

        <nav className="primary-nav" aria-label="Admin navigation">
          <a href="#clients" className="is-active" aria-current="page">
            <Users size={15} />
            Clients
          </a>
        </nav>

        <div className="sidebar__spacer" />

        <div className="sidebar__account">
          <div className="profile-menu">
            <button className="profile-button" type="button">
              <span className="avatar">MW</span>
              <span className="profile-button__copy">
                <strong>{user.name}</strong>
                <small>{user.role}</small>
              </span>
            </button>
          </div>
          <button className="notification-button" type="button" onClick={() => void onSignOut()}>
            <LogOut size={17} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="app-main admin-main">
        <div className="admin-page-kicker">
          <Terminal size={16} />
          <span>MWM_ADMIN</span>
        </div>
        <AdvisorConsoleTab user={user} />
      </div>
    </div>
  )
}
