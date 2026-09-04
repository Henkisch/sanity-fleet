/**
 * Viewport breakpoints.
 *
 * Fleet is a monitoring tool, so it gets opened on a phone to answer "is
 * anything waiting?" as often as on a desktop. The rail and the table both
 * need to know which shape they are in, and `matchMedia` is the honest source
 * for that — a resize listener re-renders on every pixel.
 */
import {useSyncExternalStore} from 'react'

/** Below this, the navigation rail becomes an overlay and the table sheds columns. */
export const MOBILE_QUERY = '(max-width: 900px)'

function subscribe(query: string) {
  return (onChange: () => void) => {
    const list = window.matchMedia(query)
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    subscribe(query),
    () => window.matchMedia(query).matches,
    () => false,
  )
}

export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_QUERY)
}
