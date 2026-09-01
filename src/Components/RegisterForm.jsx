import { useState, useEffect, useRef } from 'react'
import * as faceapi from 'face-api.js'
import '../Style/RegisterForm.css'
import { registerUser } from '../services/authService'
import { uploadProfilePhoto } from '../services/storageService'
import { createProfile } from '../services/.profileService'

const initialFormState = {
  username: '',
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
  dateOfBirth: '',
  country: '',
  agreedToTerms: false,
}

// Analyzes the image's pixel data to guess whether it's a real photo
// vs. a cartoon/illustration/flat-color avatar — no external API needed.
function analyzeIsRealPhoto(imgElement) {
  const canvas = document.createElement('canvas')
  const sampleSize = 100
  canvas.width = sampleSize
  canvas.height = sampleSize
  const ctx = canvas.getContext('2d')
  ctx.drawImage(imgElement, 0, 0, sampleSize, sampleSize)

  const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize)
  const pixels = imageData.data

  const colorSet = new Set()
  let edgeCount = 0
  const quantizeStep = 16
  const brightnessValues = []

  for (let i = 0; i < pixels.length; i += 4) {
    const r = Math.floor(pixels[i] / quantizeStep) * quantizeStep
    const g = Math.floor(pixels[i + 1] / quantizeStep) * quantizeStep
    const b = Math.floor(pixels[i + 2] / quantizeStep) * quantizeStep
    colorSet.add(`${r},${g},${b}`)
    brightnessValues.push((pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3)
  }

  const width = sampleSize
  const height = sampleSize
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width - 1; x++) {
      const idx = (y * width + x) * 4
      const idxNext = (y * width + x + 1) * 4
      const diff =
        Math.abs(pixels[idx] - pixels[idxNext]) +
        Math.abs(pixels[idx + 1] - pixels[idxNext + 1]) +
        Math.abs(pixels[idx + 2] - pixels[idxNext + 2])
      if (diff > 30) edgeCount++
    }
  }

  const totalPixels = sampleSize * sampleSize
  const uniqueColorRatio = colorSet.size / totalPixels
  const edgeRatio = edgeCount / totalPixels

  // Local texture variance: compare small 3x3 blocks, measure brightness fluctuation
  let textureVarianceSum = 0
  let blockCount = 0
  for (let y = 1; y < height - 1; y += 3) {
    for (let x = 1; x < width - 1; x += 3) {
      const centerIdx = y * width + x
      const neighbors = [
        brightnessValues[(y - 1) * width + x],
        brightnessValues[(y + 1) * width + x],
        brightnessValues[y * width + (x - 1)],
        brightnessValues[y * width + (x + 1)],
      ]
      const center = brightnessValues[centerIdx]
      const localVariance =
        neighbors.reduce((sum, n) => sum + Math.abs(n - center), 0) / neighbors.length
      textureVarianceSum += localVariance
      blockCount++
    }
  }
  const avgTextureVariance = textureVarianceSum / blockCount

  console.log('Photo analysis:', {
    uniqueColors: colorSet.size,
    uniqueColorRatio: uniqueColorRatio.toFixed(4),
    edgeRatio: edgeRatio.toFixed(4),
    avgTextureVariance: avgTextureVariance.toFixed(4),
  })

  // Score-based: count how many of the 3 signals suggest "real photo"
  let realPhotoScore = 0
  if (uniqueColorRatio > 0.01) realPhotoScore++
  if (edgeRatio > 0.15) realPhotoScore++
  if (avgTextureVariance > 3.5) realPhotoScore++

  const isRealPhoto = realPhotoScore >= 2 // majority vote

  return { isRealPhoto, uniqueColorRatio, edgeRatio, avgTextureVariance, realPhotoScore }
}

