import { useEffect, useState } from 'react'
import { RegisterPage } from './features/auth/pages/register-page'
import { VerifyEmailPage } from './features/auth/pages/verify-email-page'
import { AcceptAdminInvitationPage } from './features/auth/pages/accept-admin-invitation-page'
import { LoginPage } from './features/auth/pages/login-page'
import { UniversityAdminPage } from './features/universities/pages/university-admin-page'
import { AcademicStructureAdminPage } from './features/universities/pages/academic-structure-admin-page'
import { UserManagementPage } from './features/administration/pages/user-management-page'
import { DirectorProfilePage } from './features/profiles/pages/director-profile-page'
import { DirectorProfileReviewPage } from './features/profiles/pages/director-profile-review-page'
import { ExplorePage } from './features/home/pages/explore-page'
import { HomePage } from './features/home/pages/home-page'
import { WelcomePage } from './features/home/pages/welcome-page'
import { authApi } from './features/auth/api/auth-api'
import { setAccessToken } from './shared/api/api-client'
import type { AuthSession, AuthenticatedUser } from './features/auth/types/auth-types'
import './App.css'

let restoreSessionPromise: Promise<AuthSession> | null = null

function restoreSession(): Promise<AuthSession> {
  restoreSessionPromise ??= authApi
    .refresh()
    .finally(() => {
      restoreSessionPromise = null
    })
  return restoreSessionPromise
}

function routeForRole(role: AuthenticatedUser['role']): string {
  if (role === 'ADMIN_GLOBAL') return '/admin/global'
  if (role === 'ADMIN_LOCAL') return '/admin/university'
  return '/home'
}

function App() {
  const verificationToken = new URLSearchParams(window.location.search).get(
    'verify',
  )
  const adminInvitationToken = new URLSearchParams(
    window.location.search,
  ).get('admin-setup')
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [currentPath, setCurrentPath] = useState(window.location.pathname)
  const [isRestoring, setIsRestoring] = useState(
    () => !verificationToken && !adminInvitationToken,
  )
  const [notice, setNotice] = useState('')

  const navigate = (path: string) => {
    window.history.replaceState({}, '', path)
    setCurrentPath(path)
  }

  useEffect(() => {
    if (verificationToken || adminInvitationToken) return

    let active = true
    void restoreSession()
      .then((session) => {
        if (!active) return
        setAccessToken(session.accessToken)
        setUser(session.user)
        const isUserManagementRoute =
          window.location.pathname === '/admin/users' &&
          (session.user.role === 'ADMIN_GLOBAL' ||
            session.user.role === 'ADMIN_LOCAL')
        const isDirectorReviewRoute =
          window.location.pathname === '/admin/director-reviews' &&
          session.user.role === 'ADMIN_LOCAL'
        const isDirectorProfileRoute =
          window.location.pathname === '/director/profile' &&
          session.user.role === 'DIRECTOR'
        const isExploreRoute =
          window.location.pathname.startsWith('/projects') &&
          (session.user.role === 'DIRECTOR' || session.user.role === 'STUDENT')
        const path = isUserManagementRoute
          ? '/admin/users'
          : isDirectorReviewRoute
            ? '/admin/director-reviews'
            : isDirectorProfileRoute
              ? '/director/profile'
              : isExploreRoute
                ? '/projects'
                : routeForRole(session.user.role)
        window.history.replaceState({}, '', path)
        setCurrentPath(path)
      })
      .catch(() => {
        setAccessToken(null)
      })
      .finally(() => {
        if (active) setIsRestoring(false)
      })

    return () => {
      active = false
    }
  }, [adminInvitationToken, verificationToken])

  const handleLogin = (session: AuthSession) => {
    setAccessToken(session.accessToken)
    setUser(session.user)
    setNotice('')
    navigate(routeForRole(session.user.role))
  }

  const handleLogout = async () => {
    setNotice('')
    try {
      await authApi.logout()
    } catch {
      setNotice('No se pudo confirmar el cierre con el servidor. Vuelve a iniciar sesión.')
    } finally {
      setAccessToken(null)
      setUser(null)
      navigate('/login')
    }
  }

  if (verificationToken) {
    return <VerifyEmailPage token={verificationToken} />
  }

  if (adminInvitationToken) {
    return <AcceptAdminInvitationPage token={adminInvitationToken} />
  }

  if (isRestoring) {
    return (
      <main className="auth-shell">
        <section className="auth-main">
          <div className="status-card" role="status">Comprobando tu sesión…</div>
        </section>
      </main>
    )
  }

  if (user) {
    if (
      (user.role === 'STUDENT' || user.role === 'DIRECTOR') &&
      currentPath.startsWith('/projects')
    ) {
      return (
        <ExplorePage
          isAuthenticated
          onNavigate={navigate}
        />
      )
    }
    if (
      user.role === 'ADMIN_LOCAL' &&
      currentPath === '/admin/director-reviews'
    ) {
      return (
        <DirectorProfileReviewPage
          onBack={() => navigate('/admin/university')}
          onManageUsers={() => navigate('/admin/users')}
          onLogout={handleLogout}
        />
      )
    }
    if (
      user.role === 'DIRECTOR' &&
      currentPath === '/director/profile'
    ) {
      return (
        <DirectorProfilePage
          directorName={`${user.firstName} ${user.lastName}`}
          onBack={() => navigate('/home')}
          onLogout={handleLogout}
        />
      )
    }
    if (
      currentPath === '/admin/users' &&
      (user.role === 'ADMIN_GLOBAL' || user.role === 'ADMIN_LOCAL')
    ) {
      return (
        <UserManagementPage
          role={user.role}
          onBack={() =>
            navigate(
              user.role === 'ADMIN_GLOBAL'
                ? '/admin/global'
                : '/admin/university',
            )
          }
          onReviewDirectors={
            user.role === 'ADMIN_LOCAL'
              ? () => navigate('/admin/director-reviews')
              : undefined
          }
          onLogout={handleLogout}
        />
      )
    }
    if (user.role === 'ADMIN_GLOBAL') {
      return (
        <UniversityAdminPage
          onLogout={handleLogout}
          onManageUsers={() => navigate('/admin/users')}
        />
      )
    }
    if (user.role === 'ADMIN_LOCAL') {
      return (
        <AcademicStructureAdminPage
          administratorName={`${user.firstName} ${user.lastName}`}
          onLogout={handleLogout}
          onManageUsers={() => navigate('/admin/users')}
          onReviewDirectors={() => navigate('/admin/director-reviews')}
        />
      )
    }
    return (
      <HomePage
        user={user}
        onExplore={() => navigate('/projects')}
        onLogout={handleLogout}
        onManageProfile={
          user.role === 'DIRECTOR'
            ? () => navigate('/director/profile')
            : undefined
        }
      />
    )
  }

  if (currentPath.startsWith('/projects')) {
    return <ExplorePage isAuthenticated={false} onNavigate={navigate} />
  }

  if (currentPath === '/login' || currentPath.startsWith('/admin')) {
    return <LoginPage onLogin={handleLogin} notice={notice} />
  }

  if (currentPath === '/register') return <RegisterPage />

  return <WelcomePage onNavigate={navigate} />
}

export default App
