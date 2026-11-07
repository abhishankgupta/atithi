import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="font-display text-3xl font-bold">Page not found</h1>
      <p className="mt-2 text-muted">This page doesn't exist, or hasn't been built yet.</p>
      <Link to="/" className="mt-6 inline-block font-semibold text-saffron-dark underline">
        Back to the home page
      </Link>
    </section>
  )
}
