import { useState, useEffect } from 'react'
import { getProfile, updateAvatar3dUrl, updateSelectedAvatar } from '../services/.profileService'
import { getSignedAvatarUrl, uploadAvatar3dFile } from '../services/storageService'
import AvatarCreator from './AvatarCreator'
import '../Style/MenuPage.css'

import maleAvatar1 from '../assets/img1.jpeg'
import maleAvatar2 from '../assets/img2.jpeg'
import femaleAvatar1 from '../assets/img3.jpeg'
import femaleAvatar2 from '../assets/img4.jpeg'

const presetAvatars = [
  { id: 'preset_1', label: 'Soldier (Green)', image: maleAvatar1 },
  { id: 'preset_2', label: 'Soldier (Arctic)', image: maleAvatar2 },
  { id: 'preset_3', label: 'Soldier (Arctic F)', image: femaleAvatar1 },
  { id: 'preset_4', label: 'Soldier (Green F)', image: femaleAvatar2 },
]
function MenuPage({ user }) {
  const [profile, setProfile] = useState(null)
  const [myPhotoUrl, setMyPhotoUrl] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [showAvatarCreator, setShowAvatarCreator] = useState(false)
  const [mode, setMode] = useState(null)

  useEffect(() => {
    async function loadProfile() {
      try {
        const profileData = await getProfile(user.id)
        setProfile(profileData)

        if (profileData.avatar_path) {
          const url = await getSignedAvatarUrl(profileData.avatar_path)
          setMyPhotoUrl(url)
        }

        if (profileData.avatar_3d_url) {
          setMode('custom')
        } else if (profileData.selected_avatar) {
          setMode('preset')
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

  const handlePresetSelect = async (presetId) => {
    setError('')
    setIsSaving(true)
    try {
      await updateSelectedAvatar(user.id, presetId)
      setProfile((prev) => ({ ...prev, selected_avatar: presetId, avatar_3d_url: null }))
      setSuccessMessage('Avatar selected!')
    } catch (err) {
      console.error('Failed to save preset avatar:', err)
      setError('Could not save your avatar selection.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAvatarExported = async (avatarDataUri) => {
    setShowAvatarCreator(false)
    setError('')
    setIsSaving(true)
    try {
      const hostedUrl = await uploadAvatar3dFile(user.id, avatarDataUri)
      await updateAvatar3dUrl(user.id, hostedUrl)
      setProfile((prev) => ({ ...prev, avatar_3d_url: hostedUrl, selected_avatar: null }))
      setSuccessMessage('Your 3D character is ready!')
    } catch (err) {
      console.error('Failed to save 3D avatar:', err)
      setError('Could not save your 3D avatar.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <p className="menu-status">Loading your profile...</p>
  }

  const has3dAvatar = Boolean(profile?.avatar_3d_url)

  return (
    <div className="menu-container">
      <h1 className="menu-title">Character Select</h1>
      <p className="menu-subtitle">Choose a preset character or create one from your photo</p>

      {error && <p className="submit-error">{error}</p>}
      {successMessage && <p className="submit-success">{successMessage}</p>}

      {!mode && (
        <div className="mode-picker">
          <button className="mode-card" onClick={() => setMode('preset')}>
            <span className="mode-icon">🎭</span>
            <h3>Choose a Preset Avatar</h3>
            <p>Pick from ready-made characters</p>
          </button>
          <button className="mode-card" onClick={() => setMode('custom')}>
            <span className="mode-icon">📸</span>
            <h3>Create From My Photo</h3>
            <p>Generate a 3D character using your photo</p>
          </button>
        </div>
      )}

      {mode === 'preset' && (
        <>
          <div className="select-stage">
            {presetAvatars.map((avatar) => (
              <div
                key={avatar.id}
                className={`character-portrait clickable ${profile?.selected_avatar === avatar.id ? 'ready' : ''}`}
                onClick={() => handlePresetSelect(avatar.id)}
              >
                <div className="portrait-frame">
  <img src={avatar.image} alt={avatar.label} className="preset-avatar-image" />
</div>
                <div className="character-label">
                  <h3>{avatar.label}</h3>
                  {profile?.selected_avatar === avatar.id && (
                    <span className="status-badge ready">Selected</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button className="switch-link" onClick={() => setMode(null)}>
            ← Back to choices
          </button>
        </>
      )}

      {mode === 'custom' && (
        <>
          <div className="select-stage">
            <div className="character-portrait">
              <div className="portrait-frame">
                {myPhotoUrl ? (
                  <img src={myPhotoUrl} alt="Your profile photo" />
                ) : (
                  <span className="portrait-placeholder">No Photo</span>
                )}
              </div>
              <div className="character-label">
                <h3>Source Photo</h3>
                <p>{user.email}</p>
              </div>
            </div>

            <div className={`character-portrait ${has3dAvatar ? 'ready' : ''}`}>
              <div className="portrait-frame">
                {has3dAvatar && (
                  <model-viewer
                    src={profile.avatar_3d_url}
                    camera-controls="true"
                    auto-rotate="true"
                    camera-orbit="0deg 75deg auto"
                    field-of-view="30deg"
                    style={{ width: '100%', height: '100%' }}
                  ></model-viewer>
                )}
                {!has3dAvatar && (
                  <span className="portrait-placeholder">Not Created Yet</span>
                )}
              </div>
              <div className="character-label">
                <h3>Your Character</h3>
                <span className={`status-badge ${has3dAvatar ? 'ready' : 'pending'}`}>
                  {has3dAvatar ? 'Ready' : 'Pending'}
                </span>
              </div>
            </div>
          </div>

          <div className="action-panel">
            {has3dAvatar && (
              <>
                
                  <a href={profile.avatar_3d_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glb-link"
                >
                  View / Download 3D Character (.glb)
                </a>
                <button
                  className="submit-button"
                  onClick={() => setShowAvatarCreator(true)}
                >
                  Recreate Character
                </button>
              </>
            )}
            {!has3dAvatar && (
              <button
                className="submit-button"
                onClick={() => setShowAvatarCreator(true)}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Create My Character'}
              </button>
            )}
          </div>

          <button className="switch-link" onClick={() => setMode(null)}>
            ← Back to choices
          </button>
        </>
      )}

      {showAvatarCreator && (
        <div className="avatar-creator-modal">
          <AvatarCreator onAvatarExported={handleAvatarExported} />
          <button className="switch-link" onClick={() => setShowAvatarCreator(false)}>
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

export default MenuPage