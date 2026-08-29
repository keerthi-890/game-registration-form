import { useState } from 'react'
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

function RegisterForm({ onRegisterSuccess }) {
  const [formData, setFormData] = useState(initialFormState)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [wantsPersonalizedAvatar, setWantsPersonalizedAvatar] = useState(false)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handlePhotoChange = (e) => {
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
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
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
      newErrors.photo = 'Profile photo is required.'
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
              <img src={photoPreview} alt="Profile preview" />
            ) : (
              <span className="photo-placeholder">No Photo</span>
            )}
          </div>
          <label className="file-input-label">
            Choose Photo
            <input type="file" accept="image/*" onChange={handlePhotoChange} hidden />
          </label>
          {errors.photo && <p className="error-text">{errors.photo}</p>}
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
            />
            Request a Personalized Avatar (based on my photo, ready within 48 hours)
          </label>
        </div>

        <button type="submit" className="submit-button" disabled={isSubmitting}>
          {isSubmitting ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>
    </div>
  )
}

export default RegisterForm