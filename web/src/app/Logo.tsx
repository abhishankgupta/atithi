/** The marigold mark. Decorative: the word "Atithi" beside it carries the name. */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill="#F2A93B" />
      <g fill="#FFF8EE">
        <path d="M16 5c2 4 2 7 0 10-2-3-2-6 0-10z" />
        <path d="M27 16c-4 2-7 2-10 0 3-2 6-2 10 0z" />
        <path d="M16 27c-2-4-2-7 0-10 2 3 2 6 0 10z" />
        <path d="M5 16c4-2 7-2 10 0-3 2-6 2-10 0z" />
      </g>
      <circle cx="16" cy="16" r="2.4" fill="#C8326B" />
    </svg>
  )
}
