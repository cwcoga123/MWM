import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  CalendarDays,
  Loader2,
  MapPin,
  MessageSquareText,
  Percent,
  Save,
  Search,
  Terminal,
  Users,
  WalletCards,
} from 'lucide-react'
import {
  listAdvisorClientProfiles,
  updateClientPersonalization,
  type AccountProfile,
  type ClientPersonalizationPatch,
  type ClientState,
} from '../../lib/accounts'
import { isSupabaseConfigured } from '../../lib/supabase'
import {
  overviewDemoAccounts,
  type OverviewClientProfile,
} from '../../data/overviewPersonalization'
import type { HubUser } from '../shell/AdminAuthGate'

interface AdvisorConsoleTabProps {
  user: HubUser
}

interface ConsoleDraft {
  clientState: ClientState
  advisorNote: string
  targetBudget: string
  neighborhoods: string
  closingDate: string
  lockedRate: string
  refiThreshold: string
}

const emptyDraft: ConsoleDraft = {
  clientState: 'browsing',
  advisorNote: '',
  targetBudget: '',
  neighborhoods: '',
  closingDate: '',
  lockedRate: '',
  refiThreshold: '',
}

const clientStateOptions: { value: ClientState; label: string }[] = [
  { value: 'browsing', label: 'Browsing' },
  { value: 'house-hunting', label: 'House hunting' },
  { value: 'in-escrow', label: 'In escrow' },
  { value: 'homeowner', label: 'Homeowner' },
]

