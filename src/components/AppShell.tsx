import { useMemo, useState } from 'react'
import {
  Bell,
  BookOpenText,
  Calculator,
  ChevronDown,
  CircleHelp,
  Home,
  LogOut,
  Menu,
  Settings,
  X,
} from 'lucide-react'
import type { HubUser } from './AuthGate'
import { CalculatorIndex } from './CalculatorIndex'

interface AppShellProps {
  user: HubUser
  onSignOut: () => Promise<void>
}

export function AppShell({ user, onSignOut }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const initials = useMemo(
    () =>
      user.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join(''),
    [user.name],
  )

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar__top">
          <a className="brand-lockup" href="/" aria-label="MWM home">
            <span className="brand-mark">M</span>
            <span>
              <strong>MWM</strong>
              <small>Client Hub</small>
            </span>
          </a>
          <button
            className="icon-button sidebar__close"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="primary-nav" aria-label="Main navigation">
          <a href="#overview"><Home size={18} /> Overview</a>
          <a className="is-active" href="#calculators" aria-current="page">
            <Calculator size={18} /> Calculators
          </a>
          <a href="#resources"><BookOpenText size={18} /> Resources</a>
        </nav>

        <div className="sidebar__spacer" />

        <nav className="secondary-nav" aria-label="Help and settings">
          <a href="#help"><CircleHelp size={17} /> Help & support</a>
          <a href="#settings"><Settings size={17} /> Settings</a>
        </nav>
        <div className="sidebar__footer">
          <span className="secure-dot" />
          Private client workspace
        </div>
      </aside>

      {mobileNavOpen && (
        <button
          className="nav-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <div className="app-main">
        <header className="topbar">
          <button
            className="icon-button topbar__menu"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={21} />
          </button>
          <div>
            <p className="topbar__context">PRIVATE CLIENT WORKSPACE</p>
            <p className="topbar__title">Financial tools</p>
          </div>
          <div className="topbar__actions">
            <button className="icon-button notification-button" aria-label="Notifications">
              <Bell size={19} />
              <span />
            </button>
            <div className="profile-menu">
              <button
                className="profile-button"
                onClick={() => setProfileOpen((open) => !open)}
                aria-expanded={profileOpen}
              >
                <span className="avatar">{initials || 'M'}</span>
                <span className="profile-button__copy">
                  <strong>{user.name}</strong>
                  <small>Client</small>
                </span>
                <ChevronDown size={16} />
              </button>
              {profileOpen && (
                <div className="profile-popover">
                  <p>{user.email}</p>
                  <button onClick={() => void onSignOut()}><LogOut size={16} /> Sign out</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <CalculatorIndex />
      </div>
    </div>
  )
}
