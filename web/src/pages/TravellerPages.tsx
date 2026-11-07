import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { usePageTitle } from '../app/usePageTitle'
import { Button, Card, ChipGroup, FormError, SelectField, TextArea, TextField } from '../components/Form'
import { findItinerary, itineraries } from '../content/content'
import { MessageThread } from '../features/messages/MessageThread'
import {
  BUDGETS,
  HOTEL_STYLES,
  INTERESTS,
  formatDate,
  formatPrice,
  labelOf,
  matchStatus,
  requestStatus,
  travellers,
} from '../features/trips/labels'
import { useCreateTrip, useMatchAction, useMyTrips, useTrip, type TravellerMatch } from '../features/trips/tripApi'
import { errorMessage, formError } from '../lib/api'

function inMonths(months: number): string {
  const d = new Date()
  d.setUTCMonth(d.getUTCMonth() + months)
  return d.toISOString().slice(0, 10)
}

export function PlanTripPage() {
  usePageTitle('Get free proposals')
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const create = useCreateTrip()
  const base = findItinerary(params.get('itinerary') ?? undefined)
  const [form, setForm] = useState({
    baseItinerary: base?.slug ?? '',
    destinations: params.get('destinations') ?? '',
    startDate: inMonths(2),
    days: String(base?.days ?? 10),
    adults: '2',
    children: '0',
    budget: '1000_2000',
    hotelStyle: 'COMFORT',
    notes: '',
  })
  const [interests, setInterests] = useState<string[]>([])
  const [consent, setConsent] = useState(false)
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))
  const fieldError = (name: string) => errorMessage(create.error, name)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    create.mutate(
      {
        ...form,
        baseItinerary: form.baseItinerary || null,
        days: Number(form.days),
        adults: Number(form.adults),
        children: Number(form.children),
        interests,
        consent,
      },
      { onSuccess: (trip) => navigate(`/trips/${trip.id}`) },
    )
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold">Get free proposals</h1>
      <p className="mt-2 text-muted">
        Describe your trip once. Up to five verified Indian agencies reply with proposals in the same format. Your email
        stays private until you shortlist an agency.
      </p>
      <Card className="mt-6">
        <form onSubmit={submit} className="space-y-5">
          <SelectField
            label="Start from an itinerary"
            value={form.baseItinerary}
            onChange={set('baseItinerary')}
            options={[{ value: '', label: 'Custom trip' }, ...itineraries.map((i) => ({ value: i.slug, label: `${i.title} (${i.days} days)` }))]}
          />
          <TextField
            label="Places you'd like to visit (optional)"
            value={form.destinations}
            onChange={set('destinations')}
            maxLength={300}
            error={fieldError('destinations')}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Arrival date" type="date" required value={form.startDate} onChange={set('startDate')} error={fieldError('startDate')} />
            <TextField label="Number of days" type="number" min={1} max={60} required value={form.days} onChange={set('days')} error={fieldError('days')} />
            <TextField label="Adults" type="number" min={1} max={20} value={form.adults} onChange={set('adults')} error={fieldError('adults')} />
            <TextField label="Children" type="number" min={0} max={20} value={form.children} onChange={set('children')} error={fieldError('children')} />
            <SelectField label="Budget per person, excluding flights" value={form.budget} onChange={set('budget')} options={BUDGETS} />
            <SelectField label="Hotel style" value={form.hotelStyle} onChange={set('hotelStyle')} options={HOTEL_STYLES} />
          </div>
          <ChipGroup
            label="Interests"
            options={INTERESTS.map((i) => ({ value: i, label: i }))}
            selected={interests}
            onToggle={(v) => setInterests((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]))}
            error={fieldError('interests')}
          />
          <TextArea
            label="Anything agents should know?"
            hint="Dietary needs, mobility, first visit to Asia, a female guide…"
            value={form.notes}
            onChange={set('notes')}
            maxLength={2000}
            error={fieldError('notes')}
          />
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-1 size-5 accent-indigo-night" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>
              I agree to share these trip details (not my email) with up to five verified agencies so they can send proposals.
            </span>
          </label>
          {fieldError('consent') && <p className="text-sm text-rani">{fieldError('consent')}</p>}
          <FormError
            message={formError(create.error, ['destinations', 'startDate', 'days', 'adults', 'children', 'interests', 'notes', 'consent'])}
          />
          <Button type="submit" busy={create.isPending} disabled={!consent}>
            Send to agents
          </Button>
        </form>
      </Card>
    </section>
  )
}

