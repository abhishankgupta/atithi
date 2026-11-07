import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { usePageTitle } from '../app/usePageTitle'
import { destinations, itineraries } from '../content/content'
import { getJson } from '../lib/api'

interface Meta {
  name: string
  environment: string
  version: string
}

/** Shows whether the API is reachable. A sleeping free instance takes about a minute to wake. */
function ServerStatus() {
  const meta = useQuery({ queryKey: ['meta'], queryFn: () => getJson<Meta>('/api/v1/meta') })
  if (meta.isPending) {
    return (
      <p role="status" className="text-muted">
        Waking up the server… On our free plan this can take up to a minute.
      </p>
    )
  }
  if (meta.isError) {
    return (
      <p role="alert" className="text-rani">
        The server isn't responding yet. Please try again in a minute.
      </p>
    )
  }
  return (
    <p role="status" className="text-peacock">
      Server connected · {meta.data.environment} · build {meta.data.version.slice(0, 7)}
    </p>
  )
}

const steps = [
  { title: 'Tell us your trip', text: 'Dates, budget, interests and anything agents should know. Free.' },
  { title: 'Verified agents reply', text: 'Up to five local agencies send proposals in the same format.' },
  { title: 'Compare and choose', text: 'Chat with agents, shortlist one, and only then share your contact.' },
]

export function HomePage() {
  usePageTitle('')
  return (
    <>
      <section className="bg-indigo-night px-4 pt-10 pb-16 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold tracking-[0.18em] text-marigold-light uppercase">Atithi Devo Bhava</p>
          <h1 className="mt-3 font-display text-4xl leading-tight font-bold sm:text-5xl">
            Come as a guest.
            <br />
            <span className="font-medium text-marigold-light italic">Leave as family.</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-white/85">
            Handcrafted itineraries, honest safety advice and free proposals from verified local travel agents.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/plan" className="rounded-full bg-saffron px-6 py-3 font-semibold hover:bg-saffron-dark">
              Get free proposals
            </Link>
            <Link to="/itineraries" className="rounded-full border border-white/50 px-6 py-3 font-semibold hover:bg-white/10">
              Browse itineraries
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="font-display text-2xl font-bold">Popular itineraries</h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {itineraries.map((it) => (
            <li key={it.slug}>
              <Link
                to={`/itineraries/${it.slug}`}
                className="block h-full rounded-3xl bg-white p-5 shadow-[0_10px_28px_rgba(30,26,82,0.08)] hover:shadow-lg"
              >
                <p className="text-xs font-semibold text-muted">
                  {it.days} days · {it.season}
                </p>
                <h3 className="mt-1 font-display text-lg font-bold">{it.title}</h3>
                <p className="mt-2 text-sm text-muted">{it.summary}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-peacock px-4 py-10 text-white">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-2xl font-bold">How Atithi works</h2>
          <ol className="mt-4 grid gap-4 sm:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title} className="rounded-3xl bg-white/10 p-5">
                <p className="font-display text-3xl text-marigold-light">{i + 1}</p>
                <h3 className="mt-1 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-white/80">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="font-display text-2xl font-bold">Eight Indias to explore</h2>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {destinations.map((d) => (
            <li key={d.slug}>
              <Link to={`/destinations/${d.slug}`} className="block h-full rounded-2xl bg-sand p-4 hover:bg-marigold-light/40">
                <h3 className="font-display font-bold">{d.title}</h3>
                <p className="mt-1 text-xs text-muted">{d.season}</p>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link to="/safety" className="rounded-3xl bg-indigo-night p-5 text-white">
            <h3 className="font-display text-lg font-bold">Travel safe in India</h3>
            <p className="mt-1 text-sm text-white/80">Emergency numbers, common scams and advice for women travellers.</p>
          </Link>
          <Link to="/food" className="rounded-3xl bg-sand p-5">
            <h3 className="font-display text-lg font-bold">Taste India</h3>
            <p className="mt-1 text-sm text-muted">What to eat region by region, and street-food rules that work.</p>
          </Link>
        </div>
        <div className="mt-8 text-sm">
          <ServerStatus />
        </div>
      </section>
    </>
  )
}
