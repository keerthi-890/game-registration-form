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
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function updateSelectedAvatar(userId, selectedAvatar) {
  const { error } = await supabase
    .from('profiles')
    .update({ selected_avatar: selectedAvatar })
    .eq('id', userId)

  if (error) {
    throw error
  }
}
export async function updateAvatar3dUrl(userId, avatarUrl) {
  const { error } = await supabase
    .from('profiles')
    .update({ avatar_3d_url: avatarUrl })
    .eq('id', userId)

  if (error) {
    throw error
  }
}