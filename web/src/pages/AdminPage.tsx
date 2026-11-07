import { useState } from 'react'
import { usePageTitle } from '../app/usePageTitle'
import { Button, Card, FormError } from '../components/Form'
import { findItinerary } from '../content/content'
import { useAdminAgencies, useVerifyAgency } from '../features/agency/agencyApi'
import { BUDGETS, formatDate, labelOf, requestStatus, travellers } from '../features/trips/labels'
import { useAdminRequests, useMatchAgencies, type AdminRequest } from '../features/trips/tripApi'
import { errorMessage } from '../lib/api'

const MAX_AGENCIES = 5

function MatchForm({ request }: { request: AdminRequest }) {
  const verified = useAdminAgencies('VERIFIED')
  const match = useMatchAgencies()
  const already = new Set(request.matchedAgencies.map((a) => a.id))
  const [picked, setPicked] = useState<string[]>([])
  const remaining = MAX_AGENCIES - already.size
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  if (remaining <= 0) return <p className="text-sm text-muted">Sent to the maximum of {MAX_AGENCIES} agencies.</p>
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">Send to up to {remaining} more verified {remaining === 1 ? 'agency' : 'agencies'}:</p>
      {verified.data?.length === 0 && <p className="text-sm text-muted">No verified agencies yet.</p>}
      <div className="flex flex-wrap gap-2">
        {verified.data
          ?.filter((a) => !already.has(a.agency.id))
          .map((a) => {
            const on = picked.includes(a.agency.id)
            return (
              <button
                key={a.agency.id}
                type="button"
                aria-pressed={on}
                disabled={!on && picked.length >= remaining}
                onClick={() => toggle(a.agency.id)}
                className={`min-h-10 rounded-full px-4 text-sm ${on ? 'bg-indigo-night text-white' : 'border border-sand bg-white disabled:opacity-40'}`}
              >
                {a.agency.name} · {a.agency.city}
              </button>
            )
          })}
      </div>
      <FormError message={errorMessage(match.error)} />
      <Button
        type="button"
        variant="dark"
        disabled={picked.length === 0}
        busy={match.isPending}
        onClick={() => match.mutate({ requestId: request.id, agencyIds: picked }, { onSuccess: () => setPicked([]) })}
      >
        Send request to {picked.length || ''} {picked.length === 1 ? 'agency' : 'agencies'}
      </Button>
    </div>
  )
}

export function AdminPage() {
  usePageTitle('Admin')
  const [requestFilter, setRequestFilter] = useState('SUBMITTED')
  const requests = useAdminRequests(requestFilter)
  const pending = useAdminAgencies('UNVERIFIED')
  const verify = useVerifyAgency()

  return (
    <section className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold">Admin</h1>

      <h2 className="mt-8 font-display text-2xl font-bold">Agencies awaiting verification</h2>
      <p className="text-sm text-muted">Check their Ministry of Tourism approval and references before verifying.</p>
      <FormError message={errorMessage(pending.error) ?? errorMessage(verify.error)} />
      {pending.data?.length === 0 && <p className="mt-2 text-sm text-muted">None right now.</p>}
      <ul className="mt-3 space-y-3">
        {pending.data?.map(({ agency, ownerName, ownerEmail }) => (
          <li key={agency.id}>
            <Card className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm">
                <p className="font-display text-lg font-bold">{agency.name}</p>
                <p className="text-muted">
                  {agency.city} · approval no. {agency.motApprovalNo || 'not given'} · {ownerName} ({ownerEmail})
                </p>
                {agency.website && <p className="text-muted">{agency.website}</p>}
              </div>
              <Button type="button" variant="dark" busy={verify.isPending && verify.variables === agency.id} onClick={() => verify.mutate(agency.id)}>
                Verify {agency.name}
              </Button>
            </Card>
          </li>
        ))}
      </ul>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold">Trip requests</h2>
        <div className="flex gap-2">
          {[
            ['SUBMITTED', 'Waiting for agencies'],
            ['MATCHED', 'Matched'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={requestFilter === value}
              onClick={() => setRequestFilter(value)}
              className={`min-h-10 rounded-full px-4 text-sm font-semibold ${requestFilter === value ? 'bg-indigo-night text-white' : 'border border-sand bg-white'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <FormError message={errorMessage(requests.error)} />
      {requests.data?.length === 0 && <p className="mt-2 text-sm text-muted">No requests here.</p>}
      <ul className="mt-3 space-y-3">
        {requests.data?.map((r) => (
          <li key={r.id}>
            <Card className="space-y-3">
              <div>
                <p className="font-display text-lg font-bold">
                  {findItinerary(r.baseItinerary ?? undefined)?.title ?? (r.destinations || 'Custom India trip')}
                </p>
                <p className="text-sm text-muted">
                  {r.travellerName}
                  {r.travellerCountry ? ` (${r.travellerCountry})` : ''} · arriving {formatDate(r.startDate)} · {r.days} days ·{' '}
                  {travellers(r.adults, r.children)} · {labelOf(BUDGETS, r.budget)} · {requestStatus(r.status)}
                </p>
                {r.matchedAgencies.length > 0 && (
                  <p className="text-sm">Sent to: {r.matchedAgencies.map((a) => a.name).join(', ')}</p>
                )}
              </div>
              <MatchForm request={r} />
            </Card>
          </li>
        ))}
      </ul>
    </section>
  )
}
