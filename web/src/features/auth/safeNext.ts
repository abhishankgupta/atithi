/** Only same-site paths are allowed as a post-login destination (prevents open redirects). */
export function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/'
}
