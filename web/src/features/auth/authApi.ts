import { apiRequest } from '../../lib/api'
import type { AuthResponse, SessionUser } from '../../lib/session'

export type AccountType = 'TRAVELLER' | 'AGENT'

export interface CodeIssued {
  expiresInSeconds: number
  /** Outside production, with no email provider yet, the API returns the code so it can be shown on screen. */
  testCode: string | null
}

export const authApi = {
  register: (body: { email: string; password: string; displayName: string; country?: string; accountType: AccountType }) =>
    apiRequest<AuthResponse>('/api/v1/auth/register', { body }),
  login: (body: { email: string; password: string }) => apiRequest<AuthResponse>('/api/v1/auth/login', { body }),
  logout: (refreshToken: string) => apiRequest<void>('/api/v1/auth/logout', { body: { refreshToken } }),
  sendCode: () => apiRequest<CodeIssued>('/api/v1/me/email/send-code', { method: 'POST', auth: true }),
  verify: (code: string) => apiRequest<SessionUser>('/api/v1/me/email/verify', { body: { code }, auth: true }),
}
