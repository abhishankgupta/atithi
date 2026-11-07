import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { TripRequest } from '../features/trips/tripApi'
import { defaultHandlers, mockApi, problem, renderAt, signInAs } from '../test/utils'

const proposal = (price: number) => ({
  id: `p-${price}`,
  pricePerPerson: price,
  currency: 'USD',
  inclusions: ['Private car and driver', 'Taj Mahal at sunrise'],
  hotels: 'Heritage hotel in Jaipur',
  dayPlan: 'Day 1: Delhi',
  validUntil: '2027-01-31',
  updatedAt: '2026-11-08T10:00:00Z',
})

const trip = (overrides: Partial<TripRequest> = {}): TripRequest => ({
  id: 'r1',
  baseItinerary: 'golden-triangle',
  destinations: null,
  startDate: '2027-02-14',
  days: 10,
  adults: 2,
  children: 0,
  budget: '1000_2000',
  hotelStyle: 'COMFORT',
  interests: ['Heritage'],
  notes: 'Vegetarian',
  status: 'MATCHED',
  createdAt: '2026-11-08T09:00:00Z',
  matches: [
    { id: 'm1', agency: { id: 'a1', name: 'Rajasthan Roots', city: 'Jaipur' }, status: 'PROPOSED', proposal: proposal(1690), contactRevealedAt: null, agencyContactEmail: null },
    { id: 'm2', agency: { id: 'a2', name: 'Pink City Tours', city: 'Jaipur' }, status: 'PROPOSED', proposal: proposal(1540), contactRevealedAt: null, agencyContactEmail: null },
    { id: 'm3', agency: { id: 'a3', name: 'Slow Agency', city: 'Delhi' }, status: 'OPEN', proposal: null, contactRevealedAt: null, agencyContactEmail: null },
  ],
  ...overrides,
})

const emptyThread = (matchId: string) => () =>
  Response.json({ matchId, travellerName: 'Sarah Jones', agencyName: 'Agency', closed: false, messages: [] })

describe('trip requests', () => {
  it('sends a request with the chosen itinerary, interests and consent', async () => {
    const user = userEvent.setup()
    signInAs(['TRAVELLER'])
    const calls = mockApi({
      ...defaultHandlers,
      'POST /api/v1/requests': () => Response.json(trip({ status: 'SUBMITTED', matches: [] }), { status: 201 }),
      'GET /api/v1/requests/r1': () => Response.json(trip({ status: 'SUBMITTED', matches: [] })),
    })
    const { router } = renderAt('/plan?itinerary=golden-triangle')

    expect(screen.getByLabelText('Start from an itinerary')).toHaveValue('golden-triangle')
    expect(screen.getByLabelText('Number of days')).toHaveValue(7)
    const send = screen.getByRole('button', { name: 'Send to agents' })
    expect(send).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Wildlife' }))
    await user.type(screen.getByLabelText('Anything agents should know?'), 'Vegetarian')
    await user.click(screen.getByRole('checkbox'))
    await user.click(send)

    await waitFor(() => expect(router.state.location.pathname).toBe('/trips/r1'))
    expect(calls.find((c) => c.key === 'POST /api/v1/requests')?.body).toMatchObject({
      baseItinerary: 'golden-triangle',
      days: 7,
      adults: 2,
      interests: ['Wildlife'],
      notes: 'Vegetarian',
      consent: true,
    })
    expect(await screen.findByText(/We're matching your request/)).toBeInTheDocument()
  })

  it('shows API field errors next to the field', async () => {
    const user = userEvent.setup()
    signInAs(['TRAVELLER'])
    mockApi({
      ...defaultHandlers,
      'POST /api/v1/requests': () =>
        problem(400, 'VALIDATION_FAILED', 'Invalid', { fieldErrors: [{ field: 'startDate', message: 'must be a future date' }] }),
    })
    renderAt('/plan')
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Send to agents' }))
    expect(await screen.findByText('must be a future date')).toBeInTheDocument()
  })

  it('compares proposals side by side and shortlists one', async () => {
    const user = userEvent.setup()
    signInAs(['TRAVELLER'])
    const shortlisted = trip({
      matches: trip().matches.map((m) =>
        m.id === 'm2' ? { ...m, status: 'SHORTLISTED', contactRevealedAt: '2026-11-09T00:00:00Z', agencyContactEmail: 'hello@pinkcity.example' } : m,
      ),
    })
    const calls = mockApi({
      ...defaultHandlers,
      'GET /api/v1/requests/r1': () => Response.json(trip()),
      'POST /api/v1/requests/r1/matches/m2/shortlist': () => Response.json(shortlisted),
      'GET /api/v1/threads/m1/messages': emptyThread('m1'),
      'GET /api/v1/threads/m2/messages': emptyThread('m2'),
      'GET /api/v1/threads/m3/messages': emptyThread('m3'),
    })
    renderAt('/trips/r1')

    const table = await screen.findByRole('table')
    expect(within(table).getByText('Rajasthan Roots')).toBeInTheDocument()
    expect(within(table).getByText('US$1,690.00')).toBeInTheDocument()
    expect(within(table).getByText('US$1,540.00')).toBeInTheDocument()
    expect(within(table).queryByText('Slow Agency')).not.toBeInTheDocument()

    const shortlistButtons = within(table).getAllByRole('button', { name: 'Shortlist' })
    await user.click(shortlistButtons[1])

    expect(await screen.findByRole('link', { name: 'hello@pinkcity.example' })).toBeInTheDocument()
    expect(calls.some((c) => c.key === 'POST /api/v1/requests/r1/matches/m2/shortlist')).toBe(true)
    expect(within(screen.getByRole('table')).getByText('Shortlisted')).toBeInTheDocument()
  })

  it('lets the traveller message an agency', async () => {
    const user = userEvent.setup()
    signInAs(['TRAVELLER'])
    const calls = mockApi({
      ...defaultHandlers,
      'GET /api/v1/requests/r1': () => Response.json(trip({ matches: [trip().matches[0]] })),
      'GET /api/v1/threads/m1/messages': emptyThread('m1'),
      'POST /api/v1/threads/m1/messages': () =>
        Response.json({
          matchId: 'm1',
          travellerName: 'Sarah Jones',
          agencyName: 'Rajasthan Roots',
          closed: false,
          messages: [{ id: 'x1', senderName: 'Sarah Jones', senderSide: 'TRAVELLER', mine: true, body: 'Cooking class?', createdAt: '2026-11-09T00:00:00Z' }],
        }),
    })
    renderAt('/trips/r1')
    const thread = await screen.findByRole('region', { name: 'Messages with Rajasthan Roots' })
    await within(thread).findByText('No messages yet.')
    await user.type(within(thread).getByLabelText('Your message'), 'Cooking class?')
    await user.click(within(thread).getByRole('button', { name: 'Send message' }))
    expect(await within(thread).findByText('Cooking class?')).toBeInTheDocument()
    expect(calls.find((c) => c.key === 'POST /api/v1/threads/m1/messages')?.body).toEqual({ body: 'Cooking class?' })
  })
})
