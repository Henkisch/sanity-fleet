/**
 * Hash routing.
 *
 * The App SDK ships no router, and Fleet runs inside the Sanity Dashboard
 * iframe where path-based routing fights the host's basePath. Hash routes are
 * deep-linkable, survive reload, and cost one `hashchange` listener.
 *
 *   #/                      fleet grid
 *   #/p/<projectId>         project detail
 *   #/drafts                merged drafts across projects
 *   #/stale                 merged stale documents across projects
 *   #/search?q=<query>      cross-project search
 */
import {useCallback, useSyncExternalStore} from 'react'

export type Route =
  | {name: 'fleet'}
  | {name: 'project'; projectId: string}
  | {name: 'drafts'}
  | {name: 'stale'}
  | {name: 'search'; q: string}

export function parseRoute(hash: string): Route {
  const raw = hash.replace(/^#/, '')
  const [path, search] = raw.split('?')
  const segments = path.split('/').filter(Boolean)
  const params = new URLSearchParams(search ?? '')

  if (segments[0] === 'p' && segments[1]) return {name: 'project', projectId: segments[1]}
  if (segments[0] === 'drafts') return {name: 'drafts'}
  if (segments[0] === 'stale') return {name: 'stale'}
  if (segments[0] === 'search') return {name: 'search', q: params.get('q') ?? ''}
  return {name: 'fleet'}
}

export function routeToHash(route: Route): string {
  switch (route.name) {
    case 'project':
      return `#/p/${route.projectId}`
    case 'drafts':
      return '#/drafts'
    case 'stale':
      return '#/stale'
    case 'search':
      return route.q ? `#/search?q=${encodeURIComponent(route.q)}` : '#/search'
    case 'fleet':
    default:
      return '#/'
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

function getSnapshot(): string {
  return window.location.hash || '#/'
}

/** Current route plus a navigate function. Re-renders on back/forward. */
export function useRoute(): {route: Route; navigate: (route: Route) => void} {
  const hash = useSyncExternalStore(subscribe, getSnapshot, () => '#/')

  const navigate = useCallback((next: Route) => {
    const nextHash = routeToHash(next)
    if (window.location.hash === nextHash) return
    window.location.hash = nextHash
  }, [])

  return {route: parseRoute(hash), navigate}
}
