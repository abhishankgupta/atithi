import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { vi } from 'vitest'
import { routes } from '../app/router'

type Handler = (body: unknown, init: RequestInit) => Response | Promise<Response>

/** Routes fetch calls by "METHOD /path" to handlers; unknown calls return 404. Records every call. */
export function mockApi(handlers: Record<string, Handler>) {
  const calls: { key: string; body: unknown; query: URLSearchParams }[] = []
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init = {}) => {
    const url = new URL(String(input), 'http://localhost')
    const key = `${init.method ?? 'GET'} ${url.pathname}`
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : undefined
    calls.push({ key, body, query: url.searchParams })
    const handler = handlers[key]
    return handler ? handler(body, init) : new Response(null, { status: 404 })
  })
  return calls
}

/** Every field the API returns, so components never meet a shape that tests don't. */
export const defaultHandlers: Record<string, Handler> = {
  'GET /api/v1/meta': () => Response.json({ name: 'Atithi API', environment: 'test', version: 'abcdef1234567' }),
}

export function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const result = render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { ...result, router }
}