function profileFromDemo(account: OverviewClientProfile): AccountProfile {
  return {
    id: account.id,
    email: account.email,
    full_name: account.name,
    phone: null,
    account_role: 'client',
    account_status: 'active',
    client_state: account.clientState,
    advisor_note: account.advisorNote,
    target_budget: account.search?.targetBudget ?? account.escrow?.budget ?? null,
    neighborhoods: account.preferences.neighborhoods,
    closing_date: account.escrow?.closingDate ?? null,
    locked_rate: account.escrow?.lockedRate ?? null,
    refi_threshold: account.homeowner?.refiAlertRate ?? null,
    recent_calculator_ids: account.recentCalculatorIds,
    saved_scenarios: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

function draftFromProfile(profile: AccountProfile): ConsoleDraft {
  return {
    clientState: profile.client_state,
    advisorNote: profile.advisor_note ?? '',
    targetBudget: profile.target_budget === null ? '' : String(Math.round(profile.target_budget)),
    neighborhoods: profile.neighborhoods.join(', '),
    closingDate: profile.closing_date ?? '',
    lockedRate: profile.locked_rate === null ? '' : String(profile.locked_rate),
    refiThreshold: profile.refi_threshold === null ? '' : String(profile.refi_threshold),
  }
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null

  const parsed = Number(trimmed.replace(/,/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

function parseNeighborhoods(value: string) {
  return Array.from(
    new Set(
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ).slice(0, 20)
}

function toPersonalizationPatch(draft: ConsoleDraft): ClientPersonalizationPatch {
  return {
    clientState: draft.clientState,
    advisorNote: draft.advisorNote.trim() || null,
    targetBudget: parseOptionalNumber(draft.targetBudget),
    neighborhoods: parseNeighborhoods(draft.neighborhoods),
    closingDate: draft.closingDate || null,
    lockedRate: parseOptionalNumber(draft.lockedRate),
    refiThreshold: parseOptionalNumber(draft.refiThreshold),
  }
}

function updateProfileFromPatch(profile: AccountProfile, patch: ClientPersonalizationPatch): AccountProfile {
  return {
    ...profile,
    client_state: patch.clientState,
    advisor_note: patch.advisorNote,
    target_budget: patch.targetBudget,
    neighborhoods: patch.neighborhoods,
    closing_date: patch.closingDate,
    locked_rate: patch.lockedRate,
    refi_threshold: patch.refiThreshold,
    updated_at: new Date().toISOString(),
  }
}

function clientLabel(profile: AccountProfile) {
  return profile.full_name?.trim() || profile.email || 'Unnamed client'
}

export function AdvisorConsoleTab({ user }: AdvisorConsoleTabProps) {
  const canUseConsole = user.role === 'advisor' || user.role === 'admin'
  const [clients, setClients] = useState<AccountProfile[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [draftState, setDraftState] = useState<{
    clientId: string
    draft: ConsoleDraft
  } | null>(null)
  const [command, setCommand] = useState('')
  const [loading, setLoading] = useState(canUseConsole)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const commandRef = useRef<HTMLInputElement>(null)

  const normalizedCommand = command
    .replace(/^\/\s*/, '')
    .replace(/^find\s+/i, '')
    .trim()
    .toLowerCase()

  const filteredClients = useMemo(() => {
    if (!normalizedCommand) return clients

    return clients.filter((client) =>
      [
        clientLabel(client),
        client.email ?? '',
        client.client_state,
        client.neighborhoods.join(' '),
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedCommand),
    )
  }, [clients, normalizedCommand])

  const selectedClient =
    clients.find((client) => client.id === selectedId) ?? filteredClients[0] ?? clients[0]
  const draft =
    selectedClient && draftState?.clientId === selectedClient.id
      ? draftState.draft
      : selectedClient
        ? draftFromProfile(selectedClient)
        : emptyDraft

  useEffect(() => {
    if (!canUseConsole) return

    let active = true

    async function loadClients() {
      setLoading(true)
      setError('')

      try {
        const data =
          user.isDemo || !isSupabaseConfigured
            ? overviewDemoAccounts.map(profileFromDemo)
            : await listAdvisorClientProfiles()

        if (!active) return

        setClients(data)
        setSelectedId((current) => current || data[0]?.id || '')
      } catch {
        if (!active) return
        setError('Unable to load client profiles.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadClients()

    return () => {
      active = false
    }
  }, [canUseConsole, user.isDemo])

  useEffect(() => {
    function handleKeyboard(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      const isFormField =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        if (selectedClient) void saveDraft()
        return
      }

      if (event.key === '/' && !isFormField) {
        event.preventDefault()
        commandRef.current?.focus()
        return
      }

      if (!filteredClients.length || isFormField) return

      if (event.key === 'j' || event.key === 'k') {
        event.preventDefault()
        const currentIndex = Math.max(
          0,
          filteredClients.findIndex((client) => client.id === selectedClient?.id),
        )
        const delta = event.key === 'j' ? 1 : -1
        const nextIndex = (currentIndex + delta + filteredClients.length) % filteredClients.length
        selectClient(filteredClients[nextIndex].id)
      }
    }

    window.addEventListener('keydown', handleKeyboard)
    return () => window.removeEventListener('keydown', handleKeyboard)
  })

  async function saveDraft() {
    if (!selectedClient || saving) return

    const patch = toPersonalizationPatch(draft)
    setSaving(true)
    setStatus('')
    setError('')

    try {
      const updatedProfile =
        user.isDemo || !isSupabaseConfigured
          ? updateProfileFromPatch(selectedClient, patch)
          : await updateClientPersonalization(selectedClient.id, patch)

      setClients((current) =>
        current.map((client) => (client.id === updatedProfile.id ? updatedProfile : client)),
      )
      setStatus(`Saved ${clientLabel(updatedProfile)}.`)
    } catch {
      setError('Unable to save personalization.')
    } finally {
      setSaving(false)
    }
  }

  function updateDraft(patch: Partial<ConsoleDraft>) {
    if (!selectedClient) return

    setDraftState({
      clientId: selectedClient.id,
      draft: {
        ...draft,
        ...patch,
      },
    })
  }

  function selectClient(clientId: string) {
    setSelectedId(clientId)
    setStatus('')
    setError('')
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void saveDraft()
  }

  if (!canUseConsole) {
    return (
      <main className="advisor-console-page">
        <section className="advisor-terminal advisor-terminal--empty">
          <Terminal size={24} />
          <h1>Advisor Console</h1>
          <p>Advisor access required.</p>
        </section>
      </main>
    )
  }

  return (
    <main className="advisor-console-page">
      <section className="advisor-terminal" aria-label="Advisor Console">
        <header className="advisor-terminal__header">
          <div>
            <p className="eyebrow">ADVISOR CONSOLE</p>
            <h1><Terminal size={22} /> Client personalization</h1>
          </div>
          <label className="advisor-command" htmlFor="advisor-command">
            <Search size={15} />
            <input
              ref={commandRef}
              id="advisor-command"
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              placeholder="/find client, area, state"
            />
          </label>
        </header>

        {loading ? (
          <div className="advisor-console-status">
            <Loader2 size={18} />
            Loading clients
          </div>
        ) : (
          <div className="advisor-console-grid">
            <aside className="advisor-client-list" aria-label="Clients">
              <div className="advisor-client-list__heading">
                <Users size={15} />
                <span>{filteredClients.length} clients</span>
              </div>
              {filteredClients.map((client, index) => (
                <button
                  type="button"
                  key={client.id}
                  className={client.id === selectedClient?.id ? 'is-active' : ''}
                  onClick={() => selectClient(client.id)}
                >
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <strong>{clientLabel(client)}</strong>
                  <small>{client.client_state}</small>
                </button>
              ))}
            </aside>

            {selectedClient ? (
              <form className="advisor-editor" onSubmit={handleSubmit}>
                <div className="advisor-editor__identity">
                  <span>{selectedClient.email}</span>
                  <strong>{clientLabel(selectedClient)}</strong>
                </div>

                <label className="advisor-field" htmlFor="advisor-client-state">
                  <span><Terminal size={14} /> client_state</span>
                  <select
                    id="advisor-client-state"
                    value={draft.clientState}
                    onChange={(event) =>
                      updateDraft({ clientState: event.target.value as ClientState })
                    }
                  >
                    {clientStateOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="advisor-field advisor-field--wide" htmlFor="advisor-note">
                  <span><MessageSquareText size={14} /> advisor_note</span>
                  <textarea
                    id="advisor-note"
                    value={draft.advisorNote}
                    rows={4}
                    maxLength={2000}
                    onChange={(event) =>
                      updateDraft({ advisorNote: event.target.value })
                    }
                  />
                </label>

                <label className="advisor-field" htmlFor="advisor-target-budget">
                  <span><WalletCards size={14} /> target_budget</span>
                  <input
                    id="advisor-target-budget"
                    value={draft.targetBudget}
                    inputMode="numeric"
                    onChange={(event) =>
                      updateDraft({ targetBudget: event.target.value })
                    }
                  />
                </label>

                <label className="advisor-field" htmlFor="advisor-neighborhoods">
                  <span><MapPin size={14} /> neighborhoods</span>
                  <input
                    id="advisor-neighborhoods"
                    value={draft.neighborhoods}
                    onChange={(event) =>
                      updateDraft({ neighborhoods: event.target.value })
                    }
                  />
                </label>

                <label className="advisor-field" htmlFor="advisor-closing-date">
                  <span><CalendarDays size={14} /> closing_date</span>
                  <input
                    id="advisor-closing-date"
                    type="date"
                    value={draft.closingDate}
                    onChange={(event) =>
                      updateDraft({ closingDate: event.target.value })
                    }
                  />
                </label>

                <label className="advisor-field" htmlFor="advisor-locked-rate">
                  <span><Percent size={14} /> locked_rate</span>
                  <input
                    id="advisor-locked-rate"
                    value={draft.lockedRate}
                    inputMode="decimal"
                    onChange={(event) =>
                      updateDraft({ lockedRate: event.target.value })
                    }
                  />
                </label>

                <label className="advisor-field" htmlFor="advisor-refi-threshold">
                  <span><Percent size={14} /> refi_threshold</span>
                  <input
                    id="advisor-refi-threshold"
                    value={draft.refiThreshold}
                    inputMode="decimal"
                    onChange={(event) =>
                      updateDraft({ refiThreshold: event.target.value })
                    }
                  />
                </label>

                <div className="advisor-editor__footer">
                  <div aria-live="polite">
                    {status && <span className="advisor-console-ok">{status}</span>}
                    {error && <span className="advisor-console-error">{error}</span>}
                  </div>
                  <button type="submit" disabled={saving}>
                    {saving ? <Loader2 size={15} /> : <Save size={15} />}
                    {saving ? 'Saving' : 'Save'}
                  </button>
                </div>
              </form>
            ) : (
              <section className="advisor-console-status">
                <Users size={18} />
                No clients match
              </section>
            )}
          </div>
        )}
      </section>
    </main>
  )
}
