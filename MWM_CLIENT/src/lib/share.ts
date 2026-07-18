import { advisorContact } from '../data/advisor'

/**
 * Reusable "Share with your advisor" plumbing. Any tool (calculator or
 * otherwise) can describe its current scenario as a list of sections and get
 * back a plain-text summary or a prefilled mailto: draft addressed to the
 * advisor's share inbox. Keep summaries compact — mailto URLs have practical
 * length limits (~2,000 characters) in some mail clients, so share key
 * figures, not full tables.
 */
export interface ShareEntry {
  label: string
  value: string
}

export interface ShareSection {
  title: string
  entries: ShareEntry[]
}

export function buildShareSummary(tool: string, sections: ShareSection[]): string {
  const lines: string[] = [
    `Hi ${advisorContact.name},`,
    '',
    `I ran a scenario in the "${tool}" tool on the MWM Client Hub and would like to review it with you.`,
  ]

  for (const section of sections) {
    lines.push('', section.title.toUpperCase())
    for (const entry of section.entries) {
      lines.push(`- ${entry.label}: ${entry.value}`)
    }
  }

  lines.push('', 'Sent from the MWM Client Hub')
  return lines.join('\r\n')
}

export function buildShareSubject(tool: string): string {
  return `MWM Client Hub - ${tool} scenario`
}

export function buildShareMailtoUrl(tool: string, sections: ShareSection[]): string {
  const body = buildShareSummary(tool, sections)
  return `mailto:${advisorContact.shareEmail}?subject=${encodeURIComponent(buildShareSubject(tool))}&body=${encodeURIComponent(body)}`
}
