import { create } from 'zustand'

export interface SessionUser {
  id: string
  displayName: string
  email: string
  country: string | null
  roles: string[]
  emailVerified: boolean
}

export interface AuthResponse {
  accessToken: string
  accessTokenExpiresIn: number
  refreshToken: string
  user: SessionUser
}

const REFRESH_KEY = 'atithi.refreshToken'

/**
 * The access token lives only in memory. The refresh token is kept in localStorage so a
 * returning visitor stays signed in. (The API and web app are on different domains, so an
 * HttpOnly cookie isn't usable until both move under one custom domain.)
 */
export function readStoredRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_KEY)
  } catch {
    return null
  }
}

function storeRefreshToken(token: string | null) {
  try {
    if (token) localStorage.setItem(REFRESH_KEY, token)
    else localStorage.removeItem(REFRESH_KEY)
  } catch {
    // Storage can be unavailable (private mode); the session then lasts for this tab only.
  }
}

interface SessionState {
  user: SessionUser | null
  accessToken: string | null
  refreshToken: string | null
  /** True until the stored refresh token has been tried on page load. */
  restoring: boolean
  signIn: (auth: AuthResponse) => void
  updateUser: (user: Partial<SessionUser>) => void
  signOut: () => void
  finishRestoring: () => void
}

export const useSession = create<SessionState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: readStoredRefreshToken(),
  restoring: readStoredRefreshToken() !== null,
  signIn: (auth) => {
    storeRefreshToken(auth.refreshToken)
    set({ user: auth.user, accessToken: auth.accessToken, refreshToken: auth.refreshToken, restoring: false })
  },
  updateUser: (patch) => set((s) => (s.user ? { user: { ...s.user, ...patch } } : s)),
  signOut: () => {
    storeRefreshToken(null)
    set({ user: null, accessToken: null, refreshToken: null, restoring: false })
  },
  finishRestoring: () => set({ restoring: false }),
}))

export const hasRole = (user: SessionUser | null, role: string) => !!user?.roles.includes(role)
