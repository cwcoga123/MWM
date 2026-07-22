import { useCallback, useEffect, useState } from 'react'
import { Bell, ChevronDown, LogOut, Search, Settings } from 'lucide-react'
import { AdvisorConsoleTab } from '../tabs/AdvisorConsoleTab'
import { ActionPlansTab } from '../tabs/ActionPlansTab'
import { seedActionPlans, type ActionPlan } from '../../data/actionPlans'
import type { HubUser } from './AdminAuthGate'

interface AdminShellProps {
  user: HubUser
  onSignOut: () => Promise<void>
}

type AdminTab = 'clients' | 'plans'

/** Per-client activation overrides: clientId → planId → active. */
export type ClientPlanState = Record<string, Record<string, boolean>>

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'MW'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function AdminShell({ user, onSignOut }: AdminShellProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [tab, setTab] = useState<AdminTab>('clients')
  const actionPlansStorageKey = `mwm.admin.action-plans.${user.email.toLowerCase()}`

  // Save the admin's explicit action-plan edits locally until the production
  // action_plans table is connected.
  const [plans, setPlans] = useState<ActionPlan[]>(() => {
    try {
      const stored = window.localStorage.getItem(actionPlansStorageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) return parsed as ActionPlan[]
      }
    } catch {
      // Fall back to the seeded library when local storage is unavailable.
    }

    return seedActionPlans
  })
  const [clientPlanState, setClientPlanState] = useState<ClientPlanState>({})

  useEffect(() => {
    try {
      window.localStorage.setItem(actionPlansStorageKey, JSON.stringify(plans))
    } catch {
      // The in-memory state remains usable if persistence is unavailable.
    }
  }, [actionPlansStorageKey, plans])

  const toggleClientPlan = useCallback(
    (clientId: string, planId: string, active: boolean) => {
      setClientPlanState((prev) => ({
        ...prev,
        [clientId]: { ...(prev[clientId] ?? {}), [planId]: active },
      }))
    },
    [],
  )

  return (
    <div className="hs-shell">
      <header className="hs-topnav">
        <a className="hs-brand hs-brand--light" href="/" aria-label="MWM admin home">
          <span className="hs-brand__mark">M</span>
          <span className="hs-brand__text">MWM</span>
        </a>

        <nav className="hs-topnav__links" aria-label="Primary">
          <button
            type="button"
            className={tab === 'clients' ? 'hs-topnav__link is-active' : 'hs-topnav__link'}
            aria-current={tab === 'clients' ? 'page' : undefined}
            onClick={() => setTab('clients')}
          >
            Clients
          </button>
          <button
            type="button"
            className={tab === 'plans' ? 'hs-topnav__link is-active' : 'hs-topnav__link'}
            aria-current={tab === 'plans' ? 'page' : undefined}
            onClick={() => setTab('plans')}
          >
            Action plans
          </button>
          <a href="#reports" className="hs-topnav__link">
            Reports
          </a>
        </nav>

        <div className="hs-topnav__right">
          <label className="hs-topnav__search" aria-label="Search MWM">
            <Search size={15} />
            <input type="search" placeholder="Search MWM" />
          </label>

          <button className="hs-iconbtn hs-iconbtn--nav" type="button" aria-label="Settings">
            <Settings size={18} />
          </button>
          <button className="hs-iconbtn hs-iconbtn--nav" type="button" aria-label="Notifications">
            <Bell size={18} />
            <span className="hs-iconbtn__dot" />
          </button>

          <div className="hs-usermenu">
            <button
              className="hs-usermenu__trigger hs-usermenu__trigger--nav"
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
            >
              <span className="hs-avatar hs-avatar--nav">{initials(user.name)}</span>
              <ChevronDown size={15} />
            </button>

            {menuOpen && (
              <div className="hs-popover" role="menu">
                <p className="hs-popover__name">{user.name}</p>
                <p className="hs-popover__email">{user.email}</p>
                <button type="button" role="menuitem" onClick={() => void onSignOut()}>
                  <LogOut size={16} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="hs-content">
        {tab === 'clients' ? (
          <AdvisorConsoleTab
            user={user}
            plans={plans}
            clientPlanState={clientPlanState}
            onToggleClientPlan={toggleClientPlan}
          />
        ) : (
          <ActionPlansTab
            user={user}
            plans={plans}
            canEdit={user.role === 'admin'}
            onPlansChange={setPlans}
          />
        )}
      </main>
    </div>
  )
}
