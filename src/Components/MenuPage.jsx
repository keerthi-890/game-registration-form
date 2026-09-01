import { useState, useEffect } from 'react'
import { getProfile, updateAvatar3dUrl } from '../services/.profileService'
import { getSignedAvatarUrl, uploadAvatar3dFile } from '../services/storageService'
import AvatarCreator from './AvatarCreator'
import '../Style/MenuPage.css'

function MenuPage({ user }) {
  const [profile, setProfile] = useState(null)
  const [myPhotoUrl, setMyPhotoUrl] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [showAvatarCreator, setShowAvatarCreator] = useState(false)
  const [showComingSoon, setShowComingSoon] = useState(false)

  useEffect(() => {
    async function loadProfile() {
      try {
        const profileData = await getProfile(user.id)
        setProfile(profileData)

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

  const handleAvatarExported = async (avatarDataUri) => {
    setShowAvatarCreator(false)
    setError('')
    setIsSaving(true)
    try {
      const hostedUrl = await uploadAvatar3dFile(user.id, avatarDataUri)
      await updateAvatar3dUrl(user.id, hostedUrl)
      setProfile((prev) => ({ ...prev, avatar_3d_url: hostedUrl }))
      setSuccessMessage('Your 3D character is ready!')
    } catch (err) {
      console.error('Failed to save 3D avatar:', err)
      setError('Could not save your 3D avatar.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleStartGame = () => {
    // TODO: replace with actual Unity WebGL handoff once the game build exists.
    // Will pass profile.avatar_3d_url into Unity via SendMessage at that point.
    setShowComingSoon(true)
  }

  if (isLoading) {
    return <p className="menu-status">Loading your profile...</p>
  }

  const has3dAvatar = Boolean(profile?.avatar_3d_url)

  return (
    <div className="menu-container">
      <h1 className="menu-title">Character Select</h1>
      <p className="menu-subtitle">Build your 3D character from your profile photo</p>

      {error && <p className="submit-error">{error}</p>}
      {successMessage && <p className="submit-success">{successMessage}</p>}

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
            {has3dAvatar ? (
              <span className="portrait-placeholder">3D Model Ready</span>
            ) : (
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
        {has3dAvatar ? (
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
            <button
              className="submit-button"
              style={{ marginTop: '14px', background: 'linear-gradient(180deg, #2ecc71, #27ae60)' }}
              onClick={handleStartGame}
            >
              Start Game
            </button>
          </>
        ) : (
          <button
            className="submit-button"
            onClick={() => setShowAvatarCreator(true)}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Create My Character'}
          </button>
        )}
      </div>

      {showComingSoon && (
        <div className="avatar-creator-modal">
          <div className="menu-container" style={{ maxWidth: '400px' }}>
            <h1 className="menu-title" style={{ fontSize: '22px' }}>Coming Soon</h1>
            <p className="menu-subtitle">
              The game is still being built. Once it's ready, this button will launch it
              with your character already loaded in.
            </p>
            <button className="switch-link" onClick={() => setShowComingSoon(false)}>
              Close
            </button>
          </div>
        </div>
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