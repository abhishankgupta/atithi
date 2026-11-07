import type { ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { hasRole, useSession } from '../../lib/session'

/**
 * Sends signed-out visitors to sign in and back. With {@code role}, other account types see a short
 * explanation instead. With {@code verified}, unverified accounts are asked to verify their email first.
 */
export function RequireAuth({ children, role, verified }: { children: ReactNode; role?: string; verified?: boolean }) {
  const user = useSession((s) => s.user)
  const restoring = useSession((s) => s.restoring)
  const location = useLocation()
  const here = encodeURIComponent(location.pathname + location.search)

  if (restoring) return <p className="mx-auto max-w-6xl px-4 py-10 text-muted">Signing you in…</p>
  if (!user) return <Navigate to={`/login?next=${here}`} replace />
  if (role && !hasRole(user, role)) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="font-display text-3xl font-bold">This page isn't for your account</h1>
        <p className="mt-2 text-muted">It's only available to {role.toLowerCase()} accounts.</p>
        <Link to="/" className="mt-4 inline-block font-semibold text-saffron-dark underline">
          Back to the home page
        </Link>
      </section>
    )
  }
  if (verified && !user.emailVerified) return <Navigate to={`/verify-email?next=${here}`} replace />
  return <>{children}</>
}
