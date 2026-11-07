import { Link, Outlet } from 'react-router'
import { config, isProduction } from '../lib/config'
import { Logo } from './Logo'

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-cream text-ink">
      {!isProduction && (
        <div role="status" className="bg-marigold-light px-4 py-1 text-center text-sm font-medium text-ink">
          {config.appEnv.toUpperCase()} environment — data here is not real
        </div>
      )}
      <header className="bg-indigo-night text-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-display text-2xl font-bold">
            <Logo />
            Atithi
          </Link>
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
