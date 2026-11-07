/** A Markdown file split into its frontmatter fields and body. */
export interface ParsedDocument {
  meta: Record<string, string>
  body: string
}

/**
 * Reads the small frontmatter subset our content uses: `key: value` lines between `---` fences.
 * Values may be wrapped in double quotes (needed when they contain a colon).
 */
export function parseDocument(raw: string): ParsedDocument {
  const text = raw.replace(/\r\n/g, '\n')
  if (!text.startsWith('---\n')) return { meta: {}, body: text.trim() }
  const end = text.indexOf('\n---', 4)
  if (end < 0) throw new Error('Unclosed frontmatter')
  const meta: Record<string, string> = {}
  for (const line of text.slice(4, end).split('\n')) {
    if (!line.trim()) continue
    const colon = line.indexOf(':')
    if (colon < 1) throw new Error(`Bad frontmatter line: ${line}`)
    const key = line.slice(0, colon).trim()
    let value = line.slice(colon + 1).trim()
    if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
    meta[key] = value
  }
  return { meta, body: text.slice(end + 4).trim() }
}

/** Splits a comma-separated field into trimmed, non-empty values. */
export function listField(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
}
