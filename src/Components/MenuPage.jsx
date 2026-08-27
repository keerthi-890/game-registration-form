import { useState, useEffect } from 'react'
import { getProfile, updateSelectedAvatar } from '../services/.profileService'
import { getSignedAvatarUrl } from '../services/storageService'
import '../Style/MenuPage.css'

const presetAvatars = [
  { id: 'avatar_1', label: 'Warrior', color: '#e17055' },
  { id: 'avatar_2', label: 'Mage', color: '#6c5ce7' },
  { id: 'avatar_3', label: 'Archer', color: '#00b894' },
  { id: 'avatar_4', label: 'Rogue', color: '#fdcb6e' },
]

function MenuPage({ user }) {
  const [profile, setProfile] = useState(null)
  const [myPhotoUrl, setMyPhotoUrl] = useState(null)
  const [selected, setSelected] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    async function loadProfile() {
      try {
        const profileData = await getProfile(user.id)
        setProfile(profileData)
        setSelected(profileData.selected_avatar || null)

        if (profileData.avatar_path) {
          const url = await getSignedAvatarUrl(profileData.avatar_path)
          setMyPhotoUrl(url)
        }
      } catch (err) {
        console.error('Failed to load profile:', err)
        setError('Could not load your profile.')
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [user.id])

  const handleConfirm = async () => {
    if (!selected) {
      setError('Please select an avatar first.')
      return
    }

    setError('')
    setIsSaving(true)
    try {
      await updateSelectedAvatar(user.id, selected)
      setSuccessMessage('Avatar saved!')
    } catch (err) {
      console.error('Failed to save avatar:', err)
      setError('Could not save your selection. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <p className="menu-status">Loading your profile...</p>
  }

  return (
    <div className="menu-container">
      <h1>Choose Your Avatar</h1>
      {error && <p className="submit-error">{error}</p>}
      {successMessage && <p className="submit-success">{successMessage}</p>}

      <div className="avatar-grid">
        {presetAvatars.map((avatar) => (
          <div
            key={avatar.id}
            className={`avatar-card ${selected === avatar.id ? 'selected' : ''}`}
            onClick={() => setSelected(avatar.id)}
          >
            <div className="avatar-circle" style={{ backgroundColor: avatar.color }}>
              {avatar.label[0]}
            </div>
            <span>{avatar.label}</span>
          </div>
        ))}

        {myPhotoUrl && (
          <div
            className={`avatar-card ${selected === 'custom_photo' ? 'selected' : ''}`}
            onClick={() => setSelected('custom_photo')}
          >
            <div className="avatar-circle photo-circle">
              <img src={myPhotoUrl} alt="My photo" />
            </div>
            <span>My Photo</span>
          </div>
        )}
      </div>

      <button className="submit-button" onClick={handleConfirm} disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Confirm Selection'}
      </button>
    </div>
  )
}

export default MenuPage