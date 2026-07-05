import { FormEvent, type ReactNode, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { ArrowRight, CheckCircle2, LockKeyhole, Mail } from 'lucide-react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

export interface HubUser {
  email: string
  name: string
}

interface AuthGateProps {
  children: (user: HubUser, signOut: () => Promise<void>) => ReactNode
}

function toHubUser(user: User): HubUser {
  const email = user.email ?? 'client@mwm.local'
  const metadataName = user.user_metadata?.full_name

  return {
    email,
    name:
      typeof metadataName === 'string' && metadataName.trim()
        ? metadataName.trim()
        : email.split('@')[0].replace(/[._-]/g, ' '),
  }
}

export function AuthGate({ children }: AuthGateProps) {
  const allowDevBypass =
    import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH_BYPASS === 'true'
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured && !allowDevBypass)
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!supabase || allowDevBypass) return

    void supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => data.subscription.unsubscribe()
  }, [allowDevBypass])

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!supabase) return

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
        shouldCreateUser: false,
      },
    })

    if (signInError) {
      setError(
        signInError.message.toLowerCase().includes('signups not allowed')
          ? 'This email is not on the client list. Contact your MWM advisor for access.'
          : signInError.message,
      )
      return
    }

    setMessage('Check your inbox for a secure sign-in link.')
  }

  async function handleSignOut() {
    if (supabase) await supabase.auth.signOut()
  }

  if (allowDevBypass) {
    return children(
      { name: 'Alex Morgan', email: 'alex@mwm.local' },
      async () => undefined,
    )
  }

  if (loading) {
    return (
      <main className="auth-page auth-page--loading" aria-live="polite">
        <div className="brand-mark brand-mark--large" aria-label="MWM">
          M
        </div>
        <p>Opening your private workspace…</p>
      </main>
    )
  }

  if (user) return children(toHubUser(user), handleSignOut)

  return (
    <main className="auth-page">
      <section className="auth-intro">
        <a className="brand-lockup brand-lockup--light" href="/" aria-label="MWM home">
          <span className="brand-mark">M</span>
          <span>
            <strong>MWM</strong>
            <small>Private client workspace</small>
          </span>
        </a>
        <div className="auth-intro__copy">
          <span className="eyebrow eyebrow--light">YOUR FINANCIAL TOOLKIT</span>
          <h1>Better decisions start with clearer numbers.</h1>
          <p>
            Explore planning tools, understand tradeoffs, and bring more focused
            questions to your next conversation.
          </p>
        </div>
        <p className="auth-intro__footnote">Private · Secure · Built for MWM clients</p>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <span className="auth-card__icon"><LockKeyhole size={20} /></span>
          <p className="eyebrow">CLIENT ACCESS</p>
          <h2>Welcome to MWM</h2>
          <p className="auth-card__lede">
            Enter the email associated with your client account. We’ll send you a
            secure sign-in link—no password required.
          </p>

          {!isSupabaseConfigured ? (
            <div className="setup-note" role="status">
              <strong>Connect Supabase to enable sign-in</strong>
              <span>Copy <code>.env.example</code> to <code>.env.local</code> and add your project values.</span>
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
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
              <button className="button button--primary button--full" type="submit">
                Send secure link <ArrowRight size={17} />
              </button>
              {message && <p className="form-message form-message--success"><CheckCircle2 size={17} />{message}</p>}
              {error && <p className="form-message form-message--error">{error}</p>}
            </form>
          )}
          <p className="auth-card__help">Need access? Contact your MWM advisor.</p>
        </div>
      </section>
    </main>
  )
}
