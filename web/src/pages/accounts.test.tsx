import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useSession } from '../lib/session'
import { authResponse, defaultHandlers, mockApi, problem, renderAt, signInAs } from '../test/utils'

describe('accounts', () => {
  it('registers a traveller, then verifies their email with the test code', async () => {
    const user = userEvent.setup()
    const calls = mockApi({
      ...defaultHandlers,
      'POST /api/v1/auth/register': () => Response.json(authResponse(['TRAVELLER']), { status: 201 }),
      'POST /api/v1/me/email/send-code': () => Response.json({ expiresInSeconds: 600, testCode: '123456' }),
      'POST /api/v1/me/email/verify': () =>
        Response.json({ ...authResponse(['TRAVELLER']).user, emailVerified: true }),
      'GET /api/v1/requests/mine': () => Response.json([]),
    })
    const { router } = renderAt('/register?next=/trips')

    await user.type(screen.getByLabelText('Your name'), 'Sarah Jones')
    await user.type(screen.getByLabelText('Email'), 'sarah@example.org')
    await user.type(screen.getByLabelText('Password'), 'correct-horse-1')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByRole('heading', { name: 'Verify your email' })).toBeInTheDocument()
    expect(calls.find((c) => c.key === 'POST /api/v1/auth/register')?.body).toMatchObject({ accountType: 'TRAVELLER' })

    await user.click(screen.getByRole('button', { name: 'Send code' }))
    expect(await screen.findByText(/Your code is/)).toHaveTextContent('123456')
    await user.type(screen.getByLabelText('Code'), '123456')
    await user.click(screen.getByRole('button', { name: 'Verify' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/trips'))
    expect(useSession.getState().user?.emailVerified).toBe(true)
  })

  it('registers an agent and sends them to the agent desk after verifying', async () => {
    const user = userEvent.setup()
    const calls = mockApi({
      ...defaultHandlers,
      'POST /api/v1/auth/register': () => Response.json(authResponse(['AGENT']), { status: 201 }),
    })
    const { router } = renderAt('/register')
    await user.click(screen.getByRole('button', { name: 'A travel agent' }))
    expect(screen.getByRole('button', { name: 'A travel agent' })).toHaveAttribute('aria-pressed', 'true')
    await user.type(screen.getByLabelText('Your name'), 'Ravi Menon')
    await user.type(screen.getByLabelText('Email'), 'ravi@example.org')
    await user.type(screen.getByLabelText('Password'), 'correct-horse-1')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/verify-email'))
    expect(router.state.location.search).toContain(encodeURIComponent('/agent'))
    expect(calls.find((c) => c.key === 'POST /api/v1/auth/register')?.body).toMatchObject({ accountType: 'AGENT' })
  })

  it('shows sign-in errors from the API', async () => {
    const user = userEvent.setup()
    mockApi({
      ...defaultHandlers,
      'POST /api/v1/auth/login': () => problem(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect'),
    })
    renderAt('/login')
    await user.type(screen.getByLabelText('Email'), 'sarah@example.org')
    await user.type(screen.getByLabelText('Password'), 'wrong-password')
    fireEvent.submit(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect')
  })

  it('sends signed-out visitors to sign in before planning a trip, and unverified travellers to verify', async () => {
    mockApi(defaultHandlers)
    const first = renderAt('/plan?itinerary=kerala')
    await waitFor(() => expect(first.router.state.location.pathname).toBe('/login'))
    first.unmount()

    signInAs(['TRAVELLER'], { emailVerified: false })
    const second = renderAt('/plan')
    await waitFor(() => expect(second.router.state.location.pathname).toBe('/verify-email'))
  })

  it('explains when a page is for another account type', () => {
    mockApi(defaultHandlers)
    signInAs(['TRAVELLER'])
    renderAt('/agent')
    expect(screen.getByRole('heading', { name: "This page isn't for your account" })).toBeInTheDocument()
  })
})
