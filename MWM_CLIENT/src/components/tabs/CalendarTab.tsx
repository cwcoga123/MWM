import { useEffect, useMemo, useState, type FormEvent, type MouseEvent } from 'react'
import {
  Bell,
  CalendarDays,
  CalendarPlus,
  ChevronDown,
  ExternalLink,
  Home,
  Lock,
  MapPin,
  Plus,
  Search,
  Star,
  X,
} from 'lucide-react'
import {
  realEstateCalendarEvents,
  type CalendarCategory,
  type CalendarEvent,
  type CalendarImportance,
} from '../../data/realEstateCalendar'
import { localEvents, type LocalEvent } from '../../data/localEvents'
import { defaultMyDates, type MyDate, type MyDateKind } from '../../data/myDates'

type CalendarFilter = 'all' | CalendarCategory
type FeedRow =
  | { type: 'month'; key: string; label: string }
  | { type: 'event'; key: string; event: DisplayMarketEvent }

interface DisplayMarketEvent {
  event: CalendarEvent
  date: string
  endDate?: string
  daysUntil: number
  monthLabel: string
}

interface CalendarTabProps {
  hiImpactOnly?: boolean
  listMaxHeight?: number
  showLocalEvents?: boolean
}

const STORAGE_KEYS = {
  myDates: 'mwm-cal-mydates',
  reminders: 'mwm-cal-reminders',
  rsvp: 'mwm-cal-rsvp',
}

const categoryFilterLabels: Record<CalendarCategory, string> = {
  'housing-data': 'Housing data',
  'fed-macro': 'Fed & rates',
  'bay-area': 'Bay Area',
  holidays: 'Holidays & deadlines',
}

const categoryFilters: Array<{ id: CalendarFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'housing-data', label: categoryFilterLabels['housing-data'] },
  { id: 'fed-macro', label: categoryFilterLabels['fed-macro'] },
  { id: 'bay-area', label: categoryFilterLabels['bay-area'] },
  { id: 'holidays', label: categoryFilterLabels.holidays },
]

const localTagClasses: Record<LocalEvent['tag'], string> = {
  WORKSHOP: 'calendar-local-card__tag--blue',
  COMMUNITY: 'calendar-local-card__tag--blue',
  'OPEN HOUSES': 'calendar-local-card__tag--gold',
  'ADVISOR EVENT': 'calendar-local-card__tag--advisor',
}

function getToday() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function parseIsoDate(iso: string) {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function toIsoDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toCalendarDate(iso: string) {
  return iso.replace(/-/g, '')
}

function daysBetween(from: Date, to: Date) {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000)
}

function daysUntilIso(iso: string, today: Date) {
  return daysBetween(today, parseIsoDate(iso))
}

function countdownLabel(iso: string, today: Date) {
  const days = daysUntilIso(iso, today)
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days < 0) return `${Math.abs(days)} days ago`
  return `in ${days} days`
}

