import type {JSX} from 'react'

/**
 * The app's mark: Lucide's `ship` (lucide.dev, ISC), unmodified apart from a
 * lighter stroke.
 *
 * Several attempts at drawing a literal fleet — three hulls in perspective, a
 * near ship with two further out — all failed the only test that matters: at
 * the 26px this renders at, the extra vessels stopped reading as ships and
 * became grain. One clear ship plus the word "Fleet" beside it carries the
 * idea better than three unreadable ones.
 */
export function FleetMark({size = 20}: {size?: number}): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="Fleet"
      style={{flex: 'none', display: 'block'}}
    >
      <path d="M12 2v2" />
      <path d="M12 9.189V13" />
      <path d="M19 12V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6" />
      <path d="M19.38 19A11.6 11.6 0 0 0 21 13l-8.188-3.639a2 2 0 0 0-1.624 0L3 13.001a11.6 11.6 0 0 0 2.81 7.76" />
      <path d="M2 20c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1s1.2 1 2.5 1c2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
    </svg>
  )
}