export function MyTripsPage() {
  usePageTitle('My trips')
  const trips = useMyTrips()
  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">My trips</h1>
        <Link to="/plan" className="rounded-full bg-saffron px-5 py-2.5 font-semibold text-white hover:bg-saffron-dark">
          Plan a new trip
        </Link>
      </div>
      {trips.isPending && <p className="mt-6 text-muted">Loading your trips…</p>}
      <FormError message={errorMessage(trips.error)} />
      {trips.data?.length === 0 && (
        <Card className="mt-6">
          <p>You haven't requested a trip yet.</p>
        </Card>
      )}
      <ul className="mt-6 space-y-3">
        {trips.data?.map((t) => (
          <li key={t.id}>
            <Link to={`/trips/${t.id}`} className="block rounded-3xl bg-white p-5 shadow-[0_10px_28px_rgba(30,26,82,0.08)] hover:shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-lg font-bold">
                  {findItinerary(t.baseItinerary ?? undefined)?.title ?? (t.destinations || 'Custom India trip')}
                </h2>
                <span className="rounded-full bg-sand px-3 py-1 text-xs font-semibold">
                  {t.proposalCount > 0 ? `${t.proposalCount} proposal${t.proposalCount === 1 ? '' : 's'}` : requestStatus(t.status)}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted">
                Arriving {formatDate(t.startDate)} · {t.days} days · {travellers(t.adults, t.children)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

function ProposalCompare({ requestId, matches }: { requestId: string; matches: TravellerMatch[] }) {
  const action = useMatchAction(requestId)
  const withProposals = matches.filter((m) => m.proposal && m.status !== 'DECLINED')
  if (withProposals.length === 0) return null
  return (
    <section aria-labelledby="compare" className="mt-8">
      <h2 id="compare" className="font-display text-2xl font-bold">
        Compare proposals
      </h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[520px] border-separate border-spacing-0 rounded-3xl bg-white text-left text-sm shadow-[0_10px_28px_rgba(30,26,82,0.08)]">
          <thead>
            <tr>
              <th scope="col" className="p-3 text-xs text-muted">
                Agency
              </th>
              {withProposals.map((m) => (
                <th key={m.id} scope="col" className="p-3 font-display text-base">
                  {m.agency.name}
                  <span className="block text-xs font-normal text-muted">{m.agency.city}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row" className="border-t border-sand p-3 text-xs text-muted">
                Price per person
              </th>
              {withProposals.map((m) => (
                <td key={m.id} className="border-t border-sand p-3 font-display text-lg font-bold">
                  {formatPrice(m.proposal!.pricePerPerson, m.proposal!.currency)}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row" className="border-t border-sand p-3 align-top text-xs text-muted">
                Included
              </th>
              {withProposals.map((m) => (
                <td key={m.id} className="border-t border-sand p-3 align-top">
                  <ul className="list-disc pl-4">
                    {m.proposal!.inclusions.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row" className="border-t border-sand p-3 align-top text-xs text-muted">
                Hotels
              </th>
              {withProposals.map((m) => (
                <td key={m.id} className="border-t border-sand p-3 align-top whitespace-pre-wrap">
                  {m.proposal!.hotels || '—'}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row" className="border-t border-sand p-3 text-xs text-muted">
                Valid until
              </th>
              {withProposals.map((m) => (
                <td key={m.id} className="border-t border-sand p-3">
                  {formatDate(m.proposal!.validUntil)}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row" className="border-t border-sand p-3 text-xs text-muted">
                Your choice
              </th>
              {withProposals.map((m) => (
                <td key={m.id} className="border-t border-sand p-3">
                  {m.status === 'SHORTLISTED' ? (
                    <span className="font-semibold text-peacock">Shortlisted</span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        busy={action.isPending && action.variables?.matchId === m.id}
                        onClick={() => action.mutate({ matchId: m.id, action: 'shortlist' })}
                      >
                        Shortlist
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => action.mutate({ matchId: m.id, action: 'decline' })}>
                        Decline
                      </Button>
                    </div>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted">Shortlisting shares your email with that agency so you can book directly.</p>
      <FormError message={errorMessage(action.error)} />
    </section>
  )
}

export function TripPage() {
  const { id = '' } = useParams()
  const trip = useTrip(id)
  const title = trip.data ? (findItinerary(trip.data.baseItinerary ?? undefined)?.title ?? (trip.data.destinations || 'Custom India trip')) : 'Your trip'
  usePageTitle(title)

  if (trip.isPending) return <p className="mx-auto max-w-4xl px-4 py-10 text-muted">Loading your trip…</p>
  if (trip.isError || !trip.data) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-10">
        <FormError message={errorMessage(trip.error) ?? 'Trip not found'} />
      </section>
    )
  }
  const t = trip.data
  const active = t.matches.filter((m) => m.status !== 'DECLINED')
  return (
    <section className="mx-auto max-w-4xl px-4 py-10">
      <Link to="/trips" className="text-sm font-semibold text-saffron-dark underline">
        ← My trips
      </Link>
      <h1 className="mt-2 font-display text-3xl font-bold">{title}</h1>
      <p className="mt-1 text-muted">
        Arriving {formatDate(t.startDate)} · {t.days} days · {travellers(t.adults, t.children)} · {labelOf(BUDGETS, t.budget)} ·{' '}
        {labelOf(HOTEL_STYLES, t.hotelStyle)}
      </p>

      <Card className="mt-6">
        <h2 className="font-display text-lg font-bold">Status</h2>
        {t.matches.length === 0 ? (
          <p className="mt-1 text-sm text-muted">
            We're matching your request with verified agencies. You'll get an email when proposals arrive (usually within 48 hours).
          </p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {t.matches.map((m) => (
              <li key={m.id} className="flex flex-wrap justify-between gap-2">
                <span className="font-semibold">{m.agency.name}</span>
                <span className="text-muted">{matchStatus(m.status)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ProposalCompare requestId={t.id} matches={t.matches} />

      {active.some((m) => m.agencyContactEmail) && (
        <Card className="mt-6">
          <h2 className="font-display text-lg font-bold">Contact your shortlisted agency</h2>
          {active
            .filter((m) => m.agencyContactEmail)
            .map((m) => (
              <p key={m.id} className="mt-1 text-sm">
                {m.agency.name}: <a href={`mailto:${m.agencyContactEmail}`} className="font-semibold underline">{m.agencyContactEmail}</a>
              </p>
            ))}
        </Card>
      )}

      {active.map((m) => (
        <Card key={m.id} className="mt-6 space-y-4">
          {m.proposal && (
            <details>
              <summary className="cursor-pointer font-semibold">Day-by-day plan from {m.agency.name}</summary>
              <p className="mt-2 text-sm whitespace-pre-wrap">{m.proposal.dayPlan}</p>
            </details>
          )}
          <MessageThread matchId={m.id} title={`Messages with ${m.agency.name}`} />
        </Card>
      ))}
    </section>
  )
}
