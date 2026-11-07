import { Link, useParams } from 'react-router'
import { usePageTitle } from '../app/usePageTitle'
import { destinations, findDestination, findGuide, findItinerary, itineraries } from '../content/content'
import { NotFoundPage } from './NotFoundPage'

function Html({ html }: { html: string }) {
  // Trusted: written by the team in the repo and reviewed by pull request.
  return <div className="prose-atithi" dangerouslySetInnerHTML={{ __html: html }} />
}

function Reviewed({ owner, date }: { owner: string; date: string }) {
  return (
    <p className="mt-8 text-xs text-muted">
      Checked by {owner} on {date}. Rules and opening times change — confirm locally before you travel.
    </p>
  )
}

export function ItinerariesPage() {
  usePageTitle('Itineraries')
  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold">Day-by-day itineraries</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Written for first-time visitors, with safety and food notes for every stop. Use one as it is, or send it to
        agents to customise and quote.
      </p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {itineraries.map((it) => (
          <li key={it.slug} className="rounded-3xl bg-white p-5 shadow-[0_10px_28px_rgba(30,26,82,0.08)]">
            <p className="text-xs font-semibold text-muted">
              {it.days} days · {it.season} · {it.pace}
            </p>
            <h2 className="mt-1 font-display text-xl font-bold">
              <Link to={`/itineraries/${it.slug}`} className="hover:text-saffron-dark">
                {it.title}
              </Link>
            </h2>
            <p className="mt-1 text-sm font-semibold text-indigo-night">{it.route}</p>
            <p className="mt-2 text-sm text-muted">{it.summary}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function ItineraryPage() {
  const { slug } = useParams()
  const it = findItinerary(slug)
  usePageTitle(it?.title ?? 'Not found')
  if (!it) return <NotFoundPage />
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-xs font-semibold tracking-[0.12em] text-saffron-dark uppercase">{it.days}-day itinerary</p>
      <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">{it.title}</h1>
      <p className="mt-2 font-semibold text-indigo-night">{it.route}</p>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
        {[
          ['Best season', it.season],
          ['Pace', it.pace],
          ['Length', `${it.days} days`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl bg-white p-3">
            <dt className="text-xs text-muted">{k}</dt>
            <dd className="font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-6 rounded-3xl bg-indigo-night p-5 text-white">
        <p className="font-semibold">Like this plan? Up to five verified agents can quote for it — free.</p>
        <Link
          to={`/plan?itinerary=${it.slug}`}
          className="mt-3 inline-block rounded-full bg-saffron px-5 py-2.5 font-semibold hover:bg-saffron-dark"
        >
          Customise &amp; get quotes
        </Link>
      </div>
      <div className="mt-6">
        <Html html={it.html} />
      </div>
      <Reviewed owner={it.owner} date={it.lastReviewed} />
    </article>
  )
}

export function DestinationsPage() {
  usePageTitle('Destinations')
  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold">Where to go</h1>
      <p className="mt-2 text-muted">Every region feels like a different trip.</p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {destinations.map((d) => (
          <li key={d.slug} className="rounded-3xl bg-white p-5 shadow-[0_10px_28px_rgba(30,26,82,0.08)]">
            <h2 className="font-display text-lg font-bold">
              <Link to={`/destinations/${d.slug}`} className="hover:text-saffron-dark">
                {d.title}
              </Link>
            </h2>
            <p className="mt-1 text-sm text-muted">{d.summary}</p>
            <p className="mt-2 flex flex-wrap gap-1">
              {d.tags.map((t) => (
                <span key={t} className="rounded-full bg-sand px-2.5 py-0.5 text-xs font-semibold">
                  {t}
                </span>
              ))}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function DestinationPage() {
  const { slug } = useParams()
  const d = findDestination(slug)
  usePageTitle(d?.title ?? 'Not found')
  if (!d) return <NotFoundPage />
  const plans = d.itineraries.map((s) => findItinerary(s)).filter((i) => i !== undefined)
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-xs font-semibold text-muted">Best season: {d.season}</p>
      <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">{d.title}</h1>
      <p className="mt-2 text-lg text-muted">{d.summary}</p>
      <div className="mt-6">
        <Html html={d.html} />
      </div>
      {plans.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-xl font-bold">Itineraries</h2>
          <ul className="mt-2 space-y-2">
            {plans.map((it) => (
              <li key={it.slug}>
                <Link to={`/itineraries/${it.slug}`} className="font-semibold text-saffron-dark underline">
                  {it.title}
                </Link>{' '}
                <span className="text-sm text-muted">· {it.days} days</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <Link
        to={`/plan?destinations=${encodeURIComponent(d.title)}`}
        className="mt-8 inline-block rounded-full bg-saffron px-5 py-2.5 font-semibold text-white hover:bg-saffron-dark"
      >
        Get proposals for {d.title}
      </Link>
      <Reviewed owner={d.owner} date={d.lastReviewed} />
    </article>
  )
}

export function GuidePage({ slug }: { slug: 'safety' | 'food' }) {
  const guide = findGuide(slug)
  usePageTitle(guide?.title ?? 'Not found')
  if (!guide) return <NotFoundPage />
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold sm:text-4xl">{guide.title}</h1>
      <p className="mt-2 text-lg text-muted">{guide.summary}</p>
      <div className="mt-6">
        <Html html={guide.html} />
      </div>
      <Reviewed owner={guide.owner} date={guide.lastReviewed} />
    </article>
  )
}
