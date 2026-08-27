import { useState, useEffect } from 'react'
import { supabase } from './lib/supabaseClient'
import RegisterForm from './components/RegisterForm'
import LoginForm from './components/LoginForm'
import MenuPage from './components/MenuPage'

function App() {
  const [currentView, setCurrentView] = useState('register')
  const [loggedInUser, setLoggedInUser] = useState(null)
  const [isCheckingSession, setIsCheckingSession] = useState(true)

  useEffect(() => {
    // Check if a session already exists when the app first loads
    async function checkExistingSession() {
      const { data } = await supabase.auth.getSession()

      if (data.session) {
        setLoggedInUser(data.session.user)
        setCurrentView('menu')
      }

      setIsCheckingSession(false)
    }

    checkExistingSession()

    // Listen for login/logout events happening anywhere in the app
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

    // Cleanup: stop listening when the component unmounts
    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const handleLoginSuccess = (user, session) => {
    setLoggedInUser(user)
    setCurrentView('menu')
  }

  const handleRegisterSuccess = () => {
    setCurrentView('login')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    // onAuthStateChange above will handle switching the view
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
    </div>
  )
}

export default App