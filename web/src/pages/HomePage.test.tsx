import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { defaultHandlers, mockApi, renderAt } from '../test/utils'

describe('HomePage', () => {
  it('shows the brand promise and the API build once the server answers', async () => {
    mockApi(defaultHandlers)
    renderAt('/')

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Come as a guest.Leave as family.')
    expect(await screen.findByText(/Server connected · test · build abcdef1/)).toBeInTheDocument()
  })

  it('tells the visitor the server is waking up while it starts', () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise<Response>(() => undefined))
    renderAt('/')

    expect(screen.getByText(/Waking up the server/)).toBeInTheDocument()
  })

  it('shows an error when the API is down', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 503 }))
    renderAt('/')

    expect(await screen.findByRole('alert')).toHaveTextContent("The server isn't responding yet")
  })

  it('shows the non-production banner and emergency numbers', () => {
    mockApi(defaultHandlers)
    renderAt('/')

    expect(screen.getByText(/environment — data here is not real/)).toBeInTheDocument()
    expect(screen.getByText('112')).toBeInTheDocument()
    expect(screen.getByText('1363')).toBeInTheDocument()
  })

  it('shows a friendly page for unknown addresses', () => {
    mockApi(defaultHandlers)
    renderAt('/no-such-page')

    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to the home page' })).toHaveAttribute('href', '/')
  })
})
