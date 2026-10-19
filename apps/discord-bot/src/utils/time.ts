import { formatDistanceToNow } from 'date-fns'

// ---------------------------------------------------------------------------
// Discord timestamp helper
// ---------------------------------------------------------------------------

type TimestampStyle = 'F' | 'R' | 't' | 'd'

/**
 * Return a Discord dynamic timestamp string `<t:unix:style>`.
 * Returns `'—'` when date is null/undefined/falsy.
 */
export function discordTs(
  date: Date | string | null | undefined,
  style: TimestampStyle = 'F',
): string {
  if (!date) return '—'
  const d   = date instanceof Date ? date : new Date(date)
  const sec = Math.floor(d.getTime() / 1000)
  return `<t:${sec}:${style}>`
}

// ---------------------------------------------------------------------------
// Human-readable countdown
// ---------------------------------------------------------------------------

/**
 * Return a human-readable distance from now using date-fns.
 * Past dates → `'5 minutes ago'`; future dates → `'in 3 hours'`.
 * Returns `'—'` when date is null/undefined/falsy.
 */
export function countdown(date: Date | string | null | undefined): string {
  if (!date) return '—'
  const d     = date instanceof Date ? date : new Date(date)
  const now   = Date.now()
  const isPast = d.getTime() < now
  const dist  = formatDistanceToNow(d, { addSuffix: false })
  return isPast ? `${dist} ago` : `in ${dist}`
}

// ---------------------------------------------------------------------------
// Indian Rupee formatter
// ---------------------------------------------------------------------------

/**
 * Format a number/string/Decimal as `₹1,23,456`.
 * Accepts anything that can be coerced to a number via `Number()`.
 */
export function formatINR(amount: number | string | { toNumber?: () => number }): string {
  const n = typeof amount === 'object' && amount !== null && typeof amount.toNumber === 'function'
    ? amount.toNumber()
    : Number(amount)
  return '₹' + n.toLocaleString('en-IN')
}

// ---------------------------------------------------------------------------
// Game label
// ---------------------------------------------------------------------------

/** Map a Game enum string to a display label. */
export function gameLabel(game: string): string {
  switch (game) {
    case 'FREE_FIRE':  return 'FREE FIRE'
    case 'COD_MOBILE': return 'COD MOBILE'
    case 'BGMI':       return 'BGMI'
    default:           return game.replace(/_/g, ' ')
  }
}
