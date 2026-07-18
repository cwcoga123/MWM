import { supabase } from './supabase'

export interface AdvisorEmailInput {
  subject: string
  message: string
}

/**
 * Sends an email to the advisor through the `send-advisor-email` edge
 * function. Resolves to true when the email was accepted, false when Supabase
 * isn't configured or sending fails — callers should fall back to opening an
 * email draft so the client is never stuck.
 */
export async function sendAdvisorEmail({ subject, message }: AdvisorEmailInput): Promise<boolean> {
  if (!supabase) return false

  let clientName: string | undefined
  let clientEmail: string | undefined
  try {
    const { data } = await supabase.auth.getUser()
    clientEmail = data.user?.email ?? undefined
    const metadataName = data.user?.user_metadata?.full_name
    clientName =
      typeof metadataName === 'string' && metadataName.trim() ? metadataName.trim() : undefined
  } catch {
    // Identity enrichment is optional — send without it.
  }

  try {
    const { error } = await supabase.functions.invoke('send-advisor-email', {
      body: { subject, message, clientName, clientEmail },
    })
    return !error
  } catch {
    return false
  }
}
