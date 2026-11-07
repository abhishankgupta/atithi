import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { usePageTitle } from '../app/usePageTitle'
import { Button, Card, FormError, SelectField, TextArea, TextField } from '../components/Form'
import { findItinerary } from '../content/content'
import { useCreateAgency, useMyAgency, type Agency } from '../features/agency/agencyApi'
import { MessageThread } from '../features/messages/MessageThread'
import { BUDGETS, CURRENCIES, HOTEL_STYLES, agentStatus, formatDate, formatPrice, labelOf, travellers } from '../features/trips/labels'
import { useLead, useLeads, useSaveProposal, type Lead } from '../features/trips/tripApi'
import { errorMessage, formError } from '../lib/api'

function AgencySetup() {
  const create = useCreateAgency()
  const [form, setForm] = useState({ name: '', city: '', motApprovalNo: '', website: '', description: '' })
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))
  const submit = (e: FormEvent) => {
    e.preventDefault()
    create.mutate(form)
  }
  return (
    <Card className="mt-6">
      <h2 className="font-display text-xl font-bold">Set up your agency</h2>
      <p className="mt-1 text-sm text-muted">We verify every agency before it receives travellers' requests.</p>
      <form onSubmit={submit} className="mt-4 space-y-4">
        <TextField label="Agency name" required minLength={2} value={form.name} onChange={set('name')} error={errorMessage(create.error, 'name')} />
        <TextField label="City" required minLength={2} value={form.city} onChange={set('city')} error={errorMessage(create.error, 'city')} />
        <TextField
          label="Ministry of Tourism approval number (if you have one)"
          value={form.motApprovalNo}
          onChange={set('motApprovalNo')}
        />
        <TextField label="Website (optional)" type="url" value={form.website} onChange={set('website')} />
        <TextArea label="About your agency (optional)" maxLength={1000} value={form.description} onChange={set('description')} />
        <FormError message={formError(create.error, ['name', 'city'])} />
        <Button type="submit" busy={create.isPending}>
          Submit for verification
        </Button>
      </form>
    </Card>
  )
}

function LeadSummary({ lead }: { lead: Lead }) {
  return (
    <p className="text-sm text-muted">
      {lead.travellerName}
      {lead.travellerCountry ? ` · ${lead.travellerCountry}` : ''} · arriving {formatDate(lead.startDate)} · {lead.days} days ·{' '}
      {travellers(lead.adults, lead.children)}
    </p>
  )
}

