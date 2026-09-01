import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const ADMIN_PASSWORD = 'changeme123' // TODO: change this to something only you and your sir know

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      const base64Only = result.split(',')[1]
      resolve(base64Only)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function AdminUploadPage() {
  const [passwordInput, setPasswordInput] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authError, setAuthError] = useState('')

  const [userId, setUserId] = useState('')
  const [glbFile, setGlbFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const handlePasswordSubmit = (e) => {
    e.preventDefault()
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAuthenticated(true)
      setAuthError('')
    } else {
      setAuthError('Incorrect password.')
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.glb')) {
      setError('Please upload a .glb file.')
      return
    }

    setError('')
    setGlbFile(file)
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')

    if (!userId.trim()) {
      setError('Please enter the User ID.')
      return
    }
    if (!glbFile) {
      setError('Please choose a .glb file to upload.')
      return
    }

    setIsUploading(true)
    try {
      const base64 = await fileToBase64(glbFile)

      const { data, error: fnError } = await supabase.functions.invoke('admin-upload-avatar', {
        body: { userId: userId.trim(), fileBase64: base64 },
      })

      if (fnError) {
        throw new Error(fnError.message || 'Upload failed.')
      }

      if (data?.error) {
        throw new Error(data.error)
      }

      setSuccessMessage(`Success! Avatar saved for user ${userId.trim()}.`)
      setUserId('')
      setGlbFile(null)
      e.target.reset()
    } catch (err) {
      console.error('Admin upload failed:', err)
      setError(err.message || 'Upload failed. Check the User ID and try again.')
    } finally {
      setIsUploading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="menu-container">
        <h1 className="menu-title">Admin Access</h1>
        <form onSubmit={handlePasswordSubmit}>
          <div className="form-group">
            <label htmlFor="adminPassword">Password</label>
            <input
              id="adminPassword"
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
            />
          </div>
          {authError && <p className="submit-error">{authError}</p>}
          <button type="submit" className="submit-button">
            Enter
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="menu-container">
      <h1 className="menu-title">Upload Finished Avatar</h1>
      <p className="menu-subtitle">
        Paste the User ID from the request email, then upload the finished .glb file.
      </p>

      {error && <p className="submit-error">{error}</p>}
      {successMessage && <p className="submit-success">{successMessage}</p>}

      <form onSubmit={handleUpload}>
        <div className="form-group">
          <label htmlFor="userId">User ID</label>
          <input
            id="userId"
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="e.g. 80d0c75b-f98c-4144-a21e-181e6512714d"
          />
        </div>

        <div className="form-group">
          <label htmlFor="glbFile">Finished Avatar (.glb file)</label>
          <input
            id="glbFile"
            type="file"
            accept=".glb"
            onChange={handleFileChange}
          />
        </div>

        <button type="submit" className="submit-button" disabled={isUploading}>
          {isUploading ? 'Uploading...' : 'Save Avatar to User'}
        </button>
      </form>
    </div>
  )
}

export default AdminUploadPage