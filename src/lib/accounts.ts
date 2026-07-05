import { supabase } from './supabase'

export type AccountRole = 'client' | 'advisor' | 'admin'
export type AccountStatus = 'active' | 'disabled'

export interface AccountProfile {
  id: string
  email: string | null
  full_name: string | null
  phone: string | null
  account_role: AccountRole
  account_status: AccountStatus
  created_at: string
  updated_at: string
}

export async function getAccountProfile(userId: string) {
  if (!supabase) throw new Error('Supabase is not configured.')

  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, email, full_name, phone, account_role, account_status, created_at, updated_at',
    )
    .eq('id', userId)
    .single()

  if (error) throw error

  return data as AccountProfile
}

