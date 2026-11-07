export const BUDGETS = [
  { value: 'UNDER_1000', label: 'Under US$1,000' },
  { value: '1000_2000', label: 'US$1,000–2,000' },
  { value: '2000_4000', label: 'US$2,000–4,000' },
  { value: 'OVER_4000', label: 'US$4,000+' },
]

export const HOTEL_STYLES = [
  { value: 'BUDGET', label: 'Budget and homestays' },
  { value: 'COMFORT', label: 'Comfortable 3–4★' },
  { value: 'HERITAGE', label: 'Heritage and boutique' },
  { value: 'LUXURY', label: 'Luxury 5★' },
]

export const INTERESTS = [
  'Heritage',
  'Wildlife',
  'Beaches',
  'Food',
  'Yoga and wellness',
  'Spiritual',
  'Trekking',
  'Festivals',
  'Markets',
  'Photography',
]

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'AUD', 'INR']

const MATCH_STATUS: Record<string, string> = {
  OPEN: 'Waiting for proposal',
  PROPOSED: 'Proposal received',
  SHORTLISTED: 'Shortlisted',
  DECLINED: 'Declined',
}

const AGENT_STATUS: Record<string, string> = {
  OPEN: 'New',
  PROPOSED: 'Proposal sent',
  SHORTLISTED: 'Shortlisted you',
  DECLINED: 'Declined',
}

const REQUEST_STATUS: Record<string, string> = {
  SUBMITTED: 'Finding agents',
  MATCHED: 'Sent to agents',
  CLOSED: 'Closed',
}

export const labelOf = (list: { value: string; label: string }[], value: string) =>
  list.find((o) => o.value === value)?.label ?? value
export const matchStatus = (s: string) => MATCH_STATUS[s] ?? s
export const agentStatus = (s: string) => AGENT_STATUS[s] ?? s
export const requestStatus = (s: string) => REQUEST_STATUS[s] ?? s

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso)
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

export function formatPrice(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount)
  } catch {
    return `${currency} ${amount}`
  }
}

export function travellers(adults: number, children: number): string {
  const a = `${adults} adult${adults === 1 ? '' : 's'}`
  return children ? `${a}, ${children} child${children === 1 ? '' : 'ren'}` : a
}
