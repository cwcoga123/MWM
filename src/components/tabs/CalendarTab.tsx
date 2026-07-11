import { RealEstateCalendar } from '../shared/RealEstateCalendar'

/**
 * Standalone Calendar tab — previously lived at the bottom of Overview.
 * Moved out to its own view so it doesn't compete for space with Rate Watch
 * and Run the Numbers. See src/components/shared/RealEstateCalendar.tsx and
 * src/data/realEstateCalendar.ts for the underlying data.
 */
export function CalendarTab() {
  return (
    <main className="mortgage-page" id="calendar">
      <header className="page-heading">
        <div>
          <p className="eyebrow">PLAN AHEAD</p>
          <h1>Calendar</h1>
          <p>Dates worth planning around — housing data, Fed events, and closing deadlines.</p>
        </div>
      </header>

      <RealEstateCalendar />
    </main>
  )
}
