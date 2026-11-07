import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest, getPrivate } from '../../lib/api'

export interface AgencyRef {
  id: string
  name: string
  city: string | null
}

export interface Proposal {
  id: string
  pricePerPerson: number
  currency: string
  inclusions: string[]
  hotels: string | null
  dayPlan: string
  validUntil: string
  updatedAt: string
}

export interface TravellerMatch {
  id: string
  agency: AgencyRef
  status: string
  proposal: Proposal | null
  contactRevealedAt: string | null
  agencyContactEmail: string | null
}

export interface TripRequest {
  id: string
  baseItinerary: string | null
  destinations: string | null
  startDate: string
  days: number
  adults: number
  children: number
  budget: string
  hotelStyle: string
  interests: string[]
  notes: string | null
  status: string
  createdAt: string
  matches: TravellerMatch[]
}

export interface TripSummary {
  id: string
  baseItinerary: string | null
  destinations: string | null
  startDate: string
  days: number
  adults: number
  children: number
  status: string
  createdAt: string
  matchCount: number
  proposalCount: number
}

export interface RequestInput {
  baseItinerary: string | null
  destinations: string
  startDate: string
  days: number
  adults: number
  children: number
  budget: string
  hotelStyle: string
  interests: string[]
  notes: string
  consent: boolean
}

export interface Lead {
  matchId: string
  requestId: string
  status: string
  travellerName: string | null
  travellerCountry: string | null
  travellerEmail: string | null
  baseItinerary: string | null
  destinations: string | null
  startDate: string
  days: number
  adults: number
  children: number
  budget: string
  hotelStyle: string
  interests: string[]
  notes: string | null
  matchedAt: string
  proposal: Proposal | null
}

export interface ProposalInput {
  pricePerPerson: number
  currency: string
  inclusions: string[]
  hotels: string
  dayPlan: string
  validUntil: string
}

export interface AdminRequest {
  id: string
  travellerName: string | null
  travellerCountry: string | null
  baseItinerary: string | null
  destinations: string | null
  startDate: string
  days: number
  adults: number
  children: number
  budget: string
  hotelStyle: string
  interests: string[]
  notes: string | null
  status: string
  createdAt: string
  matchedAgencies: AgencyRef[]
}

export const useMyTrips = () =>
  useQuery({ queryKey: ['trips'], queryFn: () => getPrivate<TripSummary[]>('/api/v1/requests/mine') })

export const useTrip = (id: string) =>
  useQuery({ queryKey: ['trips', id], queryFn: () => getPrivate<TripRequest>(`/api/v1/requests/${id}`) })

export function useCreateTrip() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: RequestInput) => apiRequest<TripRequest>('/api/v1/requests', { body, auth: true }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['trips'] }),
  })
}

export function useMatchAction(requestId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ matchId, action }: { matchId: string; action: 'shortlist' | 'decline' }) =>
      apiRequest<TripRequest>(`/api/v1/requests/${requestId}/matches/${matchId}/${action}`, { method: 'POST', auth: true }),
    onSuccess: (trip) => client.setQueryData(['trips', requestId], trip),
  })
}

export const useLeads = () => useQuery({ queryKey: ['leads'], queryFn: () => getPrivate<Lead[]>('/api/v1/agent/leads') })

export const useLead = (matchId: string) =>
  useQuery({ queryKey: ['leads', matchId], queryFn: () => getPrivate<Lead>(`/api/v1/agent/leads/${matchId}`) })

export function useSaveProposal(matchId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: ProposalInput) =>
      apiRequest<Lead>(`/api/v1/agent/leads/${matchId}/proposal`, { method: 'PUT', body, auth: true }),
    onSuccess: (lead) => {
      client.setQueryData(['leads', matchId], lead)
      void client.invalidateQueries({ queryKey: ['leads'], exact: true })
    },
  })
}

export const useAdminRequests = (status: string) =>
  useQuery({
    queryKey: ['admin', 'requests', status],
    queryFn: () => getPrivate<AdminRequest[]>(`/api/v1/admin/requests${status ? `?status=${status}` : ''}`),
  })

export function useMatchAgencies() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, agencyIds }: { requestId: string; agencyIds: string[] }) =>
      apiRequest<AdminRequest>(`/api/v1/admin/requests/${requestId}/matches`, { body: { agencyIds }, auth: true }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin', 'requests'] }),
  })
}
