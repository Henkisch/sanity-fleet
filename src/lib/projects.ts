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

function toQueryable({id, displayName, organizationId}: ProjectRecord): QueryableProject {
  return {id, displayName, organizationId}
}

function byName(a: QueryableProject, b: QueryableProject): number {
  return a.displayName.localeCompare(b.displayName, 'sv')
}

/**
 * The projects a view should render, in display order.
 *
 * Hidden projects are always excluded here, `showHidden` or not: peeking
 * reveals the hidden *section*, it does not fold those projects back into the
 * organizations they came from — otherwise a peeked project appears twice, once
 * in its organization and once under Hidden.
 */
export function visibleProjects(
  projects: readonly ProjectRecord[],
  prefs: Prefs,
): QueryableProject[] {
  return projects
    .filter(isQueryable)
    .filter((project) => !prefs.hiddenProjects.includes(project.id))
    .map(toQueryable)
    .sort(byName)
}

/** The projects the user has hidden, for the "hidden" section of the rail. */
export function hiddenProjects(
  projects: readonly ProjectRecord[],
  prefs: Prefs,
): QueryableProject[] {
  return projects
    .filter(isQueryable)
    .filter((project) => prefs.hiddenProjects.includes(project.id))
    .map(toQueryable)
    .sort(byName)
}
