import { useState, useEffect } from 'react'
import { supabase } from './lib/supabaseClient'
import RegisterForm from './Components/RegisterForm'
import LoginForm from './Components/LoginForm'
import MenuPage from './Components/MenuPage'
import PersonalizeAvatarSelect from './Components/PersonalizeAvatarSelect'
import AdminUploadPage from './Components/AdminUploadPage'

function App() {
  const [currentView, setCurrentView] = useState('register')
  const [loggedInUser, setLoggedInUser] = useState(null)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [pendingPersonalizeUserId, setPendingPersonalizeUserId] = useState(null)
  const [pendingPersonalizeUserEmail, setPendingPersonalizeUserEmail] = useState(null)

  useEffect(() => {
    async function checkExistingSession() {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        setLoggedInUser(data.session.user)
        setCurrentView('menu')
      }
      setIsCheckingSession(false)
    }

    checkExistingSession()

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setLoggedInUser(session.user)
        setCurrentView('menu')
      }
      if (event === 'SIGNED_OUT') {
        setLoggedInUser(null)
        setCurrentView('login')
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const handleLoginSuccess = (user, session) => {
    setLoggedInUser(user)
    setCurrentView('menu')
  }

  const handleRegisterSuccess = (userId, wantsPersonalizedAvatar, userEmail) => {
    if (wantsPersonalizedAvatar) {
      setPendingPersonalizeUserId(userId)
      setPendingPersonalizeUserEmail(userEmail)
      setCurrentView('personalize')
    } else {
      setCurrentView('login')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  if (isCheckingSession) {
    return <p style={{ color: 'white', textAlign: 'center', paddingTop: '60px' }}>Loading...</p>
  }

  return (
    <div>
      {currentView === 'register' && (
        <>
          <RegisterForm onRegisterSuccess={handleRegisterSuccess} />
          <p className="switch-link">
            Already have an account?{' '}
            <button onClick={() => setCurrentView('login')}>Log In</button>
          </p>
        </>
      )}

      {currentView === 'login' && (
        <>
          <LoginForm onLoginSuccess={handleLoginSuccess} />
          <p className="switch-link">
            Don't have an account?{' '}
            <button onClick={() => setCurrentView('register')}>Register</button>
          </p>
        </>
      )}

      {currentView === 'menu' && loggedInUser && (
        <>
          <MenuPage user={loggedInUser} />
          <p className="switch-link">
            <button onClick={handleLogout}>Log Out</button>
          </p>
        </>
      )}

      {currentView === 'personalize' && pendingPersonalizeUserId && (
        <PersonalizeAvatarSelect
          userId={pendingPersonalizeUserId}
          userEmail={pendingPersonalizeUserEmail}
          onDone={() => setCurrentView('login')}
        />
      )}

      {currentView === 'admin' && <AdminUploadPage />}

      <p style={{ textAlign: 'center', marginTop: '20px' }}>
        <button
          style={{ background: 'none', border: 'none', color: '#555', fontSize: '12px', cursor: 'pointer' }}
          onClick={() => setCurrentView('admin')}
        >
          Admin
        </button>
      </p>
    </div>
  )
}

export default App