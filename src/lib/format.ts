/** Formatting helpers shared across views. */

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** "just now" | "17m ago" | "3h ago" | "12d ago" | "—" for a missing timestamp. */
export function relativeTime(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return '—'
  const then = Date.parse(iso)
  if (Number.isNaN(then)) return '—'
  const diff = Math.max(0, now - then)
  if (diff < MINUTE) return 'just now'
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`
  return `${Math.floor(diff / DAY)}d ago`
}

/** Days between an ISO timestamp and now, rounded down. Infinity when missing. */
export function daysSince(iso: string | null | undefined, now = Date.now()): number {
  if (!iso) return Infinity
  const then = Date.parse(iso)
  if (Number.isNaN(then)) return Infinity
  return Math.floor(Math.max(0, now - then) / DAY)
}

/** ISO timestamp `days` in the past — the `$staleBefore` parameter for signal queries. */
export function staleBefore(days: number, now = Date.now()): string {
  return new Date(now - days * DAY).toISOString()
}

/** 1204 -> "1 204" (thin space, matches Sanity UI's number style). */
export function formatCount(n: number): string {
  return n.toLocaleString('sv-SE').replace(/ /g, ' ')
}
