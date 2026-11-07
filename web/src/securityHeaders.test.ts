import { describe, expect, it } from 'vitest'
import { contentSecurityPolicy, headersFile } from '../security-headers'

describe('security headers', () => {
  it('allows scripts only from the site itself and API calls only to the configured API', () => {
    const csp = contentSecurityPolicy('https://atithi-api-test.onrender.com/')
    expect(csp).toContain("script-src 'self'")
    expect(csp).not.toContain('unsafe-inline')
    expect(csp).not.toContain('unsafe-eval')
    expect(csp).toContain("connect-src 'self' https://atithi-api-test.onrender.com;")
    expect(csp).toContain("frame-ancestors 'none'")
  })

  it('falls back to same-origin API calls when no API address is set', () => {
    expect(contentSecurityPolicy(undefined)).toContain("connect-src 'self';")
  })

  it('writes a Cloudflare _headers file covering every path', () => {
    const file = headersFile('https://api.example')
    expect(file.startsWith('/*\n')).toBe(true)
    expect(file).toContain('  Content-Security-Policy: ')
    expect(file).toContain('  Strict-Transport-Security: max-age=31536000; includeSubDomains')
    expect(file).toContain('  X-Frame-Options: DENY')
  })
})