function RegisterForm({ onRegisterSuccess }) {
  const [formData, setFormData] = useState(initialFormState)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [wantsPersonalizedAvatar, setWantsPersonalizedAvatar] = useState(false)
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [isCheckingFace, setIsCheckingFace] = useState(false)
  const [hasValidFace, setHasValidFace] = useState(false)
  const imgRef = useRef(null)

  useEffect(() => {
    async function loadModels() {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models')
        setModelsLoaded(true)
        console.log('Face detection model loaded')
      } catch (err) {
        console.error('Failed to load face detection model:', err)
      }
    }
    loadModels()
  }, [])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    const maxSizeBytes = 2 * 1024 * 1024 // 2MB

    if (!validTypes.includes(file.type)) {
      setErrors((prev) => ({ ...prev, photo: 'Only JPG, PNG, or WEBP images are allowed.' }))
      return
    }
    if (file.size > maxSizeBytes) {
      setErrors((prev) => ({ ...prev, photo: 'Image must be smaller than 2MB.' }))
      return
    }

    setErrors((prev) => ({ ...prev, photo: undefined }))
    setHasValidFace(false)
    setPhotoFile(file)
    const previewUrl = URL.createObjectURL(file)
    setPhotoPreview(previewUrl)

    if (!modelsLoaded) {
      setErrors((prev) => ({ ...prev, photo: 'Face detection is still loading, please wait a moment and try again.' }))
      return
    }

    setIsCheckingFace(true)
    try {
      // Wait for the image element to actually render the new photo
      await new Promise((resolve) => setTimeout(resolve, 200))

      const img = imgRef.current
      if (!img) {
        setErrors((prev) => ({ ...prev, photo: 'Could not verify the photo. Please try again.' }))
        setIsCheckingFace(false)
        return
      }

      // Check 1: is there a face at all?
      const detection = await faceapi.detectSingleFace(
        img,
        new faceapi.TinyFaceDetectorOptions()
      )

      if (!detection) {
        setErrors((prev) => ({
          ...prev,
          photo: 'No face detected in this photo. Please upload a clear photo of your face.',
        }))
        setPhotoFile(null)
        setPhotoPreview(null)
        setHasValidFace(false)
        setIsCheckingFace(false)
        return
      }

      // Check 2: is it a real photo, not a cartoon/illustration? (local analysis, no API)
      const { isRealPhoto } = analyzeIsRealPhoto(img)

      if (!isRealPhoto) {
        setErrors((prev) => ({
          ...prev,
          photo: 'This does not look like a real photo. Please upload an actual photo of your face, not a cartoon or illustration.',
        }))
        setPhotoFile(null)
        setPhotoPreview(null)
        setHasValidFace(false)
      } else {
        setHasValidFace(true)
        setErrors((prev) => ({ ...prev, photo: undefined }))
      }
    } catch (err) {
      console.error('Photo verification error:', err)
      setErrors((prev) => ({ ...prev, photo: 'Could not verify the photo. Please try a different image.' }))
    } finally {
      setIsCheckingFace(false)
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required.'
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters.'
    }

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required.'
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required.'
    } else if (!emailPattern.test(formData.email)) {
      newErrors.email = 'Enter a valid email address.'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required.'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters.'
    }

    if (formData.confirmPassword !== formData.password) {
      newErrors.confirmPassword = 'Passwords do not match.'
    }

    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required.'
    }

    if (!formData.country) {
      newErrors.country = 'Please select your country.'
    }

    if (!formData.agreedToTerms) {
      newErrors.agreedToTerms = 'You must accept the terms and conditions.'
    }

    if (!photoFile) {
      newErrors.photo = 'A real face photo is required.'
    } else if (!hasValidFace) {
      newErrors.photo = 'Please upload a verified real face photo.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitError('')
    setSubmitSuccess(false)

    const isValid = validateForm()
    if (!isValid) return

    setIsSubmitting(true)

    try {
      const { user, session } = await registerUser(
        formData.email,
        formData.password
      )

      console.log('Auth signup successful. User ID:', user.id)

      const photoPath = await uploadProfilePhoto(
        user.id,
        photoFile
      )

      console.log('Photo uploaded:', photoPath)

      await createProfile({
        userId: user.id,
        username: formData.username,
        fullName: formData.fullName,
        dateOfBirth: formData.dateOfBirth,
        country: formData.country,
        avatarPath: photoPath,
      })

      console.log('Profile created successfully')

      setSubmitSuccess(true)
      onRegisterSuccess(user.id, wantsPersonalizedAvatar, user.email)
    } catch (error) {
      console.error('Registration error:', error)
      setSubmitError(error.message || 'Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="register-container">
      <form className="register-form" onSubmit={handleSubmit} noValidate>
        <h1 className="register-title">Create Your Player Account</h1>
        {submitError && <p className="submit-error">{submitError}</p>}
        {submitSuccess && <p className="submit-success">Account created! Check your email to confirm.</p>}
        <div className="photo-upload-section">
          <div className="photo-preview">
            {photoPreview ? (
              <img
                ref={imgRef}
                src={photoPreview}
                alt="Profile preview"
                crossOrigin="anonymous"
              />
            ) : (
              <span className="photo-placeholder">No Photo</span>
            )}
          </div>
          <label className="file-input-label">
            Choose Photo
            <input type="file" accept="image/*" onChange={handlePhotoChange} hidden />
          </label>
          {isCheckingFace && <p className="submit-success">Verifying photo...</p>}
          {hasValidFace && !isCheckingFace && <p className="submit-success">✓ Real face photo verified</p>}
          {errors.photo && <p className="error-text">{errors.photo}</p>}
          {!modelsLoaded && <p className="error-text">Loading face detection, please wait...</p>}
        </div>

        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            name="username"
            type="text"
            value={formData.username}
            onChange={handleChange}
          />
          {errors.username && <p className="error-text">{errors.username}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="fullName">Full Name</label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            value={formData.fullName}
            onChange={handleChange}
          />
          {errors.fullName && <p className="error-text">{errors.fullName}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
          />
          {errors.email && <p className="error-text">{errors.email}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
          />
          {errors.password && <p className="error-text">{errors.password}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
          />
          {errors.confirmPassword && <p className="error-text">{errors.confirmPassword}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="dateOfBirth">Date of Birth</label>
          <input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            value={formData.dateOfBirth}
            onChange={handleChange}
          />
          {errors.dateOfBirth && <p className="error-text">{errors.dateOfBirth}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="country">Country</label>
          <select
            id="country"
            name="country"
            value={formData.country}
            onChange={handleChange}
          >
            <option value="">Select country</option>
            <option value="India">India</option>
            <option value="United States">United States</option>
            <option value="United Kingdom">United Kingdom</option>
            <option value="Other">Other</option>
          </select>
          {errors.country && <p className="error-text">{errors.country}</p>}
        </div>

        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              name="agreedToTerms"
              checked={formData.agreedToTerms}
              onChange={handleChange}
            />
            I agree to the Terms and Conditions
          </label>
          {errors.agreedToTerms && <p className="error-text">{errors.agreedToTerms}</p>}
        </div>
        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={wantsPersonalizedAvatar}
              onChange={(e) => setWantsPersonalizedAvatar(e.target.checked)}
              disabled={!hasValidFace}
            />
            Request a Personalized Avatar (based on my photo, ready within 48 hours)
          </label>
          {!hasValidFace && (
            <p className="error-text">Upload a verified real face photo to unlock this option.</p>
          )}
        </div>

        <button type="submit" className="submit-button" disabled={isSubmitting || isCheckingFace}>
          {isSubmitting ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>
    </div>
  )
}

export default RegisterForm