function formatMyDate(iso: string) {
  return parseIsoDate(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function formatCompactDate(iso: string) {
  return parseIsoDate(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function formatDateRange(date: string, endDate?: string) {
  if (!endDate || endDate === date) return formatCompactDate(date)

  const start = parseIsoDate(date)
  const end = parseIsoDate(endDate)
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' })
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' })

  if (startMonth === endMonth) {
    return `${startMonth} ${start.getDate()}-${end.getDate()}`
  }

  return `${startMonth} ${start.getDate()}-${endMonth} ${end.getDate()}`
}

function monthLabel(iso: string) {
  return parseIsoDate(iso)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    .toUpperCase()
}

function escapeIcsText(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
}

function safeFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64)
}

function downloadIcs(title: string, date: string, endDate?: string, details = '') {
  const start = toCalendarDate(date)
  const end = toCalendarDate(toIsoDate(addDays(parseIsoDate(endDate ?? date), 1)))
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MWM Client Hub//Calendar//EN',
    'BEGIN:VEVENT',
    `UID:${safeFileName(title)}-${Date.now()}@mwm-client-hub`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${escapeIcsText(title)}`,
    details ? `DESCRIPTION:${escapeIcsText(details)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n')

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${safeFileName(title) || 'calendar-event'}.ics`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function googleCalendarUrl(title: string, date: string, endDate?: string, details = '') {
  const start = toCalendarDate(date)
  const end = toCalendarDate(toIsoDate(addDays(parseIsoDate(endDate ?? date), 1)))
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${start}/${end}`,
    details,
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

function readStoredStringArray(key: string) {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.filter((value): value is string => typeof value === 'string')
    }
    if (typeof parsed === 'boolean') {
      return parsed ? ['advisor-webinar'] : []
    }
  } catch {
    return []
  }

  return []
}

function writeStoredJson(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

function isMyDateKind(value: unknown): value is MyDateKind {
  return value === 'lock' || value === 'home' || value === 'generic'
}

function isStoredMyDate(value: unknown): value is MyDate {
  if (!value || typeof value !== 'object') return false

  const maybe = value as Partial<MyDate>
  return (
    typeof maybe.id === 'string' &&
    typeof maybe.title === 'string' &&
    typeof maybe.date === 'string' &&
    typeof maybe.sub === 'string' &&
    typeof maybe.byUser === 'boolean' &&
    isMyDateKind(maybe.kind)
  )
}

function readStoredMyDates() {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.myDates)
    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter(isStoredMyDate)
      .filter((date) => date.byUser)
      .map((date) => ({ ...date, kind: 'generic' as const, byUser: true }))
  } catch {
    return []
  }
}

function toDisplayMarketEvent(event: CalendarEvent, today: Date): DisplayMarketEvent {
  let start = parseIsoDate(event.date)
  let end = event.endDate ? parseIsoDate(event.endDate) : undefined
  const isWeekly = event.cadence.toLowerCase().includes('weekly')

  while (isWeekly && (end ?? start) < today) {
    start = addDays(start, 7)
    end = end ? addDays(end, 7) : undefined
  }

  const date = toIsoDate(start)
  const endDate = end ? toIsoDate(end) : undefined
  const rangeEnd = end ?? start
  const daysUntil = start <= today && rangeEnd >= today ? 0 : daysBetween(today, start)

  return {
    event,
    date,
    endDate,
    daysUntil,
    monthLabel: monthLabel(date),
  }
}

function ImportanceStars({ importance }: { importance: CalendarImportance }) {
  return (
    <span className="calendar-stars" aria-label={`Importance: ${importance} of 3`}>
      {[1, 2, 3].map((value) => (
        <Star key={value} size={11} className={value <= importance ? 'is-filled' : ''} aria-hidden="true" />
      ))}
    </span>
  )
}

function MilestoneIcon({ kind }: { kind: MyDateKind }) {
  if (kind === 'lock') return <Lock size={17} aria-hidden="true" />
  if (kind === 'home') return <Home size={17} aria-hidden="true" />
  return <CalendarDays size={17} aria-hidden="true" />
}

function MyDatesSection() {
  const today = useMemo(() => getToday(), [])
  const [myDates, setMyDates] = useState<MyDate[]>(() => [...defaultMyDates, ...readStoredMyDates()])
  const [addOpen, setAddOpen] = useState(false)
  const [addLabel, setAddLabel] = useState('')
  const [addDate, setAddDate] = useState('')

  useEffect(() => {
    writeStoredJson(
      STORAGE_KEYS.myDates,
      myDates.filter((date) => date.byUser),
    )
  }, [myDates])

  const upcomingDates = useMemo(
    () =>
      myDates
        .filter((date) => daysUntilIso(date.date, today) >= 0)
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date)),
    [myDates, today],
  )

  const [primary, ...restDates] = upcomingDates
  const gridTemplateColumns = primary
    ? `1.35fr repeat(${restDates.length}, minmax(220px, 1fr)) minmax(170px, 0.75fr)`
    : '1fr'

  function handleAddSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = addLabel.trim()
    if (!title || !addDate) return

    setMyDates((current) => [
      ...current,
      {
        id: `user-${Date.now()}`,
        title,
        date: addDate,
        kind: 'generic',
        byUser: true,
        sub: 'added by you',
      },
    ])
    setAddLabel('')
    setAddDate('')
    setAddOpen(false)
  }

  function removeDate(id: string) {
    setMyDates((current) => current.filter((date) => date.id !== id || !date.byUser))
  }

  return (
    <section className="overview-section calendar-section">
      <div className="overview-section__heading">
        <span className="eyebrow">YOURS</span>
        <h2>My dates</h2>
      </div>

      <div className="calendar-my-dates" style={{ gridTemplateColumns }}>
        {primary && (
          <article className="calendar-my-card calendar-my-card--primary">
            <span className="calendar-card-label">MY NEXT DATE</span>
            <strong>
              <MilestoneIcon kind={primary.kind} />
              {primary.title}
            </strong>
            <span className="calendar-my-card__countdown">{countdownLabel(primary.date, today)}</span>
            <small>
              {formatMyDate(primary.date)} - {primary.sub}
            </small>
          </article>
        )}

        {restDates.map((date) => (
          <article className="calendar-my-card" key={date.id}>
            <span className="calendar-card-label">THEN</span>
            <strong className={`calendar-my-card__title calendar-my-card__title--${date.kind}`}>
              <MilestoneIcon kind={date.kind} />
              {date.title}
            </strong>
            <span className="calendar-my-card__date">{formatMyDate(date.date)}</span>
            <small>
              {date.sub} - {countdownLabel(date.date, today)}
            </small>
            {date.byUser && (
              <button
                type="button"
                className="calendar-remove-date"
                onClick={() => removeDate(date.id)}
                aria-label={`Remove ${date.title}`}
                title="Remove"
              >
                <X size={11} aria-hidden="true" />
              </button>
            )}
          </article>
        ))}

        {addOpen ? (
          <form className="calendar-add-date-form" onSubmit={handleAddSubmit}>
            <span className="calendar-card-label">NEW DATE</span>
            <input
              value={addLabel}
              onChange={(event) => setAddLabel(event.target.value)}
              placeholder="e.g. Appraisal visit"
              required
            />
            <input type="date" value={addDate} onChange={(event) => setAddDate(event.target.value)} required />
            <div>
              <button type="submit">Save</button>
              <button
                type="button"
                onClick={() => {
                  setAddLabel('')
                  setAddDate('')
                  setAddOpen(false)
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button type="button" className="calendar-add-date-tile" onClick={() => setAddOpen(true)}>
            <span>
              <Plus size={20} aria-hidden="true" />
              <strong>Add a date</strong>
              <small>appraisal, inspection, move...</small>
            </span>
          </button>
        )}
      </div>
    </section>
  )
}

function LocalEventsSection() {
  const [seeAll, setSeeAll] = useState(false)
  const [rsvpEventIds, setRsvpEventIds] = useState<string[]>(() => readStoredStringArray(STORAGE_KEYS.rsvp))
  const visibleEvents = seeAll ? localEvents : localEvents.slice(0, 3)

  useEffect(() => {
    writeStoredJson(STORAGE_KEYS.rsvp, rsvpEventIds)
  }, [rsvpEventIds])

  function toggleRsvp(id: string) {
    setRsvpEventIds((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]))
  }

  return (
    <section className="overview-section calendar-section">
      <div className="calendar-section-heading-row">
        <div className="overview-section__heading">
          <span className="eyebrow">NEARBY - BAY AREA</span>
          <h2>Local events</h2>
        </div>
        <button type="button" className="calendar-secondary-button" onClick={() => setSeeAll((open) => !open)}>
          {seeAll ? 'Show fewer' : `See all (${localEvents.length})`}
        </button>
      </div>

      <div className="calendar-local-grid">
        {visibleEvents.map((event) => {
          const isRsvped = rsvpEventIds.includes(event.id)

          return (
            <article
              className={`calendar-local-card${event.kind === 'advisor' ? ' calendar-local-card--advisor' : ''}`}
              key={event.id}
            >
              <div className="calendar-local-card__top">
                <span className={`calendar-local-card__tag ${localTagClasses[event.tag]}`}>{event.tag}</span>
                <span>{event.dateLabel}</span>
              </div>
              <strong>{event.title}</strong>
              <span className="calendar-local-card__place">
                <MapPin size={12} aria-hidden="true" />
                {event.place}
              </span>
              <p>{event.blurb}</p>
              <div className="calendar-local-card__actions">
                {event.rsvp && (
                  <button
                    type="button"
                    className={`calendar-rsvp-button${isRsvped ? ' is-active' : ''}`}
                    onClick={() => toggleRsvp(event.id)}
                    aria-pressed={isRsvped}
                  >
                    {isRsvped ? "You're in" : 'RSVP'}
                  </button>
                )}
                <button
                  type="button"
                  className="calendar-pill-button"
                  onClick={() => downloadIcs(event.title, event.date, event.endDate, event.blurb)}
                >
                  <CalendarPlus size={12} aria-hidden="true" />
                  Add to calendar
                </button>
                <a
                  className="calendar-text-link"
                  href={googleCalendarUrl(event.title, event.date, event.endDate, event.blurb)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Google Cal
                  <ExternalLink size={10} aria-hidden="true" />
                </a>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function MarketDatesSection({
  defaultHighImpactOnly,
  listMaxHeight,
}: {
  defaultHighImpactOnly: boolean
  listMaxHeight: number
}) {
  const today = useMemo(() => getToday(), [])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [activeCat, setActiveCat] = useState<CalendarFilter>('all')
  const [topOnly, setTopOnly] = useState(defaultHighImpactOnly)
  const [query, setQuery] = useState('')
  const [reminders, setReminders] = useState<string[]>(() => readStoredStringArray(STORAGE_KEYS.reminders))

  useEffect(() => {
    writeStoredJson(STORAGE_KEYS.reminders, reminders)
  }, [reminders])

  const visibleEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return realEstateCalendarEvents
      .map((event) => toDisplayMarketEvent(event, today))
      .filter((displayEvent) => parseIsoDate(displayEvent.endDate ?? displayEvent.date) >= today)
      .filter((displayEvent) => activeCat === 'all' || displayEvent.event.category === activeCat)
      .filter((displayEvent) => !topOnly || displayEvent.event.importance === 3)
      .filter((displayEvent) => {
        if (!normalizedQuery) return true

        const event = displayEvent.event
        const haystack = `${event.event} ${event.source} ${categoryFilterLabels[event.category]}`.toLowerCase()
        return haystack.includes(normalizedQuery)
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.event.event.localeCompare(b.event.event))
  }, [activeCat, query, today, topOnly])

  const rows = useMemo<FeedRow[]>(() => {
    const nextRows: FeedRow[] = []
    let currentMonth = ''

    for (const event of visibleEvents) {
      if (event.monthLabel !== currentMonth) {
        currentMonth = event.monthLabel
        nextRows.push({ type: 'month', key: `month-${currentMonth}`, label: currentMonth })
      }
      nextRows.push({ type: 'event', key: event.event.id, event })
    }

    return nextRows
  }, [visibleEvents])

  function changeCategory(category: CalendarFilter) {
    setActiveCat(category)
    setExpandedId(null)
  }

  function changeTopOnly() {
    setTopOnly((current) => !current)
    setExpandedId(null)
  }

  function changeQuery(value: string) {
    setQuery(value)
    setExpandedId(null)
  }

  function toggleReminder(id: string, event?: MouseEvent<HTMLElement>) {
    event?.stopPropagation()
    setReminders((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]))
  }

  const countLabel = `${visibleEvents.length} upcoming ${visibleEvents.length === 1 ? 'date' : 'dates'}`

  return (
    <section className="overview-section calendar-section">
      <div className="calendar-section-heading-row calendar-section-heading-row--wrap">
        <div className="overview-section__heading">
          <span className="eyebrow">THE MARKET</span>
          <h2>Dates that move rates & housing</h2>
        </div>
        <label className="calendar-search">
          <Search size={13} aria-hidden="true" />
          <span className="calendar-visually-hidden">Search dates</span>
          <input value={query} onChange={(event) => changeQuery(event.target.value)} placeholder="Search dates..." />
        </label>
      </div>

      <div className="calendar-filter-row">
        {categoryFilters.map((filter) => (
          <button
            type="button"
            className={`econ-calendar-filter${activeCat === filter.id ? ' is-active' : ''}`}
            key={filter.id}
            onClick={() => changeCategory(filter.id)}
            aria-pressed={activeCat === filter.id}
          >
            {filter.label}
          </button>
        ))}
        <span className="calendar-filter-divider" />
        <button
          type="button"
          className={`econ-calendar-filter calendar-impact-filter${topOnly ? ' is-active' : ''}`}
          onClick={changeTopOnly}
          aria-pressed={topOnly}
        >
          <Star size={11} aria-hidden="true" />
          High impact only
        </button>
        <span className="calendar-filter-spacer" />
        <span className="calendar-count-label">{countLabel}</span>
      </div>

      <div className="calendar-market-feed" style={{ maxHeight: listMaxHeight }}>
        {rows.map((row) =>
          row.type === 'month' ? (
            <div className="calendar-month-row" key={row.key}>
              {row.label}
            </div>
          ) : (
            <MarketFeedEvent
              key={row.key}
              displayEvent={row.event}
              expanded={expandedId === row.event.event.id}
              reminded={reminders.includes(row.event.event.id)}
              onToggle={() => setExpandedId((current) => (current === row.event.event.id ? null : row.event.event.id))}
              onToggleReminder={(event) => toggleReminder(row.event.event.id, event)}
              today={today}
            />
          ),
        )}
        {visibleEvents.length === 0 && (
          <div className="calendar-empty-state">Nothing matches - try clearing the search or filters.</div>
        )}
      </div>

      <p className="overview-section__footnote calendar-footnote">
        Dates marked ~ are best estimates pending an official schedule confirmation - verify against the linked source
        before planning around them. Reminders are saved on this device.
      </p>
    </section>
  )
}

function MarketFeedEvent({
  displayEvent,
  expanded,
  reminded,
  onToggle,
  onToggleReminder,
  today,
}: {
  displayEvent: DisplayMarketEvent
  expanded: boolean
  reminded: boolean
  onToggle: () => void
  onToggleReminder: (event?: MouseEvent<HTMLElement>) => void
  today: Date
}) {
  const { event, date, endDate, daysUntil } = displayEvent
  const inLabel = daysUntil === 0 ? 'today' : countdownLabel(date, today)
  const note = event.note ? `~ ${event.note}` : ''

  return (
    <article className={`calendar-market-event${expanded ? ' is-expanded' : ''}`}>
      <div
        className="calendar-market-row"
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(keyboardEvent) => {
          if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
            keyboardEvent.preventDefault()
            onToggle()
          }
        }}
      >
        <div className="calendar-market-date">
          <strong>
            {event.estimated && <span title="Estimated date">~</span>}
            {formatDateRange(date, endDate)}
          </strong>
          {daysUntil === 0 ? <small className="calendar-today-badge">TODAY</small> : <small>{inLabel}</small>}
        </div>

        <div className="calendar-market-main">
          <strong>{event.event}</strong>
          <span>
            {[event.time, event.cadence, event.source].filter(Boolean).join(' - ')}
          </span>
        </div>

        <ImportanceStars importance={event.importance} />

        <button
          type="button"
          className={`calendar-reminder-button${reminded ? ' is-active' : ''}`}
          onClick={onToggleReminder}
          aria-label={reminded ? `Turn off reminder for ${event.event}` : `Turn on reminder for ${event.event}`}
          aria-pressed={reminded}
          title={reminded ? 'Reminder on' : 'Remind me'}
        >
          <Bell size={12} aria-hidden="true" />
        </button>

        <ChevronDown className="calendar-market-chevron" size={15} aria-hidden="true" />
      </div>

      {expanded && (
        <div className="calendar-market-detail">
          <p>{event.why}</p>
          {note && <p className="calendar-market-note">{note}</p>}
          <div>
            <button type="button" className="calendar-pill-button" onClick={() => downloadIcs(event.event, date, endDate, event.why)}>
              <CalendarPlus size={12} aria-hidden="true" />
              Add to calendar
            </button>
            <a
              className="calendar-pill-button"
              href={googleCalendarUrl(event.event, date, endDate, event.why)}
              target="_blank"
              rel="noreferrer"
            >
              Google Calendar
              <ExternalLink size={11} aria-hidden="true" />
            </a>
            <button
              type="button"
              className={`calendar-pill-button calendar-pill-button--reminder${reminded ? ' is-active' : ''}`}
              onClick={(clickEvent) => onToggleReminder(clickEvent)}
            >
              <Bell size={12} aria-hidden="true" />
              {reminded ? 'Reminder on' : 'Remind me'}
            </button>
            <a className="calendar-source-link" href={event.sourceUrl} target="_blank" rel="noreferrer">
              {event.source}
              <ExternalLink size={10} aria-hidden="true" />
            </a>
          </div>
        </div>
      )}
    </article>
  )
}

export function CalendarTab({
  hiImpactOnly = false,
  listMaxHeight = 480,
  showLocalEvents = true,
}: CalendarTabProps) {
  return (
    <main className="mortgage-page calendar-page" id="calendar">
      <header className="page-heading">
        <div>
          <p className="eyebrow">PLAN AHEAD</p>
          <h1>Calendar</h1>
          <p>Your milestones first, then what's happening nearby, then the market dates that move rates - in that order.</p>
        </div>
      </header>

      <MyDatesSection />
      {showLocalEvents && <LocalEventsSection />}
      <MarketDatesSection defaultHighImpactOnly={hiImpactOnly} listMaxHeight={listMaxHeight} />
    </main>
  )
}