function Leads({ agency }: { agency: Agency }) {
  const leads = useLeads()
  if (agency.status !== 'VERIFIED') {
    return (
      <Card className="mt-6">
        <h2 className="font-display text-xl font-bold">{agency.name} is awaiting verification</h2>
        <p className="mt-1 text-sm text-muted">
          We'll check your details and email you. Once verified, travellers' requests will appear here.
        </p>
      </Card>
    )
  }
  return (
    <section className="mt-6">
      <h2 className="font-display text-xl font-bold">Leads</h2>
      {leads.isPending && <p className="mt-2 text-muted">Loading leads…</p>}
      <FormError message={errorMessage(leads.error)} />
      {leads.data?.length === 0 && (
        <Card className="mt-3">
          <p>No requests yet. We'll email you when a traveller's request is matched to {agency.name}.</p>
        </Card>
      )}
      <ul className="mt-3 space-y-3">
        {leads.data?.map((lead) => (
          <li key={lead.matchId}>
            <Link to={`/agent/leads/${lead.matchId}`} className="block rounded-3xl bg-white p-5 shadow-[0_10px_28px_rgba(30,26,82,0.08)] hover:shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display text-lg font-bold">
                  {findItinerary(lead.baseItinerary ?? undefined)?.title ?? (lead.destinations || 'Custom India trip')}
                </h3>
                <span className="rounded-full bg-sand px-3 py-1 text-xs font-semibold">{agentStatus(lead.status)}</span>
              </div>
              <LeadSummary lead={lead} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function AgentHomePage() {
  usePageTitle('Agent desk')
  const agency = useMyAgency()
  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold">Agent desk</h1>
      {agency.isPending && <p className="mt-4 text-muted">Loading…</p>}
      <FormError message={errorMessage(agency.error)} />
      {agency.data === null && <AgencySetup />}
      {agency.data && <Leads agency={agency.data} />}
    </section>
  )
}

function inDays(days: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function ProposalForm({ lead }: { lead: Lead }) {
  const save = useSaveProposal(lead.matchId)
  const p = lead.proposal
  const [form, setForm] = useState({
    pricePerPerson: p ? String(p.pricePerPerson) : '',
    currency: p?.currency ?? 'USD',
    inclusions: p?.inclusions.join('\n') ?? '',
    hotels: p?.hotels ?? '',
    dayPlan: p?.dayPlan ?? '',
    validUntil: p?.validUntil ?? inDays(14),
  })
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))
  const fieldError = (name: string) => errorMessage(save.error, name)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    save.mutate({
      ...form,
      pricePerPerson: Number(form.pricePerPerson),
      inclusions: form.inclusions.split('\n').map((s) => s.trim()).filter(Boolean),
    })
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <h2 className="font-display text-xl font-bold">{p ? 'Update your proposal' : 'Send a proposal'}</h2>
      <p className="text-sm text-muted">Every agency uses the same format, so travellers can compare like for like.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Price per person"
          type="number"
          min={1}
          step="0.01"
          required
          value={form.pricePerPerson}
          onChange={set('pricePerPerson')}
          error={fieldError('pricePerPerson')}
        />
        <SelectField label="Currency" value={form.currency} onChange={set('currency')} options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
      </div>
      <TextArea
        label="What's included (one per line)"
        hint="e.g. Private car and driver · English-speaking guide in cities · Breakfast daily"
        value={form.inclusions}
        onChange={set('inclusions')}
        error={fieldError('inclusions')}
      />
      <TextArea label="Hotels" value={form.hotels} onChange={set('hotels')} maxLength={2000} error={fieldError('hotels')} />
      <TextArea label="Day-by-day plan" required rows={8} value={form.dayPlan} onChange={set('dayPlan')} maxLength={8000} error={fieldError('dayPlan')} />
      <TextField label="Valid until" type="date" required value={form.validUntil} onChange={set('validUntil')} error={fieldError('validUntil')} />
      <FormError message={formError(save.error, ['pricePerPerson', 'inclusions', 'hotels', 'dayPlan', 'validUntil'])} />
      {save.isSuccess && (
        <p role="status" className="text-sm text-peacock">
          Proposal saved. The traveller has been notified.
        </p>
      )}
      <Button type="submit" busy={save.isPending}>
        {p ? 'Update proposal' : 'Send proposal'}
      </Button>
    </form>
  )
}

export function AgentLeadPage() {
  const { matchId = '' } = useParams()
  const lead = useLead(matchId)
  usePageTitle('Lead')
  if (lead.isPending) return <p className="mx-auto max-w-3xl px-4 py-10 text-muted">Loading…</p>
  if (lead.isError || !lead.data) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-10">
        <FormError message={errorMessage(lead.error) ?? 'Lead not found'} />
      </section>
    )
  }
  const l = lead.data
  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <Link to="/agent" className="text-sm font-semibold text-saffron-dark underline">
        ← All leads
      </Link>
      <h1 className="mt-2 font-display text-3xl font-bold">
        {findItinerary(l.baseItinerary ?? undefined)?.title ?? (l.destinations || 'Custom India trip')}
      </h1>
      <LeadSummary lead={l} />
      <Card className="mt-6 space-y-2 text-sm">
        <p>
          <strong>Budget:</strong> {labelOf(BUDGETS, l.budget)} per person · <strong>Hotels:</strong> {labelOf(HOTEL_STYLES, l.hotelStyle)}
        </p>
        {l.destinations && (
          <p>
            <strong>Places:</strong> {l.destinations}
          </p>
        )}
        {l.interests.length > 0 && (
          <p>
            <strong>Interests:</strong> {l.interests.join(', ')}
          </p>
        )}
        {l.notes && (
          <p className="whitespace-pre-wrap">
            <strong>Notes:</strong> {l.notes}
          </p>
        )}
        <p>
          <strong>Contact:</strong>{' '}
          {l.travellerEmail ? (
            <a href={`mailto:${l.travellerEmail}`} className="font-semibold underline">
              {l.travellerEmail}
            </a>
          ) : (
            <span className="text-muted">shared only if the traveller shortlists you</span>
          )}
        </p>
        {l.proposal && (
          <p>
            <strong>Your proposal:</strong> {formatPrice(l.proposal.pricePerPerson, l.proposal.currency)} per person
          </p>
        )}
      </Card>
      {l.status === 'DECLINED' ? (
        <Card className="mt-6">
          <p>The traveller chose another agency for this trip.</p>
        </Card>
      ) : (
        <Card className="mt-6">
          <ProposalForm key={l.matchId} lead={l} />
        </Card>
      )}
      <Card className="mt-6">
        <MessageThread matchId={l.matchId} title={`Messages with ${l.travellerName ?? 'the traveller'}`} />
      </Card>
    </section>
  )
}
