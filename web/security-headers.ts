/**
 * Security headers for the web app, written to dist/_headers at build time so Cloudflare
 * Workers static assets serves them with every page.
 *
 * Why strict: the refresh token lives in localStorage (web and API are on different domains),
 * so the main defence against a stolen session is never running injected script.
 */
export function contentSecurityPolicy(apiBaseUrl: string | undefined): string {
  const api = (apiBaseUrl ?? '').trim().replace(/\/$/, '')
  const connect = ["'self'", api].filter(Boolean).join(' ')
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src ${connect}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ')
}

export function headersFile(apiBaseUrl: string | undefined): string {
  const headers = {
    'Content-Security-Policy': contentSecurityPolicy(apiBaseUrl),
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  }
  const lines = Object.entries(headers).map(([name, value]) => `  ${name}: ${value}`)
  return ['/*', ...lines, ''].join('\n')
}
