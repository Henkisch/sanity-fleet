/**
 * Hash routing.
 *
 * A route is two independent choices: **what** you are looking at (a scope —
 * everything, one organization, one project) and **which view** of it
 * (overview, drafts, stale, activity). Keeping them separate is what lets
 * "drafts" mean "drafts in the selected organization" when one is selected,
 * rather than a permanently global list — the reason those views do not
 * belong in the navigation rail.
 *
 *   #/                         overview, everything
 *   #/drafts                   drafts, everything
 *   #/activity                 recent edits, everything
 *   #/o/<orgId>[/drafts]       one organization
 *   #/p/<projectId>[/stale]    one project
 *   #/search?q=<query>         search, everything
 *
 * The App SDK ships no router, and hash routes are deep-linkable and survive a
 * reload inside the Dashboard iframe without fighting its basePath.
 */
import {useCallback} from 'react'
import {useSyncExternalStore} from 'react'

export type Scope =
  | {kind: 'all'}
  | {kind: 'organization'; id: string}
  | {kind: 'project'; id: string}

export type View = 'overview' | 'drafts' | 'stale' | 'activity'

export interface Route {
  scope: Scope
  view: View
  /** Search term; a non-empty value means the search view. */
  q?: string
}

const VIEWS: View[] = ['overview', 'drafts', 'stale', 'activity']

function parseView(segment: string | undefined): View {
  return VIEWS.includes(segment as View) ? (segment as View) : 'overview'
}

export function parseRoute(hash: string): Route {
  const [path, search] = hash.replace(/^#/, '').split('?')
  const segments = path.split('/').filter(Boolean)
  const params = new URLSearchParams(search ?? '')

  if (segments[0] === 'search') {
    return {scope: {kind: 'all'}, view: 'overview', q: params.get('q') ?? ''}
  }
  if (segments[0] === 'o' && segments[1]) {
    return {scope: {kind: 'organization', id: segments[1]}, view: parseView(segments[2])}
  }
  if (segments[0] === 'p' && segments[1]) {
    return {scope: {kind: 'project', id: segments[1]}, view: parseView(segments[2])}
  }
  return {scope: {kind: 'all'}, view: parseView(segments[0])}
}

export function routeToHash(route: Route): string {
  if (route.q) return `#/search?q=${encodeURIComponent(route.q)}`

  const view = route.view === 'overview' ? '' : `/${route.view}`
  switch (route.scope.kind) {
    case 'organization':
      return `#/o/${route.scope.id}${view}`
    case 'project':
      return `#/p/${route.scope.id}${view}`
    case 'all':
    default:
      return view ? `#${view}` : '#/'
  }
}

/** True when two scopes point at the same thing. */
export function sameScope(a: Scope, b: Scope): boolean {
  if (a.kind !== b.kind) return false
  return a.kind === 'all' || b.kind === 'all' ? true : a.id === (b as {id: string}).id
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
