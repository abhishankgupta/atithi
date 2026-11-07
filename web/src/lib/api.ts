import { config } from './config'

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

/**
 * GET a JSON resource from the API. Signed-in requests, token refresh and writes arrive
 * with accounts in step 2 (same design as Udaan's apiRequest).
 */
export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${config.apiBaseUrl}${path}`, { headers: { Accept: 'application/json' } })
  if (!response.ok) {
    let problem: ApiProblem | undefined
    try {
      problem = (await response.json()) as ApiProblem
    } catch {
      problem = undefined
    }
    throw new ApiError(response.status, problem)
  }
  return (await response.json()) as T
}
