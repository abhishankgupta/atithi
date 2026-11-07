import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToString } from 'react-dom/server'
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router'
import { routes } from './app/router'
import { destinations, guides, itineraries } from './content/content'

/** A page to pre-render: its path, title and description for search results. */
export interface PrerenderPage {
  path: string
  title: string
  description: string
}

const HOME_DESCRIPTION =
  'Plan a safe, well-informed trip to India and get free proposals from verified local travel agents.'

/** Public pages search engines should see. Signed-in pages are never pre-rendered. */
export function pages(): PrerenderPage[] {
  return [
    { path: '/', title: 'Atithi — travel India, your way', description: HOME_DESCRIPTION },
    { path: '/itineraries', title: 'Day-by-day India itineraries · Atithi', description: 'Itineraries for first-time visitors to India, with safety and food notes for every stop.' },
    { path: '/destinations', title: 'Where to go in India · Atithi', description: 'Eight regions of India, from the Golden Triangle to Ladakh and Kerala.' },
    ...itineraries.map((i) => ({ path: `/itineraries/${i.slug}`, title: `${i.title} · Atithi`, description: i.summary })),
    ...destinations.map((d) => ({ path: `/destinations/${d.slug}`, title: `${d.title} · Atithi`, description: d.summary })),
    ...guides.map((g) => ({ path: `/${g.slug}`, title: `${g.title} · Atithi`, description: g.summary })),
  ]
}

export async function render(path: string): Promise<string> {
  const handler = createStaticHandler(routes)
  const context = await handler.query(new Request(`http://localhost${path}`))
  if (context instanceof Response) throw new Error(`Unexpected redirect while pre-rendering ${path}`)
  const router = createStaticRouter(handler.dataRoutes, context)
  const client = new QueryClient()
  // hydrate={false}: no inline hydration script, which the Content-Security-Policy would block.
  return renderToString(
    <QueryClientProvider client={client}>
      <StaticRouterProvider router={router} context={context} hydrate={false} />
    </QueryClientProvider>,
  )
}
