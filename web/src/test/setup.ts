import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { useSession } from '../lib/session'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  try {
    localStorage.clear()
  } catch {
    // ignore
  }
  useSession.setState({ user: null, accessToken: null, refreshToken: null, restoring: false })
})
