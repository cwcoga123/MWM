import { useEffect, useMemo, useState } from 'react'
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
import { OverviewTab } from './OverviewTab'
import { AdvisorContactCard } from './AdvisorContactCard'

interface AppShellProps {
  user: HubUser
  onSignOut: () => Promise<void>
}

type ActiveView = 'overview' | 'calculators'

/**
 * The Overview tab is the default landing view. Any other hash (an explicit
 * '#calculators' or a specific calculator id like '#buyer-closing-costs')
 * routes to the Calculators view so deep links and "open this calculator"
 * actions keep working.
 */
function viewFromHash(): ActiveView {
  const hash = window.location.hash.slice(1)
  if (!hash || hash === 'overview') return 'overview'
  return 'calculators'
}

export function AppShell({ user, onSignOut }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [activeView, setActiveView] = useState<ActiveView>(viewFromHash)
  const [advisorCardOpen, setAdvisorCardOpen] = useState(false)
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
  const roleLabel = user.role[0].toUpperCase() + user.role.slice(1)

  useEffect(() => {
    function syncViewFromHash() {
      setActiveView(viewFromHash())
    }

    window.addEventListener('hashchange', syncViewFromHash)
    return () => window.removeEventListener('hashchange', syncViewFromHash)
  }, [])

  function openOverview() {
    window.location.hash = 'overview'
    setActiveView('overview')
    setMobileNavOpen(false)
  }

  function openCalculators() {
    window.location.hash = 'calculators'
    setActiveView('calculators')
    setMobileNavOpen(false)
  }

  function openCalculatorFromOverview(calculatorId: string) {
    window.location.hash = calculatorId
    setActiveView('calculators')
  }

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
          <a
            href="#overview"
            className={activeView === 'overview' ? 'is-active' : ''}
            aria-current={activeView === 'overview' ? 'page' : undefined}
            onClick={(event) => {
              event.preventDefault()
              openOverview()
            }}
          >
            <Home size={18} /> Overview
          </a>
          <a
            href="#calculators"
            className={activeView === 'calculators' ? 'is-active' : ''}
            aria-current={activeView === 'calculators' ? 'page' : undefined}
            onClick={(event) => {
              event.preventDefault()
              openCalculators()
            }}
          >
            <Calculator size={18} /> Calculators
          </a>
          <a href="#resources"><BookOpenText size={18} /> Resources</a>
        </nav>

        <div className="sidebar__spacer" />

        <nav className="secondary-nav" aria-label="Help and settings">
          <a href="#help"><CircleHelp size={17} /> Help & support</a>
          <a href="#settings"><Settings size={17} /> Settings</a>
        </nav>

        <div className="sidebar__account">
          <button className="notification-button" aria-label="Notifications">
            <Bell size={17} />
            <span>Notifications</span>
            <span className="notification-button__dot" aria-hidden="true" />
          </button>
          <div className="profile-menu">
            <button
              className="profile-button"
              onClick={() => setProfileOpen((open) => !open)}
              aria-expanded={profileOpen}
              aria-haspopup="menu"
            >
              <span className="avatar">{initials || 'M'}</span>
              <span className="profile-button__copy">
                <strong>{user.name}</strong>
                <small>{roleLabel}</small>
              </span>
              <ChevronDown size={16} />
            </button>
            {profileOpen && (
              <div className="profile-popover" role="menu">
                <p>{user.email}</p>
                <button role="menuitem" onClick={() => void onSignOut()}>
                  <LogOut size={16} /> Sign out
                </button>
              </div>
            )}
          </div>
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
        <button
          className="icon-button mobile-nav-trigger"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open navigation"
        >
          <Menu size={21} />
        </button>

        {activeView === 'overview' ? (
          <OverviewTab
            user={user}
            onOpenCalculator={openCalculatorFromOverview}
            onOpenAdvisorCard={() => setAdvisorCardOpen(true)}
          />
        ) : (
          <CalculatorIndex />
        )}
      </div>

      <AdvisorContactCard open={advisorCardOpen} onOpenChange={setAdvisorCardOpen} />
    </div>
  )
}
