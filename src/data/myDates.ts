export type MyDateKind = 'lock' | 'home' | 'generic'

export interface MyDate {
  id: string
  title: string
  date: string
  kind: MyDateKind
  byUser: boolean
  sub: string
}

export const defaultMyDates: MyDate[] = [
  {
    id: 'rate-lock',
    title: 'Rate lock expires',
    date: '2026-08-02',
    kind: 'lock',
    byUser: false,
    sub: 'added by your advisor',
  },
  {
    id: 'closing',
    title: 'Closing date',
    date: '2026-08-15',
    kind: 'home',
    byUser: false,
    sub: 'added by your advisor',
  },
]
