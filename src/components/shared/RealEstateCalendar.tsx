import { useState } from 'react'
import { Star } from 'lucide-react'
import {
  calendarCategories,
  realEstateCalendarEvents,
  type CalendarCategory,
  type CalendarEvent,
} from '../../data/realEstateCalendar'

const categoryOrder = Object.keys(calendarCategories) as CalendarCategory[]

function formatEventDate(event: CalendarEvent) {
  const start = new Date(`${event.date}T00:00:00Z`)
  const startLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  if (!event.endDate) return startLabel
  const end = new Date(`${event.endDate}T00:00:00Z`)
  const endLabel = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  return `${startLabel}–${endLabel}`
}

function ImportanceStars({ importance }: { importance: 1 | 2 | 3 }) {
  return (
    <span className="econ-table__stars" aria-label={`Importance: ${importance} of 3`}>
      {[1, 2, 3].map((n) => (
        <Star key={n} size={11} className={n <= importance ? 'is-filled' : ''} />
      ))}
    </span>
  )
}

/**
 * Upcoming dates that matter to a real estate / mortgage practice: national
 * housing-data releases, the Fed & macro prints that move rates, Bay
 * Area–specific reports, and holidays/deadlines that affect closings. Same
 * Time / Cur. / Event / Imp. / Actual / Forecast / Previous table format as
 * Indicators Worth Watching, above — Actual/Forecast/Previous are always a
 * dash here since every row is a forward-looking release date, not a
 * reported value. See src/data/realEstateCalendar.ts.
 */
export function RealEstateCalendar() {
  const [activeCategories, setActiveCategories] = useState<Set<CalendarCategory>>(new Set(categoryOrder))

  function toggleCategory(category: CalendarCategory) {
    setActiveCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        if (next.size > 1) next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  const hasEstimatedRows = realEstateCalendarEvents.some((event) => event.estimated)

  return (
    <section className="overview-section">
      <div className="overview-section__heading">
        <span className="eyebrow">CALENDAR</span>
        <h2>Dates worth planning around</h2>
      </div>

      <div className="econ-calendar-filters">
        {categoryOrder.map((category) => (
          <button
            key={category}
            type="button"
            className={`econ-calendar-filter${activeCategories.has(category) ? ' is-active' : ''}`}
            onClick={() => toggleCategory(category)}
            aria-pressed={activeCategories.has(category)}
          >
            {calendarCategories[category]}
          </button>
        ))}
      </div>

      {categoryOrder
        .filter((category) => activeCategories.has(category))
        .map((category) => {
          const eventsInCategory = realEstateCalendarEvents
            .filter((event) => event.category === category)
            .slice()
            .sort((a, b) => a.date.localeCompare(b.date))
          if (eventsInCategory.length === 0) return null

          return (
            <div className="indicator-group" key={category}>
              <h3 className="indicator-group__title">{calendarCategories[category]}</h3>
              <div className="econ-table-wrap">
                <table className="econ-table">
                  <colgroup>
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '6%' }} />
                    <col style={{ width: '44%' }} />
                    <col style={{ width: '9%' }} />
                    <col style={{ width: '9%' }} />
                    <col style={{ width: '9%' }} />
                    <col style={{ width: '9%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="econ-table__th--left">Time</th>
                      <th className="econ-table__th--center">Cur.</th>
                      <th className="econ-table__th--left">Event</th>
                      <th className="econ-table__th--center">Imp.</th>
                      <th className="econ-table__th--right">Actual</th>
                      <th className="econ-table__th--right">Forecast</th>
                      <th className="econ-table__th--right">Previous</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventsInCategory.map((event) => (
                      <tr key={event.id} className="econ-table__row econ-table__row--calendar">
                        <td className="econ-table__time">
                          {event.estimated && <span className="econ-table__est-mark">~</span>}
                          {formatEventDate(event)}
                          {event.time && <span className="econ-table__time-detail">{event.time}</span>}
                        </td>
                        <td className="econ-table__flag" aria-label="United States">
                          🇺🇸
                        </td>
                        <td className="econ-table__event">
                          <span className="econ-table__event-name">{event.event}</span>
                          <span className="econ-table__series">
                            {event.cadence} ·{' '}
                            <a href={event.sourceUrl} target="_blank" rel="noreferrer">
                              {event.source}
                            </a>
                          </span>
                          {event.note && <span className="econ-table__note">{event.note}</span>}
                        </td>
                        <td className="econ-table__cell--center">
                          <ImportanceStars importance={event.importance} />
                        </td>
                        <td className="econ-table__muted econ-table__cell--right">—</td>
                        <td className="econ-table__muted econ-table__cell--right">—</td>
                        <td className="econ-table__muted econ-table__cell--right">—</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}

      <p className="overview-section__footnote">
        Actual/Forecast/Previous are blank by design — every row here is a scheduled release date, not a
        reported number (ISM's Services PMI, Prices, and Employment indexes in particular aren't on FRED, so
        their values aren't tracked here at all — check the source link when they drop).
        {hasEstimatedRows && ' Dates marked ~ are best estimates pending an official schedule confirmation — verify against the linked source before a client conversation.'}
      </p>
    </section>
  )
}
