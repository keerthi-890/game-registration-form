import { supabase } from '../lib/supabaseClient'

export async function registerUser(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    throw error
  }

  return data // contains { user, session }
}