import { useState, useEffect } from 'react'
import { getProfile } from '../services/.profileService'
import maleAvatar1 from '../assets/img1.jpeg'
import maleAvatar2 from '../assets/img2.jpeg'
import femaleAvatar1 from '../assets/img3.jpeg'
import femaleAvatar2 from '../assets/img4.jpeg'
import '../Style/MenuPage.css'

const presetAvatarOptions = [
  { id: 'base_male_1', label: 'Soldier (Green)', image: maleAvatar1 },
  { id: 'base_male_2', label: 'Soldier (Arctic)', image: maleAvatar2 },
  { id: 'base_female_1', label: 'Soldier (Arctic F)', image: femaleAvatar1 },
  { id: 'base_female_2', label: 'Soldier (Green F)', image: femaleAvatar2 },
]

function MenuPage({ user }) {
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedAvatarId, setSelectedAvatarId] = useState(null)
  const [showComingSoon, setShowComingSoon] = useState(false)

  useEffect(() => {
    async function loadProfile() {
      try {
        const profileData = await getProfile(user.id)
        setProfile(profileData)

        if (profileData.avatar_3d_url) {
          setSelectedAvatarId('personalized')
        } else {
          setSelectedAvatarId(presetAvatarOptions[0].id)
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

  const handleStartGame = () => {
    setShowComingSoon(true)
  }

  if (isLoading) {
    return <p className="menu-status">Loading your profile...</p>
  }

  const has3dAvatar = Boolean(profile?.avatar_3d_url)

  return (
    <div className="menu-container">
      <h1 className="menu-title">Character Select</h1>
      <p className="menu-subtitle">Choose a character to play with</p>

      {error && <p className="submit-error">{error}</p>}

      <div className="select-stage" style={{ flexWrap: 'wrap', gap: '20px' }}>
        <div
          className={`character-portrait ${has3dAvatar ? 'ready' : ''}`}
          style={{
            cursor: has3dAvatar ? 'pointer' : 'default',
            outline: selectedAvatarId === 'personalized' ? '3px solid #6c5ce7' : 'none',
            borderRadius: '14px',
            opacity: has3dAvatar ? 1 : 0.6,
          }}
          onClick={() => has3dAvatar && setSelectedAvatarId('personalized')}
        >
          <div className="portrait-frame">
            {has3dAvatar ? (
              <span className="portrait-placeholder">3D Model Ready</span>
            ) : (
              <span className="portrait-placeholder">Pending</span>
            )}
          </div>
          <div className="character-label">
            <h3>Your Character</h3>
            <span className={`status-badge ${has3dAvatar ? 'ready' : 'pending'}`}>
              {has3dAvatar ? 'Ready' : 'Pending'}
            </span>
          </div>
        </div>

        {presetAvatarOptions.map((avatar) => (
          <div
            key={avatar.id}
            className="character-portrait"
            style={{
              cursor: 'pointer',
              outline: selectedAvatarId === avatar.id ? '3px solid #6c5ce7' : 'none',
              borderRadius: '14px',
            }}
            onClick={() => setSelectedAvatarId(avatar.id)}
          >
            <div className="portrait-frame">
              <img src={avatar.image} alt={avatar.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div className="character-label">
              <h3>{avatar.label}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="action-panel">
        <button
          className="submit-button"
          style={{ background: 'linear-gradient(180deg, #2ecc71, #27ae60)' }}
          onClick={handleStartGame}
          disabled={!selectedAvatarId}
        >
          Start Game
        </button>
      </div>

      {showComingSoon && (
        <div className="avatar-creator-modal">
          <div className="menu-container" style={{ maxWidth: '400px' }}>
            <h1 className="menu-title" style={{ fontSize: '22px' }}>Coming Soon</h1>
            <p className="menu-subtitle">
              The game is still being built. Once it's ready, this button will launch it
              with your selected character loaded in.
            </p>
            <button className="switch-link" onClick={() => setShowComingSoon(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default MenuPage