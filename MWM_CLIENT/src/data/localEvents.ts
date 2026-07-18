export type LocalEventKind = 'local' | 'advisor'

export interface LocalEvent {
  id: string
  date: string
  endDate?: string
  dateLabel: string
  title: string
  place: string
  tag: 'WORKSHOP' | 'OPEN HOUSES' | 'ADVISOR EVENT' | 'COMMUNITY'
  kind: LocalEventKind
  rsvp?: boolean
  blurb: string
}

export const localEvents: LocalEvent[] = [
  {
    id: 'buyer-workshop',
    date: '2026-07-18',
    dateLabel: 'Sat Jul 18 - 10 AM',
    title: 'First-Time Homebuyer Workshop',
    place: 'SF Main Library, Koret Auditorium',
    tag: 'WORKSHOP',
    kind: 'local',
    blurb: 'Free 90-minute session on down payments, pre-approval, and CA assistance programs.',
  },
  {
    id: 'open-houses',
    date: '2026-07-19',
    endDate: '2026-07-20',
    dateLabel: 'Jul 19-20',
    title: 'Open House Weekend - Noe Valley & Bernal Heights',
    place: '14 listings, self-guided',
    tag: 'OPEN HOUSES',
    kind: 'local',
    blurb: 'Curated weekend route of open houses in your saved neighborhoods.',
  },
  {
    id: 'advisor-webinar',
    date: '2026-07-27',
    dateLabel: 'Mon Jul 27 - 5 PM',
    title: 'Webinar: Reading the FOMC - what it means for your rate',
    place: 'Zoom - hosted by your advisor',
    tag: 'ADVISOR EVENT',
    kind: 'advisor',
    rsvp: true,
    blurb: 'A 30-minute walk-through of the July Fed meeting, the day before it starts.',
  },
  {
    id: 'office-hours',
    date: '2026-08-07',
    dateLabel: 'Fri Aug 7 - 12-2 PM',
    title: 'Advisor office hours - drop-in Q&A',
    place: 'Zoom - no appointment needed',
    tag: 'ADVISOR EVENT',
    kind: 'advisor',
    blurb: 'Bring any question - rates, timing, paperwork. First come, first served.',
  },
  {
    id: 'housing-fair',
    date: '2026-08-22',
    dateLabel: 'Sat Aug 22 - 11 AM',
    title: 'Bay Area Housing Resource Fair',
    place: 'Oakland Convention Center',
    tag: 'COMMUNITY',
    kind: 'local',
    blurb: 'Lenders, city programs, and housing counselors under one roof.',
  },
]
