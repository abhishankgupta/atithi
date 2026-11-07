import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, apiRequest, getPrivate } from '../../lib/api'

export interface Agency {
  id: string
  name: string
  city: string
  motApprovalNo: string | null
  website: string | null
  description: string | null
  status: 'UNVERIFIED' | 'VERIFIED' | 'SUSPENDED'
  verifiedAt: string | null
  createdAt: string
}

export interface AdminAgency {
  agency: Agency
  ownerName: string | null
  ownerEmail: string | null
}

export interface AgencyInput {
  name: string
  city: string
  motApprovalNo: string
  website: string
  description: string
}

/** The agent's own agency, or null if they haven't set one up yet. */
export const useMyAgency = () =>
  useQuery({
    queryKey: ['agency'],
    queryFn: async () => {
      try {
        return await getPrivate<Agency>('/api/v1/agency')
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null
        throw e
      }
    },
  })

export function useCreateAgency() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: AgencyInput) => apiRequest<Agency>('/api/v1/agency', { body, auth: true }),
    onSuccess: (agency) => client.setQueryData(['agency'], agency),
  })
}

export const useAdminAgencies = (status: string) =>
  useQuery({
    queryKey: ['admin', 'agencies', status],
    queryFn: () => getPrivate<AdminAgency[]>(`/api/v1/admin/agencies${status ? `?status=${status}` : ''}`),
  })

export function useVerifyAgency() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiRequest<Agency>(`/api/v1/admin/agencies/${id}/verify`, { method: 'POST', auth: true }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin', 'agencies'] }),
  })
}
