import { useQuery } from '@tanstack/react-query'
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

export function HomePage() {
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
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-3xl bg-white p-6 shadow-[0_10px_28px_rgba(30,26,82,0.08)]">
          <h2 className="font-display text-2xl font-bold">We're building Atithi</h2>
          <p className="mt-2 text-muted">
            Destinations, itineraries, safety guides and trip proposals are on their way.
          </p>
          <div className="mt-4 text-sm">
            <ServerStatus />
          </div>
        </div>
      </section>
    </>
  )
}
