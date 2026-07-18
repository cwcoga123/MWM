import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabasePublishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY
)?.trim()

function getConfigurationError() {
  if (!supabaseUrl || !supabasePublishableKey) {
    return 'Supabase environment variables are missing.'
  }

  if (
    supabaseUrl.includes('your-project') ||
    supabasePublishableKey.includes('your-publishable-key') ||
    supabasePublishableKey.includes('your-anon-key')
  ) {
    return 'Supabase environment variables still contain placeholder values.'
  }

  try {
    const url = new URL(supabaseUrl)
    if (!['http:', 'https:'].includes(url.protocol)) {
      return 'VITE_SUPABASE_URL must be an HTTP or HTTPS URL.'
    }
  } catch {
    return 'VITE_SUPABASE_URL is not a valid URL.'
  }

  return null
}

export const supabaseConfigurationError = getConfigurationError()
export const isSupabaseConfigured = supabaseConfigurationError === null

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabasePublishableKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null
