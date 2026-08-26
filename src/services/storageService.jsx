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