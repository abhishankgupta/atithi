import { marked } from 'marked'
import { listField, parseDocument } from './frontmatter'

/**
 * Editorial content lives as Markdown in the repo: reviewed by pull request, versioned in Git,
 * and pre-rendered at build time so search engines can read it. Every file names an owner and
 * a last-reviewed date; a test fails when one is more than six months old.
 */

interface Reviewed {
  slug: string
  title: string
  summary: string
  owner: string
  lastReviewed: string
  html: string
}

export interface Itinerary extends Reviewed {
  days: number
  season: string
  pace: string
  route: string
  destination: string
}

export interface Destination extends Reviewed {
  season: string
  tags: string[]
  itineraries: string[]
}

export type Guide = Reviewed

const itineraryFiles = import.meta.glob<string>('./itineraries/*.md', { query: '?raw', import: 'default', eager: true })
const destinationFiles = import.meta.glob<string>('./destinations/*.md', { query: '?raw', import: 'default', eager: true })
const guideFiles = import.meta.glob<string>('./guides/*.md', { query: '?raw', import: 'default', eager: true })

function slugOf(path: string): string {
  return path.split('/').pop()!.replace(/\.md$/, '')
}

function required(meta: Record<string, string>, key: string, path: string): string {
  const value = meta[key]
  if (!value) throw new Error(`${path} is missing "${key}"`)
  return value
}

function base(path: string, raw: string): Reviewed & { meta: Record<string, string> } {
  const { meta, body } = parseDocument(raw)
  return {
    meta,
    slug: slugOf(path),
    title: required(meta, 'title', path),
    summary: required(meta, 'summary', path),
    owner: required(meta, 'owner', path),
    lastReviewed: required(meta, 'lastReviewed', path),
    // Content is written by the team and reviewed in pull requests, so its HTML is trusted.
    html: marked.parse(body, { async: false }),
  }
}

export const itineraries: Itinerary[] = Object.entries(itineraryFiles)
  .map(([path, raw]) => {
    const { meta, ...doc } = base(path, raw)
    return {
      ...doc,
      days: Number(required(meta, 'days', path)),
      season: required(meta, 'season', path),
      pace: required(meta, 'pace', path),
      route: required(meta, 'route', path),
      destination: required(meta, 'destination', path),
    }
  })
  .sort((a, b) => a.days - b.days || a.title.localeCompare(b.title))

export const destinations: Destination[] = Object.entries(destinationFiles)
  .map(([path, raw]) => {
    const { meta, ...doc } = base(path, raw)
    return {
      ...doc,
      season: required(meta, 'season', path),
      tags: listField(meta.tags),
      itineraries: listField(meta.itineraries),
    }
  })
  .sort((a, b) => b.itineraries.length - a.itineraries.length || a.title.localeCompare(b.title))

export const guides: Guide[] = Object.entries(guideFiles).map(([path, raw]) => {
  const { meta: _meta, ...doc } = base(path, raw)
  return doc
})

export const findItinerary = (slug: string | undefined) => itineraries.find((i) => i.slug === slug)
export const findDestination = (slug: string | undefined) => destinations.find((d) => d.slug === slug)
export const findGuide = (slug: string) => guides.find((g) => g.slug === slug)

/** Every content item, for the review-date check and the sitemap. */
export const allContent: Reviewed[] = [...itineraries, ...destinations, ...guides]
