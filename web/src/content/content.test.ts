import { describe, expect, it } from 'vitest'
import { allContent, destinations, findItinerary, guides, itineraries } from './content'
import { listField, parseDocument } from './frontmatter'

const SIX_MONTHS_MS = 183 * 24 * 60 * 60 * 1000

describe('frontmatter', () => {
  it('reads key: value pairs, quoted values and the body', () => {
    const doc = parseDocument('---\ntitle: "Kerala: hills"\ndays: 8\n---\n\n## Day 1\nHello')
    expect(doc.meta).toEqual({ title: 'Kerala: hills', days: '8' })
    expect(doc.body).toBe('## Day 1\nHello')
  })

  it('splits comma-separated lists', () => {
    expect(listField(' Heritage, , Romance ')).toEqual(['Heritage', 'Romance'])
    expect(listField(undefined)).toEqual([])
  })

  it('rejects unclosed frontmatter', () => {
    expect(() => parseDocument('---\ntitle: x\n')).toThrow('Unclosed')
  })
})

describe('content', () => {
  it('has the launch set of itineraries, destinations and guides', () => {
    expect(itineraries.length).toBeGreaterThanOrEqual(4)
    expect(destinations).toHaveLength(8)
    expect(guides.map((g) => g.slug).sort()).toEqual(['food', 'safety'])
  })

  it('links only to itineraries that exist', () => {
    for (const d of destinations) {
      for (const slug of d.itineraries) expect(findItinerary(slug), `${d.slug} → ${slug}`).toBeDefined()
    }
  })

  it('renders Markdown to HTML with a tip on every itinerary day', () => {
    const golden = findItinerary('golden-triangle')!
    expect(golden.html).toContain('<h2>Day 3 · Delhi to Agra</h2>')
    expect(golden.html).toContain('closed every Friday')
    expect(golden.html).not.toContain('<script')
  })

  // Guardrail: safety information goes stale. Every page names an owner and must be re-checked
  // at least every six months, or the build fails.
  it('was reviewed by a named owner in the last six months', () => {
    const now = Date.now()
    for (const item of allContent) {
      expect(item.owner.trim(), `${item.slug} owner`).not.toBe('')
      const reviewed = Date.parse(`${item.lastReviewed}T00:00:00Z`)
      expect(Number.isNaN(reviewed), `${item.slug} lastReviewed`).toBe(false)
      expect(now - reviewed, `${item.slug} was last reviewed on ${item.lastReviewed}`).toBeLessThan(SIX_MONTHS_MS)
    }
  })
})
