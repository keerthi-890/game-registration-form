import { useState } from 'react'
import { updatePersonalizationRequest } from '../services/.profileService'
import maleAvatar1 from '../assets/img1.jpeg'
import maleAvatar2 from '../assets/img2.jpeg'
import femaleAvatar1 from '../assets/img3.jpeg'
import femaleAvatar2 from '../assets/img4.jpeg'
import { supabase } from '../lib/supabaseClient'

const baseAvatarOptions = [
  { id: 'base_male_1', label: 'Soldier (Green)', image: maleAvatar1 },
  { id: 'base_male_2', label: 'Soldier (Arctic)', image: maleAvatar2 },
  { id: 'base_female_1', label: 'Soldier (Arctic F)', image: femaleAvatar1 },
  { id: 'base_female_2', label: 'Soldier (Green F)', image: femaleAvatar2 },
]

function PersonalizeAvatarSelect({ userId, userEmail, onDone }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const current = baseAvatarOptions[currentIndex]

  const goPrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? baseAvatarOptions.length - 1 : prev - 1))
  }

  const goNext = () => {
    setCurrentIndex((prev) => (prev === baseAvatarOptions.length - 1 ? 0 : prev + 1))
  }

  const handleConfirm = async () => {
    setError('')
    setIsSaving(true)
    try {
      await updatePersonalizationRequest(userId, current.id)

      // Fire admin notification — don't block success if this fails
      supabase.functions.invoke('notify-admin', {
        body: { userId, userEmail, avatarChoice: current.label },
      }).catch((err) => console.error('Admin notify failed:', err))

      setSubmitted(true)
    } catch (err) {
      console.error('Failed to save personalization request:', err)
      setError('Could not save your request. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  if (submitted) {
    return (
      <div className="menu-container">
        <h1 className="menu-title">Request Submitted</h1>
        <p className="menu-subtitle">
          Your personalized avatar is being created. It will take up to 48 hours
          to appear in your game menu. We'll use your selected style and your
          profile photo to build it.
        </p>
        <button className="submit-button" onClick={onDone}>
          Continue to Login
        </button>
      </div>
    )
  }

  return (
    <div className="menu-container">
      <h1 className="menu-title">Choose a Base Avatar</h1>
      <p className="menu-subtitle">
        Pick the style closest to what you'd like. We'll personalize it using your photo.
      </p>

      {error && <p className="submit-error">{error}</p>}

      <div className="carousel-stage">
        <button className="carousel-arrow" onClick={goPrev} aria-label="Previous avatar">
          ‹
        </button>

        <div className="carousel-card">
          <div className="carousel-image-frame">
            <img src={current.image} alt={current.label} className="carousel-image" />
          </div>
          <h3>{current.label}</h3>
        </div>

        <button className="carousel-arrow" onClick={goNext} aria-label="Next avatar">
          ›
        </button>
      </div>

      <div className="carousel-dots">
        {baseAvatarOptions.map((avatar, index) => (
          <span
            key={avatar.id}
            className={`carousel-dot ${index === currentIndex ? 'active' : ''}`}
            onClick={() => setCurrentIndex(index)}
          />
        ))}
      </div>

      <button
        className="submit-button"
        onClick={handleConfirm}
        disabled={isSaving}
        style={{ marginTop: '30px' }}
      >
        {isSaving ? 'Saving...' : `Select ${current.label}`}
      </button>
    </div>
  )
}

export default PersonalizeAvatarSelect