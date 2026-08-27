import { supabase } from '../lib/supabaseClient'

export async function uploadProfilePhoto(userId, file) {
  const fileExtension = file.name.split('.').pop().toLowerCase()

  const filePath = `${userId}/profile.${fileExtension}`

  const { error } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, {
      upsert: true,
    })

  if (error) {
    throw error
  }

  return filePath
}
export async function getSignedAvatarUrl(filePath) {
  const { data, error } = await supabase.storage
    .from('avatars')
    .createSignedUrl(filePath, 60 * 60) // valid for 1 hour

  if (error) {
    throw error
  }

  return data.signedUrl
}