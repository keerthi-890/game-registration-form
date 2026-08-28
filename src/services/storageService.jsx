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
    .createSignedUrl(filePath, 60 * 60)

  if (error) {
    throw error
  }

  return data.signedUrl
}

export async function uploadAvatar3dFile(userId, dataUri) {
  const response = await fetch(dataUri)
  const blob = await response.blob()

  const filePath = `${userId}/character.glb`

  const { error } = await supabase.storage
    .from('avatars')
    .upload(filePath, blob, {
      contentType: 'model/gltf-binary',
      upsert: true,
    })

  if (error) {
    throw error
  }

  const { data, error: signedError } = await supabase.storage
    .from('avatars')
    .createSignedUrl(filePath, 60 * 60 * 24 * 7)

  if (signedError) {
    throw signedError
  }

  return data.signedUrl
}
export async function getPresetAvatarUrl(fileName) {
  const { data, error } = await supabase.storage
    .from('avatars')
    .createSignedUrl(fileName, 60 * 60 * 24 * 30) // valid for 30 days

  if (error) {
    throw error
  }

  return data.signedUrl
}
