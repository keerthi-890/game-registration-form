import { supabase } from '../lib/supabaseClient'

export async function createProfile({
  userId,
  username,
  fullName,
  dateOfBirth,
  country,
  avatarPath,
}) {
  const { error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      username,
      full_name: fullName,
      date_of_birth: dateOfBirth,
      country,
      avatar_path: avatarPath,
    })

  if (error) {
    throw error
  }
}