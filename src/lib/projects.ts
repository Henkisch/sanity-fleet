/**
 * Which projects Fleet is willing to query.
 *
 * A project can be present in `useProjects` and still refuse every content
 * request. `isDisabledByUser` marks a project its owner has switched off:
 * the Content Lake answers `402 Payment Required` for both the query and the
 * live-events endpoint, and the SDK retries live events once a second forever,
 * so a single disabled project floods the console indefinitely.
 *
 * Filtering happens here, before a card is ever rendered, rather than in an
 * error boundary — nothing about a disabled project is worth a card.
 */
import type {Prefs} from './prefs'

export interface QueryableProject {
  id: string
  displayName: string
  organizationId: string
}

interface ProjectRecord {
  id: string
  displayName: string
  organizationId: string
  isDisabled?: boolean
  isDisabledByUser?: boolean
  isBlocked?: boolean
}

/** True when the Content Lake will actually answer for this project. */
export function isQueryable(project: ProjectRecord): boolean {
  return !project.isDisabled && !project.isDisabledByUser && !project.isBlocked
}

/** The projects a view should render, in display order. */
export function visibleProjects(
  projects: readonly ProjectRecord[],
  prefs: Prefs,
): QueryableProject[] {
  return projects
    .filter(isQueryable)
    .filter(
      (project) => prefs.visibleProjects.length === 0 || prefs.visibleProjects.includes(project.id),
    )
    .sort((a, b) => a.displayName.localeCompare(b.displayName, 'sv'))
    .map(({id, displayName, organizationId}) => ({id, displayName, organizationId}))
}
