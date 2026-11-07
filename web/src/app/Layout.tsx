import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { authApi } from '../features/auth/authApi'
import { useRestoreSession } from '../features/auth/useRestoreSession'
import { config, isProduction } from '../lib/config'
import { hasRole, useSession } from '../lib/session'
import { Logo } from './Logo'

const navItems = [
  { to: '/destinations', label: 'Destinations' },
  { to: '/itineraries', label: 'Itineraries' },
  { to: '/safety', label: 'Safety' },
  { to: '/food', label: 'Food' },
]

function AccountMenu() {
  const user = useSession((s) => s.user)
  const restoring = useSession((s) => s.restoring)
  const refreshToken = useSession((s) => s.refreshToken)
  const signOut = useSession((s) => s.signOut)
  const navigate = useNavigate()

  if (restoring) return null
  if (!user) {
    return (
      <Link to="/login" className="text-sm font-semibold text-white/90 hover:text-white">
        Sign in
      </Link>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      {hasRole(user, 'TRAVELLER') && (
        <Link to="/trips" className="text-white/90 hover:text-white">
          My trips
        </Link>
      )}
      {hasRole(user, 'AGENT') && (
        <Link to="/agent" className="text-white/90 hover:text-white">
          Agent desk
        </Link>
      )}
      {hasRole(user, 'ADMIN') && (
        <Link to="/admin" className="text-white/90 hover:text-white">
          Admin
        </Link>
      )}
      <span className="font-semibold text-marigold-light">{user.displayName}</span>
      <button
        type="button"
        className="text-white/70 hover:text-white"
        onClick={() => {
          if (refreshToken) void authApi.logout(refreshToken).catch(() => undefined)
          signOut()
          navigate('/')
        }}
      >
        Sign out
      </button>
    </div>
  )
}

export function Layout() {
  useRestoreSession()
  const user = useSession((s) => s.user)

  return (
    <div className="flex min-h-screen flex-col bg-cream text-ink">
      {!isProduction && (
        <div role="status" className="bg-marigold-light px-4 py-1 text-center text-sm font-medium text-ink">
          {config.appEnv.toUpperCase()} environment — data here is not real
        </div>
      )}
      <header className="bg-indigo-night text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-display text-2xl font-bold">
            <Logo />
            Atithi
          </Link>
          <nav aria-label="Main" className="order-last flex w-full gap-4 overflow-x-auto text-sm sm:order-none sm:w-auto sm:flex-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => (isActive ? 'font-semibold text-marigold-light' : 'text-white/80 hover:text-white')}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <AccountMenu />
          {!hasRole(user, 'AGENT') && (
            <Link
              to="/plan"
              className="rounded-full bg-saffron px-4 py-2 text-sm font-semibold text-white hover:bg-saffron-dark"
            >
              Get free proposals
            </Link>
          )}
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="bg-ink px-4 py-8 text-sm text-white/80">
        <div className="mx-auto max-w-6xl space-y-2">
          <p>
            In an emergency in India, call <strong className="text-white">112</strong>. Tourist helpline (24×7, 12
            languages): <strong className="text-white">1363</strong> or 1800-11-1363.
          </p>
          <p className="text-white/60">Atithi is an independent travel marketplace, not a government service.</p>
        </div>
      </footer>
    </div>
  )
}
