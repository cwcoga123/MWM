/**
 * Placeholder advisor contact info shown in the "Talk to your advisor" card.
 * Edit these fields with your real details before shipping.
 */
export interface AdvisorContact {
  name: string
  title: string
  phone: string
  email: string
  /** Inbox that receives "Share with your advisor" scenario emails. */
  shareEmail: string
  license: string
  scheduleUrl?: string
  photoInitials: string
}

export const advisorContact: AdvisorContact = {
  name: 'Minh',
  title: 'Deptrajvjppro',
  phone: 'your mom',
  email: 'your mom',
  shareEmail: 'cwcoga5@gmail.com',
  license: 'LIC#: #12345679',
  scheduleUrl: '#',
  photoInitials: 'M',
}
