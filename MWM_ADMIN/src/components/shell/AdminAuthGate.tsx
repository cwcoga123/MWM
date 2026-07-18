import { FormEvent, type ReactNode, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { ArrowRight, CheckCircle2, LockKeyhole, Mail } from 'lucide-react'
import {
  getAccountProfile,
  type AccountProfile,
  type AccountRole,
  type ClientState,
  type SavedScenario,
} from '../../lib/accounts'
import { defaultOverviewDemoAccount } from '../../data/overviewPersonalization'
import {
  isSupabaseConfigured,
  supabase,
  supabaseConfigurationError,
} from '../../lib/supabase'

export interface HubUser {
  id: string
  email: string
  name: string
  role: AccountRole
  isDemo?: boolean
  clientState: ClientState
  advisorNote: string | null
  targetBudget: number | null
  neighborhoods: string[]
  closingDate: string | null
  lockedRate: number | null
  refiThreshold: number | null
  recentCalculatorIds: string[]
  savedScenarios: SavedScenario[]
}

interface AdminAuthGateProps {
  children: (user: HubUser, signOut: () => Promise<void>) => ReactNode
}

function isAdvisorRole(role: AccountRole) {
  return role === 'advisor' || role === 'admin'
}

function toHubUser(user: User, profile: AccountProfile): HubUser {
  const email = profile.email ?? user.email ?? 'advisor@mwm.local'
  const metadataName = user.user_metadata?.full_name

  return {
    id: profile.id,
    email,
    name:
      profile.full_name?.trim() ||
      (typeof metadataName === 'string' && metadataName.trim()
        ? metadataName.trim()
        : email.split('@')[0].replace(/[._-]/g, ' ')),
    role: profile.account_role,
    clientState: profile.client_state,
    advisorNote: profile.advisor_note,
    targetBudget: profile.target_budget,
    neighborhoods: profile.neighborhoods,
    closingDate: profile.closing_date,
    lockedRate: profile.locked_rate,
    refiThreshold: profile.refi_threshold,
    recentCalculatorIds: profile.recent_calculator_ids,
    savedScenarios: profile.saved_scenarios,
  }
}

function readRedirectError() {
  const hash = new URLSearchParams(window.location.hash.slice(1))
  const search = new URLSearchParams(window.location.search)
  const description =
    hash.get('error_description') ?? search.get('error_description')

  if (!description) return ''

  const cleanUrl = new URL(window.location.href)
  cleanUrl.hash = ''
  cleanUrl.searchParams.delete('error')
  cleanUrl.searchParams.delete('error_code')
  cleanUrl.searchParams.delete('error_description')
  window.history.replaceState({}, document.title, cleanUrl)

  return description.replaceAll('+', ' ')
}

function readDemoRole(): AccountRole {
  const params = new URLSearchParams(window.location.search)
  const requested = params.get('role')

  return requested === 'advisor' ? 'advisor' : 'admin'
}

function friendlyAuthError(message: string) {
  const normalized = message.toLowerCase()

  if (normalized.includes('rate limit')) {
    return 'Too many sign-in attempts. Wait a minute, then try again.'
  }

  if (
    normalized.includes('signups not allowed') ||
    normalized.includes('user not found')
  ) {
    return 'This email is not on the MWM advisor list.'
  }

  if (normalized.includes('failed to fetch')) {
    return 'Unable to reach the sign-in service. Check your connection and try again.'
  }

  return message
}

export function AdminAuthGate({ children }: AdminAuthGateProps) {
  const allowDevBypass =
    import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH_BYPASS === 'true'
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<AccountProfile | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured && !allowDevBypass)
  const [profileLoading, setProfileLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState(readRedirectError)
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    if (!supabase || allowDevBypass) return

    let active = true

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return

      if (sessionError) setError(friendlyAuthError(sessionError.message))
      const sessionUser = data.session?.user ?? null
      setUser(sessionUser)
      setProfileLoading(Boolean(sessionUser))
      setLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      const sessionUser = session?.user ?? null
      setUser(sessionUser)
      setProfileLoading(Boolean(sessionUser))
      if (!sessionUser) setProfile(null)
      setLoading(false)
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [allowDevBypass])

  useEffect(() => {
    if (!user || !supabase || allowDevBypass) {
      return
    }

    const authClient = supabase
    let active = true

    void getAccountProfile(user.id)
      .then(async (accountProfile) => {
        if (!active) return

        if (
          accountProfile.account_status !== 'active' ||
          !isAdvisorRole(accountProfile.account_role)
        ) {
          setError('Advisor or admin access is required.')
          setProfileLoading(false)
          await authClient.auth.signOut()
          return
        }

        setProfile(accountProfile)
        setProfileLoading(false)
      })
      .catch(async () => {
        if (!active) return

        setError('Unable to load your account. Please try signing in again.')
        setProfileLoading(false)
        await authClient.auth.signOut()
      })

    return () => {
      active = false
    }
  }, [allowDevBypass, user])

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!supabase) return

    setIsSending(true)

    try {
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: new URL('/', window.location.origin).toString(),
          shouldCreateUser: false,
        },
      })

      if (signInError) {
        setError(friendlyAuthError(signInError.message))
        return
      }

      setMessage('Check your inbox for a secure admin sign-in link.')
    } catch (signInError) {
      const detail =
        signInError instanceof Error ? signInError.message : 'Sign-in failed.'
      setError(friendlyAuthError(detail))
    } finally {
      setIsSending(false)
    }
  }

  async function handleSignOut() {
    if (supabase) await supabase.auth.signOut()
  }

  if (allowDevBypass) {
    const demoAccount = defaultOverviewDemoAccount

    return children(
      {
        id: 'demo-admin',
        name: 'MWM Admin',
        email: 'advisor@mwm.local',
        role: readDemoRole(),
        isDemo: true,
        clientState: demoAccount.clientState,
        advisorNote: demoAccount.advisorNote,
        targetBudget: demoAccount.search?.targetBudget ?? demoAccount.escrow?.budget ?? null,
        neighborhoods: demoAccount.preferences.neighborhoods,
        closingDate: demoAccount.escrow?.closingDate ?? null,
        lockedRate: demoAccount.escrow?.lockedRate ?? null,
        refiThreshold: demoAccount.homeowner?.refiAlertRate ?? null,
        recentCalculatorIds: demoAccount.recentCalculatorIds,
        savedScenarios: [],
      },
      async () => undefined,
    )
  }

  if (loading || profileLoading) {
    return (
      <main className="auth-page auth-page--loading" aria-live="polite">
        <div className="brand-mark brand-mark--large" aria-label="MWM">
          M
        </div>
        <p>Opening the advisor workspace...</p>
      </main>
    )
  }

  if (user && profile) return children(toHubUser(user, profile), handleSignOut)

  return (
    <main className="auth-page">
      <section className="auth-intro">
        <a className="brand-lockup brand-lockup--light" href="/" aria-label="MWM admin home">
          <span className="brand-mark">M</span>
          <span>
            <strong>MWM</strong>
            <small>Admin CRM</small>
          </span>
        </a>
        <div className="auth-intro__copy">
          <span className="eyebrow eyebrow--light">ADVISOR ACCESS</span>
          <h1>Client work, organized around the next move.</h1>
          <p>
            Manage client personalization, pipeline context, and advisor notes
            from a dedicated workspace.
          </p>
        </div>
        <p className="auth-intro__footnote">Private | Advisor-only | MWM</p>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <span className="auth-card__icon"><LockKeyhole size={20} /></span>
          <p className="eyebrow">ADMIN ACCESS</p>
          <h2>Welcome to MWM Admin</h2>
          <p className="auth-card__lede">
            Enter an advisor or admin email. We will send a secure sign-in link.
          </p>

          {!isSupabaseConfigured ? (
            <div className="setup-note" role="status">
              <strong>Connect Supabase to enable sign-in</strong>
              <span>
                Copy <code>.env.example</code> to <code>.env.local</code> and add
                your project values. {supabaseConfigurationError}
              </span>
            </div>
          ) : (
            <form onSubmit={handleSignIn} className="auth-form">
              <label htmlFor="email">Email address</label>
              <div className="input-shell">
                <Mail size={18} aria-hidden="true" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="advisor@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={isSending}
                  maxLength={254}
                  required
                />
              </div>
              <button
                className="button button--primary button--full"
                type="submit"
                disabled={isSending}
              >
                {isSending ? 'Sending secure link...' : 'Send secure link'}
                {!isSending && <ArrowRight size={17} />}
              </button>
              <div aria-live="polite">
                {message && (
                  <p className="form-message form-message--success">
                    <CheckCircle2 size={17} />
                    {message}
                  </p>
                )}
                {error && (
                  <p className="form-message form-message--error">{error}</p>
                )}
              </div>
            </form>
          )}
        </div>
      </section>
    </main>
  )
}
