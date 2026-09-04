import type {JSX} from 'react'

/**
 * The app's mark: a sailboat in two strokes — a hull, and a sail whose left
 * edge doubles as its mast.
 *
 * Every earlier version failed the same test. A list of rows was
 * indistinguishable from any other dashboard's mark; filled sails, a wave and
 * an amber accent all read as texture rather than shape once the icon is the
 * 22px it actually renders at. What survives being small is one large,
 * monochrome silhouette.
 *
 * Kept as a component rather than an <img> so it stays crisp at any size and
 * needs no network request; `static/icon.svg` is the same drawing for the
 * Dashboard, which takes a file path.
 */
export function FleetMark({size = 24}: {size?: number}): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label="Fleet"
      style={{flex: 'none', display: 'block'}}
    >
      <rect width="64" height="64" rx="15" fill="#5B67F2" />
      <g stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M31 10 31 39 50 39 Z" />
        <path d="M9 44h46l-8 12H17z" />
      </g>
    </svg>
  )
}
