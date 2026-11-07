import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { Lead } from '../features/trips/tripApi'
import { defaultHandlers, mockApi, problem, renderAt, signInAs } from '../test/utils'

const agency = (status: string) => ({
  id: 'a1',
  name: 'Kerala Trails',
  city: 'Kochi',
  motApprovalNo: 'MOT-1',
  website: null,
  description: null,
  status,
  verifiedAt: null,
  createdAt: '2026-11-08T00:00:00Z',
})

const lead = (overrides: Partial<Lead> = {}): Lead => ({
  matchId: 'm1',
  requestId: 'r1',
  status: 'OPEN',
  travellerName: 'Sarah Jones',
  travellerCountry: 'United Kingdom',
  travellerEmail: null,
  baseItinerary: 'kerala',
  destinations: null,
  startDate: '2027-02-14',
  days: 8,
  adults: 2,
  children: 0,
  budget: '1000_2000',
  hotelStyle: 'COMFORT',
  interests: ['Food'],
  notes: 'Vegetarian',
  matchedAt: '2026-11-08T00:00:00Z',
  proposal: null,
  ...overrides,
})

const emptyThread = () =>
  Response.json({ matchId: 'm1', travellerName: 'Sarah Jones', agencyName: 'Kerala Trails', closed: false, messages: [] })

describe('agent desk', () => {
  it('asks a new agent to set up their agency', async () => {
    const user = userEvent.setup()
    signInAs(['AGENT'])
    const calls = mockApi({
      ...defaultHandlers,
      'GET /api/v1/agency': () => problem(404, 'AGENCY_NOT_FOUND', 'Not set up'),
      'POST /api/v1/agency': () => Response.json(agency('UNVERIFIED'), { status: 201 }),
    })
    renderAt('/agent')
    await user.type(await screen.findByLabelText('Agency name'), 'Kerala Trails')
    await user.type(screen.getByLabelText('City'), 'Kochi')
    await user.click(screen.getByRole('button', { name: 'Submit for verification' }))
    expect(await screen.findByText('Kerala Trails is awaiting verification')).toBeInTheDocument()
    expect(calls.find((c) => c.key === 'POST /api/v1/agency')?.body).toMatchObject({ name: 'Kerala Trails', city: 'Kochi' })
  })

  it('lists leads without the traveller email, and sends a proposal', async () => {
    const user = userEvent.setup()
    signInAs(['AGENT'])
    const calls = mockApi({
      ...defaultHandlers,
      'GET /api/v1/agency': () => Response.json(agency('VERIFIED')),
      'GET /api/v1/agent/leads': () => Response.json([lead()]),
      'GET /api/v1/agent/leads/m1': () => Response.json(lead()),
      'PUT /api/v1/agent/leads/m1/proposal': (body) =>
        Response.json(lead({ status: 'PROPOSED', proposal: { id: 'p1', ...(body as object), updatedAt: 'now' } as Lead['proposal'] })),
      'GET /api/v1/threads/m1/messages': emptyThread,
    })
    const { router } = renderAt('/agent')
    await user.click(await screen.findByRole('link', { name: /Kerala: hills, backwaters and beaches/ }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/agent/leads/m1'))

    expect(await screen.findByText('shared only if the traveller shortlists you')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Price per person'), '1450')
    await user.type(screen.getByLabelText("What's included (one per line)"), 'Private car{enter}Houseboat night')
    await user.type(screen.getByLabelText('Day-by-day plan'), 'Day 1: Kochi')
    await user.click(screen.getByRole('button', { name: 'Send proposal' }))

    expect(await screen.findByText('Proposal saved. The traveller has been notified.')).toBeInTheDocument()
    expect(calls.find((c) => c.key === 'PUT /api/v1/agent/leads/m1/proposal')?.body).toMatchObject({
      pricePerPerson: 1450,
      currency: 'USD',
      inclusions: ['Private car', 'Houseboat night'],
      dayPlan: 'Day 1: Kochi',
    })
  })
})

describe('admin', () => {
  it('verifies agencies and sends a request to chosen agencies', async () => {
    const user = userEvent.setup()
    signInAs(['TRAVELLER', 'ADMIN'])
    const request = {
      id: 'r1',
      travellerName: 'Sarah Jones',
      travellerCountry: 'United Kingdom',
      baseItinerary: 'golden-triangle',
      destinations: null,
      startDate: '2027-02-14',
      days: 10,
      adults: 2,
      children: 0,
      budget: '1000_2000',
      hotelStyle: 'COMFORT',
      interests: [],
      notes: null,
      status: 'SUBMITTED',
      createdAt: '2026-11-08T00:00:00Z',
      matchedAgencies: [],
    }
    const calls = mockApi({
      ...defaultHandlers,
      'GET /api/v1/admin/agencies?status=UNVERIFIED': () =>
        Response.json([{ agency: { ...agency('UNVERIFIED'), id: 'a2', name: 'Goa Getaways' }, ownerName: 'Maria', ownerEmail: 'maria@example.org' }]),
      'GET /api/v1/admin/agencies?status=VERIFIED': () =>
        Response.json([{ agency: agency('VERIFIED'), ownerName: 'Ravi', ownerEmail: 'ravi@example.org' }]),
      'GET /api/v1/admin/requests': () => Response.json([request]),
      'POST /api/v1/admin/agencies/a2/verify': () => Response.json(agency('VERIFIED')),
      'POST /api/v1/admin/requests/r1/matches': () => Response.json({ ...request, status: 'MATCHED' }),
    })

    renderAt('/admin')
    await user.click(await screen.findByRole('button', { name: 'Verify Goa Getaways' }))
    await waitFor(() => expect(calls.some((c) => c.key === 'POST /api/v1/admin/agencies/a2/verify')).toBe(true))

    const card = (await screen.findByText(/Sarah Jones \(United Kingdom\)/)).closest('div')!.parentElement!
    await user.click(await within(card).findByRole('button', { name: 'Kerala Trails · Kochi' }))
    await user.click(within(card).getByRole('button', { name: /Send request to 1 agency/ }))
    await waitFor(() =>
      expect(calls.find((c) => c.key === 'POST /api/v1/admin/requests/r1/matches')?.body).toEqual({ agencyIds: ['a1'] }),
    )
  })
})
