import { useEffect } from 'react'
import { refreshSession } from '../../lib/api'
import { useSession } from '../../lib/session'

/** On page load, turns a stored refresh token back into a signed-in session. */
export function useRestoreSession() {
  useEffect(() => {
    const { restoring, finishRestoring } = useSession.getState()
    if (!restoring) return
    void refreshSession().finally(finishRestoring)
  }, [])
}
