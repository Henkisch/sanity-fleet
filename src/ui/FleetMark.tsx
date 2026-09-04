/**
 * The app's mark: a ship, drawn in Lucide's language — strokes of one weight,
 * round caps and joins, no fills.
 *
 * Earlier attempts filled their shapes and carried more detail; every one of
 * them dissolved at the 22px this actually renders at. An outline of a ship
 * survives being small, and its sail carries the same amber the table uses for
 * a project wanting attention. Kept as a component rather than an <img> so it
 * stays crisp at any size and needs no network request; `static/icon.svg` is
 * the same drawing for the Dashboard, which takes a file path.
 */
import type {JSX} from 'react'

export function FleetMark({size = 22}: {size?: number}): JSX.Element {
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
      <rect width="64" height="64" rx="15" fill="url(#fleetBg)" />
      <g stroke="#fff" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 40h34l-5.5 9h-23z" />
        <path d="M32 13v27" />
        <path
          d="M12 52c2.2 0 3-2.5 6.5-2.5S24.8 52 27 52s3-2.5 6.5-2.5S39.8 52 42 52s3-2.5 6.5-2.5S52 52 52 52"
          strokeOpacity="0.75"
        />
      </g>
      <path
        d="M32 18l11 15H32z"
        stroke="#f9b23b"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="fleetBg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7B87FF" />
          <stop offset="1" stopColor="#4E5BE8" />
        </linearGradient>
      </defs>
    </svg>
  )
}
