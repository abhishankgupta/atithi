import { config } from './config'
import { useSession, type AuthResponse } from './session'

/** RFC 7807 error body returned by the API. */
export interface ApiProblem {
  title?: string
  status?: number
  detail?: string
  code?: string
  fieldErrors?: { field: string; message: string }[]
}

export class ApiError extends Error {
  readonly status: number
  readonly problem?: ApiProblem

  constructor(status: number, problem?: ApiProblem) {
    super(problem?.detail ?? `Request failed with status ${status}`)
    this.status = status
    this.problem = problem
  }

  get code(): string | undefined {
    return this.problem?.code
  }
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

interface RequestOptions {
  method?: Method
  body?: unknown
  /** Send the access token, refreshing it once if it has expired. */
  auth?: boolean
}

async function rawRequest<T>(path: string, method: Method, body: unknown, token: string | null): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) {
    let problem: ApiProblem | undefined
    try {
      problem = (await response.json()) as ApiProblem
    } catch {
      problem = undefined
    }
    throw new ApiError(response.status, problem)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

let refreshInFlight: Promise<boolean> | null = null

/** Swaps the stored refresh token for a new pair. Concurrent callers share one request. */
export function refreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight
  const { refreshToken } = useSession.getState()
  if (!refreshToken) return Promise.resolve(false)

  refreshInFlight = rawRequest<AuthResponse>('/api/v1/auth/refresh', 'POST', { refreshToken }, null)
    .then((auth) => {
      useSession.getState().signIn(auth)
      return true
    })
    .catch((error: unknown) => {
      // Only a definite rejection ends the session; a network blip keeps the token for next time.
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        useSession.getState().signOut()
      }
      return false
    })
    .finally(() => {
      refreshInFlight = null
    })
  return refreshInFlight
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? (options.body === undefined ? 'GET' : 'POST')
  if (!options.auth) return rawRequest<T>(path, method, options.body, null)

  let token = useSession.getState().accessToken
  if (!token && (await refreshSession())) token = useSession.getState().accessToken
  try {
    return await rawRequest<T>(path, method, options.body, token)
  } catch (error) {
    if (error instanceof ApiError && error.status === 401 && (await refreshSession())) {
      return rawRequest<T>(path, method, options.body, useSession.getState().accessToken)
    }
    throw error
  }
}

export function getJson<T>(path: string): Promise<T> {
  return apiRequest<T>(path)
}

/** GET with the access token. */
export function getPrivate<T>(path: string): Promise<T> {
  return apiRequest<T>(path, { auth: true })
}

/**
 * The general error message, unless every field error is already shown next to one of
 * {@code shownFields} (then nothing, so the same message doesn't appear twice).
 */
export function formError(error: unknown, shownFields: string[]): string | undefined {
  if (error instanceof ApiError) {
    const fields = error.problem?.fieldErrors ?? []
    if (fields.length > 0 && fields.every((f) => shownFields.includes(f.field))) return undefined
  }
  return errorMessage(error)
}

/** The first validation message for a field, or the general error message. */
export function errorMessage(error: unknown, field?: string): string | undefined {
  if (!error) return undefined
  if (error instanceof ApiError) {
    if (field) return error.problem?.fieldErrors?.find((f) => f.field === field)?.message
    const fieldErrors = error.problem?.fieldErrors ?? []
    if (fieldErrors.length === 1) return fieldErrors[0].message
    if (fieldErrors.length > 1) return 'Please check the highlighted fields.'
    return error.problem?.detail ?? error.message
  }
  return field ? undefined : 'Something went wrong. Please check your connection and try again.'
}
