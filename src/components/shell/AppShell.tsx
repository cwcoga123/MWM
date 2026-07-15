import { useEffect, useMemo, useState } from 'react'
import {
  Bell,
  ChevronDown,
  CircleHelp,
  LogOut,
  Menu,
  Settings,
  X,
} from 'lucide-react'
import type { HubUser } from './AuthGate'
import { CalculatorIndex } from '../tabs/CalculatorIndex'
import { OverviewTab } from '../tabs/OverviewTab'
import { CalendarTab } from '../tabs/CalendarTab'
import { ResourcesTab } from '../tabs/ResourcesTab'
import { AboutTab } from '../tabs/AboutTab'
import { MarketScannerTab } from '../tabs/MarketScannerTab'
import { CostWatchTab } from '../tabs/CostWatchTab'
import { AdvisorContactCard } from '../shared/AdvisorContactCard'

interface AppShellProps {
  user: HubUser
  onSignOut: () => Promise<void>
}

type ActiveView =
  | 'overview'
  | 'calendar'
  | 'calculators'
  | 'resources'
  | 'about'
  | 'market-scanner'
  | 'cost-watch'

/**
 * The Overview tab is the default landing view. '#calendar' routes to the
 * standalone Calendar view, '#resources' routes to the Resources view,
 * '#about' routes to About, '#market-scanner' routes to Market Scanner,
 * known Overview section anchors stay on Overview, and any other hash
 * (an explicit '#calculators' or a specific calculator id like
 * '#buyer-closing-costs') routes to the Calculators view so deep links and
 * "open this calculator" actions keep working.
 */
function viewFromHash(): ActiveView {
  const hash = window.location.hash.slice(1)
  if (!hash || hash === 'overview') return 'overview'
  if (hash === 'cost-watch' || hash === 'home-cost-watch' || hash.startsWith('cost-watch/')) return 'cost-watch'
  if (hash === 'calendar') return 'calendar'
  if (hash === 'resources') return 'resources'
  if (hash === 'about') return 'about'
  if (hash === 'market-scanner') return 'market-scanner'
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

  function openCalendar() {
    window.location.hash = 'calendar'
    setActiveView('calendar')
    setMobileNavOpen(false)
  }

  function openCalculators() {
    window.location.hash = 'calculators'
    setActiveView('calculators')
    setMobileNavOpen(false)
  }

  function openResources() {
    window.location.hash = 'resources'
    setActiveView('resources')
    setMobileNavOpen(false)
  }

  function openAbout() {
    window.location.hash = 'about'
    setActiveView('about')
    setMobileNavOpen(false)
  }

  function openMarketScanner() {
    window.location.hash = 'market-scanner'
    setActiveView('market-scanner')
    setMobileNavOpen(false)
  }

  function openCostWatch(indicatorId?: string) {
    window.location.hash = indicatorId ? `cost-watch/${indicatorId}` : 'cost-watch'
    setActiveView('cost-watch')
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
            Overview
          </a>
          <a
            href="#calendar"
            className={activeView === 'calendar' ? 'is-active' : ''}
            aria-current={activeView === 'calendar' ? 'page' : undefined}
            onClick={(event) => {
              event.preventDefault()
              openCalendar()
            }}
          >
            Calendar
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
            Calculators
          </a>
          <a
            href="#resources"
            className={activeView === 'resources' ? 'is-active' : ''}
            aria-current={activeView === 'resources' ? 'page' : undefined}
            onClick={(event) => {
              event.preventDefault()
              openResources()
            }}
          >
            Resources
          </a>
          <a
            href="#market-scanner"
            className={activeView === 'market-scanner' ? 'is-active' : ''}
            aria-current={activeView === 'market-scanner' ? 'page' : undefined}
            onClick={(event) => {
              event.preventDefault()
              openMarketScanner()
            }}
          >
            Trends
          </a>
          <a
            href="#cost-watch"
            className={activeView === 'cost-watch' ? 'is-active' : ''}
            aria-current={activeView === 'cost-watch' ? 'page' : undefined}
            onClick={(event) => {
              event.preventDefault()
              openCostWatch()
            }}
          >
            Cost Watch
          </a>
          <a
            href="#about"
            className={activeView === 'about' ? 'is-active' : ''}
            aria-current={activeView === 'about' ? 'page' : undefined}
            onClick={(event) => {
              event.preventDefault()
              openAbout()
            }}
          >
            About
          </a>
        </nav>

        <div className="sidebar__spacer" />

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
                <a role="menuitem" href="#help" onClick={() => setProfileOpen(false)}>
                  <CircleHelp size={16} /> Help & support
                </a>
                <a role="menuitem" href="#settings" onClick={() => setProfileOpen(false)}>
                  <Settings size={16} /> Settings
                </a>
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

        {activeView === 'overview' && (
          <OverviewTab
            user={user}
            onOpenCalculator={openCalculatorFromOverview}
            onOpenCalculators={openCalculators}
            onOpenCostWatch={openCostWatch}
            onOpenAdvisorCard={() => setAdvisorCardOpen(true)}
          />
        )}
        {activeView === 'calendar' && <CalendarTab />}
        {activeView === 'calculators' && <CalculatorIndex user={user} />}
        {activeView === 'resources' && <ResourcesTab user={user} />}
        {activeView === 'about' && <AboutTab />}
        {activeView === 'market-scanner' && <MarketScannerTab />}
        {activeView === 'cost-watch' && <CostWatchTab />}
      </div>

      <AdvisorContactCard open={advisorCardOpen} onOpenChange={setAdvisorCardOpen} />
    </div>
  )
}
